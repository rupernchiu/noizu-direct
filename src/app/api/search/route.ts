import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ products: [], creators: [], posts: [] })

  const [products, creators, posts] = await Promise.all([
    prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { category: { contains: q } },
        ],
      },
      take: 6,
      select: {
        id: true,
        title: true,
        price: true,
        images: true,
        category: true,
        creator: { select: { username: true, displayName: true } },
      },
    }),
    prisma.creatorProfile.findMany({
      where: {
        isSuspended: false,
        OR: [
          { displayName: { contains: q } },
          { username: { contains: q } },
          { bio: { contains: q } },
        ],
      },
      take: 4,
      select: {
        username: true,
        displayName: true,
        avatar: true,
        isVerified: true,
        isTopCreator: true,
        categoryTags: true,
      },
    }),
    prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { title: { contains: q } },
          { excerpt: { contains: q } },
          { tags: { contains: q } },
        ],
      },
      take: 4,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true,
      },
    }),
  ])

  return NextResponse.json({ products, creators, posts })
}
