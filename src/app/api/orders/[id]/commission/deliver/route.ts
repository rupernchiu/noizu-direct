import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { getNewCreatorExtraDays } from '@/lib/creator-trust'
import { BODY_MAX, hasAngleBrackets } from '@/lib/tickets'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { files, message } = await req.json() as { files: string[]; message?: string }

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'At least one delivery file is required' }, { status: 400 })
  }

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (order.creatorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['ACCEPTED', 'REVISION_REQUESTED'].includes(order.commissionStatus ?? '')) {
    return NextResponse.json({ error: 'Commission is not in a deliverable state' }, { status: 400 })
  }

  const now = new Date()
  const settings = await prisma.platformSettings.findFirst()
  const baseDays = settings?.commissionEscrowDays ?? 30
  const extraDays = await getNewCreatorExtraDays(order.creatorId)
  const balanceAutoReleaseAt = new Date(now.getTime() + (baseDays + extraDays) * 24 * 60 * 60 * 1000)

  await prisma.order.update({
    where: { id },
    data: {
      commissionStatus: 'DELIVERED',
      commissionDeliveredAt: order.commissionDeliveredAt ?? now, // keep first delivery time for dispute window
      commissionDeliveryFiles: JSON.stringify(files),
      escrowAutoReleaseAt: balanceAutoReleaseAt,
      status: 'DELIVERED',
    },
  })

  // Post delivery message into the order's ticket. The ticket is expected to
  // exist — it is auto-opened at payment time — so missing ticket is logged
  // but not fatal (order flow must continue).
  if (message) {
    const trimmed = String(message).trim()
    if (trimmed) {
      if (trimmed.length > BODY_MAX) {
        return NextResponse.json({ error: 'Message too long' }, { status: 400 })
      }
      if (hasAngleBrackets(trimmed)) {
        return NextResponse.json({ error: 'Angle brackets are not allowed in messages' }, { status: 400 })
      }
      const ticket = await prisma.ticket.findUnique({ where: { orderId: id }, select: { id: true, status: true } })
      if (ticket && ticket.status === 'OPEN') {
        await prisma.ticketMessage.create({
          data: { ticketId: ticket.id, senderId: session.user.id, body: trimmed, createdAt: now },
        })
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { lastMessageAt: now, lastCreatorMessageAt: now },
        })
      } else {
        console.warn(`[deliver] order ${id} has no open ticket — delivery note not recorded`)
      }
    }
  }

  await createNotification(
    order.buyerId, 'ORDER_SHIPPED',
    'Commission delivered',
    `Your commission #${id.slice(-8).toUpperCase()} has been delivered. Please review and accept the work, or request a revision. Payment will auto-release after 30 days if no action is taken.`,
    id, `/account/orders/${id}`,
  )

  return NextResponse.json({ ok: true })
}
