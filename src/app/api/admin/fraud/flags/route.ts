import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'OPEN'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
  const perPage = 25

  const where: any = {}
  if (status) where.status = status

  const [total, items] = await Promise.all([
    prisma.fraudFlag.count({ where }),
    prisma.fraudFlag.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ])

  return NextResponse.json({ total, page, perPage, items })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    type: string
    severity: string
    description: string
    orderId?: string
    userId?: string
  }

  const flag = await prisma.fraudFlag.create({
    data: {
      type: body.type ?? 'MANUAL',
      severity: body.severity ?? 'MEDIUM',
      description: body.description,
      orderId: body.orderId,
      userId: body.userId,
    },
  })

  return NextResponse.json(flag)
}
