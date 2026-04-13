import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId } = await req.json() as { productId: string }
  const product = await prisma.product.findUnique({
    where: { id: productId, isActive: true },
    include: { creator: { include: { user: true } } },
  })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Don't let creator buy own product
  const buyerId = (session.user as { id: string }).id
  if (product.creator.userId === buyerId) {
    return NextResponse.json({ error: 'Cannot buy own product' }, { status: 400 })
  }

  const order = await prisma.order.create({
    data: {
      buyerId,
      creatorId: product.creator.userId,
      productId,
      status: 'PENDING',
      amountUsd: product.price,
      displayCurrency: 'USD',
      displayAmount: product.price,
      exchangeRate: 1.0,
    },
  })

  return NextResponse.json({ orderId: order.id })
}
