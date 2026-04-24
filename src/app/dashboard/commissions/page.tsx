import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Inbox, FileText, Plus, Sparkles, ArrowRight } from 'lucide-react'

const quoteStatusStyles: Record<string, string> = {
  DRAFT:     'bg-muted-foreground/20 text-muted-foreground',
  SENT:      'bg-blue-500/20 text-blue-400',
  ACCEPTED:  'bg-secondary/20 text-secondary',
  REJECTED:  'bg-red-500/20 text-red-400',
  EXPIRED:   'bg-muted-foreground/20 text-muted-foreground',
  WITHDRAWN: 'bg-muted-foreground/20 text-muted-foreground',
}

function expiresInLabel(expiresAt: Date): string {
  const diff = expiresAt.getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days >= 1) return `Expires in ${days}d`
  const hours = Math.floor(diff / (1000 * 60 * 60))
  return `Expires in ${hours}h`
}

function budgetRange(min: number | null, max: number | null): string {
  if (min != null && max != null) return `$${(min / 100).toFixed(0)} – $${(max / 100).toFixed(0)}`
  if (min != null) return `From $${(min / 100).toFixed(0)}`
  if (max != null) return `Up to $${(max / 100).toFixed(0)}`
  return 'No budget set'
}

export default async function CommissionsInboxPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as { role?: string }).role !== 'CREATOR') redirect('/')
  const userId = (session.user as { id: string }).id

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!profile) {
    return (
      <div className="bg-surface rounded-xl border border-border px-5 py-12 text-center">
        <p className="text-sm text-muted-foreground">You need a creator profile to receive commissions.</p>
      </div>
    )
  }

  const [requests, quotes] = await Promise.all([
    prisma.commissionRequest.findMany({
      where: { creatorId: profile.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { buyer: { select: { name: true } } },
    }),
    prisma.commissionQuote.findMany({
      where: { creatorId: profile.id, status: { not: 'ACCEPTED' } },
      orderBy: { updatedAt: 'desc' },
      include: { buyer: { select: { name: true } } },
    }),
  ])

  const isFirstTime = requests.length === 0 && quotes.length === 0

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Manage incoming custom work requests and the quotes you issue.
        </p>
        <Link
          href="/dashboard/commissions/quotes/new"
          className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90"
        >
          <Plus className="size-4" />
          New quote
        </Link>
      </div>

      {isFirstTime && (
        <div className="bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/15">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">New to commissions on noizu.direct?</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-lg">
                Walk through how a commission moves from request to payout — scope, pricing,
                escrow, delivery, and the timings that protect you.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/commissions/how-it-works"
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 shrink-0"
          >
            See how it works
            <ArrowRight className="size-4" />
          </Link>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Inbox className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Incoming requests</h2>
          <span className="text-xs text-muted-foreground">({requests.length})</span>
        </div>

        {requests.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">No pending requests right now.</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {requests.map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/commissions/requests/${r.id}`}
                  className="block bg-surface rounded-xl border border-border p-4 active:bg-card/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-foreground font-semibold text-sm truncate flex-1 min-w-0">{r.title}</p>
                    <span className="text-[11px] text-muted-foreground shrink-0">{expiresInLabel(r.expiresAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {r.briefText.slice(0, 120)}{r.briefText.length > 120 ? '…' : ''}
                  </p>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground truncate">{r.buyer?.name ?? 'Unknown'}</span>
                    <span className="text-foreground font-medium shrink-0">{budgetRange(r.budgetMinUsd, r.budgetMaxUsd)}</span>
                  </div>
                </Link>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block bg-surface rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="px-5 py-3 text-left font-medium">Buyer</th>
                    <th className="px-5 py-3 text-left font-medium">Request</th>
                    <th className="px-5 py-3 text-left font-medium">Budget</th>
                    <th className="px-5 py-3 text-left font-medium">Expires</th>
                    <th className="px-5 py-3 text-left font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-card/50">
                      <td className="px-5 py-3 text-foreground">{r.buyer?.name ?? 'Unknown'}</td>
                      <td className="px-5 py-3">
                        <p className="text-foreground font-medium truncate max-w-[260px]">{r.title}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[260px]">
                          {r.briefText.slice(0, 80)}{r.briefText.length > 80 ? '…' : ''}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {budgetRange(r.budgetMinUsd, r.budgetMaxUsd)}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {expiresInLabel(r.expiresAt)}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/dashboard/commissions/requests/${r.id}`}
                          className="text-sm text-primary hover:text-primary/80 font-medium"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">My quotes</h2>
          <span className="text-xs text-muted-foreground">({quotes.length})</span>
        </div>

        {quotes.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border px-5 py-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">You haven&apos;t issued any quotes yet.</p>
            <Link
              href="/dashboard/commissions/quotes/new"
              className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90"
            >
              <Plus className="size-4" />
              Create your first quote
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {quotes.map((q) => (
                <Link
                  key={q.id}
                  href={`/dashboard/commissions/quotes/${q.id}`}
                  className="block bg-surface rounded-xl border border-border p-4 active:bg-card/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-foreground font-semibold text-sm truncate flex-1 min-w-0">{q.title}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${quoteStatusStyles[q.status] ?? 'bg-muted-foreground/20 text-muted-foreground'}`}>
                      {q.status}
                    </span>
                  </div>
                  {q.isMilestoneBased && (
                    <p className="text-[11px] text-muted-foreground mb-2">Milestone-based</p>
                  )}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground truncate">{q.buyer?.name ?? 'Unknown'}</span>
                    <span className="text-foreground font-semibold shrink-0">${(q.amountUsd / 100).toFixed(2)}</span>
                  </div>
                </Link>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block bg-surface rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="px-5 py-3 text-left font-medium">Buyer</th>
                    <th className="px-5 py-3 text-left font-medium">Title</th>
                    <th className="px-5 py-3 text-left font-medium">Amount</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-left font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id} className="border-b border-border last:border-0 hover:bg-card/50">
                      <td className="px-5 py-3 text-foreground">{q.buyer?.name ?? 'Unknown'}</td>
                      <td className="px-5 py-3">
                        <p className="text-foreground truncate max-w-[260px]">{q.title}</p>
                        {q.isMilestoneBased && (
                          <p className="text-xs text-muted-foreground">Milestone-based</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-foreground">${(q.amountUsd / 100).toFixed(2)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${quoteStatusStyles[q.status] ?? 'bg-muted-foreground/20 text-muted-foreground'}`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/dashboard/commissions/quotes/${q.id}`}
                          className="text-sm text-primary hover:text-primary/80 font-medium"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
