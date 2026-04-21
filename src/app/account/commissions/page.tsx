import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Sparkles, FileText, ArrowRight } from 'lucide-react'

type RequestStatus = 'PENDING' | 'QUOTED' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' | 'EXPIRED'
type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'WITHDRAWN'

const REQUEST_STATUS_STYLES: Record<RequestStatus, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  QUOTED: 'bg-primary/20 text-primary',
  ACCEPTED: 'bg-secondary/20 text-secondary',
  DECLINED: 'bg-red-500/20 text-red-400',
  WITHDRAWN: 'bg-muted-foreground/20 text-muted-foreground',
  EXPIRED: 'bg-muted-foreground/20 text-muted-foreground',
}

const QUOTE_STATUS_STYLES: Record<QuoteStatus, string> = {
  DRAFT: 'bg-muted-foreground/20 text-muted-foreground',
  SENT: 'bg-primary/20 text-primary',
  ACCEPTED: 'bg-secondary/20 text-secondary',
  REJECTED: 'bg-red-500/20 text-red-400',
  EXPIRED: 'bg-muted-foreground/20 text-muted-foreground',
  WITHDRAWN: 'bg-muted-foreground/20 text-muted-foreground',
}

const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'Awaiting creator',
  QUOTED: 'Quote received',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  WITHDRAWN: 'Withdrawn',
  EXPIRED: 'Expired',
}

const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Awaiting your decision',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  WITHDRAWN: 'Withdrawn',
}

function formatUsd(cents: number): string {
  return '$' + (cents / 100).toFixed(2)
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

export default async function BuyerCommissionsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const [requests, quotes] = await Promise.all([
    prisma.commissionRequest.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { username: true, user: { select: { name: true, avatar: true } } } },
        quotes: { select: { id: true, status: true } },
      },
    }),
    prisma.commissionQuote.findMany({
      where: { buyerId: userId, status: { not: 'DRAFT' } },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { username: true, user: { select: { name: true, avatar: true } } } },
        order: { select: { id: true } },
      },
    }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Commissions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Custom work requested from creators and quotes offered to you.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Your requests
        </h2>

        {requests.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border p-12 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-card text-muted-foreground">
              <Sparkles className="size-8" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">No commission requests yet</h3>
            <p className="mb-6 text-sm text-muted-foreground max-w-sm mx-auto">
              Browse creators and start one.
            </p>
            <Link
              href="/creators"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Browse creators
              <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const statusClass = REQUEST_STATUS_STYLES[r.status as RequestStatus] ?? REQUEST_STATUS_STYLES.PENDING
              const statusLabel = REQUEST_STATUS_LABELS[r.status as RequestStatus] ?? r.status
              const creatorName = r.creator.user.name ?? r.creator.username
              const sentQuoteCount = r.quotes.filter((q) => q.status === 'SENT').length
              return (
                <Link
                  key={r.id}
                  href={`/account/commissions/requests/${r.id}`}
                  className="block bg-surface rounded-xl border border-border p-4 hover:border-primary/40 transition-colors"
                >
                  <div className="flex gap-4 items-start">
                    <div className="shrink-0 size-12 rounded-full overflow-hidden bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                      {r.creator.user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.creator.user.avatar} alt={creatorName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-white">{creatorName.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        to {creatorName} · {formatDate(r.createdAt)}
                      </p>
                      {sentQuoteCount > 0 && r.status === 'QUOTED' && (
                        <p className="text-xs text-primary mt-1">
                          {sentQuoteCount} quote{sentQuoteCount !== 1 ? 's' : ''} awaiting review
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Quotes offered to you
        </h2>

        {quotes.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border p-8 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-card text-muted-foreground">
              <FileText className="size-5" />
            </div>
            <p className="text-sm text-muted-foreground">No quotes yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quotes.map((q) => {
              const statusClass = QUOTE_STATUS_STYLES[q.status as QuoteStatus] ?? QUOTE_STATUS_STYLES.SENT
              const statusLabel = QUOTE_STATUS_LABELS[q.status as QuoteStatus] ?? q.status
              const creatorName = q.creator.user.name ?? q.creator.username
              return (
                <Link
                  key={q.id}
                  href={`/account/commissions/quotes/${q.id}`}
                  className="block bg-surface rounded-xl border border-border p-4 hover:border-primary/40 transition-colors"
                >
                  <div className="flex gap-4 items-start">
                    <div className="shrink-0 size-12 rounded-full overflow-hidden bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                      {q.creator.user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={q.creator.user.avatar} alt={creatorName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-white">{creatorName.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{q.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        from {creatorName} · {formatDate(q.createdAt)}
                      </p>
                      {q.order?.id && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Order{' '}
                          <Link href={`/account/orders/${q.order.id}`} className="text-primary hover:underline">
                            #{q.order.id.slice(-8).toUpperCase()}
                          </Link>
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold text-foreground">{formatUsd(q.amountUsd)}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
