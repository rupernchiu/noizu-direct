import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPaymentIntent, decideThreeDsAction } from '@/lib/airwallex'
import { ensureAirwallexCustomer } from '@/lib/support-customer'
import { priceCentsForPlan } from '@/lib/storage-quota'

/**
 * Start a storage plan subscription (CREATOR or PRO).
 *
 * Mirrors support subscription flow: create PENDING StorageSubscription,
 * open a PaymentIntent with savePaymentMethod=true, return intent_id +
 * client_secret for DropIn. Webhook (payment_intent.succeeded) activates
 * the subscription, saves the PaymentConsent for future off-session renewals,
 * and flips user.storagePlan.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const body = await req.json() as { plan: 'CREATOR' | 'PRO' }
  const plan = body.plan
  if (plan !== 'CREATOR' && plan !== 'PRO') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  // Block duplicate subscriptions. PENDING is restartable — it just means a
  // prior attempt opened a PaymentIntent that never completed (tab closed,
  // card declined, DropIn blocked by CSP, etc.). The existing update branch
  // below reuses the row with a fresh intent.
  const existing = await prisma.storageSubscription.findUnique({
    where: { userId },
  })
  if (existing && ['ACTIVE', 'PAST_DUE'].includes(existing.status)) {
    return NextResponse.json({ error: 'You already have an active storage subscription' }, { status: 400 })
  }

  const config = await prisma.storagePricingConfig.findUnique({ where: { id: 'config' } })
  const priceCents = priceCentsForPlan(plan, config)

  const customerId = await ensureAirwallexCustomer(userId)

  // If a prior CANCELED row exists, reuse it. Otherwise create new.
  const sub = existing
    ? await prisma.storageSubscription.update({
        where: { userId },
        data: {
          plan,
          priceCents,
          status: 'PENDING',
          airwallexCustomerId: customerId,
          airwallexPaymentConsentId: null,
          airwallexInitialIntentId: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          failedChargeCount: 0,
          lastChargedAt: null,
          nextRetryAt: null,
        },
      })
    : await prisma.storageSubscription.create({
        data: {
          userId,
          plan,
          priceCents,
          status: 'PENDING',
          airwallexCustomerId: customerId,
        },
      })

  const intent = await createPaymentIntent({
    amount: priceCents,
    currency: 'USD',
    orderId: `storage_sub_${sub.id}_${Date.now()}`,
    customerId,
    savePaymentMethod: true,
    threeDsAction: decideThreeDsAction({
      productType: 'STORAGE',
      amountUsdCents: priceCents,
    }),
    metadata: {
      storageSubscriptionId: sub.id,
      plan,
      recurring: true,
    },
  })

  await prisma.storageSubscription.update({
    where: { id: sub.id },
    data: { airwallexInitialIntentId: intent.id as string },
  })

  return NextResponse.json({
    intentId: intent.id,
    clientSecret: intent.client_secret,
    currency: 'USD',
    amount: priceCents,
    subscriptionId: sub.id,
  })
}
