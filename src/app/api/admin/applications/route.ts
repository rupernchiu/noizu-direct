import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

const PER_PAGE = 20

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? undefined
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))

  const where = status ? { status } : {}

  const [applications, total] = await Promise.all([
    prisma.creatorApplication.findMany({
      where,
      select: {
        id: true,
        userId: true,
        status: true,
        displayName: true,
        username: true,
        bio: true,
        categoryTags: true,
        legalFullName: true,
        nationality: true,
        country: true,
        submittedAt: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { submittedAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.creatorApplication.count({ where }),
  ])

  return NextResponse.json({ applications, total, page, perPage: PER_PAGE })
}
