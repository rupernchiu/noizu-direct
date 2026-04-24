import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyOtherParty } from '@/lib/tickets'

// POST /api/tickets/[id]/reopen — creator reopens a closed ticket (within purge window).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { id } = await params

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, subject: true, status: true, buyerId: true, creatorId: true, purgeAt: true },
  })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ticket.creatorId !== userId) {
    return NextResponse.json({ error: 'Only the creator can reopen a ticket.' }, { status: 403 })
  }
  if (ticket.status !== 'CLOSED') {
    return NextResponse.json({ error: 'Ticket is not closed.' }, { status: 400 })
  }

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id },
      data: {
        status: 'OPEN',
        closedAt: null,
        closedById: null,
        closeReason: null,
        purgeAt: null,
        lastMessageAt: now,
        lastCreatorMessageAt: now,
      },
    })
    await tx.ticketMessage.create({
      data: {
        ticketId: id,
        senderId: userId,
        body: 'Ticket reopened.',
        systemKind: 'REOPENED',
        createdAt: now,
      },
    })
  })

  await notifyOtherParty(
    ticket,
    userId,
    'TICKET_REPLY',
    'Ticket reopened',
    `The ticket "${ticket.subject}" was reopened.`,
  )

  return NextResponse.json({ ok: true })
}
