import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'

function emailShell(body: string, baseUrl: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
<tr><td style="padding-bottom:32px;text-align:center;"><img src="${baseUrl}/uploads/library/38cf460d-b641-4ded-918e-a190d438eb3d.webp" alt="noizu.direct" height="50" /></td></tr>
<tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">${body}</td></tr>
<tr><td style="padding-top:24px;text-align:center;"><p style="margin:0;font-size:12px;color:#4b4b5a;">noizu.direct &mdash; Creator marketplace for SEA creators</p></td></tr>
</table></td></tr></table></body></html>`
}

async function sendAndLog(prisma: any, { to, subject, html, type }: { to: string; subject: string; html: string; type: string }) {
  try {
    const { data } = await resend.emails.send({ from: 'noizu.direct <noreply@noizu.direct>', to: [to], subject, html })
    await prisma.emailLog.create({ data: { to, subject, type, status: 'sent', resendId: data?.id ?? null } })
  } catch (e) {
    await prisma.emailLog.create({ data: { to, subject, type, status: 'failed', error: String(e) } }).catch(() => {})
  }
}

function cuid() {
  return 'd' + Math.random().toString(36).slice(2, 27)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json() as { reason: string; description: string; evidence?: string[] }

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (order.buyerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const existing = await prisma.dispute.findUnique({ where: { orderId: id } })
  if (existing) return NextResponse.json({ error: 'Dispute already exists for this order' }, { status: 409 })

  const dispute = await prisma.$transaction(async (tx) => {
    const d = await tx.dispute.create({
      data: {
        id: cuid(),
        orderId: id,
        raisedBy: session.user!.id!,
        reason: body.reason,
        description: body.description,
        evidence: JSON.stringify(body.evidence ?? []),
      },
    })
    await tx.order.update({ where: { id }, data: { escrowStatus: 'DISPUTED' } })
    return d
  })

  await createNotification(
    order.creatorId, 'DISPUTE_RAISED',
    'A buyer has raised a dispute',
    `A dispute has been raised on order #${id.slice(-8).toUpperCase()}. Please respond within 48 hours.`,
    id, `/dashboard/orders/${id}/dispute`,
  )

  ;(async () => {
    try {
      const creator = await prisma.user.findUnique({ where: { id: order.creatorId }, select: { email: true, name: true } })
      if (creator) {
        const html = emailShell(`
          <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#fff;">Dispute opened on your order</p>
          <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">Hi ${creator.name}, a buyer has opened a dispute on order #${id.slice(-8).toUpperCase()}. Please respond within 48 hours.</p>
        `, baseUrl)
        await sendAndLog(prisma, { to: creator.email, subject: 'Dispute opened — noizu.direct', html, type: 'dispute_opened' })
      }
    } catch {}
  })()

  return NextResponse.json({ ok: true, disputeId: dispute.id })
}
