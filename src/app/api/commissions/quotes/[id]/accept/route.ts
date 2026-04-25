import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPaymentIntent, decideThreeDsAction } from '@/lib/airwallex'
import { getProcessingFeeRate, feeOnSubtotal } from '@/lib/platform-fees'
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

  // Fee is added on top of the quote amount (buyer pays it) — matches the cart flow
  const feeRate = await getProcessingFeeRate()
  const processingFee = feeOnSubtotal(quote.amountUsd, feeRate)
  const orderAmountUsd = quote.amountUsd + processingFee
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
