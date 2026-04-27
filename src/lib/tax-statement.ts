/**
 * Shared aggregation helper for the creator-facing tax & earnings statement.
 *
 * Used by:
 *   - GET /api/dashboard/finance/tax            (JSON for the page)
 *   - GET /api/dashboard/finance/tax/export     (PDF rendering)
 *   - GET /api/dashboard/finance/tax/pph-certificate
 *     (subset path — re-implemented inline because it needs a per-month
 *      breakdown and ID-only gating; kept separate for clarity)
 *
 * All amounts in USD cents. Conditional sections (per spec §3.4) are returned
 * as `null` when their totals are zero so the client can simply branch on
 * presence to decide whether to render.
 */
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { COUNTRIES, countryFor } from '@/lib/countries'
import type { CreatorProfile } from '@/generated/prisma/client'

// ─── Query parameter parsing ─────────────────────────────────────────────────

const querySchema = z
  .object({
    from: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional()),
    to: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional()),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(3000).optional(),
  })
  .strict()

export type TaxStatementQuery = z.infer<typeof querySchema>

export interface ResolvedPeriod {
  from: Date
  to: Date
  month: number | null
  year: number | null
  /** True if the period is exactly one full calendar month. */
  isMonth: boolean
  /** True if the period is exactly one full calendar year. */
  isYear: boolean
}

export function parseTaxStatementParams(searchParams: URLSearchParams) {
  const raw: Record<string, string> = {}
  for (const [k, v] of searchParams.entries()) {
    if (k === 'from' || k === 'to' || k === 'month' || k === 'year') raw[k] = v
  }
  return querySchema.safeParse(raw)
}

/**
 * Resolve a query into a concrete [from, to) period. Exclusive upper bound.
 *
 * Precedence:
 *   1. month + year     → that calendar month
 *   2. year (no month)  → that calendar year
 *   3. from + to        → custom range (to defaults to "now" if missing)
 *   4. neither          → current calendar year, Jan 1 → now
 */
export function resolvePeriod(q: TaxStatementQuery): ResolvedPeriod {
  // 1. Explicit month + year.
  if (q.month && q.year) {
    const from = new Date(Date.UTC(q.year, q.month - 1, 1))
    const to = new Date(Date.UTC(q.year, q.month, 1))
    return { from, to, month: q.month, year: q.year, isMonth: true, isYear: false }
  }

  // 2. Year only.
  if (q.year) {
    const from = new Date(Date.UTC(q.year, 0, 1))
    const to = new Date(Date.UTC(q.year + 1, 0, 1))
    return { from, to, month: null, year: q.year, isMonth: false, isYear: true }
  }

  // 3. Custom range — month alone is ignored without a year (no enclosing
  //    calendar position).
  if (q.from || q.to) {
    const from = q.from ? new Date(q.from) : new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1))
    const to = q.to ? new Date(q.to) : new Date()
    return { from, to, month: null, year: null, isMonth: false, isYear: false }
  }

  // 4. Default: current calendar year (Jan 1 → now).
  const nowYear = new Date().getUTCFullYear()
  return {
    from: new Date(Date.UTC(nowYear, 0, 1)),
    to: new Date(),
    month: null,
    year: nowYear,
    isMonth: false,
    isYear: true,
  }
}

// ─── Output shape ────────────────────────────────────────────────────────────

