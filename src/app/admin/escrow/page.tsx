import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AdminEscrowClient from './AdminEscrowClient'
import { Pagination } from '@/components/ui/Pagination'

const PER_PAGE = 25

export default async function AdminEscrowPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (user?.role !== 'ADMIN') redirect('/login')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const activeWhere = { escrowStatus: { in: ['HELD', 'TRACKING_ADDED', 'DISPUTED'] } }

  const [heldAgg, trackingAgg, disputedAgg, releasedToday, totalActive, orders, flagged] = await Promise.all([
    prisma.order.aggregate({ where: { escrowStatus: 'HELD' }, _sum: { amountUsd: true }, _count: true }),
    prisma.order.aggregate({ where: { escrowStatus: 'TRACKING_ADDED' }, _sum: { amountUsd: true }, _count: true }),
    prisma.order.aggregate({ where: { escrowStatus: 'DISPUTED' }, _sum: { amountUsd: true }, _count: true }),
    prisma.escrowTransaction.aggregate({
      where: { type: 'RELEASE', createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } },
      _sum: { amount: true },
    }),
    prisma.order.count({ where: activeWhere }),
    prisma.order.findMany({
      where: activeWhere,
      include: {
        product: { select: { title: true, type: true } },
        buyer: { select: { name: true } },
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.user.findMany({
      where: { warningCount: { gte: 1 } },
      select: { id: true, name: true, email: true, warningCount: true, isFlaggedForReview: true },
      orderBy: { warningCount: 'desc' },
    }),
  ])

  return (
    <>
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
      <div className="px-6 pb-6 max-w-6xl mx-auto -mt-4">
        <Pagination total={totalActive} page={page} perPage={PER_PAGE} />
      </div>
    </>
  )
}
