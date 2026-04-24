import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getR2Url } from '@/lib/r2'
import { canCreatorBroadcast, RATE_LIMIT_PER_DAY, RATE_LIMIT_PER_MONTH } from '@/lib/broadcasts'
import { Megaphone, Plus, Users, Heart, Image as ImageIcon } from 'lucide-react'
import { BroadcastDeleteButton } from './BroadcastDeleteButton'

const TEMPLATE_LABEL: Record<string, string> = {
  NEW_DROP: 'New Drop',
  FLASH_SALE: 'Flash Sale',
  BEHIND_SCENES: 'Behind the Scenes',
  EVENT: 'Event',
  THANK_YOU: 'Thank You',
  MILESTONE: 'Milestone',
}

function formatWhen(d: Date): string {
  const now = Date.now()
  const t = d.getTime()
  const diffMin = Math.round((now - t) / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function DashboardBroadcastsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id as string

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (!profile) redirect('/dashboard')

  const [rows, eligibility] = await Promise.all([
    prisma.broadcast.findMany({
      where: { creatorId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        body: true,
        template: true,
        audience: true,
        imageKey: true,
        createdAt: true,
        _count: { select: { notifications: true } },
      },
    }),
    canCreatorBroadcast(profile.id),
  ])

  const disabled = !eligibility.ok
  const sentToday = eligibility.ok ? undefined : eligibility.sentToday
  const sentThisMonth = eligibility.ok ? undefined : eligibility.sentThisMonth

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Megaphone className="size-6" />
            Broadcasts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Send announcements to your followers or supporters. Read-only — replies go through tickets.
          </p>
        </div>
        <Link
          href="/dashboard/broadcasts/compose"
          aria-disabled={disabled}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${
            disabled
              ? 'bg-surface text-muted-foreground pointer-events-none'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          <Plus className="size-4" />
          New broadcast
        </Link>
      </div>

      {disabled && (
        <div className="rounded-xl border border-border bg-surface p-3 text-sm text-muted-foreground">
          {eligibility.reason === 'daily_cap' ? (
            <>You've hit the daily cap of {RATE_LIMIT_PER_DAY} broadcasts ({sentToday} sent today). New sends unlock tomorrow.</>
          ) : (
            <>You've hit the monthly cap of {RATE_LIMIT_PER_MONTH} broadcasts ({sentThisMonth} sent this month). New sends unlock in the next rolling window.</>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Megaphone className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">No broadcasts yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Send your first announcement to let fans know what you're up to.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map(r => (
            <li key={r.id} className="flex gap-3 rounded-xl border border-border bg-surface p-3">
              <div className="shrink-0">
                {r.imageKey ? (
                  <img
                    src={getR2Url(r.imageKey)}
                    alt=""
                    className="size-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-lg bg-background">
                    <ImageIcon className="size-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{r.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{r.body}</p>
                  </div>
                  <BroadcastDeleteButton id={r.id} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="rounded-full bg-background px-2 py-0.5 font-medium text-foreground">
                    {TEMPLATE_LABEL[r.template] ?? r.template}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {r.audience === 'SUBSCRIBERS_ONLY' ? (
                      <>
                        <Heart className="size-3" /> Supporters only
                      </>
                    ) : (
                      <>
                        <Users className="size-3" /> All followers
                      </>
                    )}
                  </span>
                  <span>{r._count.notifications} recipient{r._count.notifications === 1 ? '' : 's'}</span>
                  <span>· {formatWhen(r.createdAt)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
