import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPaymentIntent, getCurrencyFactor } from '@/lib/airwallex'
import { ensureAirwallexCustomer } from '@/lib/support-customer'
import { getProcessingFeeRate, feeOnSubtotal } from '@/lib/platform-fees'

const SUPPORTED_CURRENCIES = ['USD', 'MYR', 'SGD', 'PHP', 'THB', 'IDR']
const MIN_USD_CENTS = 100  // $1 floor — no $0.50 spam gifts
const MAX_USD_CENTS = 500_00 // $500 cap per one-time gift

async function convertToDisplayCurrency(amountUsdCents: number, currency: string): Promise<number> {
  if (currency === 'USD') return amountUsdCents
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'
  const res = await fetch(`${appUrl}/api/airwallex/fx-rate?to=${currency}&amountUsd=${amountUsdCents}`)
  if (!res.ok) throw new Error(`FX rate unavailable for ${currency}`)
  const { displayAmount } = await res.json() as { displayAmount: number }
  return displayAmount
}

/**
 * One-time support: gift (Buy me a coffee) OR goal contribution.
 * Fan clicks a preset/custom amount → we create a pending SupportTransaction
 * and an Airwallex PaymentIntent → client mounts DropIn with the clientSecret.
 * Webhook flips status to PAID + updates counters.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Sign in to support this creator' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const body = await req.json() as {
    creatorUsername: string
    kind: 'GIFT' | 'GOAL'
    goalId?: string
    amountUsd: number   // cents
    message?: string
    isAnonymous?: boolean
    currency?: string
  }

  const currency = SUPPORTED_CURRENCIES.includes((body.currency ?? '').toUpperCase())
    ? body.currency!.toUpperCase()
    : 'USD'

  if (!body.creatorUsername || !body.kind || !body.amountUsd) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (body.amountUsd < MIN_USD_CENTS || body.amountUsd > MAX_USD_CENTS) {
    return NextResponse.json({ error: `Amount must be between $${MIN_USD_CENTS / 100} and $${MAX_USD_CENTS / 100}` }, { status: 400 })
  }

  const creator = await prisma.creatorProfile.findUnique({
    where: { username: body.creatorUsername },
    select: { id: true, userId: true, storeStatus: true, isSuspended: true, supportGift: true },
  })
  if (!creator || creator.isSuspended || creator.storeStatus !== 'ACTIVE') {
    return NextResponse.json({ error: 'Creator is not accepting support right now' }, { status: 400 })
  }
  if (creator.userId === userId) {
    return NextResponse.json({ error: 'You cannot support your own page' }, { status: 400 })
  }

  if (body.kind === 'GIFT') {
    if (!creator.supportGift || !creator.supportGift.isActive) {
      return NextResponse.json({ error: 'This creator is not accepting gifts' }, { status: 400 })
    }
  }

  let goalId: string | null = null
  if (body.kind === 'GOAL') {
    if (!body.goalId) return NextResponse.json({ error: 'goalId is required' }, { status: 400 })
    const goal = await prisma.supportGoal.findFirst({
      where: { id: body.goalId, creatorId: creator.id, status: 'ACTIVE' },
    })
    if (!goal) return NextResponse.json({ error: 'Goal is not active' }, { status: 400 })
    goalId = goal.id
  }

  // Ensure Airwallex Customer — keeps card-on-file for repeat gifting (better UX)
  const customerId = await ensureAirwallexCustomer(userId)

  const feeRate = await getProcessingFeeRate()
  const processingFee = feeOnSubtotal(body.amountUsd, feeRate)
  // Fan pays fee on top; creator receives full gift amount minus zero extra
  // (matches product checkout where fan covers processing)
  const grossUsd = body.amountUsd + processingFee

  const tx = await prisma.supportTransaction.create({
    data: {
      creatorId: creator.id,
      supporterId: body.isAnonymous ? null : userId,
      type: body.kind,
      amountUsd: body.amountUsd,
      currency,
      goalId,
      message: body.message?.trim().slice(0, 500) || null,
      isAnonymous: !!body.isAnonymous,
      isMonthly: false,
      status: 'PENDING',
      processingFee,
      creatorAmount: body.amountUsd,
    },
  })

  const displayAmount = await convertToDisplayCurrency(grossUsd, currency)

  const intent = await createPaymentIntent({
    amount: displayAmount,
    currency,
    orderId: tx.id,
    customerId,
    metadata: { supportTxId: tx.id, kind: body.kind, creatorId: creator.id },
  })

  await prisma.supportTransaction.update({
    where: { id: tx.id },
    data: { airwallexIntentId: intent.id as string },
  })

  return NextResponse.json({
    intentId: intent.id,
    clientSecret: intent.client_secret,
    currency,
    displayAmount,
    transactionId: tx.id,
  })
}
