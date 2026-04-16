import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import Link from 'next/link'
import { ShoppingBag, Package } from 'lucide-react'
import { SearchBar } from '@/components/ui/SearchBar'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Pagination } from '@/components/ui/Pagination'
import { getDisputeEligibility } from '@/lib/dispute-eligibility'
import { STATUS_LABELS, TYPE_LABELS, CATEGORY_LABELS } from '@/lib/labels'
import { OrderReviewButton } from '@/components/ui/OrderReviewButton'

const PER_PAGE = 10

type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'

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
  { value: 'REFUNDED', label: 'Refunded' },
]

function formatAmount(displayAmount: number, displayCurrency: string, amountUsd: number) {
  if (displayAmount && displayCurrency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency,
    }).format(displayAmount / 100)
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    amountUsd / 100
  )
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  const userId = (session.user as any).id

  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const status = params.status ?? ''

  const where: any = { buyerId: userId }
  if (q) {
    where.OR = [
      { id: { contains: q } },
      { product: { title: { contains: q } } },
    ]
  }
  if (status) where.status = status

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { id: true, title: true, images: true, type: true, category: true, creator: { select: { displayName: true } } },
        },
        dispute: { select: { id: true } },
        review: { select: { id: true } },
      },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])

  // Group orders by cartSessionId
  // Orders sharing the same non-null cartSessionId that appears >1 time are grouped
  type OrderItem = typeof orders[number] & { cartSessionId?: string | null }
  const sessionCounts: Record<string, number> = {}
  for (const o of orders) {
    const sid = (o as OrderItem).cartSessionId
    if (sid) sessionCounts[sid] = (sessionCounts[sid] ?? 0) + 1
  }

  type RenderGroup =
    | { kind: 'solo'; order: typeof orders[number] }
    | { kind: 'group'; sessionId: string; groupDate: Date; orders: typeof orders }

  const renderItems: RenderGroup[] = []
  const seenGroups = new Set<string>()

  for (const o of orders) {
    const sid = (o as OrderItem).cartSessionId
    if (sid && sessionCounts[sid] > 1) {
      if (!seenGroups.has(sid)) {
        seenGroups.add(sid)
        const groupOrders = orders.filter(x => (x as OrderItem).cartSessionId === sid)
        renderItems.push({ kind: 'group', sessionId: sid, groupDate: groupOrders[0].createdAt, orders: groupOrders })
      }
    } else {
      renderItems.push({ kind: 'solo', order: o })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">Your purchase history</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Suspense fallback={null}>
          <SearchBar placeholder="Search by order ID or product..." className="min-w-48 flex-1" />
          <FilterSelect paramName="status" options={STATUS_OPTIONS} allLabel="All Statuses" className="w-40" />
        </Suspense>
      </div>

      {orders.length === 0 && total === 0 && !q && !status ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-card text-muted-foreground">
            <ShoppingBag className="size-8" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">No orders yet</h3>
          <p className="mb-6 text-sm text-muted-foreground max-w-sm mx-auto">
            Your purchases will appear here. Start exploring the marketplace!
          </p>
          <Link href="/marketplace" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
            Browse Marketplace
          </Link>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground text-sm">No orders match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {renderItems.map((item) => {
            if (item.kind === 'group') {
              return (
                <div key={item.sessionId} className="rounded-xl bg-card border border-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-surface">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Checkout on {formatDate(item.groupDate)} · {item.orders.length} orders
                    </p>
                  </div>
                  {item.orders.map((order) => {
                    const images = (() => {
                      try { return JSON.parse(order.product.images) as string[] }
                      catch { return [] }
                    })()
                    const thumb = images[0] ?? null
                    const statusClass = statusStyles[order.status as OrderStatus] ?? 'bg-border text-muted-foreground'
                    const isDigital = order.product.type === 'DIGITAL'
                    const isPhysical = order.product.type === 'PHYSICAL'
                    const canDownload = order.status === 'PAID' && isDigital && order.downloadToken

                    const eligibility = getDisputeEligibility({
                      product: { type: order.product.type },
                      status: order.status,
                      createdAt: order.createdAt,
                      trackingAddedAt: order.trackingAddedAt,
                      dispute: order.dispute,
                    })

                    return (
                      <div key={order.id} className="bg-surface p-4 flex gap-4 items-start border-b border-border last:border-b-0">
                        <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt={order.product.title} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="size-6 text-muted-foreground/40" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{order.product.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">by {order.product?.creator?.displayName ?? 'Unknown Creator'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{CATEGORY_LABELS[order.product.category] ?? order.product.category} · {TYPE_LABELS[order.product.type] ?? order.product.type}</p>
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {formatAmount(order.displayAmount, order.displayCurrency, order.amountUsd)}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                            {STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>

                          <Link href={`/account/orders/${order.id}`} className="inline-flex items-center px-2 py-1 rounded text-xs text-muted-foreground hover:text-primary transition-colors">
                            View →
                          </Link>

                          {order.escrowStatus === 'RELEASED' && (
                            order.review
                              ? <span className="text-xs text-green-500 font-medium">✓ Reviewed</span>
                              : <OrderReviewButton orderId={order.id} productId={order.product.id} productTitle={order.product.title} />
                          )}

                          {canDownload && (
                            <Link
                              href={`/download/${order.downloadToken}`}
                              className="inline-flex items-center px-3 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-medium transition-colors"
                            >
                              Download
                            </Link>
                          )}

                          {order.status === 'PAID' && isPhysical && (
                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                              (order as any).trackingNumber
                                ? 'bg-border text-foreground cursor-pointer hover:bg-card'
                                : 'bg-card text-muted-foreground cursor-not-allowed'
                            }`}>
                              Track order
                            </span>
                          )}

                          {/* Dispute actions — always shown for PHYSICAL and POD, never on terminal statuses */}
                          {(order.product.type === 'PHYSICAL' || order.product.type === 'POD') &&
                           !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status) && (
                            <>
                              {eligibility.status === 'has_dispute' && (
                                <Link
                                  href={`/account/disputes/${eligibility.disputeId}`}
                                  className="inline-flex items-center px-3 py-1 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-card transition-colors"
                                >
                                  View Dispute
                                </Link>
                              )}
                              {eligibility.status === 'eligible' && (
                                <Link
                                  href={`/account/orders/${order.id}/dispute`}
                                  className="inline-flex items-center px-3 py-1 rounded-lg border border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium transition-colors"
                                >
                                  Raise Dispute
                                </Link>
                              )}
                              {eligibility.status === 'not_yet' && (
                                <span className="text-xs text-muted-foreground">
                                  Dispute in {eligibility.availableInDays}d
                                </span>
                              )}
                              {eligibility.status === 'expired' && (
                                <span className="text-xs text-muted-foreground line-through opacity-50">
                                  Dispute closed
                                </span>
                              )}
                            </>
                          )}
                          {/* DIGITAL dispute — only shown when within 7-day window */}
                          {order.product.type === 'DIGITAL' && eligibility.status === 'eligible' && (
                            <Link
                              href={`/account/orders/${order.id}/dispute`}
                              className="inline-flex items-center px-3 py-1 rounded-lg border border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium transition-colors"
                            >
                              Raise Dispute
                            </Link>
                          )}
                          {order.product.type === 'DIGITAL' && eligibility.status === 'has_dispute' && (
                            <Link
                              href={`/account/disputes/${eligibility.disputeId}`}
                              className="inline-flex items-center px-3 py-1 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-card transition-colors"
                            >
                              View Dispute
                            </Link>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }

            // Solo (ungrouped) order
            const order = item.order
            const images = (() => {
              try { return JSON.parse(order.product.images) as string[] }
              catch { return [] }
            })()
            const thumb = images[0] ?? null
            const statusClass = statusStyles[order.status as OrderStatus] ?? 'bg-border text-muted-foreground'
            const isDigital = order.product.type === 'DIGITAL'
            const isPhysical = order.product.type === 'PHYSICAL'
            const canDownload = order.status === 'PAID' && isDigital && order.downloadToken

            const eligibility = getDisputeEligibility({
              product: { type: order.product.type },
              status: order.status,
              createdAt: order.createdAt,
              trackingAddedAt: order.trackingAddedAt,
              dispute: order.dispute,
            })

            return (
              <div key={order.id} className="bg-surface rounded-xl border border-border p-4 flex gap-4 items-start">
                <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt={order.product.title} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="size-6 text-muted-foreground/40" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{order.product.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">by {order.product?.creator?.displayName ?? 'Unknown Creator'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{CATEGORY_LABELS[order.product.category] ?? order.product.category} · {TYPE_LABELS[order.product.type] ?? order.product.type}</p>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {formatAmount(order.displayAmount, order.displayCurrency, order.amountUsd)}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                    {STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>

                  <Link href={`/account/orders/${order.id}`} className="inline-flex items-center px-2 py-1 rounded text-xs text-muted-foreground hover:text-primary transition-colors">
                    View →
                  </Link>

                  {order.escrowStatus === 'RELEASED' && (
                    order.review
                      ? <span className="text-xs text-green-500 font-medium">✓ Reviewed</span>
                      : <OrderReviewButton orderId={order.id} productId={order.product.id} productTitle={order.product.title} />
                  )}

                  {canDownload && (
                    <Link
                      href={`/download/${order.downloadToken}`}
                      className="inline-flex items-center px-3 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-medium transition-colors"
                    >
                      Download
                    </Link>
                  )}

                  {order.status === 'PAID' && isPhysical && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      (order as any).trackingNumber
                        ? 'bg-border text-foreground cursor-pointer hover:bg-card'
                        : 'bg-card text-muted-foreground cursor-not-allowed'
                    }`}>
                      Track order
                    </span>
                  )}

                  {/* Dispute actions — always shown for PHYSICAL and POD, never on terminal statuses */}
                  {(order.product.type === 'PHYSICAL' || order.product.type === 'POD') &&
                   !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status) && (
                    <>
                      {eligibility.status === 'has_dispute' && (
                        <Link
                          href={`/account/disputes/${eligibility.disputeId}`}
                          className="inline-flex items-center px-3 py-1 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-card transition-colors"
                        >
                          View Dispute
                        </Link>
                      )}
                      {eligibility.status === 'eligible' && (
                        <Link
                          href={`/account/orders/${order.id}/dispute`}
                          className="inline-flex items-center px-3 py-1 rounded-lg border border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium transition-colors"
                        >
                          Raise Dispute
                        </Link>
                      )}
                      {eligibility.status === 'not_yet' && (
                        <span className="text-xs text-muted-foreground">
                          Dispute in {eligibility.availableInDays}d
                        </span>
                      )}
                      {eligibility.status === 'expired' && (
                        <span className="text-xs text-muted-foreground line-through opacity-50">
                          Dispute closed
                        </span>
                      )}
                    </>
                  )}
                  {/* DIGITAL dispute — only shown when within 7-day window */}
                  {order.product.type === 'DIGITAL' && eligibility.status === 'eligible' && (
                    <Link
                      href={`/account/orders/${order.id}/dispute`}
                      className="inline-flex items-center px-3 py-1 rounded-lg border border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium transition-colors"
                    >
                      Raise Dispute
                    </Link>
                  )}
                  {order.product.type === 'DIGITAL' && eligibility.status === 'has_dispute' && (
                    <Link
                      href={`/account/disputes/${eligibility.disputeId}`}
                      className="inline-flex items-center px-3 py-1 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-card transition-colors"
                    >
                      View Dispute
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Suspense fallback={null}>
        <Pagination total={total} page={page} perPage={PER_PAGE} />
      </Suspense>
    </div>
  )
}
