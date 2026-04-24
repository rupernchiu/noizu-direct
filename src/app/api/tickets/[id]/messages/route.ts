import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import {
  canPostInTicket,
  notifyOtherParty,
  hasAngleBrackets,
  BODY_MAX,
} from '@/lib/tickets'

const schema = z.object({
  body: z.string().trim().min(1).max(BODY_MAX),
  attachmentIds: z.array(z.string().min(1).max(128)).max(4).optional(),
})

// POST /api/tickets/[id]/messages — reply to a ticket.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { id } = await params

  const json = await req.json().catch(() => null)
  const parsed = schema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const body = parsed.data.body.trim()
  if (hasAngleBrackets(body)) {
    return NextResponse.json({ error: 'HTML not allowed' }, { status: 400 })
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, subject: true, status: true, buyerId: true, creatorId: true },
  })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const perm = await canPostInTicket(userId, ticket)
  if (!perm.canReply) {
    return NextResponse.json({ error: perm.readOnlyReason ?? 'Cannot reply' }, { status: 403 })
  }

  const rl = await rateLimit('tickets-reply', userId, 50, 3600)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many messages. Try again later.' },
      { status: 429, headers: rateLimitHeaders(rl, 50) },
    )
  }

  const now = new Date()
  const isBuyer = userId === ticket.buyerId

  const message = await prisma.$transaction(async (tx) => {
    const msg = await tx.ticketMessage.create({
      data: { ticketId: ticket.id, senderId: userId, body, createdAt: now },
    })

    if (parsed.data.attachmentIds && parsed.data.attachmentIds.length > 0) {
      // Attach any pre-uploaded orphan TicketAttachment rows owned by sender on this ticket.
      await tx.ticketAttachment.updateMany({
        where: {
          id: { in: parsed.data.attachmentIds },
          ticketId: ticket.id,
          uploaderId: userId,
          messageId: null,
        },
        data: { messageId: msg.id },
      })
    }

    await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        lastMessageAt: now,
        ...(isBuyer ? { lastBuyerMessageAt: now } : { lastCreatorMessageAt: now }),
      },
    })
    return msg
  })

  await notifyOtherParty(
    ticket,
    userId,
    'TICKET_REPLY',
    `Reply on "${ticket.subject}"`,
    body.slice(0, 140),
  )

  return NextResponse.json({ message }, { headers: rateLimitHeaders(rl, 50) })
}
