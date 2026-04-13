import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'CREATOR') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session.user as any).id as string

  const [completedTxAgg, payoutsAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { creatorId: userId, status: 'COMPLETED' },
      _sum: { creatorAmount: true },
    }),
    prisma.payout.aggregate({
      where: { creatorId: userId, status: { not: 'FAILED' } },
      _sum: { amountUsd: true },
    }),
  ])

  const totalEarned = completedTxAgg._sum.creatorAmount ?? 0
  const totalPaidOut = payoutsAgg._sum.amountUsd ?? 0
  const available = Math.max(0, totalEarned - totalPaidOut)

  return NextResponse.json({ available })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'CREATOR') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session.user as any).id as string

  const { amount } = await req.json() as { amount: number }

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  // Verify sufficient balance
  const [completedTxAgg, payoutsAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { creatorId: userId, status: 'COMPLETED' },
      _sum: { creatorAmount: true },
    }),
    prisma.payout.aggregate({
      where: { creatorId: userId, status: { not: 'FAILED' } },
      _sum: { amountUsd: true },
    }),
  ])
  const totalEarned = completedTxAgg._sum.creatorAmount ?? 0
  const totalPaidOut = payoutsAgg._sum.amountUsd ?? 0
  const available = Math.max(0, totalEarned - totalPaidOut)

  if (amount > available) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  const payout = await prisma.payout.create({
    data: {
      creatorId: userId,
      amountUsd: amount,
      status: 'PENDING',
    },
  })

  // Attempt Airwallex payout (gracefully fail if not configured)
  // This is a placeholder — integrate with Airwallex SDK when credentials are available.

  return NextResponse.json(payout, { status: 201 })
}
