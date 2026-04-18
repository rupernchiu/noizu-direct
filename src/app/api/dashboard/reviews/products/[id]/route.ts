import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'CREATOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userId = (session.user as any).id as string
  const { id } = await params

  const profile = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true } })
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const review = await prisma.productReview.findUnique({
    where: { id },
    select: { product: { select: { creatorId: true } } },
  })

  if (!review || review.product.creatorId !== profile.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.productReview.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'CREATOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userId = (session.user as any).id as string
  const { id } = await params
  const body = await req.json() as { displayOrder?: number; action?: 'approve' | 'reject' }

  const profile = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true } })
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const review = await prisma.productReview.findUnique({
    where: { id },
    select: { productId: true, product: { select: { creatorId: true } } },
  })

  if (!review || review.product.creatorId !== profile.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (body.action === 'approve') {
    const updated = await prisma.productReview.update({
      where: { id },
      data: { status: 'APPROVED', isVisible: true },
    })
    // Update product aggregate
    const agg = await prisma.productReview.aggregate({
      where: { productId: review.productId, isVisible: true, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { id: true },
    })
    await prisma.product.update({
      where: { id: review.productId },
      data: { averageRating: agg._avg.rating ?? 0, reviewCount: agg._count.id },
    })
    return NextResponse.json(updated)
  }

  if (body.action === 'reject') {
    const updated = await prisma.productReview.update({
      where: { id },
      data: { status: 'REJECTED', isVisible: false },
    })
    return NextResponse.json(updated)
  }

  // Default: reorder
  const updated = await prisma.productReview.update({
    where: { id },
    data: { displayOrder: body.displayOrder },
  })
  return NextResponse.json(updated)
}
