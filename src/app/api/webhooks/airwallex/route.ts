import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-signature') ?? ''
  const secret = process.env.AIRWALLEX_WEBHOOK_SECRET ?? ''

  if (!secret) {
    console.error('[webhooks/airwallex] AIRWALLEX_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  const sigBuf  = Buffer.from(signature)
  const expBuf  = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body) as {
    name: string
    data?: { object?: Record<string, any> }
  }
  const obj = event.data?.object ?? {}

  // ── Payment succeeded ──────────────────────────────────────────────────────
  if (event.name === 'payment_intent.succeeded') {
    const intentId = obj.id as string | undefined
    if (!intentId) return NextResponse.json({ ok: true })

    const order = await prisma.order.findFirst({ where: { airwallexIntentId: intentId } })
    if (!order || order.status === 'PAID') return NextResponse.json({ ok: true })

    const settings = await prisma.platformSettings.findFirst()
    const feePercent = settings?.processingFeePercent ?? 2.5
    const processingFee = Math.round(order.amountUsd * (feePercent / 100))
    const withdrawalProvision = Math.round(order.amountUsd * 0.04)
    const creatorAmount = order.amountUsd - withdrawalProvision

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        downloadToken: uuidv4(),
        downloadExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    })

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
        currency: order.displayCurrency,
        airwallexReference: intentId,
        status: 'COMPLETED',
      },
    })

    return NextResponse.json({ ok: true })
  }

  // ── Chargeback / payment dispute ───────────────────────────────────────────
  if (event.name === 'payment.dispute.RaisedByBuyer' || event.name === 'payment_dispute.created') {
    await handleDisputeCreated(obj)
    return NextResponse.json({ ok: true })
  }

  if (event.name === 'payment.dispute.updated' || event.name === 'payment_dispute.updated') {
    await handleDisputeUpdated(obj)
    return NextResponse.json({ ok: true })
  }

  if (event.name === 'payment.dispute.Accepted' || event.name === 'payment_dispute.closed') {
    await handleDisputeClosed(obj, 'LOST')
    return NextResponse.json({ ok: true })
  }

  if (event.name === 'payment.dispute.Closed' || event.name === 'payment_dispute.won') {
    await handleDisputeClosed(obj, 'WON')
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}

async function handleDisputeCreated(obj: Record<string, any>) {
  const disputeId = obj.id as string
  if (!disputeId) return

  const paymentIntentId = obj.payment_intent_id ?? obj.payment_consent_id ?? ''
  const amountUsd = Math.round((obj.dispute_amount ?? obj.amount ?? 0) * 100)
  const currency = (obj.dispute_currency ?? obj.currency ?? 'USD').toUpperCase()
  const reason = (obj.dispute_reason_type ?? obj.reason_code ?? 'GENERAL').toUpperCase()
  const evidenceDeadlineDays = obj.evidence_deadline ? null : null
  const evidenceDeadline = obj.evidence_due_date
    ? new Date(obj.evidence_due_date)
    : obj.respond_by_date
    ? new Date(obj.respond_by_date)
    : null

  // Find the order by payment intent
  const order = paymentIntentId
    ? await prisma.order.findFirst({ where: { airwallexIntentId: paymentIntentId } })
    : null

  if (!order) {
    console.warn('[webhook] chargeback received but no matching order for intent', paymentIntentId)
    return
  }

  // Upsert so duplicate webhooks are idempotent
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

  // Flag the order in escrow to prevent premature release
  await prisma.order.update({
    where: { id: order.id },
    data: { escrowStatus: 'DISPUTED' },
  }).catch(() => {})

  // Create a fraud flag for visibility
  await prisma.fraudFlag.create({
    data: {
      type: 'CHARGEBACK_PATTERN',
      severity: 'HIGH',
      description: `Chargeback raised: ${reason.replace(/_/g, ' ')} — ${currency} ${(amountUsd / 100).toFixed(2)}`,
      orderId: order.id,
      userId: order.buyerId,
    },
  })

  console.log('[webhook] chargeback created for order', order.id)
}

async function handleDisputeUpdated(obj: Record<string, any>) {
  const disputeId = obj.id as string
  if (!disputeId) return

  const existing = await prisma.chargebackDispute.findUnique({ where: { airwallexDisputeId: disputeId } })
  if (!existing) return

  await prisma.chargebackDispute.update({
    where: { airwallexDisputeId: disputeId },
    data: { status: 'UNDER_REVIEW' },
  })
}

async function handleDisputeClosed(obj: Record<string, any>, outcome: 'WON' | 'LOST') {
  const disputeId = obj.id as string
  if (!disputeId) return

  const existing = await prisma.chargebackDispute.findUnique({ where: { airwallexDisputeId: disputeId } })
  if (!existing) return

  await prisma.chargebackDispute.update({
    where: { airwallexDisputeId: disputeId },
    data: { status: outcome, outcome },
  })

  // If WON, release the escrow hold flag
  if (outcome === 'WON') {
    await prisma.order.update({
      where: { id: existing.orderId },
      data: { escrowStatus: 'HELD' },
    }).catch(() => {})
  }
}
