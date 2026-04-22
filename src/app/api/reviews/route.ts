import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// M8 — reviews are stored and rendered on product pages. The React tree
// escapes text, but without length caps a single reviewer could post a
// multi-megabyte body as a DoS. Reject HTML outright (simplest rule) so
// future renderers that use dangerouslySetInnerHTML can't be abused.
const reviewSchema = z.object({
  productId: z.string().min(1).max(128),
  rating: z.number().int().min(1).max(5),
  title: z
    .string()
    .trim()
    .max(100, 'Title is too long')
    .refine((s) => !/[<>]/.test(s), 'HTML not allowed in title')
    .optional()
    .nullable(),
  body: z
    .string()
    .trim()
    .max(5000, 'Body is too long')
    .refine((s) => !/[<>]/.test(s), 'HTML not allowed in body')
    .optional()
    .nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as any).id as string
    const userRole = (session.user as any).role as string

    if (userRole === 'ADMIN') {
      return NextResponse.json({ error: 'Admins cannot leave reviews' }, { status: 403 })
    }

    const json = await req.json().catch(() => null)
    const parsed = reviewSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const { productId, rating, title, body: reviewBody } = parsed.data

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
