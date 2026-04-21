import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { RequestActions } from './RequestActions'

function fmtUsd(cents: number) { return '$' + (cents / 100).toFixed(2) }

export default async function CreatorRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const { id } = await params

  const request = await prisma.commissionRequest.findUnique({
    where: { id },
    include: {
      buyer: { select: { id: true, name: true, email: true, avatar: true } },
      creator: { select: { userId: true } },
      quotes: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, amountUsd: true, isMilestoneBased: true },
      },
    },
  })
  if (!request) notFound()
  if (request.creator.userId !== session.user.id) redirect('/dashboard/commissions')

  let refs: string[] = []
  try { refs = JSON.parse(request.referenceImages) as string[] } catch {}

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/dashboard/commissions" className="text-sm text-muted-foreground hover:text-foreground">&larr; Back to inbox</Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{request.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">From {request.buyer.name ?? request.buyer.email} · {request.createdAt.toISOString().slice(0,10)} · <span className="px-2 py-0.5 rounded bg-muted">{request.status}</span></p>
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
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Desired deadline</p>
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
      </div>

      {request.quotes.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Your quotes on this request</h2>
          <div className="space-y-2">
            {request.quotes.map(q => (
              <Link key={q.id} href={`/dashboard/commissions/quotes/${q.id}`} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg hover:border-primary/40">
                <p className="text-sm text-foreground">{fmtUsd(q.amountUsd)} · {q.isMilestoneBased ? 'Milestone' : 'Single'}</p>
                <span className="text-xs px-2 py-0.5 rounded bg-muted text-foreground">{q.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {request.status === 'PENDING' && <RequestActions id={request.id} />}
    </div>
  )
}
