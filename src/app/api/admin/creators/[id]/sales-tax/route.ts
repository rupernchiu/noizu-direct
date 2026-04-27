/**
 * PATCH /api/admin/creators/[id]/sales-tax
 *
 * Admin moves a CreatorProfile through the sales-tax state machine:
 *
 *   REQUESTED → APPROVED   (action: 'APPROVE')
 *     - salesTaxStatus = 'APPROVED'
 *     - salesTaxApprovedAt / salesTaxApprovedBy filled in
 *     - collectsSalesTax = true   ← gate that activates collection at order time
 *     - email + in-app notification to creator
 *
 *   REQUESTED → REJECTED   (action: 'REJECT', reason: string >= 5 chars)
 *     - salesTaxStatus = 'REJECTED'
 *     - collectsSalesTax = false (defensive)
 *     - reason persisted to AuditEvent + included in the email
 *
 *   REJECTED → APPROVED is also allowed (admin reconsidering); same APPROVE
 *   handler. REQUESTED → REQUESTED, NONE → anything is rejected.
 *
 * The `[id]` param is the CreatorProfile.id (matches the existing
 * /api/admin/creators/[id] PATCH convention).
 */
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/lib/auditLog'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'
const FROM = process.env.EMAIL_FROM ?? 'noreply@noizu.direct'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = (await req.json().catch(() => ({}))) as {
    action?: 'APPROVE' | 'REJECT'
    reason?: string
  }
  const { action, reason } = body

  if (action !== 'APPROVE' && action !== 'REJECT') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  if (action === 'REJECT' && (!reason || reason.trim().length < 5)) {
    return NextResponse.json(
      { error: 'Rejection reason is required (min 5 chars).' },
      { status: 400 },
    )
  }

  const profile = await prisma.creatorProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Enforce state-machine transitions.
  if (action === 'APPROVE') {
    if (profile.salesTaxStatus !== 'REQUESTED' && profile.salesTaxStatus !== 'REJECTED') {
      return NextResponse.json(
        { error: `Cannot approve from status "${profile.salesTaxStatus}".` },
        { status: 400 },
      )
    }
  } else {
    if (profile.salesTaxStatus !== 'REQUESTED') {
      return NextResponse.json(
        { error: `Cannot reject from status "${profile.salesTaxStatus}".` },
        { status: 400 },
      )
    }
  }

  const adminId = (session.user as any).id as string
  const adminName =
    (session.user as any).name ?? (session.user as any).email ?? 'Admin'
  const labelDisplay = profile.salesTaxLabel ?? 'sales tax'
  const ratePctDisplay =
    profile.salesTaxRate != null ? `${(profile.salesTaxRate * 100).toFixed(2)}%` : '—'
  const creatorEmail = profile.user.email
  const creatorName = profile.user.name ?? 'Creator'

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

  if (action === 'APPROVE') {
    const before = JSON.stringify({
      salesTaxStatus: profile.salesTaxStatus,
      collectsSalesTax: profile.collectsSalesTax,
    })

    const updated = await prisma.creatorProfile.update({
      where: { id },
      data: {
        salesTaxStatus: 'APPROVED',
        salesTaxApprovedAt: new Date(),
        salesTaxApprovedBy: adminId,
        collectsSalesTax: true,
      },
      select: {
        salesTaxStatus: true,
        salesTaxApprovedAt: true,
        salesTaxApprovedBy: true,
        collectsSalesTax: true,
        salesTaxLabel: true,
        salesTaxRate: true,
      },
    })

    // Audit.
    await logAuditEvent({
      actorId: adminId,
      actorName: adminName,
      action: 'creators.salesTax.approve',
      entityType: 'CreatorProfile',
      entityId: id,
      entityLabel: profile.displayName ?? creatorName,
      beforeJson: before,
      afterJson: JSON.stringify(updated),
    }).catch((err) => console.warn('[sales-tax] audit log failed', err))

    // Email creator. Best-effort; don't block on transport failure.
    if (resend && creatorEmail) {
      try {
        await resend.emails.send({
          from: FROM,
          to: [creatorEmail],
          subject: 'Sales tax collection approved',
          html: approvedHtml(creatorName, labelDisplay, ratePctDisplay),
        })
      } catch (err) {
        console.warn('[sales-tax] approval email failed', (err as Error).message)
      }
    } else if (!resend) {
      console.info('[sales-tax] RESEND_API_KEY missing — skipping approval email')
    }

    // In-app notification (best-effort).
    try {
      await prisma.notification.create({
        data: {
          userId: profile.user.id,
          type: 'SALES_TAX_APPROVED',
          title: 'Sales tax collection approved',
          message: `Starting on your next order, noizu.direct will collect ${labelDisplay} ${ratePctDisplay} on your sales and pass it through in your payout for you to remit.`,
          actionUrl: '/dashboard/finance/tax/sales-tax-opt-in',
          isRead: false,
        },
      })
    } catch (err) {
      console.warn('[sales-tax] notification create failed', (err as Error).message)
    }

    return NextResponse.json({ ok: true })
  }

  // REJECT
  const trimmedReason = (reason ?? '').trim()
  const before = JSON.stringify({ salesTaxStatus: profile.salesTaxStatus })

  await prisma.creatorProfile.update({
    where: { id },
    data: {
      salesTaxStatus: 'REJECTED',
      collectsSalesTax: false,
    },
  })

  // Audit — this is where the rejection reason lives (Option B from the spec).
  // No new schema column; AuditEvent is the canonical record.
  await logAuditEvent({
    actorId: adminId,
    actorName: adminName,
    action: 'creators.salesTax.reject',
    entityType: 'CreatorProfile',
    entityId: id,
    entityLabel: profile.displayName ?? creatorName,
    reason: trimmedReason,
    beforeJson: before,
    afterJson: JSON.stringify({ salesTaxStatus: 'REJECTED' }),
  }).catch((err) => console.warn('[sales-tax] audit log failed', err))

  if (resend && creatorEmail) {
    try {
      await resend.emails.send({
        from: FROM,
        to: [creatorEmail],
        subject: 'Sales tax collection request — update',
        html: rejectedHtml(creatorName, trimmedReason),
      })
    } catch (err) {
      console.warn('[sales-tax] rejection email failed', (err as Error).message)
    }
  } else if (!resend) {
    console.info('[sales-tax] RESEND_API_KEY missing — skipping rejection email')
  }

  try {
    await prisma.notification.create({
      data: {
        userId: profile.user.id,
        type: 'SALES_TAX_REJECTED',
        title: 'Sales tax collection request not approved',
        message: `Your sales-tax collection request was not approved. Reason: ${trimmedReason}. You can submit a fresh request from the opt-in page.`,
        actionUrl: '/dashboard/finance/tax/sales-tax-opt-in',
        isRead: false,
      },
    })
  } catch (err) {
    console.warn('[sales-tax] notification create failed', (err as Error).message)
  }

  return NextResponse.json({ ok: true })
}

