import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import { AdminCreatorTable } from './AdminCreatorTable'
import { SearchBar } from '@/components/ui/SearchBar'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Pagination } from '@/components/ui/Pagination'
import Link from 'next/link'

const PER_PAGE = 20

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
]
const VERIFIED_OPTIONS = [
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'UNVERIFIED', label: 'Unverified' },
]

const HEALTH_TABS = [
  { key: '',        label: 'All' },
  { key: 'ACTIVE',  label: 'Active' },
  { key: 'IDLE',    label: 'Idle' },
  { key: 'HIATUS',  label: 'Hiatus' },
  { key: 'FLAGGED', label: 'Flagged' },
] as const

export default async function AdminCreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string; verified?: string; health?: string }>
}) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const params = await searchParams
  const q       = params.q?.trim() ?? ''
  const page    = Math.max(1, parseInt(params.page ?? '1') || 1)
  const status  = params.status ?? ''
  const verified = params.verified ?? ''
  const health  = params.health ?? ''

  // Tab counts (across all creators regardless of other filters)
  const [activeCount, idleCount, hiatusCount, flaggedCount] = await Promise.all([
    prisma.creatorProfile.count({ where: { storeStatus: 'ACTIVE' } }),
    prisma.creatorProfile.count({ where: { storeStatus: 'IDLE' } }),
    prisma.creatorProfile.count({ where: { storeStatus: 'HIATUS' } }),
    prisma.creatorProfile.count({ where: { storeStatus: 'FLAGGED' } }),
  ])
  const totalAll = activeCount + idleCount + hiatusCount + flaggedCount

  // Build where clause
  const where: any = {}
  if (q) {
    where.OR = [
      { displayName: { contains: q } },
      { username: { contains: q } },
      { user: { email: { contains: q } } },
    ]
  }
  if (status === 'ACTIVE')    where.isSuspended = false
  if (status === 'SUSPENDED') where.isSuspended = true
  if (verified === 'VERIFIED')   where.isVerified = true
  if (verified === 'UNVERIFIED') where.isVerified = false
  if (health) where.storeStatus = health

  const [total, creators] = await Promise.all([
    prisma.creatorProfile.count({ where }),
    prisma.creatorProfile.findMany({
      where,
      include: {
        user: { select: { email: true, createdAt: true, legalFullName: true } },
        _count: { select: { products: { where: { isActive: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])

  const userIds = creators.map((c) => c.userId)
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

  const orderCountMap = Object.fromEntries(orderStats.map((s) => [s.creatorId, s._count.id]))
  const revenueMap    = Object.fromEntries(revenueStats.map((s) => [s.creatorId, s._sum.creatorAmount ?? 0]))

  const creatorsWithStats = creators.map((c) => ({
    ...c,
    orderCount: orderCountMap[c.userId] ?? 0,
    revenue:    revenueMap[c.userId]    ?? 0,
  }))

  function tabHref(key: string) {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (key) p.set('health', key)
    return `/admin/creators?${p.toString()}`
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Creators</h2>

      {/* Health status tabs */}
      <div className="flex gap-1 flex-wrap border-b border-border pb-0">
        {HEALTH_TABS.map(({ key, label }) => {
          const count = key === '' ? totalAll : key === 'ACTIVE' ? activeCount : key === 'IDLE' ? idleCount : key === 'HIATUS' ? hiatusCount : flaggedCount
          const active = health === key
          return (
            <Link
              key={key}
              href={tabHref(key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border border-transparent ${
                active
                  ? 'bg-surface border-border border-b-surface text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${
                key === 'FLAGGED' ? 'bg-destructive/20 text-destructive'
                : key === 'HIATUS' ? 'bg-amber-500/20 text-amber-400'
                : key === 'IDLE' ? 'bg-border text-muted-foreground'
                : 'bg-border text-muted-foreground'
              }`}>
                {count}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Secondary filters */}
      <div className="flex flex-wrap gap-3">
        <Suspense fallback={null}>
          <SearchBar placeholder="Search by name, username or email..." className="min-w-52 flex-1" />
          <FilterSelect paramName="status" options={STATUS_OPTIONS} allLabel="All Statuses" className="w-40" />
          <FilterSelect paramName="verified" options={VERIFIED_OPTIONS} allLabel="Verified: All" className="w-36" />
        </Suspense>
      </div>

      <AdminCreatorTable
        creators={creatorsWithStats as any}
        total={total}
        page={page}
        perPage={PER_PAGE}
        healthTab={health}
      />
    </div>
  )
}
