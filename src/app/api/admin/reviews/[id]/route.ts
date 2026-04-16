import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { isVisible } = body as { isVisible: boolean }

  const review = await prisma.productReview.update({
    where: { id },
    data: { isVisible },
  })

  const agg = await prisma.productReview.aggregate({
    where: { productId: review.productId, isVisible: true },
    _avg: { rating: true },
    _count: { id: true },
  })

  await prisma.product.update({
    where: { id: review.productId },
    data: {
      averageRating: agg._avg.rating ?? 0,
      reviewCount: agg._count.id,
    },
  })

  return NextResponse.json(review)
}
