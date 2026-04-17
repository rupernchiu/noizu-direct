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

  const { amount } = await req.json() as { amount: number }

  // 1. Min amount check (RM50 = 5000 cents)
  if (!amount || amount < 5000) {
    return NextResponse.json({ error: 'Minimum payout is RM50' }, { status: 400 })
  }

  // 2. No pending payout
  const existingPending = await prisma.payout.findFirst({
    where: { creatorId: userId, status: 'PENDING' },
  })
  if (existingPending) {
    return NextResponse.json({ error: 'You already have a pending payout request' }, { status: 400 })
  }

  // 3. No open disputes
  const openDisputes = await prisma.dispute.count({
    where: { status: 'OPEN', order: { creatorId: userId } },
  })
  if (openDisputes > 0) {
    return NextResponse.json({ error: 'You have open disputes that must be resolved first' }, { status: 400 })
  }

  // 4. Account status
  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { userId },
  })
  if (!creatorProfile) return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 })

  if (creatorProfile.storeStatus !== 'ACTIVE') {
    return NextResponse.json({ error: 'Your account must be active to request a payout' }, { status: 400 })
  }

  // 5. New creator hold (account <30 days AND 0 lifetime PAID payouts)
  const accountAgeMs = Date.now() - creatorProfile.createdAt.getTime()
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
  if (accountAgeMs < thirtyDaysMs) {
    const paidPayoutsCount = await prisma.payout.count({
      where: { creatorId: userId, status: 'PAID' },
    })
    if (paidPayoutsCount === 0) {
      return NextResponse.json({
        error: 'New creator accounts have a 7-day hold. Your account must be at least 30 days old for your first payout.',
      }, { status: 400 })
    }
  }

  // 6. Must have payout details saved
  const hasPayoutDetails =
    creatorProfile.airwallexBeneficiaryId != null ||
    (creatorProfile.payoutMethod === 'paypal' && creatorProfile.payoutDetails != null)
  if (!hasPayoutDetails) {
    return NextResponse.json({ error: 'Please set up your payout details first' }, { status: 400 })
  }

  // 7. Balance check
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
      currency: (creatorProfile as any).payoutCurrency ?? 'MYR',
      payoutMethod: creatorProfile.payoutMethod,
    },
  })

  // Send confirmation email
  const creator = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })
  if (creator?.email) {
    const email = creator.email
    const subject = 'Payout request received'
    const html = `<p>Hi ${creator.name ?? 'there'},</p><p>Your payout request of RM ${(amount / 100).toFixed(2)} has been received and is being reviewed.</p><p>We will notify you once it has been processed.</p><p>— NOIZU DIRECT</p>`
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
