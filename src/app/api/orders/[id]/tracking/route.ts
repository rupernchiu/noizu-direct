import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { getNewCreatorExtraDays } from '@/lib/creator-trust'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json() as { trackingNumber: string; courierCode: string; courierName: string; estimatedDelivery?: string }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { product: true },
  })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (order.creatorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['HELD', 'PAID'].includes(order.escrowStatus) && order.escrowStatus !== 'HELD') {
    return NextResponse.json({ error: 'Cannot add tracking in current escrow state' }, { status: 400 })
  }

  const now = new Date()
  const settings = await prisma.platformSettings.findFirst()
  const isPod = order.product.type === 'POD'
  const baseDays = isPod
    ? (settings?.podEscrowDays ?? 30)
    : (settings?.physicalEscrowDays ?? 14)

  const extraDays = await getNewCreatorExtraDays(order.creatorId)
  const autoReleaseAt = new Date(now.getTime() + (baseDays + extraDays) * 24 * 60 * 60 * 1000)

  await prisma.order.update({
    where: { id },
    data: {
      trackingNumber: body.trackingNumber,
      courierCode: body.courierCode,
      courierName: body.courierName,
      trackingAddedAt: now,
      estimatedDelivery: body.estimatedDelivery ? new Date(body.estimatedDelivery) : null,
      escrowStatus: 'TRACKING_ADDED',
      escrowAutoReleaseAt: autoReleaseAt,
      status: 'SHIPPED',
    },
  })

  await createNotification(
    order.buyerId, 'ORDER_SHIPPED',
    'Your order has been shipped!',
    `Your order has been dispatched via ${body.courierName}. Tracking: ${body.trackingNumber}`,
    order.id, `/account/orders/${order.id}`,
  )

  return NextResponse.json({ ok: true, escrowAutoReleaseAt: autoReleaseAt })
}
