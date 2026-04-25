import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { getAirwallexBalances } from '@/lib/airwallex'

// Augmented finance summary. Surfaces sprint 0.1 rail-aware fields (paymentRail,
// subtotalUsd, buyerFeeUsd, creatorCommissionUsd, buyerCountry) alongside legacy
// processingFee/platformFee aggregates so the existing dashboard keeps working
// while new dashboards (tax/insights/treasury) read clean numbers.
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const since90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    grossAgg,
    processingFeeAgg,
    platformFeeAgg,
    creatorAmountAgg,
    // Sprint 0.1 aggregates — buyer fees actually collected + creator commission
    buyerFeeAgg,
    creatorCommissionAgg,
    subtotalAgg,
    escrowAgg,
    completedAgg,
    paidOutAgg,
    pendingPayoutsAgg,
    chargebacks,
    chargebacks30d,
    chargebacks90d,
    openFraudFlags,
    monthlyData,
    perCountryData,
    perRailData,
    flow24h,
    flow7d,
    flow30d,
    payouts24h,
    refunds30d,
    airwallexBalances,
  ] = await Promise.all([
    prisma.transaction.aggregate({ _sum: { grossAmountUsd: true } }),
    prisma.transaction.aggregate({ _sum: { processingFee: true } }),
    prisma.transaction.aggregate({ _sum: { platformFee: true } }),
    prisma.transaction.aggregate({ _sum: { creatorAmount: true } }),
    prisma.transaction.aggregate({ _sum: { buyerFeeUsd: true } }),
    prisma.transaction.aggregate({ _sum: { creatorCommissionUsd: true } }),
    prisma.transaction.aggregate({ _sum: { subtotalUsd: true } }),
    prisma.transaction.aggregate({
      where: { status: 'ESCROW' },
      _sum: { creatorAmount: true },
    }),
    prisma.transaction.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { creatorAmount: true },
    }),
    prisma.payout.aggregate({
      where: { status: 'PAID' },
      _sum: { amountUsd: true },
    }),
    prisma.payout.aggregate({
      where: { status: { in: ['PENDING', 'PROCESSING'] } },
      _sum: { amountUsd: true },
    }),
    prisma.chargebackDispute.groupBy({
      by: ['status'],
      _count: true,
      _sum: { amountUsd: true },
    }),
    prisma.chargebackDispute.aggregate({
      where: { createdAt: { gte: since30 } },
      _count: true,
      _sum: { amountUsd: true },
    }),
    prisma.chargebackDispute.aggregate({
      where: { createdAt: { gte: since90 } },
      _count: true,
      _sum: { amountUsd: true },
    }),
    prisma.fraudFlag.count({ where: { status: 'OPEN' } }),
    prisma.$queryRaw<{ month: string; gross: bigint; fees: bigint; net: bigint; buyer_fee: bigint | null; creator_commission: bigint | null }[]>`
      SELECT
        TO_CHAR("createdAt", 'YYYY-MM') AS month,
        SUM("grossAmountUsd")           AS gross,
        SUM("processingFee" + "platformFee") AS fees,
        SUM("creatorAmount")            AS net,
        SUM("buyerFeeUsd")              AS buyer_fee,
        SUM("creatorCommissionUsd")     AS creator_commission
      FROM "Transaction"
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `.catch(() => []),
    // Per-country GMV (sprint 0.1's buyerCountry feed) — drives the tax dashboard
    prisma.$queryRaw<{ country: string | null; gmv: bigint; orders: bigint }[]>`
      SELECT
        "buyerCountry"        AS country,
        SUM("grossAmountUsd") AS gmv,
        COUNT(*)              AS orders
      FROM "Transaction"
      WHERE "status" IN ('COMPLETED', 'ESCROW', 'PAID')
      GROUP BY "buyerCountry"
      ORDER BY gmv DESC NULLS LAST
    `.catch(() => []),
    // Per-rail breakdown — needed for margin-by-rail
    prisma.$queryRaw<{ rail: string | null; gross: bigint; buyer_fee: bigint | null; creator_commission: bigint | null; orders: bigint }[]>`
      SELECT
        "paymentRail"               AS rail,
        SUM("grossAmountUsd")       AS gross,
        SUM("buyerFeeUsd")          AS buyer_fee,
        SUM("creatorCommissionUsd") AS creator_commission,
        COUNT(*)                    AS orders
      FROM "Transaction"
      GROUP BY "paymentRail"
      ORDER BY gross DESC NULLS LAST
    `.catch(() => []),
    // Last-24h flow
    prisma.transaction.aggregate({
      where: { createdAt: { gte: since24h } },
      _sum: { grossAmountUsd: true },
      _count: true,
    }),
    // 7-day rolling avg basis
    prisma.transaction.aggregate({
      where: { createdAt: { gte: since7d } },
      _sum: { grossAmountUsd: true },
      _count: true,
    }),
    // 30-day denominator for chargeback ratio
    prisma.transaction.aggregate({
      where: { createdAt: { gte: since30 } },
      _sum: { grossAmountUsd: true },
      _count: true,
    }),
    prisma.payout.aggregate({
      where: { status: 'PAID', completedAt: { gte: since24h } },
      _sum: { amountUsd: true },
      _count: true,
    }),
    // 30-day refund signal — REFUNDED orders aggregated against the period.
    prisma.order.aggregate({
      where: { status: 'REFUNDED', updatedAt: { gte: since30 } },
      _sum: { amountUsd: true },
      _count: true,
    }),
    getAirwallexBalances().catch(() => []),
  ])

  const totalGross = grossAgg._sum.grossAmountUsd ?? 0
  const totalProcessingFee = processingFeeAgg._sum.processingFee ?? 0
  const totalPlatformFee = platformFeeAgg._sum.platformFee ?? 0
  // Rail-aware buyer fee + creator commission. May overlap with the legacy
  // fields above for orders captured under the new model — webhook stores both
  // so we don't double-count, we present the enriched view alongside legacy.
  const totalBuyerFee = buyerFeeAgg._sum.buyerFeeUsd ?? 0
  const totalCreatorCommission = creatorCommissionAgg._sum.creatorCommissionUsd ?? 0
  const totalSubtotal = subtotalAgg._sum.subtotalUsd ?? 0
  const totalPlatformRevenue = totalProcessingFee + totalPlatformFee
  const totalCreatorAmount = creatorAmountAgg._sum.creatorAmount ?? 0
  const escrowLiability = escrowAgg._sum.creatorAmount ?? 0
  const completedAvailable = completedAgg._sum.creatorAmount ?? 0
  const totalPaidOut = paidOutAgg._sum.amountUsd ?? 0
  const availableLiability = Math.max(0, completedAvailable - totalPaidOut)
  const pendingPayouts = pendingPayoutsAgg._sum.amountUsd ?? 0

  const chargebackSummary = {
    open: 0, won: 0, lost: 0, totalAmount: 0,
  }
  for (const row of chargebacks) {
    const count = row._count as number
    const amount = (row._sum as { amountUsd: number | null })?.amountUsd ?? 0
    if (row.status === 'OPEN' || row.status === 'UNDER_REVIEW') chargebackSummary.open += count
    if (row.status === 'WON') chargebackSummary.won += count
    if (row.status === 'LOST') { chargebackSummary.lost += count; chargebackSummary.totalAmount += amount }
  }

  // Visa Dispute Monitoring Program traffic-light
  // <0.65% chargeback ratio = healthy, 0.65–0.9 = monitor, ≥0.9 = early warning,
  // ≥1.5 = high risk (Excessive). Using 30d gross volume as denominator.
  const gross30dCents = flow30d._sum.grossAmountUsd ?? 0
  const chargebackCount30d = chargebacks30d._count
  const chargebackAmount30d = chargebacks30d._sum.amountUsd ?? 0
  const chargebackCount90d = chargebacks90d._count
  const chargebackAmount90d = chargebacks90d._sum.amountUsd ?? 0

  // Liability coverage ratio: how much real money do we hold vs how much we owe.
  // For now USD only — Treasury dashboard breaks out per-currency once balances
  // come back. NULL-safe: if Airwallex API is down, ratio = null.
  const usdAvailable = airwallexBalances
    .filter(b => b.currency === 'USD')
    .reduce((s, b) => s + Math.round(b.available_amount * 100), 0)
  const totalLiability = escrowLiability + availableLiability + pendingPayouts
  const liabilityCoverageRatio = totalLiability > 0 && airwallexBalances.length > 0
    ? +(usdAvailable / totalLiability).toFixed(3)
    : null

  return NextResponse.json({
    summary: {
      totalGrossUsd: totalGross,
      totalSubtotalUsd: totalSubtotal,
      totalBuyerFeeUsd: totalBuyerFee,
      totalCreatorCommissionUsd: totalCreatorCommission,
      totalPlatformRevenueUsd: totalPlatformRevenue,
      totalCreatorAmountUsd: totalCreatorAmount,
      escrowLiabilityUsd: escrowLiability,
      availableLiabilityUsd: availableLiability,
      totalPaidOutUsd: totalPaidOut,
      pendingPayoutsUsd: pendingPayouts,
      netPlatformPositionUsd: totalPlatformRevenue,
      liabilityCoverageRatio,
      usdAvailableUsd: usdAvailable,
      totalLiabilityUsd: totalLiability,
    },
    flow: {
      gross24hUsd: flow24h._sum.grossAmountUsd ?? 0,
      orders24h: flow24h._count,
      gross7dUsd: flow7d._sum.grossAmountUsd ?? 0,
      orders7d: flow7d._count,
      payouts24hUsd: payouts24h._sum.amountUsd ?? 0,
      payouts24hCount: payouts24h._count,
      refunds30dUsd: refunds30d._sum.amountUsd ?? 0,
      refunds30dCount: refunds30d._count,
    },
    chargebacks: chargebackSummary,
    chargebackRates: {
      count30d: chargebackCount30d,
      amount30dUsd: chargebackAmount30d,
      count90d: chargebackCount90d,
      amount90dUsd: chargebackAmount90d,
      gross30dDenominator: gross30dCents,
    },
    perCountry: perCountryData.map(r => ({
      country: r.country,
      gmvUsd: Number(r.gmv ?? 0),
      orders: Number(r.orders ?? 0),
    })),
    perRail: perRailData.map(r => ({
      rail: r.rail,
      grossUsd: Number(r.gross ?? 0),
      buyerFeeUsd: Number(r.buyer_fee ?? 0),
      creatorCommissionUsd: Number(r.creator_commission ?? 0),
      orders: Number(r.orders ?? 0),
    })),
    openFraudFlags,
    monthlyRevenue: monthlyData.map(r => ({
      month: r.month,
      gross: Number(r.gross),
      fees: Number(r.fees),
      net: Number(r.net),
      buyerFee: Number(r.buyer_fee ?? 0),
      creatorCommission: Number(r.creator_commission ?? 0),
    })),
    airwallexBalances,
  })
}
