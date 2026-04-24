import { auth } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ArrowLeft, CircleDot, CheckCircle2, ExternalLink, ShieldAlert } from 'lucide-react'
import { canPostInTicket, markTicketRead, isAutoCloseBlocked } from '@/lib/tickets'
import { TicketThread } from './TicketThread'

export default async function CreatorTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  const { id } = await params

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      buyer: { select: { id: true, name: true, avatar: true, email: true } },
      creator: { select: { id: true, name: true } },
      commissionRequest: { select: { id: true, title: true, status: true } },
      commissionQuote: { select: { id: true, title: true, status: true, amountUsd: true } },
      order: { select: { id: true, status: true, product: { select: { title: true } } } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { id: true, name: true, avatar: true } } },
      },
    },
  })
  if (!ticket) notFound()
  if (ticket.creatorId !== userId) notFound()

  const perm = await canPostInTicket(userId, ticket)
  await markTicketRead(ticket.id, userId)
  const closeBlocker = ticket.status === 'OPEN' ? await isAutoCloseBlocked(ticket.id) : null
  const block = await prisma.userBlock.findUnique({
    where: { blockerId_blockedId: { blockerId: userId, blockedId: ticket.buyerId } },
    select: { id: true },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/tickets"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> All tickets
        </Link>
      </div>

      <div className="bg-surface rounded-xl border border-border p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-muted-foreground/15 text-muted-foreground">
            {ticket.kind.toLowerCase()}
          </span>
          {ticket.status === 'OPEN' ? (
            <span className="inline-flex items-center gap-1 text-xs text-secondary font-semibold">
              <CircleDot className="size-3.5" /> Open
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-semibold">
              <CheckCircle2 className="size-3.5" /> Closed
              {ticket.purgeAt && (
                <span className="ml-1 text-muted-foreground/80">
                  · purges {new Date(ticket.purgeAt).toLocaleDateString()}
                </span>
              )}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-foreground">{ticket.subject}</h1>
        <div className="text-xs text-muted-foreground">
          Opened by {ticket.openedById === ticket.buyerId ? 'buyer' : 'system'} on{' '}
          {new Date(ticket.createdAt).toLocaleString()}
        </div>

        <div className="grid gap-2 pt-2">
          <div className="text-xs text-muted-foreground">
            Buyer:{' '}
            <span className="text-foreground font-medium">{ticket.buyer.name ?? 'Unknown'}</span>
            {ticket.buyer.email && <> · {ticket.buyer.email}</>}
          </div>
          {ticket.commissionRequest && (
            <LinkedRow
              href={`/dashboard/commissions/requests/${ticket.commissionRequest.id}`}
              label="Commission request"
              title={ticket.commissionRequest.title}
              status={ticket.commissionRequest.status}
            />
          )}
          {ticket.commissionQuote && (
            <LinkedRow
              href={`/dashboard/commissions/quotes/${ticket.commissionQuote.id}`}
              label="Quote"
              title={`${ticket.commissionQuote.title} · USD ${(ticket.commissionQuote.amountUsd / 100).toFixed(2)}`}
              status={ticket.commissionQuote.status}
            />
          )}
          {ticket.order && (
            <LinkedRow
              href={`/dashboard/orders/${ticket.order.id}`}
              label="Order"
              title={ticket.order.product?.title ?? ticket.order.id}
              status={ticket.order.status}
            />
          )}
        </div>
      </div>

      {block && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-center gap-2">
          <ShieldAlert className="size-4 text-amber-500" />
          <p className="text-xs text-foreground">
            You&apos;ve blocked this buyer. They can&apos;t reply or open new tickets with you.
          </p>
        </div>
      )}

      <TicketThread
        ticketId={ticket.id}
        status={ticket.status as 'OPEN' | 'CLOSED'}
        viewerId={userId}
        viewerIsCreator
        otherParty={{
          id: ticket.buyer.id,
          name: ticket.buyer.name ?? 'Buyer',
          avatar: ticket.buyer.avatar ?? null,
        }}
        initialMessages={ticket.messages.map((m) => ({
          id: m.id,
          body: m.deletedAt ? '[message removed]' : m.body,
          senderId: m.senderId,
          senderName: m.sender?.name ?? 'Unknown',
          senderAvatar: m.sender?.avatar ?? null,
          systemKind: m.systemKind,
          createdAt: m.createdAt.toISOString(),
          reportedAt: m.reportedAt ? m.reportedAt.toISOString() : null,
        }))}
        canReply={perm.canReply}
        readOnlyReason={perm.readOnlyReason}
        closeBlocker={closeBlocker}
        blockedBuyer={Boolean(block)}
      />
    </div>
  )
}

function LinkedRow({
  href,
  label,
  title,
  status,
}: {
  href: string
  label: string
  title: string
  status: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2 hover:border-primary/40 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground truncate">{title}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-muted-foreground">{status}</span>
        <ExternalLink className="size-3.5 text-muted-foreground" />
      </div>
    </Link>
  )
}
