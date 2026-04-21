import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { QuoteViewActions } from './QuoteViewActions'

function fmtUsd(cents: number) { return '$' + (cents / 100).toFixed(2) }

export default async function CreatorQuoteViewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const { id } = await params

  const quote = await prisma.commissionQuote.findUnique({
    where: { id },
    include: {
      creator: { select: { userId: true } },
      buyer: { select: { name: true, email: true } },
      milestones: { orderBy: { order: 'asc' } },
      order: { select: { id: true } },
    },
  })
  if (!quote) notFound()
  if (quote.creator.userId !== session.user.id) redirect('/dashboard/commissions')

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/dashboard/commissions" className="text-sm text-muted-foreground hover:text-foreground">&larr; Back</Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{quote.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            To {quote.buyer.name ?? quote.buyer.email} · {quote.createdAt.toISOString().slice(0, 10)}
          </p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded bg-muted text-foreground">{quote.status}</span>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <p className="text-sm text-foreground whitespace-pre-wrap">{quote.description}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-border">
          <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-semibold text-foreground">{fmtUsd(quote.amountUsd)}</p></div>
          {!quote.isMilestoneBased && (
            <div><p className="text-xs text-muted-foreground">Deposit</p><p className="font-semibold text-foreground">{quote.depositPercent}%</p></div>
          )}
          <div><p className="text-xs text-muted-foreground">Revisions</p><p className="font-semibold text-foreground">{quote.revisionsIncluded}</p></div>
          <div><p className="text-xs text-muted-foreground">Turnaround</p><p className="font-semibold text-foreground">{quote.turnaroundDays}d</p></div>
        </div>
      </div>

      {quote.isMilestoneBased && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Milestones</h2>
          <div className="space-y-2">
            {quote.milestones.map((m, i) => (
              <div key={m.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{i + 1}. {m.title}</p>
                  {m.description && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{m.description}</p>}
                </div>
                <p className="text-sm font-semibold text-foreground shrink-0">{fmtUsd(m.amountUsd)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <QuoteViewActions id={quote.id} status={quote.status} orderId={quote.order?.id ?? null} />
    </div>
  )
}