export interface TaxStatementResult {
  period: {
    from: string
    to: string
    month: number | null
    year: number | null
    label: string
  }
  creator: {
    name: string
    legalFullName: string | null
    country: string | null
    countryName: string | null
    classification: string | null
    hasOriginTax: boolean
    originTaxLabel: string | null
    /** True only when creator country is ID and at least one withheld order
     *  exists in the requested year. Drives the "Download PPh certificate"
     *  button on the client. */
    canDownloadPphCertificate: boolean
  }
  earnings: {
    grossUsd: number
    commissionUsd: number
    commissionTaxUsd: number
    withheldPphUsd: number
    netUsd: number
    orderCount: number
  }
  withheldAtPayout: {
    totalUsd: number
    label: string
    country: string
    countryName: string
  } | null
  collectedFromBuyers: {
    totalUsd: number
    label: string
    orderCount: number
  } | null
  collectedByPlatform: {
    destinationTax: { country: string; countryName: string; label: string; totalUsd: number }[]
    serviceFeeTax: number
    /** Convenience flag — true iff at least one of the above is non-zero. */
    hasAny: boolean
  }
  salesByCountry: { country: string; countryName: string; orderCount: number; grossUsd: number; netUsd: number }[]
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

/**
 * Build the structured statement for a creator. Uses Order rows directly
 * (not Transaction) because the snapshot fields needed for the four tax
 * layers are only stamped on Order — Transaction carries a subset.
 *
 * Status filter mirrors the existing admin creator-earnings export: only
 * paid orders count. We use `escrowStatus IN (HELD, RELEASED, TRACKING_ADDED,
 * PARTIALLY_REFUNDED)` to capture every order whose money has reached the
 * platform, matching the buyer-side "paid" definition. Refunded /
 * disputed-resolved-against-creator orders are excluded (their PPh has been
 * reversed too — see Phase 1/2 of the tax build).
 */
export async function computeTaxStatement(
  userId: string,
  profile: CreatorProfile,
  q: TaxStatementQuery,
): Promise<TaxStatementResult> {
  const period = resolvePeriod(q)

  const country = (profile.payoutCountry ?? profile.taxJurisdiction ?? null)?.toUpperCase() ?? null
  const countryRecord = country ? countryFor(country) : null
  const originRule = countryRecord?.creatorOriginTax ?? null

  // Pull the creator's orders for the period. We need product+creator country
  // snapshots per row. We index off `product.creator.userId` so the same query
  // picks up commission-route orders (via Order.creatorId) and product-listing
  // orders alike — both routes set Order.creatorId = the creator's userId.
  const orders = await prisma.order.findMany({
    where: {
      creatorId: userId,
      createdAt: { gte: period.from, lt: period.to },
      escrowStatus: { in: ['HELD', 'TRACKING_ADDED', 'RELEASED', 'PARTIALLY_REFUNDED'] },
    },
    select: {
      id: true,
      createdAt: true,
      amountUsd: true,
      subtotalUsd: true,
      shippingCostUsd: true,
      buyerCountry: true,
      buyerFeeUsd: true,
      creatorCommissionUsd: true,
      creatorTaxAmountUsd: true,
      creatorTaxRatePercent: true,
      creatorCountry: true,
      destinationTaxAmountUsd: true,
      destinationTaxCountry: true,
      destinationTaxRatePercent: true,
      creatorSalesTaxAmountUsd: true,
      creatorSalesTaxLabel: true,
      platformFeeBuyerTaxUsd: true,
      platformFeeCreatorTaxUsd: true,
    },
  })

  // ── Earnings summary ──
  let grossUsd = 0
  let commissionUsd = 0
  let commissionTaxUsd = 0
  let withheldPphUsd = 0
  let creatorSalesTaxTotal = 0
  let serviceFeeTaxTotal = 0
  // destinationTax breakdown by country — also keep label per country (mostly
  // a single label per country at launch but the structure tolerates more).
  const destByCountry = new Map<string, { totalUsd: number; label: string }>()
  // sales-by-country aggregator
  const salesByCountryMap = new Map<string, { orderCount: number; grossUsd: number; netUsd: number }>()
  // For PPh certificate gating: count any creator-tax-withheld order whose
  // creatorCountry is ID. We tolerate missing creatorCountry snapshots on
  // legacy rows by also treating profile.payoutCountry === ID as the tie-breaker.
  let pphOrderCount = 0

  for (const o of orders) {
    // Gross = subtotal + shipping (creator's share of revenue, pre-fee).
    // Fall back to amountUsd - buyerFeeUsd for legacy non-snapshotted rows.
    const subtotal = o.subtotalUsd ?? Math.max(0, o.amountUsd - (o.buyerFeeUsd ?? 0))
    const shipping = o.shippingCostUsd ?? 0
    const orderGross = subtotal + shipping
    grossUsd += orderGross

    commissionUsd += o.creatorCommissionUsd ?? 0
    commissionTaxUsd += o.platformFeeCreatorTaxUsd ?? 0
    withheldPphUsd += o.creatorTaxAmountUsd ?? 0
    creatorSalesTaxTotal += o.creatorSalesTaxAmountUsd ?? 0
    serviceFeeTaxTotal += o.platformFeeBuyerTaxUsd ?? 0

    if ((o.creatorTaxAmountUsd ?? 0) > 0) {
      const oc = (o.creatorCountry ?? country ?? '').toUpperCase()
      if (oc === 'ID') pphOrderCount++
    }

    // Destination tax — bucket by destinationTaxCountry (falls back to buyerCountry).
    if ((o.destinationTaxAmountUsd ?? 0) > 0) {
      const c = (o.destinationTaxCountry ?? o.buyerCountry ?? 'XX').toUpperCase()
      const rec = countryFor(c)
      const label = rec?.destinationTax?.label ?? 'Tax'
      const cur = destByCountry.get(c) ?? { totalUsd: 0, label }
      cur.totalUsd += o.destinationTaxAmountUsd ?? 0
      destByCountry.set(c, cur)
    }

    // Sales by buyer country — net = gross − commission − commissionTax − pph.
    const bc = (o.buyerCountry ?? 'XX').toUpperCase()
    const orderCommission = o.creatorCommissionUsd ?? 0
    const orderCommissionTax = o.platformFeeCreatorTaxUsd ?? 0
    const orderPph = o.creatorTaxAmountUsd ?? 0
    const orderNet = orderGross - orderCommission - orderCommissionTax - orderPph
    const cur = salesByCountryMap.get(bc) ?? { orderCount: 0, grossUsd: 0, netUsd: 0 }
    cur.orderCount += 1
    cur.grossUsd += orderGross
    cur.netUsd += orderNet
    salesByCountryMap.set(bc, cur)
  }

  const netUsd = grossUsd - commissionUsd - commissionTaxUsd - withheldPphUsd

  // ── WITHHELD AT PAYOUT — render iff total > 0 AND creator has an origin rule ──
  const withheldAtPayout =
    withheldPphUsd > 0 && originRule && country
      ? {
          totalUsd: withheldPphUsd,
          label: originRule.label,
          country,
          countryName: countryRecord?.name ?? country,
        }
      : null

  // ── COLLECTED FROM BUYERS ON YOUR BEHALF — only if creator's own sales tax > 0 ──
  const collectedFromBuyers =
    creatorSalesTaxTotal > 0
      ? {
          totalUsd: creatorSalesTaxTotal,
          label: profile.salesTaxLabel ?? 'Sales Tax',
          orderCount: orders.filter((o) => (o.creatorSalesTaxAmountUsd ?? 0) > 0).length,
        }
      : null

  // ── COLLECTED BY noizu.direct ──
  const destinationTaxArr = Array.from(destByCountry.entries())
    .map(([c, v]) => ({
      country: c,
      countryName: countryFor(c)?.name ?? c,
      label: v.label,
      totalUsd: v.totalUsd,
    }))
    .sort((a, b) => b.totalUsd - a.totalUsd)
  const collectedByPlatform = {
    destinationTax: destinationTaxArr,
    serviceFeeTax: serviceFeeTaxTotal,
    hasAny: destinationTaxArr.length > 0 || serviceFeeTaxTotal > 0,
  }

  // ── Sales by buyer country ──
  const salesByCountry = Array.from(salesByCountryMap.entries())
    .map(([c, v]) => ({
      country: c,
      countryName: countryFor(c)?.name ?? c,
      orderCount: v.orderCount,
      grossUsd: v.grossUsd,
      netUsd: v.netUsd,
    }))
    .sort((a, b) => b.grossUsd - a.grossUsd)

  // ── Period label ──
  const periodLabel = formatPeriodLabel(period)

  // ── Creator block ──
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, legalFullName: true },
  })

  // PPh certificate availability: ID + at least one withheld order in the
  // covering YEAR (not just the current period). We only enable the button
  // if the period's year resolves to a single year — otherwise the cert
  // request would be ambiguous.
  const certYear = period.year
  let canDownloadPphCertificate = false
  if (country === 'ID' && certYear) {
    if (period.isYear && pphOrderCount > 0) {
      // Already counted within the period — short-circuit.
      canDownloadPphCertificate = true
    } else {
      // Otherwise, peek at the full year for any PPh-withheld order.
      const yStart = new Date(Date.UTC(certYear, 0, 1))
      const yEnd = new Date(Date.UTC(certYear + 1, 0, 1))
      const anyWithheld = await prisma.order.count({
        where: {
          creatorId: userId,
          createdAt: { gte: yStart, lt: yEnd },
          escrowStatus: { in: ['HELD', 'TRACKING_ADDED', 'RELEASED', 'PARTIALLY_REFUNDED'] },
          creatorTaxAmountUsd: { gt: 0 },
        },
      })
      canDownloadPphCertificate = anyWithheld > 0
    }
  }

  return {
    period: {
      from: period.from.toISOString(),
      to: period.to.toISOString(),
      month: period.month,
      year: period.year,
      label: periodLabel,
    },
    creator: {
      name: user?.name ?? '',
      legalFullName: user?.legalFullName ?? null,
      country,
      countryName: countryRecord?.name ?? null,
      classification: profile.creatorClassification ?? null,
      hasOriginTax: !!originRule,
      originTaxLabel: originRule?.label ?? null,
      canDownloadPphCertificate,
    },
    earnings: {
      grossUsd,
      commissionUsd,
      commissionTaxUsd,
      withheldPphUsd,
      netUsd,
      orderCount: orders.length,
    },
    withheldAtPayout,
    collectedFromBuyers,
    collectedByPlatform,
    salesByCountry,
  }
}

