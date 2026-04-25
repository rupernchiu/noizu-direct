import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

// Phase 3.2 — Monthly / annual P&L export.
//
// One CSV with three sections:
//   1. Per-period summary (months in the year, or one row when ?month is set)
//   2. Reserve movements during the period (PlatformReserveEntry ledger)
//   3. Chargeback ledger (ChargebackDispute by status)
//
// Revenue lines come straight from Transaction (rail-aware buyer fee + creator
// commission). Refunds and cancellations are *netted out* of revenue using
// Order.status — refunded orders zero out their buyer fee + commission.
// Tax (creator/destination) is held pass-through and surfaced as a separate
// memo line, NOT booked as revenue.
//
// GET /api/admin/finance/exports/pnl?year=2026               → 12 monthly rows
// GET /api/admin/finance/exports/pnl?year=2026&month=4       → April 2026 only

interface PeriodTotals {
  label: string
  start: Date
  end: Date
  grossUsd: number
  buyerFeeUsd: number
  creatorCommissionUsd: number
  creatorTaxUsd: number
  destinationTaxUsd: number
  refundedGrossUsd: number
  refundedBuyerFeeUsd: number
  refundedCommissionUsd: number
  chargebackOpenUsd: number
  chargebackLostUsd: number
  chargebackWonUsd: number
  orderCount: number
  refundedOrderCount: number
}

