import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNewCreatorExtraDays } from '@/lib/creator-trust'
import { getProcessingFeeRate, feeFromGross } from '@/lib/platform-fees'
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
    await prisma.emailLog.create({ data: { to, subject, type, status: 'failed', error: String(e) } }).catch(() => {})
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

    // Create Transaction record — fee is backed out of gross (amountUsd includes fee)
    const processingFee = feeFromGross(order.amountUsd, feeRate)
    const creatorAmount = order.amountUsd - processingFee
    await prisma.transaction.create({
      data: {
        orderId: order.id,
        buyerId: order.buyerId,
        creatorId: order.creatorId,
        grossAmountUsd: order.amountUsd,
        processingFee,
        platformFee: 0,
        withdrawalFee: 0,
        creatorAmount,
        currency: order.displayCurrency ?? 'USD',
        airwallexReference: intentId,
        // Commission funds are held as ESCROW until deposit/balance portions release
        status: isCommission ? 'ESCROW' : 'COMPLETED',
      },
    })

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
    }).catch(() => {})
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
  }).catch(() => {})

  // Email buyer
  const buyer = orders[0].buyer
  const shortId = orders[0].id.slice(-8).toUpperCase()
  await sendAndLog(
    buyer.email,
    'Payment successful — noizu.direct',
    emailShell(`
      <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#fff;">Payment received!</p>
      <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">Hi ${buyer.name ?? 'there'}, your payment was successful and your order${orders.length !== 1 ? 's are' : ' is'} now being processed.</p>
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
  }).catch(() => {})

  await prisma.fraudFlag.create({
    data: {
      type: 'CHARGEBACK_PATTERN',
      severity: 'HIGH',
      description: `Chargeback raised: ${reason.replace(/_/g, ' ')} — ${currency} ${(amountUsd / 100).toFixed(2)}`,
      orderId: order.id,
      userId: order.buyerId,
    },
  }).catch(() => {})
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
    }).catch(() => {})
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
  }).catch(() => {})

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

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-signature') ?? ''
  const secret = process.env.AIRWALLEX_WEBHOOK_SECRET ?? ''

  // Always enforce HMAC verification. A missing or placeholder secret is a
  // deployment misconfiguration — reject rather than silently bypass.
  if (!secret || secret === 'placeholder') {
    console.error('[airwallex/webhook] AIRWALLEX_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  const sigBuf   = Buffer.from(signature)
  const expBuf   = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body) as {
    name: string
    data?: { object?: Record<string, any> }
  }

  const obj = event.data?.object ?? {}
  const intentId = obj.id as string | undefined

  // Return 200 immediately; process async
  if (event.name === 'payment_intent.succeeded' && intentId) {
    void handlePaymentSucceeded(intentId)
  } else if (event.name === 'payment_intent.failed' && intentId) {
    void handlePaymentFailed(intentId)
  } else if (event.name === 'transfer.succeeded' && intentId) {
    void handleTransferSucceeded(intentId)
  } else if (event.name === 'transfer.failed' && intentId) {
    const failureReason = obj.failure_reason as string | undefined
    void handleTransferFailed(intentId, failureReason)
  } else if (
    event.name === 'payment.dispute.RaisedByBuyer' ||
    event.name === 'payment_dispute.created'
  ) {
    void handleDisputeCreated(obj)
  } else if (
    event.name === 'payment.dispute.updated' ||
    event.name === 'payment_dispute.updated'
  ) {
    void handleDisputeUpdated(obj)
  } else if (
    event.name === 'payment.dispute.Accepted' ||
    event.name === 'payment_dispute.closed'
  ) {
    void handleDisputeClosed(obj, 'LOST')
  } else if (
    event.name === 'payment.dispute.Closed' ||
    event.name === 'payment_dispute.won'
  ) {
    void handleDisputeClosed(obj, 'WON')
  }

  return NextResponse.json({ ok: true })
}
