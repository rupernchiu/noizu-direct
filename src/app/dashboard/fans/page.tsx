import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'

const PER_PAGE = 10

export default async function FansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id

  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)

  // Get aggregates for all buyers of this creator
  const spendAgg = await prisma.order.groupBy({
    by: ['buyerId'],
    where: { creatorId: userId, status: { in: ['PAID', 'COMPLETED'] } },
    _sum: { amountUsd: true },
    _count: { id: true },
  })

  const buyerIds = spendAgg.map((s) => s.buyerId)

  // Fetch buyer details with optional name/email search
  const buyerWhere: any = { id: { in: buyerIds } }
  if (q) {
    buyerWhere.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
    ]
  }

  const [buyerTotal, buyers] = await Promise.all([
    prisma.user.count({ where: buyerWhere }),
    prisma.user.findMany({
      where: buyerWhere,
      select: { id: true, name: true, email: true },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])

  const spendMap = new Map(
    spendAgg.map((s) => [s.buyerId, { total: s._sum.amountUsd ?? 0, orders: s._count.id }])
  )

  const fans = buyers
    .map((buyer) => ({
      buyer,
      total: spendMap.get(buyer.id)?.total ?? 0,
      orderCount: spendMap.get(buyer.id)?.orders ?? 0,
    }))
    .sort((a, b) => b.total - a.total)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Fans</h1>
        <p className="text-sm text-muted-foreground mt-1">{buyerTotal} fan{buyerTotal !== 1 ? 's' : ''}</p>
      </div>

      <Suspense fallback={null}>
        <SearchBar placeholder="Search by name or email..." className="max-w-sm" />
      </Suspense>

      {fans.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border px-5 py-12 text-center">
          <p className="text-muted-foreground text-sm">
            {q ? 'No fans match your search.' : 'No fans yet. Fans appear when buyers purchase from you.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {fans.map(({ buyer, total, orderCount }) => (
              <div key={buyer.id} className="bg-surface rounded-xl border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {buyer.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground text-sm truncate">{buyer.name ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground truncate">{buyer.email ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border text-xs">
                  <span className="text-muted-foreground">{orderCount} order{orderCount !== 1 ? 's' : ''}</span>
                  <span className="text-secondary font-semibold">${(total / 100).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block bg-surface rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="px-5 py-3 text-left font-medium">Fan</th>
                    <th className="px-5 py-3 text-left font-medium">Email</th>
                    <th className="px-5 py-3 text-left font-medium">Orders</th>
                    <th className="px-5 py-3 text-left font-medium">Total Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {fans.map(({ buyer, total, orderCount }) => (
                    <tr key={buyer.id} className="border-b border-border last:border-0 hover:bg-card/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {buyer.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <span className="font-medium text-foreground">{buyer.name ?? 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{buyer.email ?? '—'}</td>
                      <td className="px-5 py-3 text-foreground">{orderCount}</td>
                      <td className="px-5 py-3 text-secondary font-medium">${(total / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Suspense fallback={null}>
        <Pagination total={buyerTotal} page={page} perPage={PER_PAGE} />
      </Suspense>
    </div>
  )
}
