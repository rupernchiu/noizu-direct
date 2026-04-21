import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPaymentIntent, getCurrencyFactor } from '@/lib/airwallex'
import { ensureAirwallexCustomer } from '@/lib/support-customer'
import { getProcessingFeeRate, feeOnSubtotal } from '@/lib/platform-fees'

const SUPPORTED_CURRENCIES = ['USD', 'MYR', 'SGD', 'PHP', 'THB', 'IDR']

async function convertToDisplayCurrency(amountUsdCents: number, currency: string): Promise<number> {
  if (currency === 'USD') return amountUsdCents
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'
  const res = await fetch(`${appUrl}/api/airwallex/fx-rate?to=${currency}&amountUsd=${amountUsdCents}`)
  if (!res.ok) throw new Error(`FX rate unavailable for ${currency}`)
  const { displayAmount } = await res.json() as { displayAmount: number }
  return displayAmount
}

/**
 * Start a new monthly subscription (tier OR monthly gift).
 *
 * Returns a PaymentIntent configured to SAVE the payment method. The client
 * mounts DropIn; after buyer pays the first month, Airwallex creates a
 * PaymentConsent tied to their card — we look it up in the webhook and store
 * it on the subscription, then the renewals cron reuses it off-session.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Sign in to subscribe' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const body = await req.json() as {
    creatorUsername: string
    kind: 'TIER' | 'MONTHLY_GIFT'
    tierId?: string
    amountUsd?: number   // only for MONTHLY_GIFT
    currency?: string
  }

  const currency = SUPPORTED_CURRENCIES.includes((body.currency ?? '').toUpperCase())
    ? body.currency!.toUpperCase()
    : 'USD'

  if (!body.creatorUsername || !body.kind) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const creator = await prisma.creatorProfile.findUnique({
    where: { username: body.creatorUsername },
    select: { id: true, userId: true, storeStatus: true, isSuspended: true },
  })
  if (!creator || creator.isSuspended || creator.storeStatus !== 'ACTIVE') {
    return NextResponse.json({ error: 'Creator is not accepting support right now' }, { status: 400 })
  }
  if (creator.userId === userId) {
    return NextResponse.json({ error: 'You cannot subscribe to your own page' }, { status: 400 })
  }

  // Resolve amount + tierId based on kind
  let tierId: string | null = null
  let amountUsd: number
  if (body.kind === 'TIER') {
    if (!body.tierId) return NextResponse.json({ error: 'tierId is required' }, { status: 400 })
    const tier = await prisma.supportTier.findFirst({
      where: { id: body.tierId, creatorId: creator.id, isActive: true },
    })
    if (!tier) return NextResponse.json({ error: 'Tier not available' }, { status: 400 })
    tierId = tier.id
    amountUsd = tier.priceUsd
  } else {
    if (!body.amountUsd || body.amountUsd < 100) {
      return NextResponse.json({ error: 'Minimum monthly amount is $1' }, { status: 400 })
    }
    amountUsd = body.amountUsd
  }

  // Prevent double-subscribe to the same thing
  const existing = await prisma.supportSubscription.findFirst({
    where: {
      supporterId: userId,
      creatorId: creator.id,
      status: { in: ['PENDING', 'ACTIVE', 'PAST_DUE'] },
      ...(tierId ? { tierId } : { type: 'MONTHLY_GIFT' }),
    },
  })
  if (existing) {
    return NextResponse.json({ error: 'You already have an active subscription here' }, { status: 400 })
  }

  const customerId = await ensureAirwallexCustomer(userId)

  const feeRate = await getProcessingFeeRate()
  const processingFee = feeOnSubtotal(amountUsd, feeRate)
  const grossUsd = amountUsd + processingFee
  const displayAmount = await convertToDisplayCurrency(grossUsd, currency)

  // Create the subscription in PENDING state; becomes ACTIVE when webhook confirms first charge
  const sub = await prisma.supportSubscription.create({
    data: {
      supporterId: userId,
      creatorId: creator.id,
      tierId,
      type: body.kind,
      amountUsd,
      currency,
      status: 'PENDING',
      airwallexCustomerId: customerId,
    },
  })

  const intent = await createPaymentIntent({
    amount: displayAmount,
    currency,
    orderId: sub.id,
    customerId,
    savePaymentMethod: true,
    metadata: {
      supportSubscriptionId: sub.id,
      kind: body.kind,
      creatorId: creator.id,
      recurring: true,
    },
  })

  await prisma.supportSubscription.update({
    where: { id: sub.id },
    data: { airwallexInitialIntentId: intent.id as string },
  })

  return NextResponse.json({
    intentId: intent.id,
    clientSecret: intent.client_secret,
    currency,
    displayAmount,
    subscriptionId: sub.id,
  })
}
