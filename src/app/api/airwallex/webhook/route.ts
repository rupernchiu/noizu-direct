import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'

function emailShell(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
<tr><td style="padding-bottom:32px;text-align:center;"><img src="${baseUrl}/uploads/library/38cf460d-b641-4ded-918e-a190d438eb3d.webp" alt="NOIZU-DIRECT" height="50" /></td></tr>
<tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">${body}</td></tr>
<tr><td style="padding-top:24px;text-align:center;"><p style="margin:0;font-size:12px;color:#4b4b5a;">NOIZU-DIRECT &mdash; Creator marketplace for SEA creators</p></td></tr>
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
      from: 'NOIZU-DIRECT <noreply@noizu.direct>',
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
  const orders = await prisma.order.findMany({
    where: { airwallexIntentId: intentId, status: 'PENDING' },
    include: {
      buyer: { select: { email: true, name: true } },
      creator: { select: { email: true } },
      product: { select: { title: true, type: true } },
    },
  })

  if (orders.length === 0) return

  for (const order of orders) {
    const isDigital = order.product.type === 'DIGITAL'
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PROCESSING',
        escrowStatus: isDigital ? 'RELEASED' : 'HELD',
        escrowHeldAt: new Date(),
      },
    })

    // Notify creator
    await prisma.notification.create({
      data: {
        userId: order.creatorId,
        type: 'NEW_ORDER',
        title: 'New order received',
        message: `You have a new order for "${order.product.title}".`,
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
    'Payment successful — NOIZU-DIRECT',
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
      'New order — NOIZU-DIRECT',
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

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-signature') ?? ''
  const secret = process.env.AIRWALLEX_WEBHOOK_SECRET ?? ''

  if (secret && secret !== 'placeholder') {
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
    if (expected !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  const event = JSON.parse(body) as {
    name: string
    data?: { object?: { id?: string } }
  }

  const intentId = event.data?.object?.id

  // Return 200 immediately; process async
  if (event.name === 'payment_intent.succeeded' && intentId) {
    void handlePaymentSucceeded(intentId)
  } else if (event.name === 'payment_intent.failed' && intentId) {
    void handlePaymentFailed(intentId)
  }

  return NextResponse.json({ ok: true })
}
