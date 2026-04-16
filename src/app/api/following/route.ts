import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  try {
    const items = await prisma.creatorFollow.findMany({
      where: { buyerId: userId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            bannerImage: true,
            commissionStatus: true,
            categoryTags: true,
            totalSales: true,
            isVerified: true,
            isTopCreator: true,
            badges: true,
            _count: { select: { products: true } },
          },
        },
      },
      orderBy: { followedAt: 'desc' },
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
    const { creatorId } = await req.json() as { creatorId: string }
    if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 })

    const item = await prisma.creatorFollow.upsert({
      where: { buyerId_creatorId: { buyerId: userId, creatorId } },
      create: { buyerId: userId, creatorId },
      update: {},
    })
    return NextResponse.json({ ok: true, item })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
