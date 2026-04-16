import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { releaseEscrow } from '@/lib/escrow-processor'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (order.buyerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['TRACKING_ADDED', 'HELD'].includes(order.escrowStatus)) {
    return NextResponse.json({ error: 'Order not in releasable state' }, { status: 400 })
  }

  await releaseEscrow(id, session.user.id, 'Buyer confirmed receipt')
  return NextResponse.json({ ok: true })
}
