import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { BODY_MAX, hasAngleBrackets } from '@/lib/tickets'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { notes } = await req.json() as { notes?: string }

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (order.buyerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (order.commissionStatus !== 'DELIVERED') {
    return NextResponse.json({ error: 'No delivery to revise' }, { status: 400 })
  }

  const revisionsUsed = order.commissionRevisionsUsed ?? 0
  const revisionsAllowed = order.commissionRevisionsAllowed ?? 0
  const limitReached = revisionsAllowed > 0 && revisionsUsed >= revisionsAllowed

  await prisma.order.update({
    where: { id },
    data: {
      commissionStatus: 'REVISION_REQUESTED',
      commissionRevisionsUsed: { increment: 1 },
    },
  })

  if (notes) {
    const trimmedNotes = String(notes).trim()
    if (trimmedNotes) {
      if (hasAngleBrackets(trimmedNotes)) {
        return NextResponse.json({ error: 'Angle brackets are not allowed in messages' }, { status: 400 })
      }
      const ticket = await prisma.ticket.findUnique({ where: { orderId: id }, select: { id: true, status: true } })
      if (ticket && ticket.status === 'OPEN') {
        const now = new Date()
        const prefix = limitReached
          ? `[Revision request — limit reached] `
          : `[Revision request ${revisionsUsed + 1}/${revisionsAllowed > 0 ? revisionsAllowed : '∞'}] `
        const body = (prefix + trimmedNotes).slice(0, BODY_MAX)
        await prisma.ticketMessage.create({
          data: { ticketId: ticket.id, senderId: session.user.id, body, createdAt: now },
        })
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { lastMessageAt: now, lastBuyerMessageAt: now },
        })
      } else {
        console.warn(`[request-revision] order ${id} has no open ticket — revision note not recorded`)
      }
    }
  }

  await createNotification(
    order.creatorId, 'TICKET_REPLY',
    limitReached ? 'Revision requested (limit exceeded)' : 'Revision requested',
    limitReached
      ? `Buyer has requested a revision on commission #${id.slice(-8).toUpperCase()} — the included revision limit has been reached. You may accept or decline at your discretion.`
      : `Buyer has requested a revision on commission #${id.slice(-8).toUpperCase()} (${revisionsUsed + 1}/${revisionsAllowed > 0 ? revisionsAllowed : '∞'} revisions used).`,
    id, `/dashboard/orders/${id}`,
  )

  return NextResponse.json({ ok: true, revisionsUsed: revisionsUsed + 1, revisionsAllowed, limitReached })
}
