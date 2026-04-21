import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

/**
 * Creator-side roster of paying supporters.
 * Split into three sections:
 *   - Active (currently charging)
 *   - Ending (cancelAtPeriodEnd — keep them warm until the period rolls)
 *   - Past due (retry in progress — creator should know in case they ping the fan)
 *
 * MRR card up top = sum(amountUsd) across ACTIVE subs. Past-due are excluded
 * from MRR so the number doesn't stay inflated while dunning resolves.
 */
export default async function DashboardSubscribersPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as { id: string }).id

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (!profile) redirect('/dashboard')

  const subs = await prisma.supportSubscription.findMany({
    where: {
      creatorId: profile.id,
      status: { in: ['ACTIVE', 'PAST_DUE'] },
    },
    orderBy: [{ createdAt: 'desc' }],
    include: {
      supporter: {
        select: { id: true, name: true, avatar: true },
      },
      tier: {
        select: { id: true, name: true },
      },
    },
  })

  const active   = subs.filter(s => s.status === 'ACTIVE' && !s.cancelAtPeriodEnd)
  const ending   = subs.filter(s => s.status === 'ACTIVE' && s.cancelAtPeriodEnd)
  const pastDue  = subs.filter(s => s.status === 'PAST_DUE')

  // MRR = active only (paying + renewing). Ending still contribute one more
  // charge but cadence-wise they're on their way out, so exclude for clarity.
  const mrrCents = active.reduce((sum, s) => sum + s.amountUsd, 0)
  const totalSupportersCount = active.length + ending.length

  // Lifetime counts
  const [canceledTotal, allTimeCount] = await Promise.all([
    prisma.supportSubscription.count({ where: { creatorId: profile.id, status: 'CANCELED' } }),
    prisma.supportSubscription.count({ where: { creatorId: profile.id, status: { not: 'PENDING' } } }),
  ])

  function fmtDate(d: Date | null): string {
    if (!d) return '—'
    return d.toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  type SubWithRelations = typeof subs[number]
  function Row({ sub }: { sub: SubWithRelations }) {
    const supporter = sub.supporter
    const displayName = supporter?.name ?? 'Anonymous'
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        {supporter?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={supporter.avatar} alt={displayName} className="size-10 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-white">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {sub.type === 'TIER' ? (sub.tier?.name ?? 'Membership') : 'Monthly gift'}
            {' · '}
            <span className="font-medium text-foreground">${(sub.amountUsd / 100).toFixed(2)}/mo</span>
          </p>
        </div>
        <div className="shrink-0 text-right text-xs text-muted-foreground">
          {sub.status === 'PAST_DUE' ? (
            <>
              <p className="text-warning font-semibold">Past due</p>
              <p>retry {fmtDate(sub.nextRetryAt)}</p>
            </>
          ) : sub.cancelAtPeriodEnd ? (
            <>
              <p className="text-warning">Ending</p>
              <p>{fmtDate(sub.currentPeriodEnd)}</p>
            </>
          ) : (
            <>
              <p>Renews</p>
              <p>{fmtDate(sub.currentPeriodEnd)}</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscribers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your paying supporters — the fans who keep the lights on.
          </p>
        </div>
        <Link
          href="/dashboard/support"
          className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-border/40 transition-colors"
        >
          Manage tiers
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">MRR</p>
          <p className="mt-1 text-2xl font-bold text-foreground">${(mrrCents / 100).toFixed(2)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Recurring monthly revenue</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subscribers</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalSupportersCount}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {active.length} active · {ending.length} ending
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">All time</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{allTimeCount}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{canceledTotal} churned</p>
        </div>
      </div>

      {/* Past due — highlight first */}
      {pastDue.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-warning">Past due · {pastDue.length}</h2>
          <div className="space-y-2">
            {pastDue.map(s => <Row key={s.id} sub={s} />)}
          </div>
        </section>
      )}

      {/* Active */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Active · {active.length}</h2>
        {active.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No active subscribers yet. Share your page to invite supporters.
          </div>
        ) : (
          <div className="space-y-2">
            {active.map(s => <Row key={s.id} sub={s} />)}
          </div>
        )}
      </section>

      {/* Ending */}
      {ending.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Ending · {ending.length}</h2>
          <div className="space-y-2">
            {ending.map(s => <Row key={s.id} sub={s} />)}
          </div>
        </section>
      )}
    </div>
  )
}
