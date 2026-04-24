/**
 * Abuse-report dispatch. Fires an email to abuse@noizu.direct whenever a party
 * reports a ticket message. The ticket is the official dispute record, so the
 * email just includes enough pointers for a human to open the ticket and read
 * the full thread in-app.
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'noreply@noizu.direct'
const ABUSE_INBOX = process.env.ABUSE_INBOX ?? 'abuse@noizu.direct'
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'

export interface AbuseReportPayload {
  ticketId: string
  ticketSubject: string
  messageId: string
  messagePreview: string
  reason: string
  reporterUserId: string
  reporterName: string
  reporterEmail: string | null
  targetUserId: string
  targetName: string
}

export async function sendAbuseReport(p: AbuseReportPayload): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    // eslint-disable-next-line no-console
    console.warn('[abuse-report] RESEND_API_KEY missing; skipping email', p)
    return
  }
  const adminUrl = `${baseUrl}/admin/tickets/${p.ticketId}`
  const preview = p.messagePreview.slice(0, 500)
  const reason = p.reason.slice(0, 300)

  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#f7f7fa;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:white;border-radius:12px;padding:28px;border:1px solid #e5e7eb;">
    <h1 style="margin:0 0 8px;font-size:18px;color:#111827;">Ticket message reported</h1>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">A user has flagged a message inside a ticket for moderator review.</p>
    <table cellpadding="6" style="width:100%;font-size:13px;color:#1f2937;border-collapse:collapse;">
      <tr><td style="color:#6b7280;width:140px;">Ticket</td><td><code>${p.ticketId}</code> &mdash; ${escapeHtml(p.ticketSubject)}</td></tr>
      <tr><td style="color:#6b7280;">Reported message</td><td><code>${p.messageId}</code></td></tr>
      <tr><td style="color:#6b7280;">Reported by</td><td>${escapeHtml(p.reporterName)} &lt;${escapeHtml(p.reporterEmail ?? '(no email)')}&gt; <code>${p.reporterUserId}</code></td></tr>
      <tr><td style="color:#6b7280;">Target sender</td><td>${escapeHtml(p.targetName)} <code>${p.targetUserId}</code></td></tr>
      <tr><td style="color:#6b7280;">Reason</td><td>${escapeHtml(reason)}</td></tr>
    </table>
    <div style="margin-top:16px;padding:12px;background:#f9fafb;border-left:3px solid #f59e0b;border-radius:4px;">
      <p style="margin:0 0 4px;font-size:12px;color:#92400e;font-weight:600;">Reported message preview</p>
      <p style="margin:0;white-space:pre-wrap;color:#111827;font-size:13px;">${escapeHtml(preview)}</p>
    </div>
    <div style="margin-top:20px;">
      <a href="${adminUrl}" style="display:inline-block;background:#7c3aed;color:white;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Review in admin</a>
    </div>
  </div>
</body></html>`

  await resend.emails.send({
    from: FROM,
    to: ABUSE_INBOX,
    replyTo: p.reporterEmail ?? undefined,
    subject: `[Abuse report] Ticket "${p.ticketSubject}"`,
    html,
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
