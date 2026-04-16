import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id as string
  const body = await req.json()
  const { orderId, rating, title, body: reviewBody } = body

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 })
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, buyerId: true, productId: true, escrowStatus: true },
  })

  if (!order || order.buyerId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (order.escrowStatus !== 'RELEASED') {
    return NextResponse.json({ error: 'Order must be completed before reviewing' }, { status: 400 })
  }

  const existing = await prisma.productReview.findUnique({ where: { orderId } })
  if (existing) {
    return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })
  }

  const review = await prisma.productReview.create({
    data: {
      productId: order.productId,
      orderId,
      buyerId: userId,
      rating,
      title: title ?? null,
      body: reviewBody ?? null,
    },
  })

  const agg = await prisma.productReview.aggregate({
    where: { productId: order.productId, isVisible: true },
    _avg: { rating: true },
    _count: { id: true },
  })

  await prisma.product.update({
    where: { id: order.productId },
    data: {
      averageRating: agg._avg.rating ?? 0,
      reviewCount: agg._count.id,
    },
  })

  return NextResponse.json(review, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const productId = searchParams.get('productId')

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const perPage = 10
  const skip = (page - 1) * perPage

  const [reviews, total] = await Promise.all([
    prisma.productReview.findMany({
      where: { productId, isVisible: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        isVerified: true,
        createdAt: true,
        buyer: { select: { name: true, avatar: true } },
      },
    }),
    prisma.productReview.count({ where: { productId, isVisible: true } }),
  ])

  return NextResponse.json({ reviews, total, page, perPage })
}
