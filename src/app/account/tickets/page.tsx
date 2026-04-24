import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Ticket as TicketIcon, Inbox, ArrowRight, CircleDot, CheckCircle2, Plus } from 'lucide-react'
import { computeUnreadTicketCountsByStatus } from '@/lib/tickets'

function formatWhen(date: Date): string {
  const diff = Date.now() - date.getTime()
  const hr = diff / (1000 * 60 * 60)
  if (hr < 1) return `${Math.max(1, Math.floor(diff / (1000 * 60)))}m ago`
  if (hr < 24) return `${Math.floor(hr)}h ago`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

function kindLabel(kind: string): string {
  if (kind === 'COMMISSION') return 'Commission'
  if (kind === 'QUOTE') return 'Quote'
  if (kind === 'ORDER') return 'Order'
  return 'General'
}

function kindTone(kind: string): string {
  if (kind === 'COMMISSION') return 'bg-secondary/15 text-secondary'
  if (kind === 'QUOTE') return 'bg-blue-500/15 text-blue-400'
  if (kind === 'ORDER') return 'bg-primary/15 text-primary'
  return 'bg-muted-foreground/15 text-muted-foreground'
}

export default async function BuyerTicketsInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  const { status: statusParam } = await searchParams
  const status = statusParam === 'CLOSED' ? 'CLOSED' : 'OPEN'

  const [tickets, unreadCounts, activeCount, archiveCount] = await Promise.all([
    prisma.ticket.findMany({
      where: { buyerId: userId, status },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, createdAt: true, senderId: true, systemKind: true },
        },
        readMarkers: { where: { userId }, select: { lastReadAt: true } },
      },
    }),
    computeUnreadTicketCountsByStatus(userId),
    prisma.ticket.count({ where: { buyerId: userId, status: 'OPEN' } }),
    prisma.ticket.count({ where: { buyerId: userId, status: 'CLOSED' } }),
  ])
  const isArchive = status === 'CLOSED'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TicketIcon className="size-6 text-primary" />
            My tickets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every commission, quote, order, or question you open is tracked here as a dedicated ticket.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/account/tickets/how-it-works"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            How tickets work
          </Link>
          <Link
            href="/account/tickets/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3 py-2 text-xs font-semibold text-white transition-colors"
          >
            <Plus className="size-3.5" /> New ticket
          </Link>
        </div>
      </div>

      {unreadCounts.total > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center gap-3">
          <Inbox className="size-4 text-primary" />
          <p className="text-sm text-foreground">
            You have <strong>{unreadCounts.total}</strong> ticket{unreadCounts.total === 1 ? '' : 's'} with new activity.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <TabLink
          active={!isArchive}
          href="/account/tickets"
          label={`Active (${activeCount})`}
          unread={unreadCounts.active}
        />
        <TabLink
          active={isArchive}
          href="/account/tickets?status=CLOSED"
          label={`Archive (${archiveCount})`}
          unread={unreadCounts.archive}
        />
      </div>

      {tickets.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border px-5 py-12 text-center">
          <Inbox className="mx-auto size-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">
            No {isArchive ? 'archived' : 'active'} tickets
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isArchive
              ? 'Closed tickets move here and are retained for 90 days before being removed.'
              : 'Your tickets open automatically when you place an order, send a commission request, or receive a quote. You can also open a general ticket.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
          {tickets.map((t) => {
            const marker = t.readMarkers[0]
            const unread = !marker || marker.lastReadAt < t.lastMessageAt
            const last = t.messages[0]
            const lastBody = last?.systemKind ? `— ${last.body}` : last?.body ?? 'No messages yet.'
            return (
              <li key={t.id}>
                <Link
                  href={`/account/tickets/${t.id}`}
                  className="flex items-start gap-3 px-4 py-4 hover:bg-card transition-colors"
                >
                  <div className="shrink-0 size-9 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center text-xs font-bold text-white">
                    {t.creator.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${kindTone(t.kind)}`}>
                        {kindLabel(t.kind)}
                      </span>
                      {t.status === 'OPEN' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-secondary font-semibold">
                          <CircleDot className="size-3" /> Open
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
                          <CheckCircle2 className="size-3" /> Closed
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">with {t.creator.name ?? 'creator'}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{formatWhen(t.lastMessageAt)}</span>
                    </div>
                    <p className={`mt-1 text-sm truncate ${unread ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                      {t.subject}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">{lastBody}</p>
                  </div>
                  {unread && (
                    <span className="mt-1 inline-block size-2 rounded-full bg-primary shrink-0" />
                  )}
                  <ArrowRight className="size-4 text-muted-foreground mt-1 shrink-0" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function TabLink({
  active,
  href,
  label,
  unread = 0,
}: {
  active: boolean
  href: string
  label: string
  unread?: number
}) {
  return (
    <Link
      href={href}
      className={`relative inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
        active
          ? 'bg-primary text-white border-primary'
          : 'bg-surface text-muted-foreground border-border hover:text-foreground hover:border-primary/40'
      }`}
    >
      {label}
      {unread > 0 && (
        <span
          aria-label={`${unread} unread`}
          className={`inline-flex items-center justify-center rounded-full text-[10px] font-bold min-w-4 h-4 px-1 ${
            active ? 'bg-white text-primary' : 'bg-primary text-white'
          }`}
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
