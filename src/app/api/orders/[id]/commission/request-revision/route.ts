import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

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
    await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId: order.creatorId,
        orderId: id,
        content: limitReached
          ? `[Revision request — limit reached] ${notes}`
          : `[Revision request ${revisionsUsed + 1}/${revisionsAllowed > 0 ? revisionsAllowed : '∞'}] ${notes}`,
      },
    })
  }

  await createNotification(
    order.creatorId, 'NEW_MESSAGE',
    limitReached ? 'Revision requested (limit exceeded)' : 'Revision requested',
    limitReached
      ? `Buyer has requested a revision on commission #${id.slice(-8).toUpperCase()} — the included revision limit has been reached. You may accept or decline at your discretion.`
      : `Buyer has requested a revision on commission #${id.slice(-8).toUpperCase()} (${revisionsUsed + 1}/${revisionsAllowed > 0 ? revisionsAllowed : '∞'} revisions used).`,
    id, `/dashboard/orders/${id}`,
  )

  return NextResponse.json({ ok: true, revisionsUsed: revisionsUsed + 1, revisionsAllowed, limitReached })
}
