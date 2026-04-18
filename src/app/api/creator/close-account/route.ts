import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id as string

  let reason = ''
  try {
    const body = await req.json() as { reason?: string }
    reason = (body.reason ?? '').trim().slice(0, 500)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Idempotency: already requested
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { closureRequestedAt: true, accountStatus: true, email: true, name: true },
  })
  if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (existing.closureRequestedAt || existing.accountStatus === 'CLOSED') {
    return NextResponse.json({ error: 'Account closure already requested' }, { status: 409 })
  }

  const now = new Date()
  const closureDate = new Date(now)
  closureDate.setDate(closureDate.getDate() + 30)

  // Deactivate all products via creator profile
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: { id: true },
  })

  await prisma.$transaction(async (tx) => {
    // Mark closure requested (accountStatus stays ACTIVE until 30 days elapse)
    await tx.user.update({
      where: { id: userId },
      data: {
        closureRequestedAt: now,
        restrictionReason: reason || null,
      },
    })

    // Deactivate all creator listings
    if (profile) {
      await tx.product.updateMany({
        where: { creatorId: profile.id },
        data: { isActive: false },
      })
    }

    // Create in-app notification
    await tx.notification.create({
      data: {
        userId,
        type: 'ORDER_CANCELLED', // re-using a generic type; schema allows free-text type
        title: 'Account closure scheduled',
        message: `Your account has been scheduled for closure on ${closureDate.toLocaleDateString('en-US', { dateStyle: 'long' })}. Contact hello@noizu.direct within 24 hours to cancel.`,
        actionUrl: '/dashboard',
      },
    })
  })

  // Send confirmation email (non-blocking; log failures)
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'
    const closureDateStr = closureDate.toLocaleDateString('en-US', { dateStyle: 'long' })
    await resend.emails.send({
      from: 'noreply@noizu.direct',
      to: [existing.email],
      subject: 'noizu.direct — Account Closure Scheduled',
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <img src="${baseUrl}/uploads/library/38cf460d-b641-4ded-918e-a190d438eb3d.webp" alt="noizu.direct" height="50" style="height:50px;width:auto;display:inline-block;" />
        </td></tr>
        <tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#ffffff;">Account Closure Scheduled</p>
          <p style="margin:0 0 16px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            Hi ${existing.name},
          </p>
          <p style="margin:0 0 16px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            We've received your request to close your noizu.direct creator account. Your account is scheduled for closure on <strong style="color:#ffffff;">${closureDateStr}</strong>.
          </p>
          <p style="margin:0 0 16px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            Until then you can still fulfil existing orders and withdraw your balance, but you cannot create new listings. Your existing listings have been deactivated.
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            If you'd like to cancel this request, please email us at <a href="mailto:hello@noizu.direct" style="color:#7c3aed;">hello@noizu.direct</a> within 24 hours.
          </p>
          <p style="margin:0;font-size:13px;color:#4b4b5a;">— The noizu.direct team</p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#4b4b5a;">noizu.direct &mdash; Creator marketplace</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })
  } catch (err) {
    console.error('[close-account] Failed to send confirmation email:', err)
  }

  return NextResponse.json({ ok: true, closureDate: closureDate.toISOString() })
}
