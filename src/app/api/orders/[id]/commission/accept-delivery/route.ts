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
  if (order.commissionStatus !== 'DELIVERED') {
    return NextResponse.json({ error: 'No delivery to accept' }, { status: 400 })
  }

  await prisma.order.update({
    where: { id },
    data: {
      commissionBuyerAcceptedAt: new Date(),
      commissionStatus: 'COMPLETED',
    },
  })

  await releaseEscrow(id, session.user.id, 'Buyer accepted commission delivery')

  return NextResponse.json({ ok: true })
}
