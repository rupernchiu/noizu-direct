import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'

function emailShell(body: string, baseUrl: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
<tr><td style="padding-bottom:32px;text-align:center;"><img src="${baseUrl}/uploads/library/38cf460d-b641-4ded-918e-a190d438eb3d.webp" alt="NOIZU-DIRECT" height="50" /></td></tr>
<tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">${body}</td></tr>
<tr><td style="padding-top:24px;text-align:center;"><p style="margin:0;font-size:12px;color:#4b4b5a;">NOIZU-DIRECT &mdash; Creator marketplace for SEA creators</p></td></tr>
</table></td></tr></table></body></html>`
}

async function sendAndLog(prisma: any, { to, subject, html, type }: { to: string; subject: string; html: string; type: string }) {
  try {
    const { data } = await resend.emails.send({ from: 'NOIZU-DIRECT <noreply@noizu.direct>', to: [to], subject, html })
    await prisma.emailLog.create({ data: { to, subject, type, status: 'sent', resendId: data?.id ?? null } })
  } catch (e) {
    await prisma.emailLog.create({ data: { to, subject, type, status: 'failed', error: String(e) } }).catch(() => {})
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId } = await req.json() as { productId: string }
  const product = await prisma.product.findUnique({
    where: { id: productId, isActive: true },
    include: { creator: { include: { user: true } } },
  })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Don't let creator buy own product
  const buyerId = (session.user as { id: string }).id
  if (product.creator.userId === buyerId) {
    return NextResponse.json({ error: 'Cannot buy own product' }, { status: 400 })
  }

  const order = await prisma.order.create({
    data: {
      buyerId,
      creatorId: product.creator.userId,
      productId,
      status: 'PENDING',
      amountUsd: product.price,
      displayCurrency: 'USD',
      displayAmount: product.price,
      exchangeRate: 1.0,
    },
  })

  // Fire-and-forget — never await top level
  ;(async () => {
    try {
      const buyer = await prisma.user.findUnique({ where: { id: buyerId }, select: { email: true, name: true } })
      if (buyer) {
        const html = emailShell(`
          <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#fff;">Order confirmed!</p>
          <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">Hi ${buyer.name}, your order for <strong style="color:#e5e5f0;">${product.title}</strong> has been received. You'll be notified when it's processed.</p>
          <p style="margin:0;font-size:13px;color:#6b6b7a;">Order ID: #${order.id.slice(-8).toUpperCase()}</p>
        `, baseUrl)
        await sendAndLog(prisma, { to: buyer.email, subject: 'Order confirmed — NOIZU-DIRECT', html, type: 'order_confirmation' })
      }
      const creatorEmail = product.creator.user.email
      const creatorName = product.creator.displayName
      const creatorHtml = emailShell(`
        <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#fff;">New order received!</p>
        <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">Hi ${creatorName}, you have a new order for <strong style="color:#e5e5f0;">${product.title}</strong>. Please fulfill it promptly.</p>
        <p style="margin:0;font-size:13px;color:#6b6b7a;">Order ID: #${order.id.slice(-8).toUpperCase()}</p>
      `, baseUrl)
      await sendAndLog(prisma, { to: creatorEmail, subject: 'New order — NOIZU-DIRECT', html: creatorHtml, type: 'order_notification' })
    } catch {}
  })()

  return NextResponse.json({ orderId: order.id })
}
