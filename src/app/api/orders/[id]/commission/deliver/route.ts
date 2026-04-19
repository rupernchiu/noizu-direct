import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { getNewCreatorExtraDays } from '@/lib/creator-trust'

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

  // Post delivery message to order thread if provided
  if (message) {
    await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId: order.buyerId,
        orderId: id,
        content: message,
      },
    })
  }

  await createNotification(
    order.buyerId, 'ORDER_SHIPPED',
    'Commission delivered',
    `Your commission #${id.slice(-8).toUpperCase()} has been delivered. Please review and accept the work, or request a revision. Payment will auto-release after 30 days if no action is taken.`,
    id, `/account/orders/${id}`,
  )

  return NextResponse.json({ ok: true })
}
