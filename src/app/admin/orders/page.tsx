import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import { SearchBar } from '@/components/ui/SearchBar'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Pagination } from '@/components/ui/Pagination'

const PER_PAGE = 20

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  PAID: 'bg-blue-500/20 text-blue-400',
  PROCESSING: 'bg-orange-500/20 text-orange-400',
  SHIPPED: 'bg-purple-500/20 text-purple-400',
  COMPLETED: 'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
  REFUNDED: 'bg-border text-muted-foreground',
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
]

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>
}) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const status = params.status ?? ''

  const where: any = {}
  if (q) {
    where.OR = [
      { id: { contains: q } },
      { buyer: { name: { contains: q } } },
      { buyer: { email: { contains: q } } },
      { creator: { name: { contains: q } } },
    ]
  }
  if (status) where.status = status

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        buyer: { select: { name: true, email: true } },
        product: { select: { title: true, type: true } },
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Orders</h2>

      <div className="flex flex-wrap gap-3">
        <Suspense fallback={null}>
          <SearchBar placeholder="Search by order ID, buyer or creator..." className="min-w-52 flex-1" />
          <FilterSelect paramName="status" options={STATUS_OPTIONS} allLabel="All Statuses" className="w-40" />
        </Suspense>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">ID</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Buyer</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Product</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Creator</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Amount</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-3 py-1.5 text-muted-foreground font-mono text-xs">{order.id.slice(0, 8)}…</td>
                  <td className="px-3 py-1.5">
                    <div className="text-foreground">{order.buyer?.name ?? '—'}</div>
                    <div className="text-muted-foreground text-xs">{order.buyer?.email ?? '—'}</div>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="text-foreground max-w-xs truncate">{order.product?.title ?? '—'}</div>
                    <div className="text-muted-foreground text-xs">{order.product?.type ?? '—'}</div>
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">{order.creator?.name ?? '—'}</td>
                  <td className="px-3 py-1.5 text-foreground">${(order.amountUsd / 100).toFixed(2)}</td>
                  <td className="px-3 py-1.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-border text-muted-foreground'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    {q || status ? 'No orders match your filters.' : 'No orders yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Suspense fallback={null}>
        <Pagination total={total} page={page} perPage={PER_PAGE} />
      </Suspense>
    </div>
  )
}
