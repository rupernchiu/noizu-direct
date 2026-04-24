import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import type { Prisma, Ticket } from '@/generated/prisma/client'

// ── Ticket domain rules ──────────────────────────────────────────────────────
//
// Only buyers open tickets. Only creators close them. Both sides post inside.
// One ticket per inquiry — new question = new ticket. Auto-open hooks wire
// commission requests, quotes, and orders to dedicated tickets on create.
// Retention: hard-delete 90d after close; pause during active dispute.
// Auto-close: 30d two-sided silence unless linked work is in-flight.

export type TicketKind = 'GENERAL' | 'QUOTE' | 'COMMISSION' | 'ORDER'
export type TicketStatus = 'OPEN' | 'CLOSED'
export type TicketAutoSource = 'REQUEST' | 'QUOTE' | 'ORDER' | null

export const SUBJECT_MAX = 140
export const BODY_MAX = 5000

export function normaliseSubject(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, SUBJECT_MAX)
}

export function hasAngleBrackets(s: string): boolean {
  return /[<>]/.test(s)
}

// ── Block checks ─────────────────────────────────────────────────────────────

export async function isBlocked(
  creatorUserId: string,
  buyerUserId: string,
): Promise<boolean> {
  const hit = await prisma.userBlock.findUnique({
    where: { blockerId_blockedId: { blockerId: creatorUserId, blockedId: buyerUserId } },
    select: { id: true },
  })
  return Boolean(hit)
}

// ── Create / attach ──────────────────────────────────────────────────────────

export interface OpenTicketArgs {
  kind: TicketKind
  buyerId: string
  creatorId: string // User.id of creator (NOT CreatorProfile.id)
  subject: string
  openedById: string
  openedAutoSource?: TicketAutoSource
  link?: {
    commissionRequestId?: string
    commissionQuoteId?: string
    orderId?: string
  }
  seedBody?: string
}

/**
 * Open a new ticket, or return the existing one if a linked entity (request,
 * quote, or order) already has one. Writes a "TICKET_OPENED" system message +
 * optional seed user message. Safe to call inside a prisma.$transaction — pass
 * the tx client as the second arg. If called outside a transaction, uses the
 * top-level prisma client.
 *
 * Throws if the buyer is blocked by the creator.
 */
export async function openOrAttachTicket(
  args: OpenTicketArgs,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<Ticket> {
  // Check for existing ticket on the linked entity.
  const link = args.link ?? {}
  if (link.commissionRequestId) {
    const existing = await tx.ticket.findUnique({
      where: { commissionRequestId: link.commissionRequestId },
    })
    if (existing) return existing
  }
  if (link.commissionQuoteId) {
    const existing = await tx.ticket.findUnique({
      where: { commissionQuoteId: link.commissionQuoteId },
    })
    if (existing) return existing
  }
  if (link.orderId) {
    const existing = await tx.ticket.findUnique({
      where: { orderId: link.orderId },
    })
    if (existing) return existing
  }

  // Block check (checked here so auto-open hooks can't sneak around it).
  const blocked = await tx.userBlock.findUnique({
    where: {
      blockerId_blockedId: { blockerId: args.creatorId, blockedId: args.buyerId },
    },
    select: { id: true },
  })
  if (blocked) {
    throw new TicketBlockedError('You are blocked from opening tickets with this creator.')
  }

  const now = new Date()
  const subject = normaliseSubject(args.subject) || 'Untitled ticket'

  const ticket = await tx.ticket.create({
    data: {
      subject,
      kind: args.kind,
      status: 'OPEN',
      buyerId: args.buyerId,
      creatorId: args.creatorId,
      openedById: args.openedById,
      openedAutoSource: args.openedAutoSource ?? null,
      commissionRequestId: link.commissionRequestId ?? null,
      commissionQuoteId: link.commissionQuoteId ?? null,
      orderId: link.orderId ?? null,
      lastMessageAt: now,
    },
  })

  // System "opened" marker
  await tx.ticketMessage.create({
    data: {
      ticketId: ticket.id,
      senderId: args.openedById,
      body: openedSystemBody(args.kind, args.openedAutoSource ?? null),
      systemKind: 'OPENED',
      createdAt: now,
    },
  })

  // Optional seed message from the opener (e.g. commission brief).
  if (args.seedBody && args.seedBody.trim()) {
    const body = args.seedBody.trim().slice(0, BODY_MAX)
    await tx.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: args.openedById,
        body,
        createdAt: now,
      },
    })
    if (args.openedById === args.buyerId) {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { lastBuyerMessageAt: now },
      })
    } else {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { lastCreatorMessageAt: now },
      })
    }
  }

  return ticket
}

function openedSystemBody(kind: TicketKind, source: TicketAutoSource): string {
  if (source === 'REQUEST') return 'Ticket opened from a commission request.'
  if (source === 'QUOTE') return 'Ticket opened from a quote.'
  if (source === 'ORDER') return 'Ticket opened for this order.'
  if (kind === 'GENERAL') return 'Ticket opened.'
  return 'Ticket opened.'
}

// ── Posting rules ────────────────────────────────────────────────────────────

