import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const status = req.nextUrl.searchParams.get('status')
  const disputes = await prisma.dispute.findMany({
    where: status ? { status } : {},
    include: {
      order: {
        include: {
          product: { select: { title: true, type: true } },
          buyer: { select: { name: true, email: true } },
          creator: { select: { name: true } },
        },
      },
      raiser: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(disputes)
}
