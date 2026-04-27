import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPaymentIntent, decideThreeDsAction } from '@/lib/airwallex'
import { calculateFees, getFeeRatesFromSettings } from '@/lib/fees'
import { computeOriginTax } from '@/lib/origin-tax'
import {
  computeCreatorSalesTax,
  computePlatformFeeTax,
  loadPlatformFeeTaxRules,
} from '@/lib/platform-fee-tax'
import { createQuoteBackingProduct } from '@/lib/commissions'
import { createNotification } from '@/lib/notifications'

const SUPPORTED_CURRENCIES = ['USD', 'MYR', 'SGD', 'PHP', 'THB', 'IDR']

async function convertToDisplayCurrency(amountUsdCents: number, currency: string): Promise<number> {
  if (currency === 'USD') return amountUsdCents
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'
  const res = await fetch(`${appUrl}/api/airwallex/fx-rate?to=${currency}&amountUsd=${amountUsdCents}`)
  if (!res.ok) throw new Error(`FX rate unavailable for ${currency}`)
  const { displayAmount } = await res.json() as { displayAmount: number }
  return displayAmount
}

// POST /api/commissions/quotes/[id]/accept
// Buyer accepts a SENT quote:
//  1. validate, 2. create hidden backing Product,
//  3. create PENDING Order (with airwallexIntentId placeholder → filled after intent),
//  4. clone milestones onto the Order,
//  5. compute processing fee and create Airwallex PaymentIntent for the full amount,
//  6. return clientSecret to the client for DropIn checkout.
// Webhook flips Order PENDING → PROCESSING on payment.succeeded (existing handler).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { id } = await params

  const body = await req.json().catch(() => ({})) as { currency?: string }
  const currency = SUPPORTED_CURRENCIES.includes((body.currency ?? '').toUpperCase())
    ? body.currency!.toUpperCase()
    : 'USD'

  const quote = await prisma.commissionQuote.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, userId: true } },
      milestones: { orderBy: { order: 'asc' } },
    },
  })
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (quote.buyerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (quote.status !== 'SENT') return NextResponse.json({ error: 'Quote is not available for acceptance' }, { status: 400 })
  if (quote.expiresAt < new Date()) {
    await prisma.commissionQuote.update({ where: { id }, data: { status: 'EXPIRED' } })
    return NextResponse.json({ error: 'Quote has expired' }, { status: 400 })
  }

  const buyer = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })

  // Rail-aware fee model (5/5.5/8). Commissions are 3DS-forced and the buyer
  // doesn't pre-select a rail at quote-accept time — Airwallex DropIn picks the
  // method later. We charge the conservative CARD tier (8% buyer fee) since
  // (a) it matches the 3DS policy, (b) it lets us collect the same revenue
  // regardless of which method the buyer eventually chooses, and (c) any
  // recalc-on-webhook would surprise the buyer with a different total than
  // what they accepted.
  const rates = await getFeeRatesFromSettings()
  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { id: quote.creatorId },
    select: {
      taxRegistered: true,
      taxRatePercent: true,
      taxJurisdiction: true,
      payoutCountry: true,
      // Phase 8 — creator's own sales tax (Layer 1.5, agency-collect).
      creatorClassification: true,
      taxId: true,
      collectsSalesTax: true,
      salesTaxStatus: true,
      salesTaxRate: true,
      salesTaxLabel: true,
    },
  })
  // Phase 8 — buyer country snapshot for platform-fee BUYER-side tax.
  // Commissions are services (no shipping form), so the strongest country
  // signal we have on the buyer is their `businessTaxCountry` (if they're
  // B2B). When null, the buyer-side platform fee tax returns 0 — line is
  // suppressed. Acceptable scaffolding behavior at launch.
  const buyerProfile = await prisma.user.findUnique({
    where: { id: userId },
    select: { businessTaxCountry: true },
  })
  const buyerCountry = buyerProfile?.businessTaxCountry?.toUpperCase() ?? null
  // Phase 4 — creator origin country snapshot. Prefer `payoutCountry` (where the
  // money lands), fall back to `taxJurisdiction`. Locked onto Order.creatorCountry
  // so PPh attribution survives later profile changes. Mirrors the resolution in
  // src/app/api/airwallex/payment-intent/route.ts.
  const creatorCountry = (creatorProfile?.payoutCountry ?? creatorProfile?.taxJurisdiction ?? null)
    ?.toUpperCase() ?? null

  // Layer 1 origin tax (PPh) takes precedence over the Phase 2.1 sales-tax
  // markup-and-withhold path. PPh is *withheld from creator only* — never marked
  // up onto the buyer — so when the creator's country has an active origin-tax
  // rule (ID at launch), we compute fees with creatorTaxRate=0 to keep the
  // buyer's gross PPh-free, then snapshot the PPh withholding into
  // creatorTaxAmountUsd. This mirrors the web-checkout branch in
  // src/app/api/airwallex/payment-intent/route.ts (lines 445-463).
  const originTax = computeOriginTax(creatorCountry, quote.amountUsd, 'COMMISSION')
  const isPphPath = originTax.amountUsd > 0

  const declaredTaxRate = creatorProfile?.taxRegistered
    ? (creatorProfile.taxRatePercent ?? 0)
    : 0
  const buyerSideTaxRate = isPphPath ? 0 : declaredTaxRate
  const breakdown = calculateFees(quote.amountUsd, 'CARD', rates, buyerSideTaxRate)
  const orderCreatorTaxUsd = isPphPath ? originTax.amountUsd : breakdown.creatorTaxUsdCents
  const orderCreatorTaxRate = isPphPath
    ? originTax.rate * 100
    : (declaredTaxRate > 0 ? declaredTaxRate : 0)

  // ── Phase 8: creator's own sales tax (Layer 1.5, agency-collect) ──────────
  // Commissions are services — no shipping pass-through, so the tax base is
  // just the discounted subtotal. Activates only when the creator's profile
  // clears all five gates.
  const creatorSalesTax = creatorProfile
    ? computeCreatorSalesTax(
        {
          creatorClassification: creatorProfile.creatorClassification,
          taxId: creatorProfile.taxId,
          collectsSalesTax: creatorProfile.collectsSalesTax,
          salesTaxStatus: creatorProfile.salesTaxStatus,
          salesTaxRate: creatorProfile.salesTaxRate,
          salesTaxLabel: creatorProfile.salesTaxLabel,
        },
        breakdown.subtotalUsdCents,
        0,
      )
    : { rate: 0, amountUsd: 0, label: null as string | null }

  // ── Phase 8: platform fee tax (Layer 3, threshold-gated) ──────────────────
  // Buyer side = tax on buyer service fee (`breakdown.buyerFeeUsdCents`) in
  // buyer's country. Creator side = tax on commission deducted at payout
  // (`breakdown.creatorCommissionUsdCents`) in creator's country.
  const platformFeeTaxRules = await loadPlatformFeeTaxRules()
  const platformFeeBuyerTax = computePlatformFeeTax(
    platformFeeTaxRules,
    'BUYER',
    buyerCountry,
    breakdown.buyerFeeUsdCents,
  )
  const platformFeeCreatorTax = computePlatformFeeTax(
    platformFeeTaxRules,
    'CREATOR',
    creatorCountry,
    breakdown.creatorCommissionUsdCents,
  )

  // Buyer pays: existing breakdown gross + creator's own sales tax + platform-
  // fee buyer-side tax. Creator-side platform fee tax is NOT added — it's a
  // payout-time deduction.
  const orderAmountUsd =
    breakdown.grossUsdCents + creatorSalesTax.amountUsd + platformFeeBuyerTax.amountUsd
  const now = new Date()

  const backingProduct = await createQuoteBackingProduct({
    creatorProfileId: quote.creatorId,
    title: quote.title,
    amountUsd: quote.amountUsd,
    depositPercent: quote.depositPercent,
    revisionsIncluded: quote.revisionsIncluded,
    turnaroundDays: quote.turnaroundDays,
  })

  // For milestone quotes we skip the deposit-split flow entirely — the whole amount
  // sits in escrow and releases per milestone. For non-milestone quotes we reuse the
  // existing commissionDepositPercent/Amount fields, same as Lane A.
  const depositAmount = quote.isMilestoneBased
    ? null
    : (quote.depositPercent > 0 ? Math.round(orderAmountUsd * (quote.depositPercent / 100)) : null)

  // Build Order + milestones atomically, then create intent separately (network)
  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.order.create({
      data: {
        buyerId: userId,
        creatorId: quote.creator.userId,
        productId: backingProduct.id,
        cartSessionId: `quote_${quote.id}`,
        amountUsd: orderAmountUsd,
        displayCurrency: currency,
        displayAmount: orderAmountUsd,
        status: 'PENDING',
        escrowStatus: 'HELD',
        escrowHeldAt: now,
        // Commission snapshot fields (reused for both milestone + non-milestone quote orders)
        commissionStatus: 'PENDING_ACCEPTANCE',
        commissionAcceptDeadlineAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        commissionDepositPercent: quote.isMilestoneBased ? null : quote.depositPercent,
        commissionDepositAmount: depositAmount,
        commissionRevisionsAllowed: quote.revisionsIncluded,
        commissionDepositConsentAt: now,
        commissionQuoteId: quote.id,
        commissionIsMilestoneBased: quote.isMilestoneBased,
        // Rail-aware fee snapshot (commissions default to CARD per 3DS policy)
        paymentRail: 'CARD',
        subtotalUsd: breakdown.subtotalUsdCents,
        buyerFeeUsd: breakdown.buyerFeeUsdCents,
        creatorCommissionUsd: breakdown.creatorCommissionUsdCents,
        // Phase 2.1 / Phase 4 — Layer 1 creator tax snapshot.
        // For ID creators (or any country with a `creatorOriginTax` rule):
        //   PPh Final 0.5% withholding (Phase 4) — withheld from creator only,
        //   buyer is NOT marked up.
        // For taxRegistered creators in non-PPh countries:
        //   sales-tax markup-and-withhold (Phase 2.1) — buyer pays the markup,
        //   we withhold the same amount from the creator.
        creatorTaxAmountUsd: orderCreatorTaxUsd,
        creatorTaxRatePercent: orderCreatorTaxRate > 0 ? orderCreatorTaxRate : null,
        // Phase 4 — creator country snapshot drives the webhook's PPh accrual
        // into the TAX_ORIGIN/{country} reserve when payment confirms.
        creatorCountry,
        buyerCountry,
        // Phase 8 — creator's own sales tax (Layer 1.5, agency-collect).
        // Zero unless creator's profile cleared all five gates.
        creatorSalesTaxAmountUsd: creatorSalesTax.amountUsd,
        creatorSalesTaxRatePercent: creatorSalesTax.amountUsd > 0 ? creatorSalesTax.rate : null,
        creatorSalesTaxLabel: creatorSalesTax.amountUsd > 0 ? creatorSalesTax.label : null,
        // Phase 8 — platform fee tax (Layer 3, threshold-gated per country).
        platformFeeBuyerTaxUsd: platformFeeBuyerTax.amountUsd,
        platformFeeBuyerTaxRate: platformFeeBuyerTax.amountUsd > 0 ? platformFeeBuyerTax.rate : null,
        platformFeeCreatorTaxUsd: platformFeeCreatorTax.amountUsd,
        platformFeeCreatorTaxRate: platformFeeCreatorTax.amountUsd > 0 ? platformFeeCreatorTax.rate : null,
      },
    })
    if (quote.isMilestoneBased) {
      for (const m of quote.milestones) {
        await tx.commissionMilestone.update({
          where: { id: m.id },
          data: { orderId: o.id },
        })
      }
    }
    await tx.commissionQuote.update({
      where: { id: quote.id },
      data: { status: 'ACCEPTED', acceptedAt: now },
    })
    if (quote.requestId) {
      await tx.commissionRequest.update({
        where: { id: quote.requestId },
        data: { status: 'ACCEPTED' },
      })
    }

    // Promote the linked ticket to ORDER (prefer quote's ticket, then request's).
    const linkedTicket =
      (await tx.ticket.findUnique({ where: { commissionQuoteId: quote.id }, select: { id: true, orderId: true } })) ??
      (quote.requestId
        ? await tx.ticket.findUnique({
            where: { commissionRequestId: quote.requestId },
            select: { id: true, orderId: true },
          })
        : null)
    if (linkedTicket && !linkedTicket.orderId) {
      await tx.ticket.update({
        where: { id: linkedTicket.id },
        data: {
          orderId: o.id,
          commissionQuoteId: quote.id,
          kind: 'ORDER',
          lastMessageAt: now,
        },
      })
      await tx.ticketMessage.create({
        data: {
          ticketId: linkedTicket.id,
          senderId: userId,
          body: 'Quote accepted — order created.',
          systemKind: 'OPENED',
          createdAt: now,
        },
      })
    }

    return o
  })

  // Create payment intent for the full amount in buyer's currency
  const displayAmount = await convertToDisplayCurrency(orderAmountUsd, currency)
  try {
    // Commission orders are digital-equivalent (custom work, often delivered as
    // files): force 3DS to shift chargeback liability to issuer.
    const intent = await createPaymentIntent({
      amount: displayAmount,
      currency,
      orderId: order.id,
      buyerEmail: buyer?.email,
      threeDsAction: decideThreeDsAction({
        productType: 'COMMISSION',
        amountUsdCents: orderAmountUsd,
      }),
      metadata: { commissionQuoteId: quote.id, isMilestoneBased: String(quote.isMilestoneBased) },
    })
    await prisma.order.update({
      where: { id: order.id },
      data: {
        airwallexIntentId: intent.id as string,
        displayCurrency: currency,
        displayAmount,
      },
    })

    await createNotification(
      quote.creator.userId,
      'NEW_ORDER',
      'Quote accepted — payment in progress',
      `Your quote "${quote.title}" has been accepted. The buyer is completing payment now; you'll be notified again once funds clear into escrow.`,
      order.id,
      `/dashboard/orders/${order.id}`,
    )

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      intentId: intent.id,
      clientSecret: intent.client_secret,
      currency,
      displayAmount,
    })
  } catch (e) {
    // Roll back acceptance if intent creation fails — restore quote to SENT so buyer can retry
    await prisma.$transaction([
      prisma.order.delete({ where: { id: order.id } }),
      prisma.commissionQuote.update({ where: { id: quote.id }, data: { status: 'SENT', acceptedAt: null } }),
    ]).catch(() => {})
    return NextResponse.json({ error: `Payment setup failed: ${(e as Error).message}` }, { status: 502 })
  }
}
