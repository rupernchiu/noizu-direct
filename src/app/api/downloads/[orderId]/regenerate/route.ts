import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const { orderId } = await params

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { product: { select: { type: true } } },
    })

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.buyerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (order.product.type !== 'DIGITAL') {
      return NextResponse.json({ error: 'Not a digital order' }, { status: 400 })
    }

    const token = uuidv4()
    const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000)

    await prisma.order.update({
      where: { id: orderId },
      data: { downloadToken: token, downloadExpiry: expiry },
    })

    return NextResponse.json({ ok: true, token, expiry })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
