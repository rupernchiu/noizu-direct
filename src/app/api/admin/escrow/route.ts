import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [held, tracking, disputed, releasedToday, orders, flaggedCreators] = await Promise.all([
    prisma.order.aggregate({ where: { escrowStatus: 'HELD' }, _sum: { amountUsd: true }, _count: true }),
    prisma.order.aggregate({ where: { escrowStatus: 'TRACKING_ADDED' }, _sum: { amountUsd: true }, _count: true }),
    prisma.order.aggregate({ where: { escrowStatus: 'DISPUTED' }, _sum: { amountUsd: true }, _count: true }),
    prisma.escrowTransaction.aggregate({
      where: { type: 'RELEASE', createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } },
      _sum: { amount: true },
    }),
    prisma.order.findMany({
      where: { escrowStatus: { in: ['HELD', 'TRACKING_ADDED', 'DISPUTED'] } },
      include: { product: { select: { title: true, type: true } }, buyer: { select: { name: true } }, creator: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.user.findMany({
      where: { warningCount: { gte: 1 } },
      select: { id: true, name: true, email: true, warningCount: true, isFlaggedForReview: true },
      orderBy: { warningCount: 'desc' },
    }),
  ])

  return NextResponse.json({
    summary: {
      heldAmount: held._sum.amountUsd ?? 0, heldCount: held._count,
      trackingAmount: tracking._sum.amountUsd ?? 0, trackingCount: tracking._count,
      disputedAmount: disputed._sum.amountUsd ?? 0, disputedCount: disputed._count,
      releasedToday: releasedToday._sum.amount ?? 0,
    },
    orders,
    flaggedCreators,
  })
}
