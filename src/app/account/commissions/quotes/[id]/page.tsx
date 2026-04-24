import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { QuoteAcceptActions } from './QuoteAcceptActions'
import { MilestoneBuyerActions } from './MilestoneBuyerActions'
import { getProcessingFeePercent, feeOnSubtotal } from '@/lib/platform-fees'

function fmtUsd(cents: number) { return '$' + (cents / 100).toFixed(2) }

export default async function BuyerQuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const { id } = await params

  const quote = await prisma.commissionQuote.findUnique({
    where: { id },
    include: {
      creator: { select: { username: true, user: { select: { name: true, avatar: true } } } },
      milestones: { orderBy: { order: 'asc' } },
      order: { select: { id: true, status: true, escrowStatus: true, commissionStatus: true, commissionIsMilestoneBased: true } },
    },
  })
  if (!quote) notFound()
  if (quote.buyerId !== session.user.id) redirect('/account/commissions')
  if (quote.status === 'DRAFT') notFound() // drafts never visible to buyer

  const creatorName = quote.creator.user.name ?? quote.creator.username
  const deposit = Math.round(quote.amountUsd * (quote.depositPercent / 100))

  const feePercent   = await getProcessingFeePercent()
  const processingFee = feeOnSubtotal(quote.amountUsd, feePercent / 100)
  const totalDue     = quote.amountUsd + processingFee

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/account/commissions" className="text-sm text-muted-foreground hover:text-foreground">&larr; Back</Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{quote.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">Quote from {creatorName} · {quote.createdAt.toISOString().slice(0,10)}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded bg-muted text-foreground">{quote.status}</span>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{quote.description}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-border">
          <div><p className="text-xs text-muted-foreground">Amount</p><p className="text-lg font-semibold text-foreground">{fmtUsd(quote.amountUsd)}</p></div>
          {!quote.isMilestoneBased && (
            <div><p className="text-xs text-muted-foreground">Deposit</p><p className="text-lg font-semibold text-foreground">{quote.depositPercent}% ({fmtUsd(deposit)})</p></div>
          )}
          <div><p className="text-xs text-muted-foreground">Revisions</p><p className="text-lg font-semibold text-foreground">{quote.revisionsIncluded}</p></div>
          <div><p className="text-xs text-muted-foreground">Turnaround</p><p className="text-lg font-semibold text-foreground">{quote.turnaroundDays}d</p></div>
        </div>
        {quote.termsText && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Terms</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{quote.termsText}</p>
          </div>
        )}
      </div>

      {quote.isMilestoneBased && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Milestones ({quote.milestones.length})</h2>
          <div className="space-y-2">
            {quote.milestones.map((m, i) => (
              <div key={m.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{i + 1}. {m.title}</p>
                    {m.description && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{m.description}</p>}
                    {quote.order && (
                      <p className="text-xs mt-2 inline-block px-2 py-0.5 rounded bg-muted text-foreground">{m.status}</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground shrink-0">{fmtUsd(m.amountUsd)}</p>
                </div>
                {quote.order && m.status === 'DELIVERED' && m.deliveryNote && (
                  <div className="mt-3 p-3 rounded bg-muted/50">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Delivery note</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{m.deliveryNote}</p>
                  </div>
                )}
                {quote.order && m.status === 'DELIVERED' && (
                  <MilestoneBuyerActions milestoneId={m.id} revisionsRemaining={m.revisionsAllowed - m.revisionsUsed} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {quote.status === 'SENT' && (
        <>
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">You&apos;re paying</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground truncate">{quote.title}</span>
                  <span className="text-foreground shrink-0">{fmtUsd(quote.amountUsd)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Processing fee ({feePercent}%)</span>
                  <span className="text-foreground shrink-0">{fmtUsd(processingFee)}</span>
                </div>
                <div className="flex justify-between gap-4 pt-2 border-t border-border">
                  <span className="font-semibold text-foreground">Total (USD)</span>
                  <span className="font-semibold text-foreground shrink-0">{fmtUsd(totalDue)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 pt-3 border-t border-border">
              <Lock className="size-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                <p className="text-foreground font-medium">You pay the full amount now — it sits in escrow, not with the creator.</p>
                {quote.isMilestoneBased ? (
                  <p>
                    noizu.direct releases funds to the creator milestone by milestone — <span className="text-foreground">only when you approve each deliverable</span> (or after 14 days of no response from you). The creator can&apos;t release funds themselves.
                  </p>
                ) : (
                  <p>
                    Of that total, {quote.depositPercent}% releases to the creator 48 hours after they accept your order
                    {quote.depositPercent < 100 ? <> (so they can start work), and the remaining {100 - quote.depositPercent}% releases 30 days after delivery — <span className="text-foreground">sooner if you approve early</span></> : null}
                    . The creator can&apos;t release funds themselves — you&apos;re protected by noizu.direct until then.
                  </p>
                )}
              </div>
            </div>
          </div>
          <QuoteAcceptActions quoteId={quote.id} />
        </>
      )}
      {quote.status === 'ACCEPTED' && quote.order && (
        <Link href={`/account/orders/${quote.order.id}`} className="inline-block text-sm px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90">
          View order
        </Link>
      )}
    </div>
  )
}
