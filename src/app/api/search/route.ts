import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'

const PAGE_SIZES = { products: 12, creators: 10, posts: 10 }

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q    = searchParams.get('q')?.trim() ?? ''
  const type = searchParams.get('type') ?? 'all'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))

  if (q.length < 2) {
    return NextResponse.json({ products: [], creators: [], posts: [], counts: { products: 0, creators: 0, posts: 0 } })
  }

  const cacheKey = CACHE_KEYS.search(`${encodeURIComponent(q)}:${type}:${page}`)
  const cached = await getCached(cacheKey)
  if (cached) return NextResponse.json(cached)

  try {
    const ql = q.toLowerCase()

    // ── Products ────────────────────────────────────────────────────────────────

    let products: {
      id: string; title: string; price: number; images: string; category: string; type: string
      trendingScore: number; score?: number
      creator: { username: string; displayName: string; avatar: string | null; isVerified: boolean; storeStatus: string }
    }[] = []

    let productCount = 0

    if (type === 'all' || type === 'products') {
      const raw = await prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: q } },
            { category: { contains: q } },
            { description: { contains: q } },
          ],
        },
        select: {
          id: true, title: true, price: true, images: true, category: true, type: true, trendingScore: true, description: true,
          creator: { select: { username: true, displayName: true, avatar: true, isVerified: true, storeStatus: true } },
        },
      })

      // Score each product
      const scored = raw.map(p => {
        let score = 0
        const tl = p.title.toLowerCase()
        const cl = p.category.toLowerCase()
        const dl = (p.description ?? '').toLowerCase()
        if (tl.includes(ql)) score += 3
        if (cl.includes(ql)) score += 2
        if (dl.includes(ql)) score += 1
        score += p.trendingScore * 0.1
        if (p.creator.isVerified) score += 1
        if (p.creator.storeStatus === 'ACTIVE') score += 1
        return { ...p, score }
      })

      scored.sort((a, b) => b.score - a.score)
      productCount = scored.length
      const skip = (page - 1) * PAGE_SIZES.products
      products = scored.slice(skip, skip + PAGE_SIZES.products)
    }

    // ── Creators ─────────────────────────────────────────────────────────────────

    let creators: {
      username: string; displayName: string; avatar: string | null
      isVerified: boolean; isTopCreator: boolean; bio: string | null
      categoryTags: string; totalSales: number
      _count?: { products: number }
    }[] = []

    let creatorCount = 0

    if (type === 'all' || type === 'creators') {
      const raw = await prisma.creatorProfile.findMany({
        where: {
          isSuspended: false,
          storeStatus: { not: 'FLAGGED' },
          OR: [
            { displayName: { contains: q } },
            { username: { contains: q } },
            { bio: { contains: q } },
            { categoryTags: { contains: q } },
          ],
        },
        select: {
          username: true, displayName: true, avatar: true, isVerified: true,
          isTopCreator: true, bio: true, categoryTags: true, totalSales: true,
          _count: { select: { products: { where: { isActive: true } } } },
        },
        orderBy: [
          { isVerified: 'desc' },
          { isTopCreator: 'desc' },
          { totalSales: 'desc' },
        ],
      })

      creatorCount = raw.length
      const skip = (page - 1) * PAGE_SIZES.creators
      creators = raw.slice(skip, skip + PAGE_SIZES.creators)
    }

    // ── Posts ────────────────────────────────────────────────────────────────────

    let posts: {
      slug: string; title: string; excerpt: string | null; content: string | null
      coverImage: string | null; publishedAt: Date | null
    }[] = []

    let postCount = 0

    if (type === 'all' || type === 'posts') {
      const raw = await prisma.post.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            { title: { contains: q } },
            { content: { contains: q } },
          ],
        },
        orderBy: { publishedAt: 'desc' },
        select: { slug: true, title: true, excerpt: true, content: true, coverImage: true, publishedAt: true },
      })

      postCount = raw.length
      const skip = (page - 1) * PAGE_SIZES.posts
      posts = raw.slice(skip, skip + PAGE_SIZES.posts).map(p => ({
        ...p,
        content: p.content ? p.content.slice(0, 150) : null,
      }))
    }

    const result = {
      products,
      creators,
      posts,
      counts: { products: productCount, creators: creatorCount, posts: postCount },
    }
    await setCached(cacheKey, result, CACHE_TTL.search)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[search] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
