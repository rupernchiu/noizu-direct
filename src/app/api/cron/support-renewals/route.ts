// Support subscription renewals — off-session charges for active monthly subs.
// Schedule: hourly (UTC). Picks up each sub whose currentPeriodEnd <= now.
//
// For each due subscription:
//   1. If cancelAtPeriodEnd → flip to CANCELED, decrement tier counters, skip charge
//   2. If PAST_DUE and nextRetryAt > now → skip (still in retry backoff)
//   3. Otherwise: create PENDING SupportTransaction (with subscriptionId), then
//      chargeWithConsent() using the stored PaymentConsent. Airwallex confirms
//      the intent synchronously; the webhook (payment_intent.succeeded/failed)
//      handles the follow-on bookkeeping (roll period / dunning).
//
// Idempotency: requestId = `sub_${subId}_${periodEnd.getTime()}` — if cron
// retries within the same period, Airwallex returns the same intent.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { chargeWithConsent } from '@/lib/airwallex'
import { getProcessingFeeRate, feeOnSubtotal } from '@/lib/platform-fees'
import { isCronAuthorized } from '@/lib/cron-auth'
import { withCronHeartbeat } from '@/lib/cron-heartbeat'

async function runRenewals() {
  const now = new Date()
  const feeRate = await getProcessingFeeRate()

  // Pull candidates: ACTIVE or PAST_DUE with a period that has ended
  const due = await prisma.supportSubscription.findMany({
    where: {
      status: { in: ['ACTIVE', 'PAST_DUE'] },
      airwallexPaymentConsentId: { not: null },
      currentPeriodEnd: { lte: now },
    },
    select: {
      id: true,
      supporterId: true,
      creatorId: true,
      tierId: true,
      type: true,
      amountUsd: true,
      currency: true,
      status: true,
      cancelAtPeriodEnd: true,
      airwallexCustomerId: true,
      airwallexPaymentConsentId: true,
      nextRetryAt: true,
      currentPeriodEnd: true,
      failedChargeCount: true,
    },
    take: 200,
  })

  let charged = 0
  let canceled = 0
  let retryBackoff = 0
  const errors: string[] = []

  for (const sub of due) {
    // Respect dunning backoff — webhook sets nextRetryAt when a charge fails
    if (sub.status === 'PAST_DUE' && sub.nextRetryAt && sub.nextRetryAt > now) {
      retryBackoff++
      continue
    }

    // Scheduled cancellation takes effect at period end
    if (sub.cancelAtPeriodEnd) {
      await prisma.$transaction(async (tx) => {
        await tx.supportSubscription.update({
          where: { id: sub.id },
          data: { status: 'CANCELED', canceledAt: now },
        })
        if (sub.tierId) {
          await tx.supportTier.update({
            where: { id: sub.tierId },
            data: { subscriberCount: { decrement: 1 } },
          }).catch((err: unknown) => console.error('[cron/support-renewals]', err))
        }
      })
      canceled++
      continue
    }

    // Idempotent request id keyed on subscription + period end
    const periodStamp = sub.currentPeriodEnd!.getTime()
    const requestId = `sub_${sub.id}_${periodStamp}`
    const processingFee = feeOnSubtotal(sub.amountUsd, feeRate)
    const grossUsd = sub.amountUsd + processingFee

    // Pre-create PENDING transaction so the webhook can match by intentId.
    // Use upsert-style skip: if one already exists for this period, reuse.
    const existingTx = await prisma.supportTransaction.findFirst({
      where: {
        subscriptionId: sub.id,
        createdAt: { gte: new Date(periodStamp - 86_400_000) }, // within same renewal window
        status: { in: ['PENDING', 'PAID'] },
      },
      select: { id: true, airwallexIntentId: true, status: true },
    })

    let txId: string
    if (existingTx) {
      if (existingTx.status === 'PAID') {
        // Already settled — webhook must have run. Move on.
        charged++
        continue
      }
      txId = existingTx.id
    } else {
      const newTx = await prisma.supportTransaction.create({
        data: {
          creatorId: sub.creatorId,
          supporterId: sub.supporterId,
          subscriptionId: sub.id,
          type: sub.type, // TIER | MONTHLY_GIFT
          amountUsd: sub.amountUsd,
          currency: sub.currency,
          status: 'PENDING',
          processingFee,
          creatorAmount: sub.amountUsd,
          isMonthly: true,
          isAnonymous: false,
        },
        select: { id: true },
      })
      txId = newTx.id
    }

    try {
      const intent = await chargeWithConsent({
        amount: grossUsd,
        currency: sub.currency,
        requestId,
        customerId: sub.airwallexCustomerId!,
        paymentConsentId: sub.airwallexPaymentConsentId!,
        metadata: {
          supportSubscriptionId: sub.id,
          supportTxId: txId,
          creatorId: sub.creatorId,
        },
      })

      await prisma.supportTransaction.update({
        where: { id: txId },
        data: { airwallexIntentId: intent.id },
      })

      // If Airwallex reports immediate failure synchronously, let the webhook
      // handler run its course (it'll fire payment_intent.failed). We don't
      // pre-empt dunning state here.
      charged++
    } catch (e) {
      errors.push(`sub ${sub.id}: ${(e as Error).message}`)
      // Mark transaction FAILED and escalate dunning inline — no webhook will
      // fire if the call itself threw before Airwallex accepted it.
      await prisma.supportTransaction.update({
        where: { id: txId },
        data: { status: 'FAILED' },
      }).catch((err: unknown) => console.error('[cron/support-renewals]', err))
      await bumpDunning(sub.id, sub.failedChargeCount, sub.tierId)
    }
  }

  return { charged, canceled, retryBackoff, errors }
}

async function bumpDunning(subId: string, currentCount: number, tierId: string | null) {
  const attempt = currentCount + 1
  const now = Date.now()

  if (attempt === 1) {
    await prisma.supportSubscription.update({
      where: { id: subId },
      data: {
        status: 'PAST_DUE',
        failedChargeCount: attempt,
        nextRetryAt: new Date(now + 3 * 86_400_000), // +3d
      },
    })
  } else if (attempt === 2) {
    await prisma.supportSubscription.update({
      where: { id: subId },
      data: {
        failedChargeCount: attempt,
        nextRetryAt: new Date(now + 4 * 86_400_000), // +4d
      },
    })
  } else {
    // 3 strikes: cancel
    await prisma.$transaction(async (tx) => {
      await tx.supportSubscription.update({
        where: { id: subId },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
          failedChargeCount: attempt,
        },
      })
      if (tierId) {
        await tx.supportTier.update({
          where: { id: tierId },
          data: { subscriberCount: { decrement: 1 } },
        }).catch((err: unknown) => console.error('[cron/support-renewals]', err))
      }
    })
  }
}

export async function POST(req: NextRequest) {
  if (!(await isCronAuthorized(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    return NextResponse.json(await withCronHeartbeat('support-renewals', () => runRenewals()))
  } catch (e) {
    console.error('[cron/support-renewals]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!(await isCronAuthorized(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    return NextResponse.json(await withCronHeartbeat('support-renewals', () => runRenewals()))
  } catch (e) {
    console.error('[cron/support-renewals]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
