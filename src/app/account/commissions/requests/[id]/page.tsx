import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { WithdrawRequestButton } from './WithdrawRequestButton'

function fmtUsd(cents: number) { return '$' + (cents / 100).toFixed(2) }

export default async function BuyerRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const { id } = await params

  const request = await prisma.commissionRequest.findUnique({
    where: { id },
    include: {
      creator: { select: { username: true, user: { select: { name: true, avatar: true } } } },
      quotes: {
        where: { status: { in: ['SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'] } },
        orderBy: { createdAt: 'desc' },
        include: { milestones: { orderBy: { order: 'asc' } } },
      },
    },
  })
  if (!request) notFound()
  if (request.buyerId !== session.user.id) redirect('/account/commissions')

  let refs: string[] = []
  try { refs = JSON.parse(request.referenceImages) as string[] } catch {}
  const creatorName = request.creator.user.name ?? request.creator.username

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/account/commissions" className="text-sm text-muted-foreground hover:text-foreground">&larr; Back</Link>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{request.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">Sent to {creatorName} · {request.createdAt.toISOString().slice(0,10)}</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Brief</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{request.briefText}</p>
        </div>
        {(request.budgetMinUsd != null || request.budgetMaxUsd != null) && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Budget</p>
            <p className="text-sm text-foreground">
              {request.budgetMinUsd != null && request.budgetMaxUsd != null
                ? `${fmtUsd(request.budgetMinUsd)} – ${fmtUsd(request.budgetMaxUsd)}`
                : request.budgetMinUsd != null ? `From ${fmtUsd(request.budgetMinUsd)}` : `Up to ${fmtUsd(request.budgetMaxUsd!)}`}
            </p>
          </div>
        )}
        {request.deadlineAt && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Deadline</p>
            <p className="text-sm text-foreground">{request.deadlineAt.toISOString().slice(0,10)}</p>
          </div>
        )}
        {refs.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">References</p>
            <div className="flex flex-wrap gap-2">
              {refs.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="reference" className="w-24 h-24 object-cover rounded-lg border border-border" />
              ))}
            </div>
          </div>
        )}
        {request.status === 'DECLINED' && request.declineReason && (
          <div className="p-3 rounded-lg bg-red-500/10 text-sm text-red-400">
            <p className="font-semibold mb-1">Declined</p>
            <p>{request.declineReason}</p>
          </div>
        )}
      </div>

      {request.quotes.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Quotes</h2>
          <div className="space-y-3">
            {request.quotes.map(q => (
              <Link key={q.id} href={`/account/commissions/quotes/${q.id}`} className="block bg-card border border-border rounded-xl p-4 hover:border-primary/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{q.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {q.isMilestoneBased ? `${q.milestones.length} milestones` : `Single payment`} · {q.turnaroundDays}d turnaround
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">{fmtUsd(q.amountUsd)}</p>
                    <span className="text-xs text-muted-foreground">{q.status}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {['PENDING', 'QUOTED'].includes(request.status) && (
        <WithdrawRequestButton id={request.id} />
      )}
    </div>
  )
}
