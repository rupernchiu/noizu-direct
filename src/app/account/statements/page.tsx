import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(date))
}

function formatAmount(amountUsd: number) {
  return `$${(amountUsd / 100).toFixed(2)}`
}

type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
type ProductType = 'DIGITAL' | 'PHYSICAL' | 'POD'

const statusStyles: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  PAID: 'bg-blue-500/20 text-blue-400',
  PROCESSING: 'bg-orange-500/20 text-orange-400',
  SHIPPED: 'bg-primary/20 text-primary',
  COMPLETED: 'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
  REFUNDED: 'bg-muted-foreground/20 text-muted-foreground',
}

const typeStyles: Record<ProductType, string> = {
  DIGITAL: 'bg-blue-500/20 text-blue-400',
  PHYSICAL: 'bg-green-500/20 text-green-400',
  POD: 'bg-purple-500/20 text-purple-400',
}

function getDateRange(rangeKey: string): { from: Date; to: Date } {
  const now = new Date()
  const to = new Date(now)
  to.setHours(23, 59, 59, 999)

  switch (rangeKey) {
    case 'last_month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const toEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      return { from, to: toEnd }
    }
    case 'last_3_months': {
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      return { from, to }
    }
    case 'last_6_months': {
      const from = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      return { from, to }
    }
    case 'this_year': {
      const from = new Date(now.getFullYear(), 0, 1)
      return { from, to }
    }
    case 'all_time': {
      const from = new Date('2000-01-01')
      return { from, to }
    }
    default: {
      // this_month
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from, to }
    }
  }
}

