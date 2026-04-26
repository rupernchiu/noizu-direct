import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface SearchParams { q?: string }

interface OrderHit {
  id: string
  shortId: string
  status: string
  escrowStatus: string | null
  refundStatus: string | null
  amountUsd: number
  createdAt: Date
  trackingNumber: string | null
  airwallexIntentId: string | null
  airwallexRefundId: string | null
  product: { title: string; type: string }
  buyer: { id: string; name: string | null; email: string }
  creator: { id: string; name: string | null; email: string }
  dispute: { id: string; status: string } | null
}

function fmtUsd(cents: number): string {
  return `USD ${(cents / 100).toFixed(2)}`
}

function statusTone(s: string): string {
  if (s === 'COMPLETED' || s === 'PAID' || s === 'DELIVERED') return 'bg-success/10 text-success border-success/20'
  if (s === 'CANCELLED' || s === 'FAILED') return 'bg-destructive/10 text-destructive border-destructive/20'
  if (s === 'DISPUTED') return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
  if (s === 'PROCESSING' || s === 'PENDING') return 'bg-warning/10 text-warning border-warning/20'
  return 'bg-muted/10 text-muted-foreground border-muted/20'
}

async function searchOrders(rawQuery: string): Promise<OrderHit[]> {
  const q = rawQuery.trim()
  if (!q) return []

  // Identifier strategies (most specific first):
  //  1. exact full order id (cuid, ~25 chars starting with 'c')
  //  2. last-8 short id (uppercase) — what users see in their email
  //  3. exact airwallex intent id (begins with 'int_')
  //  4. exact refund id (begins with 'rfd_' typically)
  //  5. buyer or creator email contains
  const where: Record<string, unknown>[] = []
  if (q.length === 25 && q.startsWith('c')) where.push({ id: q })
  if (q.length === 8) where.push({ id: { endsWith: q.toLowerCase() } })
  if (q.startsWith('int_')) where.push({ airwallexIntentId: q })
  if (q.startsWith('rfd_')) where.push({ airwallexRefundId: q })
  if (q.includes('@')) {
    where.push({ buyer: { email: { contains: q, mode: 'insensitive' as const } } })
    where.push({ creator: { email: { contains: q, mode: 'insensitive' as const } } })
  }
  if (where.length === 0) {
    // Generic fallback — id contains. Useful for pasted partial ids.
    where.push({ id: { contains: q.toLowerCase() } })
  }

  const rows = await prisma.order.findMany({
    where: { OR: where },
    orderBy: { createdAt: 'desc' },
    take: 25,
    select: {
      id: true,
      status: true,
      escrowStatus: true,
      refundStatus: true,
      amountUsd: true,
      createdAt: true,
      trackingNumber: true,
      airwallexIntentId: true,
      airwallexRefundId: true,
      product: { select: { title: true, type: true } },
      buyer: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } },
      dispute: { select: { id: true, status: true } },
    },
  })

  return rows.map((r) => ({
    id: r.id,
    shortId: r.id.slice(-8).toUpperCase(),
    status: r.status,
    escrowStatus: r.escrowStatus,
    refundStatus: r.refundStatus ?? null,
    amountUsd: r.amountUsd,
    createdAt: r.createdAt,
    trackingNumber: r.trackingNumber,
    airwallexIntentId: r.airwallexIntentId,
    airwallexRefundId: r.airwallexRefundId,
    product: r.product,
    buyer: r.buyer,
    creator: r.creator,
    dispute: r.dispute,
  }))
}

export default async function AdminCsWorkbenchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (user?.role !== 'ADMIN') redirect('/login')

  const { q = '' } = await searchParams
  const hits = q ? await searchOrders(q) : []

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">CS Workbench</h1>
        <p className="text-sm text-muted-foreground mt-1">
          One-stop lookup for support agents. Paste an order id (full or last 8),
          Airwallex intent id, refund id, or buyer/creator email.
        </p>
      </header>

      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="ABC12345 · int_abc… · buyer@example.com · cxyz…"
          className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary"
          autoFocus
        />
        <button
          type="submit"
          className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90"
        >
          Search
        </button>
      </form>

      {q && hits.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          No orders match <span className="font-mono text-foreground">{q}</span>.
          Try the buyer or creator email, or the last 8 characters of the order id.
        </div>
      )}

      {hits.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {hits.length} match{hits.length === 1 ? '' : 'es'}
        </div>
      )}

      <div className="space-y-4">
        {hits.map((o) => (
          <article key={o.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <Link
                  href={`/admin/orders?q=${o.id}`}
                  className="font-mono text-sm font-bold text-foreground hover:text-primary"
                >
                  #{o.shortId}
                </Link>
                <span className="ml-2 text-xs text-muted-foreground">{o.product.title}</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <span className={`text-[11px] font-semibold uppercase tracking-wide rounded border px-1.5 py-0.5 ${statusTone(o.status)}`}>
                  {o.status}
                </span>
                {o.escrowStatus && (
                  <span className={`text-[11px] font-semibold uppercase tracking-wide rounded border px-1.5 py-0.5 ${statusTone(o.escrowStatus)}`}>
                    Escrow: {o.escrowStatus}
                  </span>
                )}
                {o.refundStatus && o.refundStatus !== 'NONE' && (
                  <span className={`text-[11px] font-semibold uppercase tracking-wide rounded border px-1.5 py-0.5 ${statusTone(o.refundStatus)}`}>
                    Refund: {o.refundStatus}
                  </span>
                )}
                {o.dispute && (
                  <span className="text-[11px] font-semibold uppercase tracking-wide rounded border px-1.5 py-0.5 bg-orange-500/10 text-orange-400 border-orange-500/20">
                    Dispute: {o.dispute.status}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div>
                <div className="text-muted-foreground">Buyer</div>
                <div className="text-foreground">{o.buyer.name ?? '—'}</div>
                <div className="text-muted-foreground font-mono">{o.buyer.email}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Creator</div>
                <div className="text-foreground">{o.creator.name ?? '—'}</div>
                <div className="text-muted-foreground font-mono">{o.creator.email}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Amount</div>
                <div className="text-foreground font-semibold">{fmtUsd(o.amountUsd)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Created</div>
                <div className="text-foreground">{o.createdAt.toISOString().slice(0, 16).replace('T', ' ')} UTC</div>
              </div>
              {o.trackingNumber && (
                <div className="col-span-full">
                  <div className="text-muted-foreground">Tracking</div>
                  <div className="text-foreground font-mono">{o.trackingNumber}</div>
                </div>
              )}
              {o.airwallexIntentId && (
                <div className="col-span-full">
                  <div className="text-muted-foreground">Airwallex intent</div>
                  <div className="text-foreground font-mono break-all">{o.airwallexIntentId}</div>
                </div>
              )}
              {o.airwallexRefundId && (
                <div className="col-span-full">
                  <div className="text-muted-foreground">Airwallex refund</div>
                  <div className="text-foreground font-mono break-all">{o.airwallexRefundId}</div>
                </div>
              )}
            </div>

            <div className="flex gap-3 text-xs pt-1 border-t border-border">
              <Link href={`/admin/orders?q=${o.id}`} className="text-primary hover:underline">View order</Link>
              {o.dispute && (
                <Link href={`/admin/disputes/${o.dispute.id}`} className="text-primary hover:underline">View dispute</Link>
              )}
              <Link href={`/admin/fraud/queue?userId=${o.buyer.id}`} className="text-primary hover:underline">Buyer fraud queue</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
