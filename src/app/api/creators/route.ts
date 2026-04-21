import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { rankCreators, deriveCategoryAffinity, type ScoredCreator } from '@/lib/discovery'

const PAGE_SIZE = 20
const POOL_LIMIT = 2000  // fetch at most this many creators for in-memory scoring

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)

  // Fetch session for personalisation (non-blocking — guests get base scores)
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined

  // Fetch user's category affinity from recent product views
  let userCategories: string[] = []
  if (userId) {
    const recentViews = await prisma.productView.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { product: { select: { category: true } } },
    })
    userCategories = deriveCategoryAffinity(recentViews)
  }

  // Fetch creator pool
  const creators = await prisma.creatorProfile.findMany({
    take: POOL_LIMIT,
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatar: true,
      bannerImage: true,
      categoryTags: true,
      isVerified: true,
      isTopCreator: true,
      totalSales: true,
      commissionStatus: true,
      boostMultiplier: true,
      lastFeaturedAt: true,
      createdAt: true,
    },
  })

  const { items, total, page1Ids } = rankCreators(
    creators as ScoredCreator[],
    userCategories,
    page,
    PAGE_SIZE,
  )

  // Fire-and-forget: update lastFeaturedAt for page-1 creators (rotation layer)
  if (page === 1 && page1Ids.length > 0) {
    prisma.creatorProfile
      .updateMany({ where: { id: { in: page1Ids } }, data: { lastFeaturedAt: new Date() } })
      .catch(() => {/* non-critical */})
  }

  return NextResponse.json({
    creators: items,
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  })
}
