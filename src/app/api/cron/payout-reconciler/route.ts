// Schedule: runs once daily at 5am
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTransferStatus } from '@/lib/airwallex'
import { Resend } from 'resend'

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

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (
    req.headers.get('authorization') === `Bearer ${secret}` ||
    req.headers.get('x-cron-secret') === secret
  )
}

async function runReconciler() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const stalledPayouts = await prisma.payout.findMany({
    where: {
      status: 'PROCESSING',
      processedAt: { lt: cutoff },
      airwallexTransferId: { not: null },
    },
    include: { creator: { select: { email: true, name: true } } },
  })

  let checked = stalledPayouts.length
  let updated = 0

  for (const payout of stalledPayouts) {
    if (!payout.airwallexTransferId) continue

    try {
      const { status, failure_reason } = await getTransferStatus(payout.airwallexTransferId)

      if (status === 'SUCCEEDED' || status === 'PAID') {
        await prisma.payout.update({
          where: { id: payout.id },
          data: { status: 'PAID', completedAt: new Date() },
        })
        updated++

        const html = emailShell(`
          <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#fff;">Payout sent!</p>
          <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">Hi ${payout.creator.name ?? 'there'}, your payout of <strong style="color:#e5e5f0;">RM ${(payout.amountUsd / 100).toFixed(2)}</strong> has been sent.</p>
        `)
        await resend.emails.send({
          from: 'noizu.direct <noreply@noizu.direct>',
          to: [payout.creator.email],
          subject: 'Your payout has been sent — noizu.direct',
          html,
        }).catch(() => {})

      } else if (status === 'FAILED' || status === 'REJECTED') {
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'REJECTED',
            rejectedAt: new Date(),
            failureReason: failure_reason ?? 'Transfer failed',
          },
        })
        updated++

        const html = emailShell(`
          <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#fff;">Payout failed</p>
          <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">Hi ${payout.creator.name ?? 'there'}, your payout could not be processed. Reason: ${failure_reason ?? 'Unknown'}. Please contact support.</p>
        `)
        await resend.emails.send({
          from: 'noizu.direct <noreply@noizu.direct>',
          to: [payout.creator.email],
          subject: 'Your payout failed — noizu.direct',
          html,
        }).catch(() => {})
      }
    } catch (e) {
      console.error(`Reconciler error for payout ${payout.id}:`, e)
    }
  }

  return { checked, updated }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    return NextResponse.json(await runReconciler())
  } catch (e) {
    console.error('[cron/payout-reconciler]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    return NextResponse.json(await runReconciler())
  } catch (e) {
    console.error('[cron/payout-reconciler]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
