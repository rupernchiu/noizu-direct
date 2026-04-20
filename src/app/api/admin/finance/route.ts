import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { getAirwallexBalances } from '@/lib/airwallex'

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [
    grossAgg,
    processingFeeAgg,
    platformFeeAgg,
    creatorAmountAgg,
    escrowAgg,
    completedAgg,
    paidOutAgg,
    pendingPayoutsAgg,
    chargebacks,
    openFraudFlags,
    monthlyData,
    airwallexBalances,
  ] = await Promise.all([
    // All-time gross
    prisma.transaction.aggregate({ _sum: { grossAmountUsd: true } }),
    // All-time processing fees
    prisma.transaction.aggregate({ _sum: { processingFee: true } }),
    // All-time platform fees
    prisma.transaction.aggregate({ _sum: { platformFee: true } }),
    // All-time creator amounts
    prisma.transaction.aggregate({ _sum: { creatorAmount: true } }),
    // Escrow liability (ESCROW transactions)
    prisma.transaction.aggregate({
      where: { status: 'ESCROW' },
      _sum: { creatorAmount: true },
    }),
    // Available liability (COMPLETED not yet paid)
    prisma.transaction.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { creatorAmount: true },
    }),
    // Total paid out (PAID payouts)
    prisma.payout.aggregate({
      where: { status: 'PAID' },
      _sum: { amountUsd: true },
    }),
    // Pending payouts queued
    prisma.payout.aggregate({
      where: { status: { in: ['PENDING', 'PROCESSING'] } },
      _sum: { amountUsd: true },
    }),
    // Chargeback count & amount
    prisma.chargebackDispute.groupBy({
      by: ['status'],
      _count: true,
      _sum: { amountUsd: true },
    }),
    // Open fraud flags
    prisma.fraudFlag.count({ where: { status: 'OPEN' } }),
    // Last 12 months of gross volume
    prisma.$queryRaw<{ month: string; gross: bigint; fees: bigint; net: bigint }[]>`
      SELECT
        TO_CHAR("createdAt", 'YYYY-MM') AS month,
        SUM("grossAmountUsd")           AS gross,
        SUM("processingFee" + "platformFee") AS fees,
        SUM("creatorAmount")            AS net
      FROM "Transaction"
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `.catch(() => []),
    // Live Airwallex account balances
    getAirwallexBalances().catch(() => []),
  ])

  const totalGross = grossAgg._sum.grossAmountUsd ?? 0
  const totalProcessingFee = processingFeeAgg._sum.processingFee ?? 0
  const totalPlatformFee = platformFeeAgg._sum.platformFee ?? 0
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
    const amount = (row._sum as any)?.amountUsd ?? 0
    if (row.status === 'OPEN' || row.status === 'UNDER_REVIEW') chargebackSummary.open += count
    if (row.status === 'WON') chargebackSummary.won += count
    if (row.status === 'LOST') { chargebackSummary.lost += count; chargebackSummary.totalAmount += amount }
  }

  return NextResponse.json({
    summary: {
      totalGrossUsd: totalGross,
      totalPlatformRevenueUsd: totalPlatformRevenue,
      totalCreatorAmountUsd: totalCreatorAmount,
      escrowLiabilityUsd: escrowLiability,
      availableLiabilityUsd: availableLiability,
      totalPaidOutUsd: totalPaidOut,
      pendingPayoutsUsd: pendingPayouts,
      netPlatformPositionUsd: totalPlatformRevenue,
    },
    chargebacks: chargebackSummary,
    openFraudFlags,
    monthlyRevenue: monthlyData.map(r => ({
      month: r.month,
      gross: Number(r.gross),
      fees: Number(r.fees),
      net: Number(r.net),
    })),
    airwallexBalances,
  })
}
