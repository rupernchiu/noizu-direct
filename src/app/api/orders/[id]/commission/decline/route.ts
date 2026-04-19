import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { reason } = await req.json() as { reason?: string }

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (order.creatorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (order.commissionStatus !== 'PENDING_ACCEPTANCE') {
    return NextResponse.json({ error: 'Commission is not awaiting acceptance' }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { commissionStatus: 'COMPLETED', escrowStatus: 'REFUNDED', status: 'CANCELLED' },
    })
    await tx.escrowTransaction.create({
      data: {
        id: `et_${Math.random().toString(36).slice(2)}`,
        orderId: id,
        type: 'REFUND',
        amount: order.amountUsd,
        note: reason ? `Creator declined: ${reason}` : 'Creator declined commission',
        performedBy: session.user?.id,
      },
    })
  })

  await createNotification(
    order.buyerId, 'REFUND_ISSUED',
    'Commission declined',
    `Your commission request #${id.slice(-8).toUpperCase()} was declined by the creator.${reason ? ` Reason: ${reason}` : ''} A full refund of USD ${(order.amountUsd / 100).toFixed(2)} will be returned to you.`,
    id, '/account/orders',
  )

  return NextResponse.json({ ok: true })
}
