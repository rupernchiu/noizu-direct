/**
 * Health-related email templates for creator lifecycle nudges.
 * All sent via Resend. Mirror the dark-theme styling of existing transactional emails.
 */

import { Resend } from 'resend'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:7000'

function shell(body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <img src="${baseUrl}/uploads/library/38cf460d-b641-4ded-918e-a190d438eb3d.webp" alt="NOIZU-DIRECT" height="50" style="height:50px;width:auto;" />
        </td></tr>
        <tr><td style="background:#13131a;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">
          ${body}
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#4b4b5a;">NOIZU-DIRECT &mdash; Creator marketplace for SEA creators</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function btn(href: string, label: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-top:4px;">
    <a href="${href}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:10px;">${label}</a>
  </td></tr></table>`
}

// ── 1. 30-day nudge: store is ready, add your first product ──────────────────

export function creatorNudge30Html(name: string): string {
  return shell(`
    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">Your store is ready, ${name}!</p>
    <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">
      Your NOIZU-DIRECT creator store has been set up for 30 days — but it's still waiting for its first product.
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">
      Your community is out there looking for original art, doujin, cosplay prints, and merch from creators like you. Adding even a single product is all it takes to go live.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#c4b5fd;font-weight:600;">Getting started is easy:</p>
    <ul style="margin:0 0 28px;padding-left:20px;color:#8b8b9a;font-size:14px;line-height:1.8;">
      <li>Digital products (art packs, PDFs) go live instantly</li>
      <li>Physical items and POD are supported too</li>
      <li>You set the price and keep the majority of every sale</li>
    </ul>
    ${btn(`${baseUrl}/dashboard/listings/new`, 'Add Your First Product')}
  `)
}

// ── 2. Re-engagement: store has been quiet ───────────────────────────────────

export function creatorReengagementHtml(name: string): string {
  return shell(`
    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">We miss you, ${name}!</p>
    <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">
      Your NOIZU-DIRECT store has been quiet lately. Stores that stay active get more discovery, more followers, and more sales.
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">
      Even a small update — a new product, a refreshed bio, or a pinned announcement — reminds your community that you're here.
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">
      We'd love to see you back. Log in to check your messages, update your store, or list something new.
    </p>
    ${btn(`${baseUrl}/dashboard`, 'Visit Your Dashboard')}
  `)
}

// ── 3. Fulfillment warning: unfulfilled orders ───────────────────────────────

export function creatorFulfillmentWarningHtml(name: string): string {
  return shell(`
    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">Action required, ${name}</p>
    <div style="background:#2a1515;border:1px solid #5a2020;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;font-weight:600;color:#f87171;">⚠ You have unfulfilled orders past their deadline</p>
    </div>
    <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">
      Hi ${name}, you have orders on NOIZU-DIRECT that have passed their fulfilment deadline and are still unshipped or undelivered.
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">
      Unfulfilled orders damage buyer trust, may trigger disputes, and put your account at risk of being flagged for review. Please fulfil your pending orders as soon as possible.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#8b8b9a;line-height:1.6;">
      If you're experiencing a delay, contact our support team so we can communicate with buyers on your behalf.
    </p>
    ${btn(`${baseUrl}/dashboard/orders`, 'View Your Orders')}
  `)
}

// ── 4. Pre-suspension: account will be suspended in 7 days ───────────────────

export function creatorPreSuspensionHtml(name: string): string {
  return shell(`
    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ef4444;">Important notice for ${name}</p>
    <div style="background:#2a1515;border:1px solid #ef4444;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#f87171;">Your NOIZU-DIRECT account will be suspended in 7 days</p>
    </div>
    <p style="margin:0 0 20px;font-size:14px;color:#8b8b9a;line-height:1.6;">
      Hi ${name}, this is a final warning. Your store has multiple unfulfilled orders that are significantly overdue. Your account has been flagged for review and will be suspended unless you take immediate action.
    </p>
    <p style="margin:0 0 12px;font-size:14px;color:#c4b5fd;font-weight:600;">What you need to do:</p>
    <ul style="margin:0 0 24px;padding-left:20px;color:#8b8b9a;font-size:14px;line-height:1.8;">
      <li>Fulfil all pending orders immediately</li>
      <li>Add tracking numbers for any shipped items</li>
      <li>Contact support if you are unable to fulfil</li>
    </ul>
    <p style="margin:0 0 24px;font-size:14px;color:#8b8b9a;line-height:1.6;">
      If you believe this is a mistake or need help resolving outstanding orders, please contact us before the deadline.
    </p>
    <div style="display:flex;gap:12px;flex-direction:column;">
      ${btn(`${baseUrl}/dashboard/orders`, 'Go to My Orders')}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;"><tr><td align="center">
        <a href="${baseUrl}/contact" style="display:inline-block;background:#27272f;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px;">Contact Support</a>
      </td></tr></table>
    </div>
  `)
}

// ── Sender helpers ────────────────────────────────────────────────────────────

async function send(to: string, subject: string, html: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({ from: 'noreply@noizu.direct', to: [to], subject, html })
}

export async function sendCreatorNudge30(email: string, name: string): Promise<void> {
  await send(email, 'Your NOIZU-DIRECT store is ready — add your first product', creatorNudge30Html(name))
}

export async function sendCreatorReengagement(email: string, name: string): Promise<void> {
  await send(email, 'Your store has been quiet — we\'d love to see you back', creatorReengagementHtml(name))
}

export async function sendCreatorFulfillmentWarning(email: string, name: string): Promise<void> {
  await send(email, 'Action required: you have unfulfilled orders', creatorFulfillmentWarningHtml(name))
}

export async function sendCreatorPreSuspension(email: string, name: string): Promise<void> {
  await send(email, 'Your NOIZU-DIRECT account will be suspended in 7 days', creatorPreSuspensionHtml(name))
}
