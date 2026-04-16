import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AdminEscrowClient from './AdminEscrowClient'

export default async function AdminEscrowPage() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (user?.role !== 'ADMIN') redirect('/login')

  const [heldAgg, trackingAgg, disputedAgg, releasedToday, orders, flagged] = await Promise.all([
    prisma.order.aggregate({ where: { escrowStatus: 'HELD' }, _sum: { amountUsd: true }, _count: true }),
    prisma.order.aggregate({ where: { escrowStatus: 'TRACKING_ADDED' }, _sum: { amountUsd: true }, _count: true }),
    prisma.order.aggregate({ where: { escrowStatus: 'DISPUTED' }, _sum: { amountUsd: true }, _count: true }),
    prisma.escrowTransaction.aggregate({
      where: { type: 'RELEASE', createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } },
      _sum: { amount: true },
    }),
    prisma.order.findMany({
      where: { escrowStatus: { in: ['HELD', 'TRACKING_ADDED', 'DISPUTED'] } },
      include: {
        product: { select: { title: true, type: true } },
        buyer: { select: { name: true } },
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.user.findMany({
      where: { warningCount: { gte: 1 } },
      select: { id: true, name: true, email: true, warningCount: true, isFlaggedForReview: true },
      orderBy: { warningCount: 'desc' },
    }),
  ])

  return (
    <AdminEscrowClient
      summary={{
        heldAmount: heldAgg._sum.amountUsd ?? 0, heldCount: heldAgg._count,
        trackingAmount: trackingAgg._sum.amountUsd ?? 0, trackingCount: trackingAgg._count,
        disputedAmount: disputedAgg._sum.amountUsd ?? 0, disputedCount: disputedAgg._count,
        releasedToday: releasedToday._sum.amount ?? 0,
      }}
      orders={orders}
      flaggedCreators={flagged}
    />
  )
}
