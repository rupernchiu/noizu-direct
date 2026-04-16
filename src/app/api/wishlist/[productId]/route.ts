import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const { productId } = await params

  try {
    const item = await prisma.wishlistItem.findUnique({
      where: { buyerId_productId: { buyerId: userId, productId } },
    })
    return NextResponse.json({ inWishlist: !!item })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const { productId } = await params

  try {
    await prisma.wishlistItem.deleteMany({
      where: { buyerId: userId, productId },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const { productId } = await params

  try {
    const body = await req.json() as {
      notifyPriceChange?: boolean
      notifyRestock?: boolean
      notifyNewDrop?: boolean
    }

    const item = await prisma.wishlistItem.update({
      where: { buyerId_productId: { buyerId: userId, productId } },
      data: {
        ...(body.notifyPriceChange !== undefined && { notifyPriceChange: body.notifyPriceChange }),
        ...(body.notifyRestock !== undefined && { notifyRestock: body.notifyRestock }),
        ...(body.notifyNewDrop !== undefined && { notifyNewDrop: body.notifyNewDrop }),
      },
    })
    return NextResponse.json(item)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
