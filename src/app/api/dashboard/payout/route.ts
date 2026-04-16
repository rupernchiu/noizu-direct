import { NextResponse } from 'next/server'
import { requireCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'

export async function GET() {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  const { amount, payoutMethod, accountDetails } = await req.json() as {
    amount: number
    payoutMethod?: string
    accountDetails?: string
  }

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  if (amount < 50) {
    return NextResponse.json({ error: 'Minimum payout amount is RM 50' }, { status: 400 })
  }

  // Check for existing pending payout
  const existingPending = await prisma.payout.findFirst({
    where: { creatorId: userId, status: 'PENDING' },
  })
  if (existingPending) {
    return NextResponse.json({ error: 'You already have a pending payout request' }, { status: 400 })
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
      currency: 'MYR',
      payoutMethod: payoutMethod ?? 'bank_transfer',
      accountDetails: accountDetails ?? null,
    },
  })

  // Send confirmation email to creator
  const creator = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })
  if (creator?.email) {
    const email = creator.email
    const subject = 'Payout request received'
    const html = `<p>Hi ${creator.name ?? 'there'},</p><p>Your payout request of RM ${amount.toFixed(2)} has been received and is being reviewed.</p><p>We will notify you once it has been processed.</p><p>— NOIZU DIRECT</p>`
    const type = 'payout_requested'
    try {
      const { data } = await resend.emails.send({ from: 'NOIZU-DIRECT <noreply@noizu.direct>', to: [email], subject, html })
      await prisma.emailLog.create({ data: { to: email, subject, type, status: 'sent', resendId: data?.id ?? null } })
    } catch (e) {
      await prisma.emailLog.create({ data: { to: email, subject, type, status: 'failed', error: String(e) } }).catch(() => {})
    }
  }

  return NextResponse.json(payout, { status: 201 })
}
