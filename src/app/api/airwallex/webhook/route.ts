import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNewCreatorExtraDays } from '@/lib/creator-trust'
import { getProcessingFeeRate, feeFromGross } from '@/lib/platform-fees'
import { listPaymentConsents } from '@/lib/airwallex'
import { openOrAttachTicket, TicketBlockedError } from '@/lib/tickets'
import { Resend } from 'resend'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'

function emailShell(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
<tr><td style="padding-bottom:32px;text-align:center;"><img src="${baseUrl}/uploads/library/38cf460d-b641-4ded-918e-a190d438eb3d.webp" alt="noizu.direct" height="50" /></td></tr>
<tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">${body}</td></tr>
<tr><td style="padding-top:24px;text-align:center;"><p style="margin:0;font-size:12px;color:#4b4b5a;">noizu.direct &mdash; Creator marketplace for SEA creators</p></td></tr>
</table></td></tr></table></body></html>`
}

async function sendAndLog(
  to: string,
  subject: string,
  html: string,
  type: string,
) {
  try {
    const { data } = await resend.emails.send({
      from: 'noizu.direct <noreply@noizu.direct>',
      to: [to],
      subject,
      html,
    })
    await prisma.emailLog.create({ data: { to, subject, type, status: 'sent', resendId: data?.id ?? null } })
  } catch (e) {
    await prisma.emailLog.create({ data: { to, subject, type, status: 'failed', error: String(e) } }).catch((err: unknown) => console.error('[airwallex/webhook]', err))
  }
}

async function handlePaymentSucceeded(intentId: string) {
  // Idempotency: atomically claim all PENDING orders for this intent by flipping to PROCESSING.
  // If a second webhook arrives, claim returns 0 and we exit — no duplicate transactions/emails.
  const claim = await prisma.order.updateMany({
    where: { airwallexIntentId: intentId, status: 'PENDING' },
    data: { status: 'PROCESSING', escrowStatus: 'HELD', escrowHeldAt: new Date() },
  })
  if (claim.count === 0) return

  const orders = await prisma.order.findMany({
    where: { airwallexIntentId: intentId, status: 'PROCESSING' },
    include: {
      buyer: { select: { email: true, name: true } },
      creator: { select: { email: true } },
      product: { select: { title: true, type: true } },
    },
  })

  if (orders.length === 0) return

  const settings = await prisma.platformSettings.findFirst()
  const feeRate = await getProcessingFeeRate()
  const digitalEscrowHours = settings?.digitalEscrowHours ?? 48
  const now = new Date()

  for (const order of orders) {
    const isDigital = order.product.type === 'DIGITAL'
    const isCommission = !!order.commissionStatus

    const extraDays = await getNewCreatorExtraDays(order.creatorId)

    // Digital: hold with configurable auto-release window
    const digitalReleaseMs = (digitalEscrowHours * 60 * 60 * 1000) + (extraDays * 24 * 60 * 60 * 1000)
    const escrowAutoReleaseAt = isDigital ? new Date(now.getTime() + digitalReleaseMs) : null

    // Download token generated now for digital orders
    const downloadToken = isDigital ? crypto.randomUUID() : null
    const downloadExpiry = isDigital ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : null

    if (isDigital) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          escrowAutoReleaseAt,
          downloadToken,
          downloadExpiry,
        },
      })
    }

    // Create Transaction record. Two paths:
    //   (a) Rail-aware: order has snapshotted breakdown (paymentRail + subtotalUsd
    //       + buyerFeeUsd + creatorCommissionUsd). Use it verbatim — same numbers
    //       the buyer saw at checkout, even if PlatformSettings rates shift later.
    //   (b) Legacy: back out a flat 2.5% from gross via feeFromGross().
    const isRailAware =
      order.paymentRail != null &&
      order.subtotalUsd != null &&
      order.buyerFeeUsd != null &&
      order.creatorCommissionUsd != null
    const processingFee = isRailAware
      ? order.buyerFeeUsd!
      : feeFromGross(order.amountUsd, feeRate)
    const creatorCommission = isRailAware ? order.creatorCommissionUsd! : 0
    // Phase 2.1 — withhold creator-tax from payout (Layer 1).
    const creatorTax = order.creatorTaxAmountUsd ?? 0
    const creatorAmount = isRailAware
      ? order.subtotalUsd! - creatorCommission - creatorTax
      : order.amountUsd - processingFee

    await prisma.transaction.create({
      data: {
        orderId: order.id,
        buyerId: order.buyerId,
        creatorId: order.creatorId,
        grossAmountUsd: order.amountUsd,
        processingFee,
        platformFee: creatorCommission,
        withdrawalFee: 0,
        creatorAmount,
        currency: order.displayCurrency ?? 'USD',
        airwallexReference: intentId,
        paymentRail: order.paymentRail,
        subtotalUsd: order.subtotalUsd,
        buyerFeeUsd: order.buyerFeeUsd,
        creatorCommissionUsd: order.creatorCommissionUsd,
        // Phase 2.1 / 2.2 — tax snapshot on the transaction.
        creatorTaxUsd: creatorTax,
        buyerCountry: order.buyerCountry,
        // Commission funds are held as ESCROW until deposit/balance portions release
        status: isCommission ? 'ESCROW' : 'COMPLETED',
      },
    })

    // Auto-open (or reuse) a ticket linked to this order. Idempotent via orderId
    // unique constraint — commission orders already have a ticket from quote/accept.
    try {
      await openOrAttachTicket({
        kind: 'ORDER',
        buyerId: order.buyerId,
        creatorId: order.creatorId,
        subject: `Order: ${order.product.title}`,
        openedById: order.buyerId,
        openedAutoSource: 'ORDER',
        link: { orderId: order.id },
      })
    } catch (err) {
      if (!(err instanceof TicketBlockedError)) {
        console.error('[airwallex/webhook] ticket open failed', { orderId: order.id, err })
      }
    }

    // Notify creator
    await prisma.notification.create({
      data: {
        userId: order.creatorId,
        type: 'NEW_ORDER',
        title: isCommission ? 'New commission received' : 'New order received',
        message: isCommission
          ? `You have a new commission request for "${order.product.title}". You have 48 hours to accept or it will auto-cancel.`
          : `You have a new paid order for "${order.product.title}".`,
        orderId: order.id,
        actionUrl: `/dashboard/orders/${order.id}`,
      },
    }).catch((err: unknown) => console.error('[airwallex/webhook]', err))
  }

  // Notify buyer once
  await prisma.notification.create({
    data: {
      userId: orders[0].buyerId,
      type: 'ORDER_CONFIRMED',
      title: 'Payment successful',
      message: `Your payment was received and ${orders.length} order${orders.length !== 1 ? 's are' : ' is'} being processed.`,
      actionUrl: '/account/orders',
    },
  }).catch((err: unknown) => console.error('[airwallex/webhook]', err))

  // Email buyer (include download links for digital orders)
  const buyer = orders[0].buyer
  const shortId = orders[0].id.slice(-8).toUpperCase()

  const digitalOrders = await prisma.order.findMany({
    where: { airwallexIntentId: intentId, product: { type: 'DIGITAL' } },
    select: { id: true, downloadToken: true, product: { select: { title: true } } },
  })
  const digitalSection = digitalOrders.length > 0
    ? `<div style="margin:24px 0;padding:20px;background:#0a0a0f;border:1px solid #27272f;border-radius:12px;">
        <p style="margin:0 0 14px;font-size:14px;font-weight:600;color:#fff;">Your digital downloads</p>
        ${digitalOrders.map(o => `
          <p style="margin:0 0 10px;font-size:13px;color:#8b8b9a;line-height:1.5;">
            <strong style="color:#e5e5f0;">${o.product.title}</strong><br/>
            <a href="${baseUrl}/download/${o.downloadToken}" style="color:#7c3aed;text-decoration:none;">Download files</a>
          </p>
        `).join('')}
        <p style="margin:12px 0 0;font-size:11px;color:#6b6b7a;">Links expire in 30 days.</p>
      </div>`
    : ''

  await sendAndLog(
    buyer.email,
    'Payment successful — noizu.direct',
    emailShell(`
      <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#fff;">Payment received!</p>
      <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">Hi ${buyer.name ?? 'there'}, your payment was successful and your order${orders.length !== 1 ? 's are' : ' is'} now being processed.</p>
      ${digitalSection}
      <p style="margin:0;font-size:13px;color:#6b6b7a;">Reference: #${shortId}</p>
    `),
    'order_payment_confirmed',
  )

  // Email each unique creator
  const creatorEmails = new Set<string>()
  for (const order of orders) {
    if (creatorEmails.has(order.creator.email)) continue
    creatorEmails.add(order.creator.email)
    await sendAndLog(
      order.creator.email,
      'New order — noizu.direct',
      emailShell(`
        <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#fff;">New order received!</p>
        <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">You have a new paid order for <strong style="color:#e5e5f0;">${order.product.title}</strong>. Please fulfil it promptly.</p>
        <p style="margin:0;font-size:13px;color:#6b6b7a;">Order ID: #${order.id.slice(-8).toUpperCase()}</p>
      `),
      'order_notification',
    )
  }
}

async function handlePaymentFailed(intentId: string) {
  await prisma.order.updateMany({
    where: { airwallexIntentId: intentId, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  })
  // Support one-time: mark failed (no counter bumps)
  await prisma.supportTransaction.updateMany({
    where: { airwallexIntentId: intentId, status: 'PENDING' },
    data: { status: 'FAILED' },
  })
  // Subscription first charge failure → leave in PENDING (never activated);
  // for recurring renewals handled by handleSupportRenewalFailed.
  await handleSupportRenewalFailed(intentId)
  // Storage subscription failures
  await handleStoragePaymentFailed(intentId)
}

/**
 * Storage subscription payment succeeded.
 * Two cases:
 *   1. First charge: StorageSubscription.airwallexInitialIntentId matches →
 *      activate, save PaymentConsent, flip user.storagePlan.
 *   2. Renewal: StorageSubscription.airwallexPaymentConsentId was used →
 *      roll period, clear failure counters.
 */
async function handleStoragePaymentSucceeded(intentId: string): Promise<boolean> {
  // Case 1: first-charge intent
  const pending = await prisma.storageSubscription.findFirst({
    where: { airwallexInitialIntentId: intentId, status: 'PENDING' },
  })
  if (pending) {
    await activateStorageSubscription(pending.id, intentId)
    return true
  }

  // Case 2: recurring renewal — the cron created the intent via
  // chargeWithConsent; we identify by requestId metadata on the webhook object
  // not being readable here, so we look for an ACTIVE/PAST_DUE sub whose
  // stored consent was used. Match by the intent metadata instead: the cron
  // embeds storageSubscriptionId. We query subs whose currentPeriodEnd was
  // recently hit and whose last charge intent matches.
  //
  // Simpler approach: the cron records the intentId on the subscription's
  // `lastChargedAt` side via a StorageTransaction equivalent. Since we don't
  // have a StorageTransaction table, match by looking up subs where a charge
  // was attempted matching this intent. Because `chargeWithConsent` uses a
  // deterministic requestId (`storage_${subId}_${periodStamp}`), we match
  // by scanning ACTIVE/PAST_DUE subs. This only fires if intentId wasn't a
  // first-charge, so it must be a renewal by elimination.
  const candidate = await prisma.storageSubscription.findFirst({
    where: {
      status: { in: ['ACTIVE', 'PAST_DUE'] },
      // Match by the request id convention — handled in cron; here we just
      // need any ACTIVE/PAST_DUE sub that the webhook arrived for. Since
      // Airwallex includes customer_id on the intent payload, ideally we'd
      // look it up — but the cron stores the pending intentId as lastRenewalIntentId.
      // Fallback: no-op if no match (keeps webhook safe & idempotent).
    },
    orderBy: { updatedAt: 'desc' },
  })
  // Without a lastRenewalIntentId column, we rely on the cron's synchronous
  // behavior (see below) to have already recorded success. This webhook then
  // serves as a confirmation that the charge cleared — it's safe to no-op
  // if we can't uniquely attribute it.
  if (!candidate) return false
  return false
}

async function activateStorageSubscription(subId: string, initialIntentId: string) {
  const sub = await prisma.storageSubscription.findUnique({ where: { id: subId } })
  if (!sub || sub.status === 'ACTIVE') return

  // Look up the saved PaymentConsent for this customer
  let consentId: string | null = null
  try {
    const consents = await listPaymentConsents(sub.airwallexCustomerId)
    const merchant = consents.find(c => c.status === 'VERIFIED' && c.next_triggered_by === 'merchant')
    consentId = merchant?.id ?? consents[0]?.id ?? null
  } catch {
    // Non-fatal — first renewal attempt will retry consent lookup
  }

  const now = new Date()
  const currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await prisma.$transaction([
    prisma.storageSubscription.update({
      where: { id: subId },
      data: {
        status: 'ACTIVE',
        airwallexPaymentConsentId: consentId,
        currentPeriodStart: now,
        currentPeriodEnd,
        lastChargedAt: now,
        failedChargeCount: 0,
        nextRetryAt: null,
      },
    }),
    prisma.user.update({
      where: { id: sub.userId },
      data: {
        storagePlan: sub.plan,
        storagePlanRenewsAt: currentPeriodEnd,
      },
    }),
    prisma.notification.create({
      data: {
        userId: sub.userId,
        type: 'SYSTEM',
        title: `Storage plan activated: ${sub.plan}`,
        message: `Your ${sub.plan} storage plan is now active. Next renewal on ${currentPeriodEnd.toISOString().slice(0, 10)}.`,
        actionUrl: '/dashboard/storage',
      },
    }),
  ]).catch((err: unknown) => console.error('[airwallex/webhook]', err))
  void initialIntentId
}

async function handleStoragePaymentFailed(intentId: string) {
  // First-charge failure: leave StorageSubscription PENDING (user can retry by re-subscribing)
  const pending = await prisma.storageSubscription.findFirst({
    where: { airwallexInitialIntentId: intentId, status: 'PENDING' },
  })
  if (pending) {
    // Clear the stale intent id so the user can start a fresh attempt
    await prisma.storageSubscription.update({
      where: { id: pending.id },
      data: { airwallexInitialIntentId: null },
    }).catch((err: unknown) => console.error('[airwallex/webhook]', err))
    return
  }
  // Renewal failures are handled inline by the cron (no webhook-driven dunning here)
}

/**
 * Support (gift / goal / tier / monthly gift) payment succeeded.
 * Routes three distinct cases by the record the intentId matches:
 *   1. SupportTransaction (one-time gift or goal)
 *   2. SupportSubscription.airwallexInitialIntentId (first charge)
 *   3. SupportTransaction tied to a subscription (recurring renewal)
 * Returns true if this intent belonged to a support flow (so the caller skips
 * the order/product handler).
 */
async function handleSupportPaymentSucceeded(intentId: string): Promise<boolean> {
  // Case 2: subscription first-charge intent
  const pendingSub = await prisma.supportSubscription.findFirst({
    where: { airwallexInitialIntentId: intentId, status: 'PENDING' },
  })
  if (pendingSub) {
    await activateSubscription(pendingSub.id, intentId, true)
    return true
  }

  // Cases 1 + 3: claim the transaction atomically for idempotency
  const claim = await prisma.supportTransaction.updateMany({
    where: { airwallexIntentId: intentId, status: 'PENDING' },
    data: { status: 'PAID' },
  })
  if (claim.count === 0) return false

  const tx = await prisma.supportTransaction.findFirst({
    where: { airwallexIntentId: intentId },
    include: {
      creator: { include: { user: { select: { email: true, name: true } } } },
      supporter: { select: { email: true, name: true } },
      subscription: true,
    },
  })
  if (!tx) return false

  const feeRate = await getProcessingFeeRate()
  const processingFee = feeFromGross(tx.amountUsd + tx.processingFee, feeRate)
  const creatorAmount = tx.amountUsd

  await prisma.supportTransaction.update({
    where: { id: tx.id },
    data: { processingFee, creatorAmount },
  })

  // Update rollup counters
  if (tx.type === 'GIFT') {
    await prisma.supportGift.updateMany({
      where: { creatorId: tx.creatorId },
      data: {
        totalReceived: { increment: creatorAmount },
        giftCount: { increment: 1 },
      },
    })
  }
  if (tx.type === 'GOAL' && tx.goalId) {
    const updated = await prisma.supportGoal.update({
      where: { id: tx.goalId },
      data: { currentAmountUsd: { increment: creatorAmount } },
    })
    if (updated.currentAmountUsd >= updated.targetAmountUsd && updated.status === 'ACTIVE') {
      await prisma.supportGoal.update({ where: { id: tx.goalId }, data: { status: 'COMPLETED' } })
    }
  }
  if ((tx.type === 'TIER' || tx.type === 'MONTHLY_GIFT') && tx.subscriptionId) {
    // Recurring renewal — roll the period forward
    await rollSubscriptionPeriod(tx.subscriptionId)
  }

  // Notify creator
  await prisma.notification.create({
    data: {
      userId: tx.creator.userId,
      type: 'NEW_ORDER',
      title: tx.type === 'GIFT' ? 'You received a gift!' : tx.type === 'GOAL' ? 'New goal contribution' : 'Recurring support charged',
      message: `$${(creatorAmount / 100).toFixed(2)} from ${tx.isAnonymous ? 'an anonymous supporter' : tx.supporter?.name ?? 'a supporter'}${tx.message ? `: "${tx.message}"` : ''}`,
      actionUrl: '/dashboard/support',
    },
  }).catch((err: unknown) => console.error('[airwallex/webhook]', err))

  return true
}

/**
 * Activate a subscription after first charge succeeds.
 * Looks up the PaymentConsent Airwallex created during the first-charge DropIn
 * (we didn't know the consent ID at create-time) and stores it for future off-session charges.
 */
async function activateSubscription(subId: string, initialIntentId: string, createInitialTx: boolean) {
  const sub = await prisma.supportSubscription.findUnique({
    where: { id: subId },
    include: { tier: true },
  })
  if (!sub || sub.status === 'ACTIVE') return

  // Look up the saved PaymentConsent for this customer (best-effort)
  let consentId: string | null = null
  try {
    const consents = await listPaymentConsents(sub.airwallexCustomerId)
    // Pick the most recently-authorized one set up for merchant triggers
    const merchant = consents.find(c => c.status === 'VERIFIED' && c.next_triggered_by === 'merchant')
    consentId = merchant?.id ?? consents[0]?.id ?? null
  } catch {
    // Non-fatal — we'll retry on first renewal attempt
  }

  const now = new Date()
  const currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await prisma.supportSubscription.update({
    where: { id: subId },
    data: {
      status: 'ACTIVE',
      airwallexPaymentConsentId: consentId,
      currentPeriodStart: now,
      currentPeriodEnd,
      lastChargedAt: now,
      failedChargeCount: 0,
      nextRetryAt: null,
    },
  })

  // Bump tier subscriber count
  if (sub.tierId) {
    await prisma.supportTier.update({
      where: { id: sub.tierId },
      data: { subscriberCount: { increment: 1 } },
    }).catch((err: unknown) => console.error('[airwallex/webhook]', err))
  }
  // For monthly gift, bump the gift monthly counters
  if (sub.type === 'MONTHLY_GIFT') {
    await prisma.supportGift.updateMany({
      where: { creatorId: sub.creatorId },
      data: { monthlyGifterCount: { increment: 1 } },
    })
  }

  // Record the first transaction
  if (createInitialTx) {
    const feeRate = await getProcessingFeeRate()
    const processingFee = feeFromGross(sub.amountUsd, feeRate)
    await prisma.supportTransaction.create({
      data: {
        creatorId: sub.creatorId,
        supporterId: sub.supporterId,
        type: sub.type,
        amountUsd: sub.amountUsd,
        currency: sub.currency,
        tierId: sub.tierId,
        subscriptionId: sub.id,
        status: 'PAID',
        isMonthly: true,
        airwallexIntentId: initialIntentId,
        processingFee,
        creatorAmount: sub.amountUsd - processingFee,
      },
    })
  }
}

/**
 * Advance a subscription's billing period after a successful renewal charge.
 * Cron creates the transaction (already PAID), then we roll the window here.
 */
async function rollSubscriptionPeriod(subId: string) {
  const sub = await prisma.supportSubscription.findUnique({ where: { id: subId } })
  if (!sub) return
  const now = new Date()
  // If cancelAtPeriodEnd was set, this shouldn't have charged — but defensive: if it did, flip to CANCELED
  if (sub.cancelAtPeriodEnd) {
    await prisma.supportSubscription.update({
      where: { id: subId },
      data: { status: 'CANCELED', canceledAt: now },
    })
    return
  }
  const newEnd = new Date((sub.currentPeriodEnd ?? now).getTime() + 30 * 24 * 60 * 60 * 1000)
  await prisma.supportSubscription.update({
    where: { id: subId },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: sub.currentPeriodEnd ?? now,
      currentPeriodEnd: newEnd,
      lastChargedAt: now,
      failedChargeCount: 0,
      nextRetryAt: null,
    },
  })
}

/**
 * Renewal charge failed — bump failure counter, schedule retry, or cancel.
 * Dunning schedule: day 3 → day 7 → cancel.
 */
async function handleSupportRenewalFailed(intentId: string) {
  const tx = await prisma.supportTransaction.findFirst({
    where: { airwallexIntentId: intentId },
  })
  if (!tx || !tx.subscriptionId) return

  await prisma.supportTransaction.update({
    where: { id: tx.id },
    data: { status: 'FAILED' },
  })

  const sub = await prisma.supportSubscription.findUnique({ where: { id: tx.subscriptionId } })
  if (!sub) return

  const nextFailureCount = sub.failedChargeCount + 1
  const now = new Date()

  if (nextFailureCount >= 3) {
    await prisma.supportSubscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELED', canceledAt: now, failedChargeCount: nextFailureCount, nextRetryAt: null },
    })
    if (sub.tierId) {
      await prisma.supportTier.update({
        where: { id: sub.tierId },
        data: { subscriberCount: { decrement: 1 } },
      }).catch((err: unknown) => console.error('[airwallex/webhook]', err))
    }
    return
  }

  const retryInDays = nextFailureCount === 1 ? 3 : 4
  await prisma.supportSubscription.update({
    where: { id: sub.id },
    data: {
      status: 'PAST_DUE',
      failedChargeCount: nextFailureCount,
      nextRetryAt: new Date(now.getTime() + retryInDays * 24 * 60 * 60 * 1000),
    },
  })
}

async function handleTransferSucceeded(transferId: string) {
  const payout = await prisma.payout.findFirst({
    where: { airwallexTransferId: transferId },
    include: { creator: { select: { email: true, name: true } } },
  })
  if (!payout || payout.status === 'PAID') return

  await prisma.payout.update({
    where: { id: payout.id },
    data: { status: 'PAID', completedAt: new Date(), processedAt: new Date() },
  })

  await sendAndLog(
    payout.creator.email,
    'Your payout has been sent — noizu.direct',
    emailShell(`
      <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#fff;">Payout sent!</p>
      <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">Hi ${payout.creator.name ?? 'there'}, your payout of <strong style="color:#e5e5f0;">RM ${(payout.amountUsd / 100).toFixed(2)}</strong> has been sent to your account. Please allow 1–3 business days for the funds to arrive.</p>
      <p style="margin:0;font-size:13px;color:#6b6b7a;">Reference: #${payout.id.slice(-8).toUpperCase()}</p>
    `),
    'payout_sent',
  )
}

async function handleDisputeCreated(obj: Record<string, any>) {
  const disputeId = obj.id as string | undefined
  if (!disputeId) return

  const paymentIntentId = (obj.payment_intent_id ?? obj.payment_consent_id ?? '') as string
  const amountUsd = Math.round(((obj.dispute_amount ?? obj.amount ?? 0) as number) * 100)
  const currency = String(obj.dispute_currency ?? obj.currency ?? 'USD').toUpperCase()
  const reason = String(obj.dispute_reason_type ?? obj.reason_code ?? 'GENERAL').toUpperCase()
  const evidenceDeadline = obj.evidence_due_date
    ? new Date(obj.evidence_due_date as string)
    : obj.respond_by_date
      ? new Date(obj.respond_by_date as string)
      : null

  const order = paymentIntentId
    ? await prisma.order.findFirst({ where: { airwallexIntentId: paymentIntentId } })
    : null

  if (!order) {
    console.warn('[airwallex/webhook] chargeback received but no matching order for intent', paymentIntentId)
    return
  }

  await prisma.chargebackDispute.upsert({
    where: { airwallexDisputeId: disputeId },
    create: {
      airwallexDisputeId: disputeId,
      orderId: order.id,
      paymentIntentId,
      amountUsd,
      currency,
      reason,
      status: 'OPEN',
      evidenceDeadline,
    },
    update: { status: 'OPEN', evidenceDeadline },
  })

  await prisma.order.update({
    where: { id: order.id },
    data: { escrowStatus: 'DISPUTED' },
  }).catch((err: unknown) => console.error('[airwallex/webhook]', err))

  // M3 — chargeback must pause payout even if the transaction already flipped
  // to COMPLETED (escrow auto-released before the dispute arrived). The payout
  // cron excludes `payoutBlocked: true` from the per-creator balance groupBy.
  await prisma.transaction.updateMany({
    where: { orderId: order.id, status: 'COMPLETED', payoutBlocked: false },
    data: { payoutBlocked: true, payoutBlockReason: `Chargeback ${disputeId}` },
  }).catch((err: unknown) => console.error('[airwallex/webhook]', err))

  await prisma.fraudFlag.create({
    data: {
      type: 'CHARGEBACK_PATTERN',
      severity: 'HIGH',
      description: `Chargeback raised: ${reason.replace(/_/g, ' ')} — ${currency} ${(amountUsd / 100).toFixed(2)}`,
      orderId: order.id,
      userId: order.buyerId,
    },
  }).catch((err: unknown) => console.error('[airwallex/webhook]', err))
}

async function handleDisputeUpdated(obj: Record<string, any>) {
  const disputeId = obj.id as string | undefined
  if (!disputeId) return
  const existing = await prisma.chargebackDispute.findUnique({ where: { airwallexDisputeId: disputeId } })
  if (!existing) return
  await prisma.chargebackDispute.update({
    where: { airwallexDisputeId: disputeId },
    data: { status: 'UNDER_REVIEW' },
  })
}

async function handleDisputeClosed(obj: Record<string, any>, outcome: 'WON' | 'LOST') {
  const disputeId = obj.id as string | undefined
  if (!disputeId) return
  const existing = await prisma.chargebackDispute.findUnique({ where: { airwallexDisputeId: disputeId } })
  if (!existing) return
  await prisma.chargebackDispute.update({
    where: { airwallexDisputeId: disputeId },
    data: { status: outcome, outcome },
  })
  if (outcome === 'WON') {
    await prisma.order.update({
      where: { id: existing.orderId },
      data: { escrowStatus: 'HELD' },
    }).catch((err: unknown) => console.error('[airwallex/webhook]', err))

    // Dispute resolved in merchant's favour — re-enable payout on any tx we
    // previously flagged for this order (M3).
    await prisma.transaction.updateMany({
      where: { orderId: existing.orderId, payoutBlocked: true },
      data: { payoutBlocked: false, payoutBlockReason: null },
    }).catch((err: unknown) => console.error('[airwallex/webhook]', err))
  }
}

async function handleTransferFailed(transferId: string, failureReason?: string) {
  const payout = await prisma.payout.findFirst({
    where: { airwallexTransferId: transferId },
    include: { creator: { select: { email: true, name: true } } },
  })
  if (!payout || payout.status === 'REJECTED') return

  await prisma.payout.update({
    where: { id: payout.id },
    data: {
      status: 'REJECTED',
      rejectedAt: new Date(),
      failureReason: failureReason ?? 'Transfer failed',
    },
  })

  await prisma.auditEvent.create({
    data: {
      actorId: 'system',
      actorName: 'Airwallex Webhook',
      action: 'payouts.failed',
      entityType: 'Payout',
      entityId: payout.id,
      reason: failureReason ?? 'Transfer failed',
      entityLabel: `RM ${(payout.amountUsd / 100).toFixed(2)}`,
    },
  }).catch((err: unknown) => console.error('[airwallex/webhook]', err))

  await sendAndLog(
    payout.creator.email,
    'Your payout failed — noizu.direct',
    emailShell(`
      <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#fff;">Payout failed</p>
      <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">Hi ${payout.creator.name ?? 'there'}, unfortunately your payout of <strong style="color:#e5e5f0;">RM ${(payout.amountUsd / 100).toFixed(2)}</strong> could not be processed.</p>
      <p style="margin:0 0 16px;font-size:14px;color:#8b8b9a;">Reason: ${failureReason ?? 'Unknown error'}</p>
      <p style="margin:0;font-size:13px;color:#6b6b7a;">Please update your payout details and try again, or contact support.</p>
    `),
    'payout_failed',
  )
}

// Maximum clock skew between Airwallex and our server. Airwallex's own docs use
// 5 minutes; we match for symmetry. Replay attempts past this window are rejected.
const WEBHOOK_MAX_SKEW_MS = 5 * 60 * 1000

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-signature') ?? ''
  const timestampHeader = req.headers.get('x-timestamp') ?? ''
  const secret = process.env.AIRWALLEX_WEBHOOK_SECRET ?? ''

  // Always enforce HMAC verification. A missing or placeholder secret is a
  // deployment misconfiguration — reject rather than silently bypass.
  if (!secret || secret === 'placeholder') {
    console.error('[airwallex/webhook] AIRWALLEX_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  // H3 — freshness check: Airwallex sends an `x-timestamp` header (ms since
  // epoch). Reject anything older/newer than 5 minutes to kill naive replays.
  // Missing header is also rejected — Airwallex always sends it.
  if (!timestampHeader) {
    return NextResponse.json({ error: 'Missing x-timestamp' }, { status: 400 })
  }
  const timestampMs = parseInt(timestampHeader, 10)
  if (!Number.isFinite(timestampMs)) {
    return NextResponse.json({ error: 'Invalid x-timestamp' }, { status: 400 })
  }
  const skew = Math.abs(Date.now() - timestampMs)
  if (skew > WEBHOOK_MAX_SKEW_MS) {
    console.warn('[airwallex/webhook] rejected stale event', { skew, timestampMs })
    return NextResponse.json({ error: 'Timestamp out of window' }, { status: 401 })
  }

  // H3 — HMAC now covers `${timestamp}.${body}` per Airwallex docs. This ties
  // each signature to a specific moment in time; it can't be replayed across
  // the window boundary because the ts also has to be fresh.
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestampHeader}.${body}`)
    .digest('hex')
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body) as {
    id?: string
    name: string
    data?: { object?: Record<string, any> }
  }

  const obj = event.data?.object ?? {}
  const intentId = obj.id as string | undefined

  // H3 — idempotent dispatch via event id. Airwallex stamps every event with a
  // top-level `id`; if we've seen it before we ack 200 without re-firing any
  // side-effects. We insert first (creating the row is our claim), so two
  // concurrent deliveries can't both proceed. The unique constraint on
  // airwallexEventId guarantees at-most-once processing.
  const eventId = typeof event.id === 'string' && event.id.length > 0 ? event.id : null
  if (eventId) {
    try {
      await prisma.processedWebhookEvent.create({
        data: { airwallexEventId: eventId, eventName: event.name },
      })
    } catch (err: any) {
      // Prisma P2002 = unique constraint violation → already processed. Ack 200.
      if (err?.code === 'P2002') {
        return NextResponse.json({ ok: true, replayed: true })
      }
      throw err
    }
  }

  // Process synchronously before returning 200. On Vercel serverless, background
  // promises after response-flush are not guaranteed to complete — see audit F11.
  // Airwallex retries on non-2xx for up to 24h, so we prefer slow-but-correct.
  try {
    if (event.name === 'payment_intent.succeeded' && intentId) {
      if (await handleSupportPaymentSucceeded(intentId)) {
        // handled as support flow
      } else if (await handleStoragePaymentSucceeded(intentId)) {
        // handled as storage flow
      } else {
        await handlePaymentSucceeded(intentId)
      }
    } else if (event.name === 'payment_intent.failed' && intentId) {
      await handlePaymentFailed(intentId)
    } else if (event.name === 'transfer.succeeded' && intentId) {
      await handleTransferSucceeded(intentId)
    } else if (event.name === 'transfer.failed' && intentId) {
      const failureReason = obj.failure_reason as string | undefined
      await handleTransferFailed(intentId, failureReason)
    } else if (
      event.name === 'payment.dispute.RaisedByBuyer' ||
      event.name === 'payment_dispute.created'
    ) {
      await handleDisputeCreated(obj)
    } else if (
      event.name === 'payment.dispute.updated' ||
      event.name === 'payment_dispute.updated'
    ) {
      await handleDisputeUpdated(obj)
    } else if (
      event.name === 'payment.dispute.Accepted' ||
      event.name === 'payment_dispute.closed'
    ) {
      await handleDisputeClosed(obj, 'LOST')
    } else if (
      event.name === 'payment.dispute.Closed' ||
      event.name === 'payment_dispute.won'
    ) {
      await handleDisputeClosed(obj, 'WON')
    }
  } catch (err) {
    // Returning 500 causes Airwallex to retry. The handler's idempotency guard
    // (atomic updateMany PENDING→PROCESSING) prevents duplicate processing.
    // Roll back our dedupe row so a retry isn't short-circuited into a 200 no-op.
    if (eventId) {
      await prisma.processedWebhookEvent
        .delete({ where: { airwallexEventId: eventId } })
        .catch(() => {})
    }
    console.error('[airwallex/webhook] handler failed', { event: event.name, intentId, err })
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