export default async function StatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string; type?: string; range?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  const userId = (session.user as any).id

  const params = await searchParams
  const rangeKey = params.range ?? 'this_month'
  const statusFilter = params.status ?? ''
  const typeFilter = params.type ?? ''

  let fromDate: Date
  let toDate: Date

  if (params.from && params.to) {
    fromDate = new Date(params.from)
    toDate = new Date(params.to)
    toDate.setHours(23, 59, 59, 999)
  } else {
    const range = getDateRange(rangeKey)
    fromDate = range.from
    toDate = range.to
  }

  const orderWhere: any = {
    buyerId: userId,
    createdAt: { gte: fromDate, lte: toDate },
  }
  if (statusFilter) orderWhere.status = statusFilter
  if (typeFilter) orderWhere.product = { type: typeFilter }

  const orders = await prisma.order.findMany({
    where: orderWhere,
    include: {
      product: {
        select: { id: true, title: true, type: true, images: true },
      },
      creator: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const refundTransactions = await prisma.escrowTransaction.findMany({
    where: {
      type: 'REFUND',
      createdAt: { gte: fromDate, lte: toDate },
      order: { buyerId: userId },
    },
    include: {
      order: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const activeStatuses: OrderStatus[] = ['COMPLETED', 'PAID', 'SHIPPED', 'PROCESSING']
  const totalSpentCents = orders
    .filter(o => activeStatuses.includes(o.status as OrderStatus))
    .reduce((sum, o) => sum + o.amountUsd, 0)
  const totalOrders = orders.length
  const totalRefundsCents = refundTransactions.reduce((sum, t) => sum + t.amount, 0)
  const netSpentCents = totalSpentCents - totalRefundsCents

  const rangeOptions = [
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'last_3_months', label: 'Last 3 Months' },
    { value: 'last_6_months', label: 'Last 6 Months' },
    { value: 'this_year', label: 'This Year' },
    { value: 'all_time', label: 'All Time' },
  ]

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'PAID', label: 'Paid' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'REFUNDED', label: 'Refunded' },
  ]

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'DIGITAL', label: 'Digital' },
    { value: 'PHYSICAL', label: 'Physical' },
    { value: 'POD', label: 'Print-on-Demand' },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Statement of Accounts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review your transaction history, spending, and refunds
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <form method="GET" className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3 sm:items-end">
          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-xs font-medium text-muted-foreground">Date Range</label>
            <select
              suppressHydrationWarning
              name="range"
              defaultValue={rangeKey}
              className="bg-background border border-border rounded-lg px-3 py-2 text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full"
            >
              {rangeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select
              suppressHydrationWarning
              name="status"
              defaultValue={statusFilter}
              className="bg-background border border-border rounded-lg px-3 py-2 text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-xs font-medium text-muted-foreground">Product Type</label>
            <select
              suppressHydrationWarning
              name="type"
              defaultValue={typeFilter}
              className="bg-background border border-border rounded-lg px-3 py-2 text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full"
            >
              {typeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              suppressHydrationWarning
              type="submit"
              className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-2 text-sm font-medium"
            >
              Apply
            </button>

            <Link
              href="/account/statements"
              className="flex-1 sm:flex-none text-center bg-background hover:bg-surface border border-border text-foreground rounded-lg px-4 py-2 text-sm font-medium"
            >
              Reset
            </Link>
          </div>
        </form>

        <p className="text-xs text-muted-foreground mt-3">
          Showing results from{' '}
          <span className="text-foreground font-medium">{formatDate(fromDate)}</span> to{' '}
          <span className="text-foreground font-medium">{formatDate(toDate)}</span>
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-surface rounded-xl border border-border p-4 sm:p-6">
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Spent</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{formatAmount(totalSpentCents)}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 hidden sm:block">Paid, Processing, Shipped, Completed</p>
        </div>

        <div className="bg-surface rounded-xl border border-border p-4 sm:p-6">
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Orders</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{totalOrders}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 hidden sm:block">In selected period</p>
        </div>

        <div className="bg-surface rounded-xl border border-border p-4 sm:p-6">
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Refunds</p>
          <p className="text-xl sm:text-2xl font-bold text-green-400 mt-1">{formatAmount(totalRefundsCents)}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 hidden sm:block">{refundTransactions.length} transaction{refundTransactions.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="bg-surface rounded-xl border border-border p-4 sm:p-6">
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Net Spent</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{formatAmount(netSpentCents)}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 hidden sm:block">After refunds</p>
        </div>
      </div>

      {/* Transactions table */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Transactions</h2>
        {orders.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border p-12 text-center">
            <p className="text-muted-foreground">No transactions found for this period.</p>
            <Link href="/marketplace" className="mt-3 inline-block text-sm text-primary hover:underline">
              Browse marketplace
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {orders.map(order => {
                let thumbnailUrl: string | null = null
                try {
                  const imgs = JSON.parse(order.product.images)
                  thumbnailUrl = Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : null
                } catch {
                  thumbnailUrl = null
                }
                return (
                  <Link
                    key={order.id}
                    href={`/account/orders/${order.id}`}
                    className="block bg-surface rounded-xl border border-border p-4 active:bg-card/80 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbnailUrl} alt={order.product.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-card flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground font-semibold text-sm truncate">{order.product.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          by {order.creator?.name ?? '—'} · {formatDate(order.createdAt)}
                        </p>
                        <p className="font-mono text-[11px] text-primary mt-0.5">#{order.id.slice(-8).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${typeStyles[order.product.type as ProductType] ?? 'bg-muted/20 text-muted-foreground'}`}>
                          {order.product.type}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyles[order.status as OrderStatus] ?? 'bg-muted/20 text-muted-foreground'}`}>
                          {order.status}
                        </span>
                      </div>
                      <span className="font-semibold text-foreground text-sm">{formatAmount(order.amountUsd)}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block bg-surface rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Order #</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Creator</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map(order => {
                    let thumbnailUrl: string | null = null
                    try {
                      const imgs = JSON.parse(order.product.images)
                      thumbnailUrl = Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : null
                    } catch {
                      thumbnailUrl = null
                    }

                    return (
                      <tr key={order.id} className="hover:bg-background/50 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/account/orders/${order.id}`}
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            #{order.id.slice(-8).toUpperCase()}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {thumbnailUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={thumbnailUrl}
                                alt={order.product.title}
                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                              />
                            )}
                            <span className="text-foreground font-medium truncate max-w-[160px]">
                              {order.product.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {order.creator?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              typeStyles[order.product.type as ProductType] ?? 'bg-muted/20 text-muted-foreground'
                            }`}
                          >
                            {order.product.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground whitespace-nowrap">
                          {formatAmount(order.amountUsd)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              statusStyles[order.status as OrderStatus] ?? 'bg-muted/20 text-muted-foreground'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Refunds section */}
      {refundTransactions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Refunds</h2>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {refundTransactions.map(txn => (
              <div key={txn.id} className="bg-surface rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/account/orders/${txn.order.id}`}
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    #{txn.order.id.slice(-8).toUpperCase()}
                  </Link>
                  <span className="font-semibold text-green-400 text-sm">+{formatAmount(txn.amount)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(txn.createdAt)}</p>
                {txn.note && <p className="text-xs text-muted-foreground mt-1">{txn.note}</p>}
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block bg-surface rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Order #</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Note</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {refundTransactions.map(txn => (
                  <tr key={txn.id} className="hover:bg-background/50 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(txn.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/account/orders/${txn.order.id}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        #{txn.order.id.slice(-8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {txn.note ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-400">
                      +{formatAmount(txn.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary footer */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Period Summary</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal ({totalOrders} order{totalOrders !== 1 ? 's' : ''})</span>
            <span className="text-foreground font-medium">{formatAmount(totalSpentCents)}</span>
          </div>
          {totalRefundsCents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Refunds ({refundTransactions.length})</span>
              <span className="text-green-400 font-medium">−{formatAmount(totalRefundsCents)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm pt-2 border-t border-border mt-2">
            <span className="text-foreground font-semibold">Net Spent</span>
            <span className="text-foreground font-bold text-base">{formatAmount(netSpentCents)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
