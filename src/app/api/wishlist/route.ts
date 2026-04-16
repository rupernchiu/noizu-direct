import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  try {
    const items = await prisma.wishlistItem.findMany({
      where: { buyerId: userId },
      include: {
        product: {
          include: {
            creator: {
              select: { username: true, displayName: true, avatar: true, isVerified: true },
            },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    })
    return NextResponse.json(items)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  try {
    const { productId } = await req.json() as { productId: string }
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

    const item = await prisma.wishlistItem.upsert({
      where: { buyerId_productId: { buyerId: userId, productId } },
      create: { buyerId: userId, productId },
      update: {},
    })
    return NextResponse.json({ ok: true, item })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
