import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

const RESET_TTL_MS = 30 * 60 * 1000 // 30 minutes

export async function POST(req: Request) {
  try {
    const body = await req.json() as { email?: string }
    const email = (body.email ?? '').trim().toLowerCase()

    // Always return 200 — never reveal whether the email exists
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: true })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ ok: true })

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + RESET_TTL_MS)

    await prisma.passwordResetToken.create({
      data: { token, email, expiresAt },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'noreply@noizu.direct',
      to: [email],
      subject: 'Reset your NOIZU-DIRECT password',
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <!-- Logo -->
        <tr><td style="padding-bottom:32px;text-align:center;">
          <img src="${baseUrl}/uploads/library/38cf460d-b641-4ded-918e-a190d438eb3d.webp" alt="NOIZU-DIRECT" height="50" style="height:50px;width:auto;display:inline-block;" />
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#ffffff;">Reset your password</p>
          <p style="margin:0 0 24px;font-size:14px;color:#8b8b9a;line-height:1.6;">
            We received a request to reset the password for your NOIZU-DIRECT account. Click the button below to choose a new password.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:24px;">
            <a href="${resetUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:10px;">Reset Password</a>
          </td></tr></table>
          <p style="margin:0 0 8px;font-size:13px;color:#8b8b9a;line-height:1.6;">
            This link expires in <strong style="color:#c4b5fd;">30 minutes</strong>. If you didn't request a password reset, you can safely ignore this email — your password won't change.
          </p>
          <p style="margin:16px 0 0;font-size:12px;color:#4b4b5a;line-height:1.6;word-break:break-all;">
            If the button doesn't work, copy and paste this link:<br>
            <a href="${resetUrl}" style="color:#7c3aed;">${resetUrl}</a>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#4b4b5a;">NOIZU-DIRECT &mdash; Creator marketplace</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })

    console.info(`[forgot-password] Reset email sent to ${email}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[forgot-password] Error:', err)
    // Still return 200 to avoid leaking information
    return NextResponse.json({ ok: true })
  }
}