// ─── PPh certificate aggregation (ID only) ───────────────────────────────────

export interface PphCertificateData {
  creator: {
    name: string
    legalFullName: string | null
    taxId: string | null
    country: string
    countryName: string
  }
  year: number
  totalWithheldUsd: number
  totalGrossUsd: number
  totalOrders: number
  monthlyBreakdown: { month: number; monthLabel: string; orderCount: number; grossUsd: number; withheldUsd: number }[]
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export async function computePphCertificate(
  userId: string,
  profile: CreatorProfile,
  year: number,
): Promise<PphCertificateData | null> {
  const country = (profile.payoutCountry ?? profile.taxJurisdiction ?? '').toUpperCase()
  if (country !== 'ID') return null

  const yStart = new Date(Date.UTC(year, 0, 1))
  const yEnd = new Date(Date.UTC(year + 1, 0, 1))

  const orders = await prisma.order.findMany({
    where: {
      creatorId: userId,
      createdAt: { gte: yStart, lt: yEnd },
      escrowStatus: { in: ['HELD', 'TRACKING_ADDED', 'RELEASED', 'PARTIALLY_REFUNDED'] },
      creatorTaxAmountUsd: { gt: 0 },
    },
    select: {
      createdAt: true,
      subtotalUsd: true,
      shippingCostUsd: true,
      amountUsd: true,
      buyerFeeUsd: true,
      creatorTaxAmountUsd: true,
    },
  })

  if (orders.length === 0) return null

  // Group by month (1-12).
  const byMonth = new Map<number, { orderCount: number; grossUsd: number; withheldUsd: number }>()
  for (let m = 1; m <= 12; m++) byMonth.set(m, { orderCount: 0, grossUsd: 0, withheldUsd: 0 })

  let totalWithheldUsd = 0
  let totalGrossUsd = 0
  for (const o of orders) {
    const m = o.createdAt.getUTCMonth() + 1
    const subtotal = o.subtotalUsd ?? Math.max(0, o.amountUsd - (o.buyerFeeUsd ?? 0))
    const gross = subtotal + (o.shippingCostUsd ?? 0)
    const cur = byMonth.get(m)!
    cur.orderCount += 1
    cur.grossUsd += gross
    cur.withheldUsd += o.creatorTaxAmountUsd ?? 0
    totalGrossUsd += gross
    totalWithheldUsd += o.creatorTaxAmountUsd ?? 0
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, legalFullName: true },
  })

  return {
    creator: {
      name: user?.name ?? '',
      legalFullName: user?.legalFullName ?? null,
      taxId: profile.taxId ?? null,
      country,
      countryName: COUNTRIES[country]?.name ?? country,
    },
    year,
    totalWithheldUsd,
    totalGrossUsd,
    totalOrders: orders.length,
    monthlyBreakdown: Array.from(byMonth.entries())
      .filter(([, v]) => v.orderCount > 0)
      .map(([m, v]) => ({
        month: m,
        monthLabel: MONTH_NAMES[m - 1],
        orderCount: v.orderCount,
        grossUsd: v.grossUsd,
        withheldUsd: v.withheldUsd,
      })),
  }
}

// ─── Period label formatting ─────────────────────────────────────────────────

function formatPeriodLabel(p: ResolvedPeriod): string {
  if (p.isMonth && p.month && p.year) {
    return `${MONTH_NAMES[p.month - 1]} ${p.year}`
  }
  if (p.isYear && p.year) {
    return `${p.year}`
  }
  const f = p.from.toISOString().slice(0, 10)
  const t = new Date(p.to.getTime() - 1).toISOString().slice(0, 10)
  return `${f} → ${t}`
}
