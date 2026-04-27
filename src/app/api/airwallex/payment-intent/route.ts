import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPaymentIntent, decideThreeDsAction } from '@/lib/airwallex'
import { getProcessingFeeRate, feeOnSubtotal } from '@/lib/platform-fees'
import {
  calculateFees,
  getFeeRatesFromSettings,
  type PaymentRail,
  LOCAL_RAILS,
  CARD_RAILS,
} from '@/lib/fees'
import {
  destinationTaxFromMap,
  loadEnabledTaxCountries,
} from '@/lib/destination-tax'
import { computeOriginTax, type OriginTaxListingType } from '@/lib/origin-tax'
import {
  computeCreatorSalesTax,
  computePlatformFeeTax,
  loadPlatformFeeTaxRules,
} from '@/lib/platform-fee-tax'
import { convertUsdCentsTo } from '@/lib/fx'
import {
  combineCartShipping,
  isPhysicalType,
  normalizeCountryToCode,
} from '@/lib/shipping'

const ALL_RAILS: readonly PaymentRail[] = [...LOCAL_RAILS, ...CARD_RAILS] as const

function parseRail(input: unknown): PaymentRail | null {
  if (typeof input !== 'string') return null
  const upper = input.toUpperCase() as PaymentRail
  return (ALL_RAILS as readonly string[]).includes(upper) ? upper : null
}

const SUPPORTED_CURRENCIES = ['USD', 'MYR', 'SGD', 'PHP', 'THB', 'IDR']

/**
 * Convert a USD-cents amount to the target currency's minor units using live rates.
 *
 * Delegates to `src/lib/fx.ts` — we used to fetch our own `/api/airwallex/fx-rate`
 * route over HTTP which (a) bypassed middleware, (b) added an unnecessary hop,
 * and (c) inflated Vercel function invocations (F8 / M5).
 */
async function convertToDisplayCurrency(amountUsdCents: number, currency: string): Promise<number> {
  const { displayAmount } = await convertUsdCentsTo(amountUsdCents, currency)
  return displayAmount
}

