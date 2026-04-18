import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as any).id as string
    const userRole = (session.user as any).role as string

    if (userRole === 'ADMIN') {
      return NextResponse.json({ error: 'Admins cannot leave reviews' }, { status: 403 })
    }

    const body = await req.json()
    const { productId, rating, title, body: reviewBody } = body

    if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 })

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
      select: { id: true, title: true, creatorId: true, creator: { select: { userId: true } } },
    })

    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const existing = await prisma.productReview.findUnique({
      where: { productId_buyerId: { productId, buyerId: userId } },
    })
    if (existing) return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })

    const review = await prisma.productReview.create({
      data: {
        productId,
        buyerId: userId,
        rating,
        title: title ?? null,
        body: reviewBody ?? null,
        status: 'PENDING',
        isVisible: false,
        isVerified: false,
      },
    })

    if (product.creator?.userId) {
      await prisma.notification.create({
        data: {
          userId: product.creator.userId,
          type: 'NEW_REVIEW_PENDING',
          title: 'New review pending approval',
          message: `A member submitted a review for "${product.title}" awaiting your approval.`,
          actionUrl: '/dashboard/reviews/products',
        },
      })
    }

    return NextResponse.json(review, { status: 201 })
  } catch (err) {
    console.error('[reviews POST] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const productId = searchParams.get('productId')

  if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 })

  try {
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const perPage = 10
    const skip = (page - 1) * perPage

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where: { productId, isVisible: true, status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
        select: {
          id: true, rating: true, title: true, body: true, isVerified: true, createdAt: true,
          buyer: { select: { name: true, avatar: true } },
        },
      }),
      prisma.productReview.count({ where: { productId, isVisible: true, status: 'APPROVED' } }),
    ])

    return NextResponse.json({ reviews, total, page, perPage })
  } catch (err) {
    console.error('[reviews GET] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