export interface TicketPostPermission {
  canReply: boolean
  readOnlyReason: string | null // null when canReply = true
}

/**
 * Is `userId` allowed to post a user message in `ticket` right now?
 * - Closed tickets: nobody posts (use reopen).
 * - Blocked buyer: can't post; creator still can.
 * - Non-party user: can't post.
 */
export async function canPostInTicket(
  userId: string,
  ticket: Pick<Ticket, 'id' | 'status' | 'buyerId' | 'creatorId'>,
): Promise<TicketPostPermission> {
  const isBuyer = userId === ticket.buyerId
  const isCreator = userId === ticket.creatorId
  if (!isBuyer && !isCreator) return { canReply: false, readOnlyReason: 'Not a ticket party.' }

  if (ticket.status === 'CLOSED') {
    return { canReply: false, readOnlyReason: 'Ticket is closed.' }
  }

  if (isBuyer) {
    const blocked = await isBlocked(ticket.creatorId, ticket.buyerId)
    if (blocked) {
      return { canReply: false, readOnlyReason: 'You have been blocked by this creator.' }
    }
  }
  return { canReply: true, readOnlyReason: null }
}

// ── Read markers ─────────────────────────────────────────────────────────────

export async function markTicketRead(ticketId: string, userId: string): Promise<void> {
  await prisma.ticketReadMarker.upsert({
    where: { ticketId_userId: { ticketId, userId } },
    update: { lastReadAt: new Date() },
    create: { ticketId, userId, lastReadAt: new Date() },
  })
}

/** Count tickets where the current user has unseen activity. Includes CLOSED
 *  tickets still inside the 90-day retention window — a creator closing the
 *  ticket shouldn't clear the buyer's unread badge on the final message. */
export async function computeUnreadTicketCount(userId: string): Promise<number> {
  const { total } = await computeUnreadTicketCountsByStatus(userId)
  return total
}

/** Same as computeUnreadTicketCount, but split by ticket status so the inbox
 *  can show a per-tab badge (Active vs Archive). */
export async function computeUnreadTicketCountsByStatus(
  userId: string,
): Promise<{ active: number; archive: number; total: number }> {
  const rows = await prisma.ticket.findMany({
    where: { OR: [{ buyerId: userId }, { creatorId: userId }] },
    select: {
      id: true,
      status: true,
      lastMessageAt: true,
      readMarkers: { where: { userId }, select: { lastReadAt: true } },
    },
  })
  let active = 0
  let archive = 0
  for (const t of rows) {
    const marker = t.readMarkers[0]
    const unread = !marker || marker.lastReadAt < t.lastMessageAt
    if (!unread) continue
    if (t.status === 'OPEN') active++
    else archive++
  }
  return { active, archive, total: active + archive }
}

// ── Auto-close eligibility ───────────────────────────────────────────────────
//
// A ticket with 30 days of two-sided silence is auto-closeable UNLESS linked
// work is still in progress. These checks mirror the plan's blocker list and
// are reused by the cron + by the "eligible to auto-close" hint in UI.

export async function isAutoCloseBlocked(ticketId: string): Promise<string | null> {
  const t = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      order: { select: { status: true, escrowStatus: true, dispute: { select: { status: true } } } },
      commissionQuote: {
        select: {
          status: true,
          milestones: { select: { status: true } },
        },
      },
      commissionRequest: { select: { status: true } },
    },
  })
  if (!t) return null
  if (t.order) {
    if (['OPEN', 'UNDER_REVIEW'].includes(t.order.dispute?.status ?? '')) return 'Order has an active dispute.'
    if (['HELD', 'TRACKING_ADDED'].includes(t.order.escrowStatus)) return 'Order escrow is still active.'
    if (['PENDING', 'PAID', 'PROCESSING', 'SHIPPED'].includes(t.order.status)) return 'Order is still in progress.'
  }
  if (t.commissionQuote) {
    const ms = t.commissionQuote.milestones
    if (ms.some((m) => ['IN_PROGRESS', 'DELIVERED', 'REVISION_REQUESTED'].includes(m.status))) {
      return 'A milestone is still active.'
    }
  }
  if (t.commissionRequest) {
    if (['PENDING', 'QUOTED'].includes(t.commissionRequest.status)) return 'Commission request is still open.'
  }
  return null
}

// ── Domain errors ────────────────────────────────────────────────────────────

export class TicketBlockedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TicketBlockedError'
  }
}

// ── Party notification helper ────────────────────────────────────────────────

export async function notifyOtherParty(
  ticket: Pick<Ticket, 'id' | 'subject' | 'buyerId' | 'creatorId'>,
  fromUserId: string,
  kind: 'TICKET_OPENED' | 'TICKET_REPLY' | 'TICKET_CLOSED',
  title: string,
  message: string,
): Promise<void> {
  const otherId = fromUserId === ticket.buyerId ? ticket.creatorId : ticket.buyerId
  const isBuyerRecipient = otherId === ticket.buyerId
  const actionUrl = isBuyerRecipient
    ? `/account/tickets/${ticket.id}`
    : `/dashboard/tickets/${ticket.id}`
  await createNotification(otherId, kind, title, message, undefined, actionUrl)
}
