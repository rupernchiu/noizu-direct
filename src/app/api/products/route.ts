import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCreator } from '@/lib/guards'
import { Prisma } from '@/generated/prisma/client'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const category = searchParams.get('category') ?? 'ALL'
  const type = searchParams.get('type') ?? ''
  const sort = searchParams.get('sort') ?? 'NEWEST'
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

  // Build where clause
  const where: Prisma.ProductWhereInput = {
    isActive: true,
  }

  if (category && category !== 'ALL') {
    where.category = category
  }

  if (type && type !== 'ALL') {
    where.type = type
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ]
  }

  // Build orderBy
  let orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[]
  switch (sort) {
    case 'PRICE_ASC':
      orderBy = { price: 'asc' }
      break
    case 'PRICE_DESC':
      orderBy = { price: 'desc' }
      break
    case 'POPULAR':
      orderBy = [{ isPinned: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }]
      break
    case 'NEWEST':
    default:
      orderBy = { createdAt: 'desc' }
      break
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        category: true,
        type: true,
        images: true,
        stock: true,
        isPinned: true,
        createdAt: true,
        creator: {
          select: {
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true,
            isTopCreator: true,
          },
        },
      },
    }),
  ])

  const totalPages = Math.ceil(total / limit)

  return NextResponse.json({
    products,
    total,
    page,
    totalPages,
  })
}

export async function POST(req: Request) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) return NextResponse.json({ error: 'No creator profile' }, { status: 400 })

  const body = await req.json() as {
    title: string
    description: string
    price: number
    category: string
    type: string
    images?: string[]
    stock?: number
  }

  const product = await prisma.product.create({
    data: {
      creatorId: profile.id,
      title: body.title,
      description: body.description,
      price: Math.round(body.price * 100),
      category: body.category,
      type: body.type,
      images: JSON.stringify(body.images ?? []),
      stock: body.stock ?? null,
      isActive: true,
    },
  })

  return NextResponse.json(product, { status: 201 })
}
