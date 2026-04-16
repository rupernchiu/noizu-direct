import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q      = searchParams.get('q')?.trim() ?? ''
  const status = searchParams.get('status') ?? ''
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
  const perPage = 20

  const where: any = {}
  if (q) where.OR = [{ title: { contains: q } }, { excerpt: { contains: q } }]
  if (status) where.status = status

  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      select: { id: true, slug: true, title: true, status: true, publishedAt: true, viewCount: true, createdAt: true, author: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ])

  return NextResponse.json({ posts, total, page, perPage })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, slug, excerpt, content, coverImage, status, publishedAt, scheduledAt, tags, seoTitle, seoDescription } = body

  if (!title || !slug) return NextResponse.json({ error: 'title and slug are required' }, { status: 400 })

  const post = await prisma.post.create({
    data: {
      title,
      slug,
      excerpt: excerpt ?? null,
      content: content ?? null,
      coverImage: coverImage ?? null,
      authorId: (session.user as any).id,
      status: status ?? 'DRAFT',
      publishedAt: publishedAt ? new Date(publishedAt) : null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      tags: JSON.stringify(tags ?? []),
      seoTitle: seoTitle ?? null,
      seoDescription: seoDescription ?? null,
    },
  })

  return NextResponse.json(post, { status: 201 })
}