async function rollupPeriod(start: Date, end: Date, label: string): Promise<PeriodTotals> {
  const [okTxs, refundedOrders, chargebacks] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        createdAt: { gte: start, lt: end },
        status: { in: ['COMPLETED', 'ESCROW', 'PAID'] },
        order: { status: { notIn: ['REFUNDED', 'CANCELLED'] } },
      },
      _sum: {
        grossAmountUsd: true,
        buyerFeeUsd: true,
        creatorCommissionUsd: true,
        creatorTaxUsd: true,
      },
      _count: { _all: true },
    }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        status: { in: ['REFUNDED', 'CANCELLED'] },
      },
      select: {
        amountUsd: true,
        buyerFeeUsd: true,
        creatorCommissionUsd: true,
        destinationTaxAmountUsd: true,
      },
    }),
    prisma.chargebackDispute.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: { amountUsd: true, status: true },
    }),
  ])

  const refundedGrossUsd = refundedOrders.reduce((s, o) => s + (o.amountUsd ?? 0), 0)
  const refundedBuyerFeeUsd = refundedOrders.reduce((s, o) => s + (o.buyerFeeUsd ?? 0), 0)
  const refundedCommissionUsd = refundedOrders.reduce((s, o) => s + (o.creatorCommissionUsd ?? 0), 0)

  // Destination tax is collected on every order including refunded ones at
  // checkout time, but tax export already excludes refunded — we mirror that
  // by summing destination tax from successful transactions only.
  const destinationTaxAggregate = await prisma.order.aggregate({
    where: {
      createdAt: { gte: start, lt: end },
      status: { notIn: ['REFUNDED', 'CANCELLED'] },
    },
    _sum: { destinationTaxAmountUsd: true },
  })

  const cbByStatus = (status: string) =>
    chargebacks.filter(c => c.status === status).reduce((s, c) => s + c.amountUsd, 0)

  return {
    label,
    start,
    end,
    grossUsd: okTxs._sum.grossAmountUsd ?? 0,
    buyerFeeUsd: okTxs._sum.buyerFeeUsd ?? 0,
    creatorCommissionUsd: okTxs._sum.creatorCommissionUsd ?? 0,
    creatorTaxUsd: okTxs._sum.creatorTaxUsd ?? 0,
    destinationTaxUsd: destinationTaxAggregate._sum.destinationTaxAmountUsd ?? 0,
    refundedGrossUsd,
    refundedBuyerFeeUsd,
    refundedCommissionUsd,
    chargebackOpenUsd: cbByStatus('OPEN') + cbByStatus('UNDER_REVIEW'),
    chargebackLostUsd: cbByStatus('LOST'),
    chargebackWonUsd: cbByStatus('WON'),
    orderCount: okTxs._count._all,
    refundedOrderCount: refundedOrders.length,
  }
}

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const yearParam = url.searchParams.get('year')
  const monthParam = url.searchParams.get('month')

  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()
  if (isNaN(year) || year < 2024 || year > 2099) {
    return NextResponse.json({ error: 'invalid year' }, { status: 400 })
  }

  let periods: PeriodTotals[]
  let rangeLabel: string

  if (monthParam !== null) {
    const month = parseInt(monthParam, 10)
    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'month must be 1-12' }, { status: 400 })
    }
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 1)
    const label = `${year}-${String(month).padStart(2, '0')}`
    periods = [await rollupPeriod(start, end, label)]
    rangeLabel = label
  } else {
    rangeLabel = String(year)
    const tasks = Array.from({ length: 12 }, (_, i) => {
      const start = new Date(year, i, 1)
      const end = new Date(year, i + 1, 1)
      const label = `${year}-${String(i + 1).padStart(2, '0')}`
      return rollupPeriod(start, end, label)
    })
    periods = await Promise.all(tasks)
  }

  // Reserve movements over the requested span
  const rangeStart = periods[0].start
  const rangeEnd = periods[periods.length - 1].end

  const [reserveEntries, reserves] = await Promise.all([
    prisma.platformReserveEntry.findMany({
      where: { createdAt: { gte: rangeStart, lt: rangeEnd } },
      orderBy: { createdAt: 'asc' },
      include: {
        reserve: { select: { kind: true, scope: true, label: true } },
      },
    }).catch(() => []),
    prisma.platformReserve.findMany({
      select: { kind: true, scope: true, label: true, balanceUsd: true, isActive: true },
    }).catch(() => []),
  ])

  // ── CSV assembly ──────────────────────────────────────────────────────────
  const summary = [
    `# Platform P&L Statement — ${rangeLabel}`,
    `# Generated ${new Date().toISOString()}`,
    `# All amounts in USD cents (multiply by 0.01 for dollars).`,
    `#`,
    `# Revenue: rail-aware buyer fee + 5% creator commission, sourced from`,
    `#   Transaction.status IN (COMPLETED, ESCROW, PAID).`,
    `# Refunds: Order.status IN (REFUNDED, CANCELLED) within the period — these`,
    `#   reverse the corresponding buyer fee + commission lines.`,
    `# Tax pass-through (creator/destination) is reported separately and is NOT`,
    `#   counted as platform revenue — it is held for remittance.`,
    `# Chargebacks listed by status (OPEN/UNDER_REVIEW lumped as "exposed").`,
    `# Reserve movements pulled from PlatformReserveEntry over the same window.`,
    '',
  ]

  const periodHeader = [
    'period',
    'order_count',
    'gross_volume_usd_cents',
    'buyer_fee_usd_cents',
    'creator_commission_usd_cents',
    'platform_revenue_usd_cents',
    'creator_tax_collected_usd_cents',
    'destination_tax_collected_usd_cents',
    'refunded_order_count',
    'refunded_gross_usd_cents',
    'refunded_buyer_fee_usd_cents',
    'refunded_commission_usd_cents',
    'net_buyer_fee_usd_cents',
    'net_commission_usd_cents',
    'net_platform_revenue_usd_cents',
    'chargeback_exposed_usd_cents',
    'chargeback_lost_usd_cents',
    'chargeback_won_usd_cents',
    'operating_revenue_usd_cents',
  ].join(',')

  const periodRows = periods.map(p => {
    const platformRevenue = p.buyerFeeUsd + p.creatorCommissionUsd
    const netBuyerFee = p.buyerFeeUsd - p.refundedBuyerFeeUsd
    const netCommission = p.creatorCommissionUsd - p.refundedCommissionUsd
    const netPlatformRevenue = netBuyerFee + netCommission
    const operatingRevenue = netPlatformRevenue - p.chargebackLostUsd
    return [
      p.label,
      p.orderCount,
      p.grossUsd,
      p.buyerFeeUsd,
      p.creatorCommissionUsd,
      platformRevenue,
      p.creatorTaxUsd,
      p.destinationTaxUsd,
      p.refundedOrderCount,
      p.refundedGrossUsd,
      p.refundedBuyerFeeUsd,
      p.refundedCommissionUsd,
      netBuyerFee,
      netCommission,
      netPlatformRevenue,
      p.chargebackOpenUsd,
      p.chargebackLostUsd,
      p.chargebackWonUsd,
      operatingRevenue,
    ].join(',')
  })

  const totalRow = (() => {
    const t = periods.reduce(
      (acc, p) => ({
        orderCount: acc.orderCount + p.orderCount,
        grossUsd: acc.grossUsd + p.grossUsd,
        buyerFeeUsd: acc.buyerFeeUsd + p.buyerFeeUsd,
        creatorCommissionUsd: acc.creatorCommissionUsd + p.creatorCommissionUsd,
        creatorTaxUsd: acc.creatorTaxUsd + p.creatorTaxUsd,
        destinationTaxUsd: acc.destinationTaxUsd + p.destinationTaxUsd,
        refundedOrderCount: acc.refundedOrderCount + p.refundedOrderCount,
        refundedGrossUsd: acc.refundedGrossUsd + p.refundedGrossUsd,
        refundedBuyerFeeUsd: acc.refundedBuyerFeeUsd + p.refundedBuyerFeeUsd,
        refundedCommissionUsd: acc.refundedCommissionUsd + p.refundedCommissionUsd,
        chargebackOpenUsd: acc.chargebackOpenUsd + p.chargebackOpenUsd,
        chargebackLostUsd: acc.chargebackLostUsd + p.chargebackLostUsd,
        chargebackWonUsd: acc.chargebackWonUsd + p.chargebackWonUsd,
      }),
      {
        orderCount: 0, grossUsd: 0, buyerFeeUsd: 0, creatorCommissionUsd: 0,
        creatorTaxUsd: 0, destinationTaxUsd: 0,
        refundedOrderCount: 0, refundedGrossUsd: 0, refundedBuyerFeeUsd: 0, refundedCommissionUsd: 0,
        chargebackOpenUsd: 0, chargebackLostUsd: 0, chargebackWonUsd: 0,
      },
    )
    const platformRevenue = t.buyerFeeUsd + t.creatorCommissionUsd
    const netBuyerFee = t.buyerFeeUsd - t.refundedBuyerFeeUsd
    const netCommission = t.creatorCommissionUsd - t.refundedCommissionUsd
    const netPlatformRevenue = netBuyerFee + netCommission
    const operatingRevenue = netPlatformRevenue - t.chargebackLostUsd
    return [
      `TOTAL`,
      t.orderCount,
      t.grossUsd,
      t.buyerFeeUsd,
      t.creatorCommissionUsd,
      platformRevenue,
      t.creatorTaxUsd,
      t.destinationTaxUsd,
      t.refundedOrderCount,
      t.refundedGrossUsd,
      t.refundedBuyerFeeUsd,
      t.refundedCommissionUsd,
      netBuyerFee,
      netCommission,
      netPlatformRevenue,
      t.chargebackOpenUsd,
      t.chargebackLostUsd,
      t.chargebackWonUsd,
      operatingRevenue,
    ].join(',')
  })()

  // Reserves section — accruals + releases per (kind|scope) over window
  const reserveBuckets = new Map<string, {
    kind: string
    scope: string
    label: string
    accrualsUsd: number
    releasesUsd: number
    adjustmentsUsd: number
  }>()
  for (const entry of reserveEntries) {
    const key = `${entry.reserve.kind}|${entry.reserve.scope ?? ''}`
    const bucket = reserveBuckets.get(key) ?? {
      kind: entry.reserve.kind,
      scope: entry.reserve.scope ?? '',
      label: entry.reserve.label,
      accrualsUsd: 0,
      releasesUsd: 0,
      adjustmentsUsd: 0,
    }
    if (entry.direction === 'ACCRUAL') bucket.accrualsUsd += entry.amountUsd
    else if (entry.direction === 'RELEASE') bucket.releasesUsd += entry.amountUsd
    else bucket.adjustmentsUsd += entry.amountUsd
    reserveBuckets.set(key, bucket)
  }
  // Add zero-row for reserves with no movements but a non-zero balance
  for (const r of reserves) {
    const key = `${r.kind}|${r.scope ?? ''}`
    if (!reserveBuckets.has(key) && (r.balanceUsd ?? 0) > 0) {
      reserveBuckets.set(key, {
        kind: r.kind,
        scope: r.scope ?? '',
        label: r.label,
        accrualsUsd: 0,
        releasesUsd: 0,
        adjustmentsUsd: 0,
      })
    }
  }

  const reserveBalanceByKey = new Map<string, number>()
  for (const r of reserves) reserveBalanceByKey.set(`${r.kind}|${r.scope ?? ''}`, r.balanceUsd)

  const reserveHeader = 'reserve_kind,reserve_scope,reserve_label,accruals_usd_cents,releases_usd_cents,adjustments_usd_cents,current_balance_usd_cents'
  const reserveRows = Array.from(reserveBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, b]) => [
      b.kind,
      b.scope,
      `"${b.label.replace(/"/g, '""')}"`,
      b.accrualsUsd,
      b.releasesUsd,
      b.adjustmentsUsd,
      reserveBalanceByKey.get(key) ?? 0,
    ].join(','))

  const csv = [
    ...summary,
    '# ── Period P&L ────────────────────────────────────────────────────────',
    periodHeader,
    ...periodRows,
    totalRow,
    '',
    '# ── Reserve movements (during window) ─────────────────────────────────',
    '# Accruals deposit to the reserve; releases withdraw to platform GA.',
    reserveHeader,
    ...reserveRows,
    '',
    '# ── Notes ─────────────────────────────────────────────────────────────',
    '# operating_revenue = net_platform_revenue - chargeback_lost.',
    '# chargeback_exposed = OPEN + UNDER_REVIEW disputes (potential loss).',
    '# Reserve movements above are NOT subtracted from revenue — they are',
    '#   liability segregation. Track them separately for cash-flow planning.',
  ].join('\n')

  const filename = `pnl-${rangeLabel}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
