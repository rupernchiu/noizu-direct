import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasAngleBrackets, notifyOtherParty } from '@/lib/tickets'

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000
const REASON_MAX = 280

// POST /api/tickets/[id]/close — only the creator may close.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { id } = await params

  let reason: string | null = null
  try {
    const body = await req.json() as { reason?: string }
    const trimmed = String(body?.reason ?? '').trim()
    if (trimmed) {
      if (hasAngleBrackets(trimmed)) {
        return NextResponse.json({ error: 'Angle brackets are not allowed.' }, { status: 400 })
      }
      reason = trimmed.slice(0, REASON_MAX)
    }
  } catch {
    // No body or invalid JSON — reason stays null.
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, subject: true, status: true, buyerId: true, creatorId: true },
  })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ticket.creatorId !== userId) {
    return NextResponse.json({ error: 'Only the creator can close a ticket.' }, { status: 403 })
  }
  if (ticket.status === 'CLOSED') {
    return NextResponse.json({ error: 'Ticket is already closed.' }, { status: 400 })
  }

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: now,
        closedById: userId,
        closeReason: 'CREATOR_CLOSED',
        purgeAt: new Date(now.getTime() + NINETY_DAYS_MS),
        lastMessageAt: now,
        lastCreatorMessageAt: now,
      },
    })
    await tx.ticketMessage.create({
      data: {
        ticketId: id,
        senderId: userId,
        body: reason ? `Ticket closed — ${reason}` : 'Ticket closed.',
        systemKind: 'CLOSED',
        createdAt: now,
      },
    })
  })

  await notifyOtherParty(
    ticket,
    userId,
    'TICKET_CLOSED',
    'Ticket closed',
    `Your ticket "${ticket.subject}" was closed by the creator.`,
  )

  return NextResponse.json({ ok: true })
}
