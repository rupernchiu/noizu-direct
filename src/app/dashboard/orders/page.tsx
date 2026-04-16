import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import { OrdersActions } from './OrdersActions'
import { SearchBar } from '@/components/ui/SearchBar'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Pagination } from '@/components/ui/Pagination'
import { ShoppingBag } from 'lucide-react'
import { STATUS_LABELS, TYPE_LABELS } from '@/lib/labels'

const PER_PAGE = 10

type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'

const statusStyles: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  PAID: 'bg-blue-500/20 text-blue-400',
  PROCESSING: 'bg-orange-500/20 text-orange-400',
  SHIPPED: 'bg-primary/20 text-primary',
  COMPLETED: 'bg-secondary/20 text-secondary',
  CANCELLED: 'bg-red-500/20 text-red-400',
  REFUNDED: 'bg-muted-foreground/20 text-muted-foreground',
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

export default async function DashboardOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id

  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const statusFilter = params.status ?? ''

  const where: any = { creatorId: userId }
  if (q) {
    where.OR = [
      { id: { contains: q } },
      { buyer: { name: { contains: q } } },
      { buyer: { email: { contains: q } } },
    ]
  }
  if (statusFilter) where.status = statusFilter

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { name: true, email: true } },
        product: { select: { title: true, type: true } },
      },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">{total} order{total !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Suspense fallback={null}>
          <SearchBar placeholder="Search by order ID or buyer..." className="min-w-48 flex-1" />
          <FilterSelect paramName="status" options={STATUS_OPTIONS} allLabel="All Statuses" className="w-40" />
        </Suspense>
      </div>

      {orders.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border px-5 py-12 text-center">
          <ShoppingBag className="size-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">No orders found</h3>
          <p className="text-sm text-muted-foreground">
            {q || statusFilter ? 'No orders match your filters.' : 'Orders will appear here when fans purchase your products.'}
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="px-5 py-3 text-left font-medium">Buyer</th>
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
      )}

      <Suspense fallback={null}>
        <Pagination total={total} page={page} perPage={PER_PAGE} />
      </Suspense>
    </div>
  )
}
