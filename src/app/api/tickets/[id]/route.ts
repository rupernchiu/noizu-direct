import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canPostInTicket, markTicketRead, isAutoCloseBlocked } from '@/lib/tickets'

// GET /api/tickets/[id] — thread + messages + link context.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { id } = await params

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      buyer: {
        select: {
          id: true,
          name: true,
          avatar: true,
          creatorProfile: { select: { username: true, displayName: true, avatar: true } },
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          avatar: true,
          creatorProfile: { select: { username: true, displayName: true, avatar: true } },
        },
      },
      commissionRequest: { select: { id: true, title: true, status: true } },
      commissionQuote: {
        select: { id: true, title: true, amountUsd: true, status: true },
      },
      order: {
        select: {
          id: true,
          status: true,
          escrowStatus: true,
          product: { select: { title: true } },
        },
      },
    },
  })

  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const isParty = ticket.buyerId === userId || ticket.creatorId === userId
  if (!isParty) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const messages = await prisma.ticketMessage.findMany({
    where: { ticketId: id },
    orderBy: { createdAt: 'asc' },
    include: {
      attachments: {
        where: { supersededAt: null },
        select: { id: true, viewerUrl: true, mimeType: true, fileSize: true },
      },
    },
  })

  const perm = await canPostInTicket(userId, ticket)

  // Mark read on every GET (same pattern as existing messaging).
  await markTicketRead(id, userId)

  const isBuyer = ticket.buyerId === userId
  const other = isBuyer ? ticket.creator : ticket.buyer
  const otherParty = {
    id: other.id,
    name: other.creatorProfile?.displayName ?? other.name,
    avatar: other.creatorProfile?.avatar ?? other.avatar,
    username: other.creatorProfile?.username ?? null,
  }

  const closeBlocker = ticket.status === 'OPEN' ? await isAutoCloseBlocked(id) : null

  return NextResponse.json({
    ticket: {
      id: ticket.id,
      subject: ticket.subject,
      kind: ticket.kind,
      status: ticket.status,
      openedAutoSource: ticket.openedAutoSource,
      createdAt: ticket.createdAt,
      lastMessageAt: ticket.lastMessageAt,
      closedAt: ticket.closedAt,
      purgeAt: ticket.purgeAt,
      buyerId: ticket.buyerId,
      creatorId: ticket.creatorId,
    },
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      body: m.isDeleted ? '[message removed]' : m.body,
      systemKind: m.systemKind,
      isDeleted: m.isDeleted,
      createdAt: m.createdAt,
      attachments: m.attachments,
    })),
    canReply: perm.canReply,
    readOnlyReason: perm.readOnlyReason,
    isBuyer,
    otherParty,
    linked: {
      commissionRequest: ticket.commissionRequest,
      commissionQuote: ticket.commissionQuote,
      order: ticket.order
        ? {
            id: ticket.order.id,
            status: ticket.order.status,
            escrowStatus: ticket.order.escrowStatus,
            productTitle: ticket.order.product?.title ?? null,
          }
        : null,
    },
    closeBlocker,
  })
}
