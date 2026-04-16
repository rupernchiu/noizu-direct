import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  const sp = req.nextUrl.searchParams
  const status = sp.get('status') ?? ''
  const type = sp.get('type') ?? ''

  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const defaultTo = now

  const fromDate = sp.get('from') ? new Date(sp.get('from')!) : defaultFrom
  const toDate = sp.get('to') ? new Date(sp.get('to')!) : defaultTo

  try {
    const orders = await prisma.order.findMany({
      where: {
        buyerId: userId,
        createdAt: { gte: fromDate, lte: toDate },
        ...(status ? { status } : {}),
        ...(type ? { product: { type } } : {}),
      },
      include: {
        product: { select: { title: true, type: true, category: true } },
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const refunds = await prisma.escrowTransaction.findMany({
      where: {
        order: { buyerId: userId },
        type: { in: ['REFUND', 'PARTIAL_REFUND'] },
        createdAt: { gte: fromDate, lte: toDate },
      },
      include: { order: { select: { id: true } } },
    })

    const totalSpent = orders
      .filter((o) => o.status === 'COMPLETED' || o.status === 'PAID')
      .reduce((sum, o) => sum + o.amountUsd, 0)

    const totalRefunds = refunds.reduce((sum, r) => sum + r.amount, 0)
    const netSpent = totalSpent - totalRefunds

    return NextResponse.json({
      orders,
      refunds,
      summary: {
        totalSpent,
        totalOrders: orders.length,
        totalRefunds,
        netSpent,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
