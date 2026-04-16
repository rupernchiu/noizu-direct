import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import { AdminCreatorTable } from './AdminCreatorTable'
import { SearchBar } from '@/components/ui/SearchBar'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Pagination } from '@/components/ui/Pagination'

const PER_PAGE = 20

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
]
const VERIFIED_OPTIONS = [
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'UNVERIFIED', label: 'Unverified' },
]

export default async function AdminCreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string; verified?: string }>
}) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const status = params.status ?? ''
  const verified = params.verified ?? ''

  const where: any = {}
  if (q) {
    where.OR = [
      { displayName: { contains: q } },
      { username: { contains: q } },
      { user: { email: { contains: q } } },
    ]
  }
  if (status === 'ACTIVE') where.isSuspended = false
  if (status === 'SUSPENDED') where.isSuspended = true
  if (verified === 'VERIFIED') where.isVerified = true
  if (verified === 'UNVERIFIED') where.isVerified = false

  const [total, creators] = await Promise.all([
    prisma.creatorProfile.count({ where }),
    prisma.creatorProfile.findMany({
      where,
      include: {
        user: { select: { email: true, createdAt: true } },
        _count: { select: { products: { where: { isActive: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])

  // Live order counts and revenue — accurate, never stale
  const userIds = creators.map(c => c.userId)
  const [orderStats, revenueStats] = await Promise.all([
    prisma.order.groupBy({
      by: ['creatorId'],
      where: { creatorId: { in: userIds }, status: { in: ['PAID', 'COMPLETED', 'SHIPPED', 'PROCESSING'] } },
      _count: { id: true },
    }),
    prisma.transaction.groupBy({
      by: ['creatorId'],
      where: { creatorId: { in: userIds }, status: 'COMPLETED' },
      _sum: { creatorAmount: true },
    }),
  ])

  const orderCountMap  = Object.fromEntries(orderStats.map(s => [s.creatorId, s._count.id]))
  const revenueMap     = Object.fromEntries(revenueStats.map(s => [s.creatorId, s._sum.creatorAmount ?? 0]))

  const creatorsWithStats = creators.map(c => ({
    ...c,
    orderCount: orderCountMap[c.userId] ?? 0,
    revenue:    revenueMap[c.userId]    ?? 0,
  }))

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Creators</h2>

      <div className="flex flex-wrap gap-3">
        <Suspense fallback={null}>
          <SearchBar placeholder="Search by name, username or email..." className="min-w-52 flex-1" />
          <FilterSelect paramName="status" options={STATUS_OPTIONS} allLabel="All Statuses" className="w-40" />
          <FilterSelect paramName="verified" options={VERIFIED_OPTIONS} allLabel="Verified: All" className="w-36" />
        </Suspense>
      </div>

      <AdminCreatorTable creators={creatorsWithStats as any} total={total} page={page} perPage={PER_PAGE} />
    </div>
  )
}
