import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { getReserveSummary } from '@/lib/reserves'
import { getAirwallexBalances } from '@/lib/airwallex'

// Treasury & reserves dashboard data.
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [reserves, balances, recentEntries, escrowAgg, completedAgg, paidOutAgg, pendingPayoutsAgg] = await Promise.all([
    getReserveSummary().catch(() => []),
    getAirwallexBalances().catch(() => []),
    prisma.platformReserveEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: { reserve: { select: { kind: true, scope: true, label: true } } },
    }).catch(() => []),
    prisma.transaction.aggregate({ where: { status: 'ESCROW' }, _sum: { creatorAmount: true } }),
    prisma.transaction.aggregate({ where: { status: 'COMPLETED' }, _sum: { creatorAmount: true } }),
    prisma.payout.aggregate({ where: { status: 'PAID' }, _sum: { amountUsd: true } }),
    prisma.payout.aggregate({ where: { status: { in: ['PENDING', 'PROCESSING'] } }, _sum: { amountUsd: true } }),
  ])

  const escrowLiability = escrowAgg._sum.creatorAmount ?? 0
  const completedAvailable = completedAgg._sum.creatorAmount ?? 0
  const totalPaidOut = paidOutAgg._sum.amountUsd ?? 0
  const availableLiability = Math.max(0, completedAvailable - totalPaidOut)
  const pendingPayouts = pendingPayoutsAgg._sum.amountUsd ?? 0
  const reserveBalance = reserves.reduce((s, r) => s + r.balanceUsd, 0)
  const totalLiability = escrowLiability + availableLiability + pendingPayouts

  // Per-currency Airwallex coverage (rough — uses approximate FX in display)
  const balancesByCurrency = balances.map(b => ({
    currency: b.currency,
    available: Math.round(b.available_amount * 100),
    pending: Math.round(b.pending_amount * 100),
    total: Math.round(b.total_amount * 100),
  }))

  return NextResponse.json({
    reserves,
    reserveBalanceUsd: reserveBalance,
    liabilities: {
      escrowUsd: escrowLiability,
      availableUsd: availableLiability,
      pendingPayoutsUsd: pendingPayouts,
      totalUsd: totalLiability,
    },
    balancesByCurrency,
    recentEntries: recentEntries.map(e => ({
      id: e.id,
      direction: e.direction,
      amountUsd: e.amountUsd,
      reason: e.reason,
      reserveKind: e.reserve.kind,
      reserveScope: e.reserve.scope,
      reserveLabel: e.reserve.label,
      approvedBy: e.approvedBy,
      createdAt: e.createdAt.toISOString(),
    })),
  })
}