// ─── Email templates ─────────────────────────────────────────────────────────

function approvedHtml(name: string, label: string, ratePct: string): string {
  const optInUrl = `${baseUrl}/dashboard/finance/tax/sales-tax-opt-in`
  const safeName = escapeHtml(name)
  const safeLabel = escapeHtml(label)
  const safeRate = escapeHtml(ratePct)
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">Sales tax collection approved</p>
          <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            Hi ${safeName}, your request to have noizu.direct collect ${safeLabel} on your sales has been approved.
          </p>
          <div style="background:#1a1a24;border:1px solid #3f3f4a;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#8b8b9a;text-transform:uppercase;letter-spacing:0.05em;">Active rate</p>
            <p style="margin:0;font-size:16px;color:#e5e5f0;font-weight:600;">${safeLabel} ${safeRate}</p>
          </div>
          <p style="margin:0 0 24px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            Starting on your next order, we will collect ${safeLabel} on your sales (subtotal + shipping) and pass it through to you in your payout. You remit the tax to your tax authority yourself under your own registration. We do not file or remit on your behalf.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${optInUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px;">Manage settings</a>
          </td></tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function rejectedHtml(name: string, reason: string): string {
  const optInUrl = `${baseUrl}/dashboard/finance/tax/sales-tax-opt-in`
  const safeName = escapeHtml(name)
  const safeReason = escapeHtml(reason)
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">Sales tax request — update</p>
          <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            Hi ${safeName}, after reviewing your registration certificate we were unable to approve your sales tax collection request at this time.
          </p>
          <div style="background:#1a1a24;border:1px solid #3f3f4a;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#8b8b9a;text-transform:uppercase;letter-spacing:0.05em;">Reason</p>
            <p style="margin:0;font-size:14px;color:#e5e5f0;line-height:1.6;">${safeReason}</p>
          </div>
          <p style="margin:0 0 24px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            You can submit a fresh request once you've addressed the issue above. If you have any questions, reply to this email.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${optInUrl}" style="display:inline-block;background:#27272f;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px;">Submit again</a>
          </td></tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
