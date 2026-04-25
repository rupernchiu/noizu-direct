// Storage subscription renewals — off-session charges for active monthly plans.
// Schedule: hourly (UTC). Picks up each sub whose currentPeriodEnd <= now.
//
// Per due sub:
//   1. If cancelAtPeriodEnd → flip to CANCELED, downgrade user.storagePlan to FREE.
//   2. If PAST_DUE and nextRetryAt > now → skip (still in retry backoff).
//   3. Otherwise: chargeWithConsent(). On success, roll period + reset counters.
//      On failure, bump dunning (day 3 → day 7 → cancel).

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { chargeWithConsent } from '@/lib/airwallex'
import { isCronAuthorized } from '@/lib/cron-auth'
import { withCronHeartbeat } from '@/lib/cron-heartbeat'
import { rollStorageRenewalPeriod } from '@/lib/storage-renewal'

async function runRenewals() {
  const now = new Date()

  const due = await prisma.storageSubscription.findMany({
    where: {
      status: { in: ['ACTIVE', 'PAST_DUE'] },
      airwallexPaymentConsentId: { not: null },
      currentPeriodEnd: { lte: now },
    },
    take: 200,
  })

  let charged = 0
  let canceled = 0
  let retryBackoff = 0
  const errors: string[] = []

  for (const sub of due) {
    if (sub.status === 'PAST_DUE' && sub.nextRetryAt && sub.nextRetryAt > now) {
      retryBackoff++
      continue
    }

    if (sub.cancelAtPeriodEnd) {
      await downgradeToFree(sub.id, sub.userId, now)
      canceled++
      continue
    }

    const periodStamp = sub.currentPeriodEnd!.getTime()
    const requestId = `storage_${sub.id}_${periodStamp}`

    try {
      const intent = await chargeWithConsent({
        amount: sub.priceCents,
        currency: 'USD',
        requestId,
        customerId: sub.airwallexCustomerId,
        paymentConsentId: sub.airwallexPaymentConsentId!,
        metadata: {
          storageSubscriptionId: sub.id,
          userId: sub.userId,
          plan: sub.plan,
        },
      })

      // Stamp the intent id on the sub so the webhook can attribute
      // payment_intent.succeeded back to this subscription if the synchronous
      // confirmation was PROCESSING (rare for stored-card flows, but happens
      // on 3DS step-up or temporary acquirer queues).
      await prisma.storageSubscription.update({
        where: { id: sub.id },
        data: { lastRenewalIntentId: intent.id },
      }).catch((err: unknown) => console.error('[cron/storage-renewals] stamp intent', err))

      if (intent.status === 'SUCCEEDED') {
        // Idempotent: if the webhook already rolled this period in a race,
        // rollStorageRenewalPeriod returns rolled=false and we just count it.
        await rollStorageRenewalPeriod(sub.id, now)
        charged++
      } else if (intent.status === 'REQUIRES_PAYMENT_METHOD' || intent.status === 'CANCELLED') {
        await bumpDunning(sub.id, sub.userId, sub.failedChargeCount)
      } else {
        // PROCESSING / REQUIRES_CAPTURE — webhook will finalize via lastRenewalIntentId
        charged++
      }
    } catch (e) {
      errors.push(`sub ${sub.id}: ${(e as Error).message}`)
      await bumpDunning(sub.id, sub.userId, sub.failedChargeCount)
    }
  }

  return { charged, canceled, retryBackoff, errors }
}

async function bumpDunning(subId: string, userId: string, currentCount: number) {
  const attempt = currentCount + 1
  const now = Date.now()

  if (attempt === 1) {
    await prisma.storageSubscription.update({
      where: { id: subId },
      data: {
        status: 'PAST_DUE',
        failedChargeCount: attempt,
        nextRetryAt: new Date(now + 3 * 86_400_000),
      },
    })
    await prisma.notification.create({
      data: {
        userId,
        type: 'SYSTEM',
        title: 'Storage plan payment failed',
        message: "We couldn't charge your card. We'll retry in 3 days. Please update your payment method.",
        actionUrl: '/dashboard/storage',
      },
    }).catch((err: unknown) => console.error('[cron/storage-renewals]', err))
  } else if (attempt === 2) {
    await prisma.storageSubscription.update({
      where: { id: subId },
      data: {
        failedChargeCount: attempt,
        nextRetryAt: new Date(now + 4 * 86_400_000),
      },
    })
  } else {
    // 3 strikes → cancel & downgrade
    await downgradeToFree(subId, userId, new Date())
  }
}

async function downgradeToFree(subId: string, userId: string, now: Date) {
  await prisma.$transaction([
    prisma.storageSubscription.update({
      where: { id: subId },
      data: { status: 'CANCELED', canceledAt: now, nextRetryAt: null },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { storagePlan: 'FREE', storagePlanRenewsAt: null },
    }),
    prisma.notification.create({
      data: {
        userId,
        type: 'SYSTEM',
        title: 'Storage plan canceled',
        message: 'Your storage plan has been canceled. You are now on the free tier. Files exceeding the free quota will be locked from new uploads.',
        actionUrl: '/dashboard/storage',
      },
    }),
  ])
}

export async function POST(req: NextRequest) {
  if (!(await isCronAuthorized(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    return NextResponse.json(await withCronHeartbeat('storage-renewals', () => runRenewals()))
  } catch (e) {
    console.error('[cron/storage-renewals]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!(await isCronAuthorized(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    return NextResponse.json(await withCronHeartbeat('storage-renewals', () => runRenewals()))
  } catch (e) {
    console.error('[cron/storage-renewals]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
