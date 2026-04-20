import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
  const perPage = 20

  const where: any = {}
  if (status) where.status = status

  const [total, items] = await Promise.all([
    prisma.chargebackDispute.count({ where }),
    prisma.chargebackDispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        order: {
          select: {
            id: true,
            amountUsd: true,
            buyer: { select: { name: true, email: true } },
            creator: { select: { name: true } },
            product: { select: { title: true } },
          },
        },
      },
    }),
  ])

  return NextResponse.json({ total, page, perPage, items })
}
