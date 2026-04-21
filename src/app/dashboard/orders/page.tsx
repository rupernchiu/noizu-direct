import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import { OrdersActions } from './OrdersActions'
import { OrdersFilters } from './OrdersFilters'
import { Pagination } from '@/components/ui/Pagination'
import { ShoppingBag } from 'lucide-react'
import { STATUS_LABELS, TYPE_LABELS } from '@/lib/labels'

const PER_PAGE = 10

type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'

const statusStyles: Record<OrderStatus, string> = {
  PENDING:    'bg-yellow-500/20 text-yellow-400',
  PAID:       'bg-blue-500/20 text-blue-400',
  PROCESSING: 'bg-orange-500/20 text-orange-400',
  SHIPPED:    'bg-primary/20 text-primary',
  COMPLETED:  'bg-secondary/20 text-secondary',
  CANCELLED:  'bg-red-500/20 text-red-400',
  REFUNDED:   'bg-muted-foreground/20 text-muted-foreground',
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

function dateRangeSince(range: string): Date | null {
  const now = new Date()
  if (range === 'week')   { const d = new Date(now); d.setDate(d.getDate() - 7);   return d }
  if (range === 'month')  { const d = new Date(now); d.setDate(d.getDate() - 30);  return d }
  if (range === '3month') { const d = new Date(now); d.setDate(d.getDate() - 90);  return d }
  return null
}

function sortOrder(sort: string): { createdAt?: 'asc' | 'desc'; amountUsd?: 'asc' | 'desc'; fulfillmentDeadline?: 'asc' } {
  if (sort === 'oldest')   return { createdAt: 'asc' }
  if (sort === 'high')     return { amountUsd: 'desc' }
  if (sort === 'low')      return { amountUsd: 'asc' }
  if (sort === 'deadline') return { fulfillmentDeadline: 'asc' }
  return { createdAt: 'desc' }
}

export default async function DashboardOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?:      string
    page?:   string
    status?: string
    type?:   string
    date?:   string
    escrow?: string
    sort?:   string
  }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id

  const params  = await searchParams
  const q       = params.q?.trim() ?? ''
  const page    = Math.max(1, parseInt(params.page ?? '1') || 1)
  const status  = params.status ?? ''
  const type    = params.type   ?? ''
  const date    = params.date   ?? ''
  const escrow  = params.escrow ?? ''
  const sort    = params.sort   ?? 'newest'

  // ── Base where (shared across count queries + main query) ───────────────────
  const since = dateRangeSince(date)

  const baseWhere: any = { creatorId: userId }
  if (q) {
    baseWhere.OR = [
      { id: { contains: q } },
      { product: { title: { contains: q } } },
    ]
  }
  if (type)   baseWhere.product = { ...baseWhere.product, type }
  if (escrow) baseWhere.escrowStatus = escrow
  if (since)  baseWhere.createdAt = { gte: since }

  // ── Status counts (for tab badges) — apply base but NOT status filter ───────
  const statusGroups = await prisma.order.groupBy({
    by: ['status'],
    where: baseWhere,
    _count: { _all: true },
  })
  const allCount = statusGroups.reduce((s, g) => s + g._count._all, 0)
  const counts: Record<string, number> = { ALL: allCount }
  for (const g of statusGroups) counts[g.status] = g._count._all

  // ── Main query ────────────────────────────────────────────────────────────────
  const fullWhere = { ...baseWhere }
  if (status) fullWhere.status = status

  const [total, orders] = await Promise.all([
    prisma.order.count({ where: fullWhere }),
    prisma.order.findMany({
      where: fullWhere,
      orderBy: sortOrder(sort),
      include: {
        buyer:   { select: { name: true, email: true } },
        product: { select: { title: true, type: true } },
      },
      skip:  (page - 1) * PER_PAGE,
      take:  PER_PAGE,
    }),
  ])

  const hasFilters = !!(q || status || type || date || escrow)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Orders</h1>
      </div>

      <Suspense fallback={null}>
        <OrdersFilters
          counts={counts}
          total={total}
          page={page}
          perPage={PER_PAGE}
        />
      </Suspense>

      {orders.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border px-5 py-12 text-center">
          <ShoppingBag className="size-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">No orders found</h3>
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? 'No orders match your filters. Try adjusting your search or filters.'
              : 'Orders will appear here when fans purchase your products.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="bg-surface rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground font-semibold text-sm truncate">{order.product?.title ?? '—'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {order.buyer?.name ?? 'Unknown'} · {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${statusStyles[order.status as OrderStatus] ?? 'bg-muted-foreground/20 text-muted-foreground'}`}>
                    {STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
                  <span className="text-foreground font-semibold">${(order.amountUsd / 100).toFixed(2)}</span>
                  <OrdersActions
                    orderId={order.id}
                    status={order.status}
                    productType={order.product?.type ?? 'DIGITAL'}
                  />
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
                    <th className="px-5 py-3 text-left font-medium">Member</th>
                    <th className="px-5 py-3 text-left font-medium">Product</th>
                    <th className="px-5 py-3 text-left font-medium">Amount</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-left font-medium">Date</th>
                    <th className="px-5 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-border last:border-0 hover:bg-card/50">
                      <td className="px-5 py-3">
                        <div>
                          <p className="text-foreground font-medium">{order.buyer?.name ?? 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{order.buyer?.email ?? ''}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-muted-foreground truncate max-w-[160px]">{order.product?.title ?? '—'}</p>
                        <p className="text-xs text-muted-foreground/60">{TYPE_LABELS[order.product?.type ?? ''] ?? order.product?.type}</p>
                      </td>
                      <td className="px-5 py-3 text-foreground">${(order.amountUsd / 100).toFixed(2)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[order.status as OrderStatus] ?? 'bg-muted-foreground/20 text-muted-foreground'}`}>
                          {STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{formatDate(order.createdAt)}</td>
                      <td className="px-5 py-3">
                        <OrdersActions
                          orderId={order.id}
                          status={order.status}
                          productType={order.product?.type ?? 'DIGITAL'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Suspense fallback={null}>
        <Pagination total={total} page={page} perPage={PER_PAGE} />
      </Suspense>
    </div>
  )
}