interface ShippingAddress {
  fullName: string
  line1: string
  line2?: string
  city: string
  state: string
  postal: string
  country: string
  phone?: string
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id as string
  const buyer = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      // Phase 2.3 — B2B reverse-charge eligibility. Tax ID + tax country must
      // be set on the buyer's account; cross-border vs. the seller's
      // jurisdiction zeroes the destination tax line.
      businessTaxId: true,
      businessTaxCountry: true,
    },
  })

  const body = await req.json() as {
    orderId: string
    currency?: string
    shippingAddress?: ShippingAddress
    discounts?: { discountCodeId: string }[]
    paymentRail?: string
  }
  const { orderId: cartSessionId, shippingAddress, discounts = [] } = body
  const currency = SUPPORTED_CURRENCIES.includes((body.currency ?? '').toUpperCase())
    ? body.currency!.toUpperCase()
    : 'USD'

  // Buyer-selected rail (optional). When provided we apply the 5/5.5/8 fee
  // model snapshotted onto the Order; when null we keep the legacy flat 2.5%
  // path so older clients / non-checkout callers don't break.
  const selectedRail = parseRail(body.paymentRail)
  // shippingAddress.country can be a full country name ("Malaysia") from the
  // checkout form. Normalize to ISO-2 so per-country lookups (tax, shipping)
  // work consistently.
  const buyerCountry = normalizeCountryToCode(shippingAddress?.country) ?? shippingAddress?.country?.toUpperCase() ?? null

  if (!cartSessionId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 })

  // Try single-order lookup first
  const existingOrder = await prisma.order.findFirst({
    where: { id: cartSessionId, buyerId: userId, status: 'PENDING' },
  })

  if (existingOrder) {
    const displayAmount = await convertToDisplayCurrency(existingOrder.amountUsd, currency)
    const productType = await prisma.product
      .findUnique({ where: { id: existingOrder.productId }, select: { type: true } })
      .then(p => p?.type ?? 'PHYSICAL')
    const usdRate = currency === 'USD' ? 1 : displayAmount / existingOrder.amountUsd
    const intent = await createPaymentIntent({
      amount: displayAmount,
      currency,
      orderId: existingOrder.id,
      buyerEmail: buyer?.email,
      metadata: {
        usd_amount: existingOrder.amountUsd,
        fx_rate_used: usdRate,
        fx_locked_at: new Date().toISOString(),
        fx_source: 'airwallex_first_frankfurter_fallback',
        ...(selectedRail ? { payment_rail: selectedRail } : {}),
        ...(buyerCountry ? { buyer_country: buyerCountry } : {}),
      },
      threeDsAction: decideThreeDsAction({
        productType,
        amountUsdCents: existingOrder.amountUsd,
      }),
    })
    await prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        airwallexIntentId: intent.id as string,
        displayCurrency: currency,
        displayAmount,
        ...(selectedRail ? { paymentRail: selectedRail } : {}),
        ...(buyerCountry ? { buyerCountry } : {}),
      },
    })
    return NextResponse.json({ intentId: intent.id, clientSecret: intent.client_secret, currency, displayAmount })
  }

  // Cart flow: cartSessionId is client-generated. Create PENDING orders from cart.
  const cartItems = await prisma.cartItem.findMany({
    where: { buyerId: userId },
    include: {
      product: {
        include: {
          creator: {
            include: { user: true },
          },
        },
      },
    },
  })

  // Creator-level cart prefs only (free-ship threshold + combined toggle).
  // Per-product rates live on Product and come in via the cart-item join.
  const creatorIdsForShipping = Array.from(new Set(cartItems.map(i => i.product.creatorId)))
  const shippingProfiles = await prisma.creatorProfile.findMany({
    where: { id: { in: creatorIdsForShipping } },
    select: {
      id: true,
      shippingFreeThresholdUsd: true,
      combinedShippingEnabled: true,
    },
  })
  const shippingProfileById = new Map(shippingProfiles.map(p => [p.id, p]))

  if (cartItems.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })

  // Validate availability
  for (const item of cartItems) {
    const p = item.product
    const stockOk = (p as any).isPreOrder || p.stock === null || p.stock === undefined || p.stock >= item.quantity
    if (!p.isActive || p.creator.isSuspended || !stockOk) {
      return NextResponse.json({ error: `"${p.title}" is no longer available` }, { status: 400 })
    }
  }

  // Require shipping address for physical/POD items
  const hasPhysical = cartItems.some(i => i.product.type === 'PHYSICAL' || i.product.type === 'POD')
  if (hasPhysical && !shippingAddress) {
    return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 })
  }

  // Validate and apply each discount code independently, one per creator.
  // Re-validate server-side — never trust client amounts.
  // Atomic increment prevents race-condition double-use.
  // creatorId → { amount, codeId }
  //
  // M4 (F7): the old version compared `dc.usedCount` (stale snapshot) inside the
  // WHERE of `updateMany`. Under concurrent checkouts this can allow
  // `usedCount > maxUses` because the check-then-increment is racy. We now use a
  // Prisma field reference (`prisma.discountCode.fields.usedCount`) so the
  // inequality is evaluated against the *current* row inside the same SQL
  // statement — atomic compare-and-swap semantics.
  const verifiedDiscountsByCreator = new Map<string, { amount: number; codeId: string }>()

  for (const { discountCodeId } of discounts) {
    const dc = await prisma.discountCode.findUnique({ where: { id: discountCodeId } })
    if (
      !dc || !dc.isActive ||
      (dc.expiresAt && dc.expiresAt <= new Date()) ||
      (dc.maxUses !== null && dc.usedCount >= dc.maxUses)
    ) continue

    const updated = await prisma.discountCode.updateMany({
      where: {
        id: discountCodeId,
        isActive: true,
        OR: [
          { maxUses: null },
          // Field reference: maxUses > usedCount evaluated per-row, atomically.
          { maxUses: { gt: prisma.discountCode.fields.usedCount } },
        ],
      },
      data: { usedCount: { increment: 1 } },
    })
    if (updated.count === 0) continue  // race condition — code just ran out

    const creatorItems = cartItems.filter(i => i.product.creatorId === dc.creatorId)
    const subtotalForDiscount = creatorItems.reduce((s, i) => s + i.product.price * i.quantity, 0)
    const discountAmount = dc.type === 'PERCENTAGE'
      ? Math.round(subtotalForDiscount * (dc.value / 100))
      : Math.min(dc.value, subtotalForDiscount)

    verifiedDiscountsByCreator.set(dc.creatorId, { amount: discountAmount, codeId: discountCodeId })
  }

  const totalVerifiedDiscount = Array.from(verifiedDiscountsByCreator.values()).reduce((s, d) => s + d.amount, 0)

  // Totals
  const subtotal = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const discountedSubtotal = Math.max(0, subtotal - totalVerifiedDiscount)

  // Phase 2.1 — load tax-registration status per creator. We mark up the
  // buyer price by the creator's declared tax rate and withhold the same
  // amount from the creator's payout (Layer 1 markup-and-withhold).
  const creatorIds = Array.from(new Set(cartItems.map((i) => i.product.creator.userId)))
  const creatorTaxProfiles = await prisma.creatorProfile.findMany({
    where: { userId: { in: creatorIds } },
    select: {
      userId: true,
      taxRegistered: true,
      taxRatePercent: true,
      taxJurisdiction: true,
      payoutCountry: true,
      // Phase 8 — creator's own sales tax (Layer 1.5, agency-collect).
      // All five gates must pass for `creatorSalesTaxAmountUsd` to populate;
      // see `src/lib/platform-fee-tax.ts::computeCreatorSalesTax`.
      creatorClassification: true,
      taxId: true,
      collectsSalesTax: true,
      salesTaxStatus: true,
      salesTaxRate: true,
      salesTaxLabel: true,
    },
  })
  const creatorTaxByUserId = new Map<string, { rate: number; jurisdiction: string | null }>()
  // Phase 8 — keep the full sales-tax profile addressable per creator-userId
  // so the per-group loop can compute their agency-collect markup.
  const creatorSalesTaxProfileByUserId = new Map<
    string,
    {
      creatorClassification: string | null
      taxId: string | null
      collectsSalesTax: boolean
      salesTaxStatus: string
      salesTaxRate: number | null
      salesTaxLabel: string | null
    }
  >()
  // Phase 4 — creator's resolved origin country for PPh attribution. Prefer
  // payoutCountry (where the money lands), fall back to taxJurisdiction. Locked
  // onto Order.creatorCountry at order creation; PPh attaches to the snapshot
  // even if the creator later changes country in their profile.
  const creatorCountryByUserId = new Map<string, string | null>()
  for (const p of creatorTaxProfiles) {
    creatorTaxByUserId.set(p.userId, {
      rate: p.taxRegistered ? (p.taxRatePercent ?? 0) : 0,
      jurisdiction: p.taxRegistered ? (p.taxJurisdiction ?? null) : null,
    })
    const resolved = (p.payoutCountry ?? p.taxJurisdiction ?? null)
    creatorCountryByUserId.set(p.userId, resolved ? resolved.toUpperCase() : null)
    creatorSalesTaxProfileByUserId.set(p.userId, {
      creatorClassification: p.creatorClassification,
      taxId: p.taxId,
      collectsSalesTax: p.collectsSalesTax,
      salesTaxStatus: p.salesTaxStatus,
      salesTaxRate: p.salesTaxRate,
      salesTaxLabel: p.salesTaxLabel,
    })
  }

  // Phase 8 — load platform-fee-tax rules once per request. Map is keyed by
  // ISO-2; default {} means no country has crossed registration threshold yet
  // so every per-group call returns 0 and the receipt suppresses the line.
  const platformFeeTaxRules = await loadPlatformFeeTaxRules()

  // Phase 2.2 — destination tax. We mark up the buyer's checkout total by the
  // jurisdiction's consumption-tax rate when (a) the buyer's country has a
  // known rate, (b) PlatformSettings has flipped that country to enabled
  // (meaning we've crossed registration threshold there). Phase 2.3 — B2B
  // reverse charge: when a verified business tax ID is on the buyer's account
  // and the buyer is cross-border vs. the platform jurisdiction, we zero out
  // the destination-tax line and stamp reverseChargeApplied on the order.
  const enabledTaxCountries = await loadEnabledTaxCountries()

  // Rail-aware fee path (5/5.5/8) when buyer has chosen a rail; otherwise the
  // legacy flat 2.5% so older callers + non-checkout flows keep working.
  let processingFee: number
  let grandTotal: number
  let creatorTaxAggregate = 0
  let destinationTaxAggregate = 0
  let feeBreakdown: ReturnType<typeof calculateFees> | null = null
  if (selectedRail) {
    const rates = await getFeeRatesFromSettings()
    // Aggregate breakdown — per-creator tax must be apportioned per-group below
    // so we use a tax-free aggregate here for the buyer-fee math, then add
    // each group's creator-tax line on top.
    feeBreakdown = calculateFees(discountedSubtotal, selectedRail, rates, 0)
    processingFee = feeBreakdown.buyerFeeUsdCents
    // Compute aggregate creator-tax across all groups, post-discount.
    //
    // Phase 4: Layer 1 origin tax (PPh) is *withheld from creator only* — never
    // marked up onto the buyer. So when a creator's country has an active
    // origin-tax rule (ID at launch), we skip the buyer-side markup for that
    // group. The Phase 2.1 markup-and-withhold path only applies to creators
    // who self-declared `taxRegistered=true` AND whose country has no PPh.
    for (const item of cartItems) {
      const creatorUserId = item.product.creator.userId
      const tax = creatorTaxByUserId.get(creatorUserId)
      if (!tax || tax.rate <= 0) continue
      const creatorCountry = creatorCountryByUserId.get(creatorUserId) ?? null
      const originRule = computeOriginTax(creatorCountry, 1, 'PHYSICAL')
      if (originRule.amountUsd > 0) continue  // PPh path — no buyer markup
      const itemSubtotal = item.product.price * item.quantity
      const discount = verifiedDiscountsByCreator.get(creatorUserId)?.amount ?? 0
      const creatorAllItems = cartItems.filter(
        (ci) => ci.product.creator.userId === creatorUserId,
      )
      const creatorSubtotal = creatorAllItems.reduce(
        (s, ci) => s + ci.product.price * ci.quantity,
        0,
      )
      const itemShare = creatorSubtotal > 0 ? itemSubtotal / creatorSubtotal : 0
      const itemDiscountedSubtotal = Math.max(0, itemSubtotal - Math.round(discount * itemShare))
      creatorTaxAggregate += Math.round(itemDiscountedSubtotal * (tax.rate / 100))
    }
    grandTotal = feeBreakdown.grossUsdCents + creatorTaxAggregate
  } else {
    const feeRate = await getProcessingFeeRate()
    processingFee = feeOnSubtotal(discountedSubtotal, feeRate)
    grandTotal = discountedSubtotal + processingFee
  }

  // Apply destination tax on top of the (post-creator-tax) gross. We base it
  // on the discounted subtotal so it's invariant w.r.t. rail choice. Returns 0
  // when the buyer's country isn't registered yet.
  let destinationTaxLine = destinationTaxFromMap(
    buyerCountry,
    discountedSubtotal,
    enabledTaxCountries,
  )

  // Phase 2.3 — B2B reverse charge. When the buyer has a verified business
  // tax ID AND is cross-border vs. the destination jurisdiction (i.e. not
  // buying inside their own country), the destination-tax line is reversed
  // to the buyer (they self-account). We zero our line and stamp the
  // reverseChargeApplied flag so the tax export can prove the exemption.
  const buyerHasBusinessTaxId =
    typeof buyer?.businessTaxId === 'string' && buyer.businessTaxId.trim().length > 0
  const buyerTaxCountry = buyer?.businessTaxCountry?.toUpperCase() ?? null
  const reverseChargeApplied = Boolean(
    destinationTaxLine &&
      buyerHasBusinessTaxId &&
      buyerTaxCountry &&
      destinationTaxLine.countryCode !== buyerTaxCountry,
  )
  if (reverseChargeApplied) {
    destinationTaxLine = null
  }

  if (destinationTaxLine) {
    destinationTaxAggregate = destinationTaxLine.amountUsdCents
    grandTotal += destinationTaxAggregate
  }

  // Shipping aggregate added to grandTotal *after* fees/taxes — shipping itself
  // is a pass-through and isn't subject to either. Computed during the per-group
  // loop below; we add it here once that loop completes.

  // Clean up *stale* PENDING orders for this buyer before creating new ones.
  // M4 (F7): previously this blanket-deleted every PENDING order, which races
  // against a tab the same buyer left open — their in-flight payment intent
  // suddenly has no orders attached. Scope to orders older than 30 min so we
  // only reap abandoned carts, not intents the buyer is actively paying.
  const staleCutoff = new Date(Date.now() - 30 * 60 * 1000)
  await prisma.order.deleteMany({
    where: { buyerId: userId, status: 'PENDING', createdAt: { lt: staleCutoff } },
  })

  // Group by creator and create PENDING orders
  const creatorMap = new Map<string, typeof cartItems>()
  for (const item of cartItems) {
    const cid = item.product.creatorId
    if (!creatorMap.has(cid)) creatorMap.set(cid, [])
    creatorMap.get(cid)!.push(item)
  }

  const createdOrderIds: string[] = []

  let shippingAggregateUsd = 0
  // Phase 8 — aggregate the new buyer-side tax lines across all creator groups
  // so they can be added to the cart-level grandTotal for FX conversion.
  let creatorSalesTaxAggregateUsd = 0
  let platformFeeBuyerTaxAggregateUsd = 0
  for (const [, items] of creatorMap) {
    const groupSubtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0)
    const groupFee = Math.round((groupSubtotal / subtotal) * processingFee)
    const isPhysicalGroup = items.some(i => i.product.type === 'PHYSICAL' || i.product.type === 'POD')

    // ── Shipping snapshot (Shipping V2, per-product) ─────────────────────────
    // Plumbing-only: rate is set per product, the platform takes no fee on it,
    // and the full amount is added to the creator payout at webhook time. The
    // free-shipping threshold and combined-cart toggle stay creator-level.
    let groupShippingUsd = 0
    let groupShippingFreeApplied = false
    if (isPhysicalGroup) {
      const creatorProfileId = items[0].product.creatorId
      const sp = shippingProfileById.get(creatorProfileId)
      const shipResult = combineCartShipping({
        creatorShippingFreeThresholdUsd: sp?.shippingFreeThresholdUsd ?? null,
        combinedShippingEnabled: sp?.combinedShippingEnabled ?? true,
        destinationCountry: buyerCountry,
        items: items.map(i => ({
          productId: i.productId,
          productShippingByCountry: (i.product as any).shippingByCountry,
          itemSubtotalUsdCents: i.product.price * i.quantity,
          isPhysical: isPhysicalType(i.product.type),
        })),
      })
      if (shipResult.blocked) {
        const blockedTitles = shipResult.blockedItemIds
          .map(id => items.find(it => it.productId === id)?.product.title ?? id)
          .join(', ')
        return NextResponse.json(
          { error: `This creator hasn't set a shipping rate for your country (${buyerCountry ?? 'unknown'}) for: ${blockedTitles}` },
          { status: 400 },
        )
      }
      groupShippingUsd = shipResult.shippingUsdCents
      groupShippingFreeApplied = shipResult.freeApplied
      shippingAggregateUsd += groupShippingUsd
    }

    // Each group only gets the discount belonging to its creator
    const groupDiscount = verifiedDiscountsByCreator.get(items[0].product.creatorId)
    const groupDiscountShare = groupDiscount?.amount ?? 0
    const groupDiscountCodeId = groupDiscount?.codeId ?? null
    const isCommissionGroup = items.some(i => i.product.type === 'COMMISSION')
    const commissionItem = isCommissionGroup ? items.find(i => i.product.type === 'COMMISSION') : null

    // Phase 2.1 — creator-tax markup. The creator's declared tax rate is
    // applied to their post-discount subtotal; the same amount is withheld
    // from their payout (handled in webhook-side Transaction creation).
    //
    // Phase 4 — Layer 1 origin tax (PPh) takes precedence when the creator's
    // country has an active origin-tax rule. PPh is *withheld only* — not
    // marked up onto the buyer. For ID creators (the only PPh country at
    // launch), `creatorTaxAmountUsd` / `creatorTaxRatePercent` snapshot the
    // PPh withholding instead of the Phase 2.1 sales-tax markup.
    const groupCreatorUserId = items[0].product.creator.userId
    const creatorTaxInfo = creatorTaxByUserId.get(groupCreatorUserId)
    const groupCreatorCountry = creatorCountryByUserId.get(groupCreatorUserId) ?? null
    const groupDiscountedSubtotal = Math.max(0, groupSubtotal - groupDiscountShare)
    // Pick a representative listing type for the group. PPh's ALL_PAYOUTS rule
    // (ID) is type-independent, so the choice only matters for the future
    // ROYALTY_OR_SERVICES scaffold. Prefer non-physical when the group is mixed.
    const groupListingType: OriginTaxListingType = (
      items.find(i => i.product.type === 'COMMISSION') ? 'COMMISSION'
        : items.find(i => i.product.type === 'DIGITAL') ? 'DIGITAL'
        : items.find(i => i.product.type === 'POD') ? 'POD'
        : 'PHYSICAL'
    )
    const originTax = computeOriginTax(
      groupCreatorCountry,
      groupDiscountedSubtotal,
      groupListingType,
    )
    let groupCreatorTaxRate: number
    let groupCreatorTaxUsd: number
    if (originTax.amountUsd > 0) {
      // Phase 4 — Layer 1 PPh withholding (e.g. ID 0.5%). Stored as percent for
      // parity with Phase 2.1's existing ratePercent column.
      groupCreatorTaxRate = originTax.rate * 100
      groupCreatorTaxUsd = originTax.amountUsd
    } else {
      // Phase 2.1 — creator's self-declared sales-tax markup-and-withhold.
      groupCreatorTaxRate = creatorTaxInfo?.rate ?? 0
      groupCreatorTaxUsd = groupCreatorTaxRate > 0
        ? Math.round(groupDiscountedSubtotal * (groupCreatorTaxRate / 100))
        : 0
    }

    // Phase 2.2 — apportion destination-tax across creator groups by their
    // share of the discounted cart subtotal.
    const groupDestinationTaxUsd = destinationTaxLine && discountedSubtotal > 0
      ? Math.round(
          (groupDiscountedSubtotal / discountedSubtotal) * destinationTaxAggregate,
        )
      : 0

    // PPh is *withheld from creator only* — it must not inflate the buyer's
    // gross. Phase 2.1 sales-tax markup, by contrast, IS added to the buyer's
    // gross (the buyer is paying for the tax the creator will remit).
    const groupCreatorTaxBuyerSide = originTax.amountUsd > 0 ? 0 : groupCreatorTaxUsd

    // Rail-aware fee snapshot. Apportion the cart-level breakdown to each
    // creator group by its USD subtotal share so per-group splits sum to the
    // overall PaymentIntent down to the cent.
    let groupSubtotalUsd: number | null = null
    let groupBuyerFeeUsd: number | null = null
    let groupCreatorCommissionUsd: number | null = null
    if (feeBreakdown && discountedSubtotal > 0) {
      groupSubtotalUsd = groupDiscountedSubtotal
      groupBuyerFeeUsd = Math.round(
        (groupDiscountedSubtotal / discountedSubtotal) * feeBreakdown.buyerFeeUsdCents,
      )
      groupCreatorCommissionUsd = Math.round(
        groupDiscountedSubtotal * (feeBreakdown.creatorCommissionPercent / 100),
      )
    }

    // ── Phase 8: creator's own sales tax (Layer 1.5, agency-collect) ────────
    // Activates only when the creator's profile clears all five gates
    // (REGISTERED_BUSINESS + taxId + collectsSalesTax + APPROVED + non-null
    // rate). Tax base = subtotal + shipping (per spec §11.4). Buyer pays it.
    const groupSalesTaxProfile = creatorSalesTaxProfileByUserId.get(groupCreatorUserId)
    const creatorSalesTax = groupSalesTaxProfile
      ? computeCreatorSalesTax(
          groupSalesTaxProfile,
          groupDiscountedSubtotal,
          groupShippingUsd,
        )
      : { rate: 0, amountUsd: 0, label: null as string | null }

    // ── Phase 8: platform fee tax (Layer 3, threshold-gated) ────────────────
    // Buyer-side: tax on the buyer service fee, applied in buyer's country.
    // Creator-side: tax on the commission deducted at payout, applied in
    // creator's country. Both are 0 unless admin has flipped the country on
    // in PlatformSettings.platformFeeTax with the matching `sides` entry.
    //
    // Per spec §11 the tax applies ONLY to platform fees — never to listing
    // price, shipping, or any pass-through. We compute against the snapshotted
    // `groupBuyerFeeUsd` / `groupCreatorCommissionUsd` (rail-aware path) when
    // available, falling back to the legacy flat fee otherwise.
    const buyerFeeForTaxBase = groupBuyerFeeUsd ?? groupFee
    const creatorCommissionForTaxBase = groupCreatorCommissionUsd ?? 0
    const platformFeeBuyerTax = computePlatformFeeTax(
      platformFeeTaxRules,
      'BUYER',
      buyerCountry,
      buyerFeeForTaxBase,
    )
    const platformFeeCreatorTax = computePlatformFeeTax(
      platformFeeTaxRules,
      'CREATOR',
      groupCreatorCountry,
      creatorCommissionForTaxBase,
    )

    // Buyer's bill includes:
    //   subtotal + service fee + (optional creator-tax markup, Phase 2.1)
    //   + (Phase 8) creator's own sales tax — buyer pays it
    //   + (Phase 8) platform-fee BUYER-side tax — buyer pays it
    //   + destination tax (Layer 2)
    //   + shipping (pass-through)
    //
    // Platform-fee CREATOR-side tax is deducted from creator's payout, NOT
    // added to the buyer's bill. Snapshotted onto Order for payout-time
    // settlement only.
    const orderAmount =
      groupSubtotal +
      groupFee +
      groupCreatorTaxBuyerSide +
      creatorSalesTax.amountUsd +
      platformFeeBuyerTax.amountUsd +
      groupDestinationTaxUsd +
      groupShippingUsd
    const orderAmountUsd = orderAmount - groupDiscountShare

    creatorSalesTaxAggregateUsd += creatorSalesTax.amountUsd
    platformFeeBuyerTaxAggregateUsd += platformFeeBuyerTax.amountUsd

    const order = await prisma.order.create({
      data: {
        buyerId: userId,
        creatorId: items[0].product.creator.userId,
        productId: items[0].productId,
        cartSessionId,
        amountUsd: orderAmountUsd,
        displayCurrency: currency,   // updated after intent creation below
        displayAmount: orderAmountUsd, // updated after intent creation below
        status: 'PENDING',
        escrowStatus: 'HELD',
        escrowHeldAt: new Date(),
        fulfillmentDeadline: isPhysicalGroup
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          : null,
        shippingAddress: isPhysicalGroup && shippingAddress
          ? JSON.stringify(shippingAddress)
          : null,
        // Download token is generated in webhook after payment confirmed — not here
        discountCodeId: groupDiscountCodeId,
        discountAmount: groupDiscountShare,
        // Rail-aware fee snapshot (sprint 0.1 — null when legacy flat-rate path)
        paymentRail: selectedRail,
        subtotalUsd: groupSubtotalUsd,
        buyerFeeUsd: groupBuyerFeeUsd,
        creatorCommissionUsd: groupCreatorCommissionUsd,
        // Phase 2.1 / Phase 4 — Layer 1 creator origin tax.
        // For ID creators: PPh Final 0.5% withholding (Phase 4).
        // For taxRegistered creators outside PPh countries: sales-tax markup-and-withhold (Phase 2.1).
        creatorTaxAmountUsd: groupCreatorTaxUsd,
        creatorTaxRatePercent: groupCreatorTaxRate > 0 ? groupCreatorTaxRate : null,
        // Phase 4 — creator country snapshot (locked at order time, drives PPh
        // attribution even if creator later changes country in their profile).
        creatorCountry: groupCreatorCountry,
        // Phase 8 — creator's own sales tax (Layer 1.5, agency-collect).
        // Zero unless creator's profile cleared all five gates; snapshotted
        // here so the receipt and payout settlement see a stable value.
        creatorSalesTaxAmountUsd: creatorSalesTax.amountUsd,
        creatorSalesTaxRatePercent: creatorSalesTax.amountUsd > 0 ? creatorSalesTax.rate : null,
        creatorSalesTaxLabel: creatorSalesTax.amountUsd > 0 ? creatorSalesTax.label : null,
        // Phase 8 — platform fee tax (Layer 3, threshold-gated per country).
        // Buyer side adds to buyer's bill; creator side deducts from payout.
        platformFeeBuyerTaxUsd: platformFeeBuyerTax.amountUsd,
        platformFeeBuyerTaxRate: platformFeeBuyerTax.amountUsd > 0 ? platformFeeBuyerTax.rate : null,
        platformFeeCreatorTaxUsd: platformFeeCreatorTax.amountUsd,
        platformFeeCreatorTaxRate: platformFeeCreatorTax.amountUsd > 0 ? platformFeeCreatorTax.rate : null,
        // Phase 2.2 — destination tax (Layer 2 platform-collected)
        destinationTaxAmountUsd: groupDestinationTaxUsd,
        destinationTaxRatePercent: destinationTaxLine?.ratePercent ?? null,
        destinationTaxCountry: destinationTaxLine?.countryCode ?? null,
        // Phase 2.3 — B2B reverse charge stamp
        reverseChargeApplied,
        buyerBusinessTaxId: reverseChargeApplied ? buyer?.businessTaxId ?? null : null,
        buyerCountry,
        // Shipping snapshot (sprint shipping-1) — passes through to creator at payout
        shippingCostUsd: groupShippingUsd,
        shippingDestinationCountry: isPhysicalGroup ? buyerCountry : null,
        shippingFreeApplied: groupShippingFreeApplied,
        // Commission fields
        commissionStatus: isCommissionGroup ? 'PENDING_ACCEPTANCE' : null,
        commissionAcceptDeadlineAt: isCommissionGroup
          ? new Date(Date.now() + 48 * 60 * 60 * 1000)
          : null,
        commissionDepositPercent: commissionItem?.product.commissionDepositPercent ?? null,
        commissionDepositAmount: commissionItem?.product.commissionDepositPercent
          ? Math.round((orderAmount - groupDiscountShare) * (commissionItem.product.commissionDepositPercent / 100))
          : null,
        commissionRevisionsAllowed: commissionItem?.product.commissionRevisionsIncluded ?? null,
        commissionDepositConsentAt: isCommissionGroup ? new Date() : null,
      },
    })
    createdOrderIds.push(order.id)
  }

  // Add aggregate shipping (computed in the per-group loop above) to grandTotal
  // before FX conversion. Shipping has no fee or tax component — pure pass-through.
  grandTotal += shippingAggregateUsd

  // Phase 8 — add the new buyer-side tax aggregates to grandTotal. Each is
  // 0 unless activation conditions are met (creator's profile gates for
  // sales tax; PlatformSettings flip for the buyer's country for platform-
  // fee tax). The creator-side platform-fee tax is intentionally NOT added —
  // it's a creator payout deduction only.
  grandTotal += creatorSalesTaxAggregateUsd
  grandTotal += platformFeeBuyerTaxAggregateUsd

  // Convert grand total to the buyer's selected display currency
  const grandTotalDisplay = await convertToDisplayCurrency(grandTotal, currency)

  // Lock the FX rate + USD canonical at intent-creation time for audit. The
  // metadata hangs on the Airwallex intent so disputes/refunds 90 days later
  // can be reconstructed without re-querying historical rates. (Sprint 0.2)
  const usdRate = currency === 'USD' ? 1 : grandTotalDisplay / grandTotal
  const intentMetadata: Record<string, string | number | boolean> = {
    usd_amount: grandTotal,
    fx_rate_used: usdRate,
    fx_locked_at: new Date().toISOString(),
    fx_source: 'airwallex_first_frankfurter_fallback',
  }
  if (selectedRail) intentMetadata.payment_rail = selectedRail
  if (buyerCountry) intentMetadata.buyer_country = buyerCountry

  // 3DS posture: digital/commission goods always FORCE_3DS; physical ≥ USD 25
  // FORCE_3DS; below that EXTERNAL_3DS so issuer/risk-engine decides.
  // Pick the strongest posture across the cart — if any item demands force, force.
  const cartHasDigital = cartItems.some(i =>
    i.product.type === 'DIGITAL' || i.product.type === 'COMMISSION',
  )
  const threeDsAction = decideThreeDsAction({
    productType: cartHasDigital ? 'DIGITAL' : 'PHYSICAL',
    amountUsdCents: grandTotal,
  })

  // Create payment intent in the buyer's currency — enables local payment methods (FPX, PayNow, etc.)
  const intent = await createPaymentIntent({
    amount: grandTotalDisplay,
    currency,
    orderId: cartSessionId,
    buyerEmail: buyer?.email,
    metadata: intentMetadata,
    threeDsAction,
  })

  // Store intentId and resolved display currency/amount on all created orders
  await prisma.order.updateMany({
    where: { id: { in: createdOrderIds } },
    data: {
      airwallexIntentId: intent.id as string,
      displayCurrency: currency,
      displayAmount: Math.round(grandTotalDisplay / createdOrderIds.length), // proportional split
    },
  })

  return NextResponse.json({
    intentId: intent.id,
    clientSecret: intent.client_secret,
    currency,
    displayAmount: grandTotalDisplay,
  })
}
