import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

async function verifyOwnership(productId: string, userId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { creator: true },
  })
  if (!product) return null
  if (product.creator.userId !== userId) return null
  return product
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'CREATOR') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session.user as any).id as string
  const { id } = await params

  const product = await verifyOwnership(id, userId)
  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json() as Record<string, unknown>

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title as string }),
      ...(body.description !== undefined && { description: body.description as string }),
      ...(body.price !== undefined && { price: Math.round((body.price as number) * 100) }),
      ...(body.category !== undefined && { category: body.category as string }),
      ...(body.type !== undefined && { type: body.type as string }),
      ...(body.images !== undefined && { images: JSON.stringify(body.images) }),
      ...(body.stock !== undefined && { stock: body.stock as number }),
      ...(body.isActive !== undefined && { isActive: body.isActive as boolean }),
      ...(body.isPinned !== undefined && { isPinned: body.isPinned as boolean }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'CREATOR') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session.user as any).id as string
  const { id } = await params

  const product = await verifyOwnership(id, userId)
  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  })

  return NextResponse.json({ success: true })
}
