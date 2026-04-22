import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { clientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

// M7 — contact-form rate limit. Previously a per-isolate Map that reset on
// cold start; now backed by Upstash so the limit is global across the edge
// fleet. 5 contact submissions per IP per hour.
const CONTACT_RATE = { limit: 5, windowSeconds: 60 * 60 }

// ─── Dangerous pattern detection ─────────────────────────────────────────────
const DANGEROUS_PATTERNS = [
  /<script/i, /javascript:/i, /onerror\s*=/i, /onload\s*=/i,
  /eval\s*\(/i, /document\.cookie/i, /vbscript:/i, /data:text\/html/i,
]

function hasDangerousContent(s: string): boolean {
  return DANGEROUS_PATTERNS.some(p => p.test(s))
}

// ─── Sanitisation ─────────────────────────────────────────────────────────────
function sanitizeField(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F]/g, '')
    .trim()
    .slice(0, maxLen)
}

// ─── Malaysia time ─────────────────────────────────────────────────────────────
function getMYT(): string {
  return new Date().toLocaleString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }) + ' (UTC+8)'
}

const API_SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'",
  'X-Content-Type-Options':  'nosniff',
}

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers: API_SECURITY_HEADERS })
}

// ─── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const ts = new Date().toISOString()

  try {
    const ip = clientIp(req)

    const rl = await rateLimit('contact', ip, CONTACT_RATE.limit, CONTACT_RATE.windowSeconds)
    if (!rl.allowed) {
      console.warn(`[contact] Rate limited | IP: ${ip} | time: ${ts}`)
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { ...API_SECURITY_HEADERS, ...rateLimitHeaders(rl, CONTACT_RATE.limit) } },
      )
    }

    const body = await req.json().catch(() => ({}))

    // Honeypot — silently discard bots
    if (body.bot) {
      console.warn(`[contact] Honeypot triggered | IP: ${ip} | time: ${ts}`)
      return NextResponse.json({ ok: true }, { headers: API_SECURITY_HEADERS })
    }

    const name    = sanitizeField(body.name,    100)
    const email   = sanitizeField(body.email,   254)
    const subject = sanitizeField(body.subject, 200)
    const message = sanitizeField(body.message, 2000)

    if (!name || !email || !message) {
      return errorResponse(400, 'Name, email and message are required.')
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse(400, 'Invalid email address.')
    }

    if (
      hasDangerousContent(name) ||
      hasDangerousContent(email) ||
      hasDangerousContent(subject) ||
      hasDangerousContent(message)
    ) {
      console.warn(`[contact] Dangerous content | IP: ${ip} | time: ${ts}`)
      return errorResponse(400, 'Invalid input.')
    }

    const firstName    = name.split(' ')[0]
    const timestamp    = getMYT()
    const adminTo      = process.env.CONTACT_EMAIL_TO ?? 'hello@noizu.direct'
    const subjectLabel = subject || '(no subject)'

    const [adminResult, senderResult] = await Promise.allSettled([
      // Admin notification
      resend.emails.send({
        from:    'noreply@noizu.direct',
        to:      [adminTo],
        subject: `[noizu.direct] New contact: ${subjectLabel} — ${name}`,
        text: [
          'New contact form submission on noizu.direct.',
          '',
          `Name:    ${name}`,
          `Email:   ${email}`,
          `Subject: ${subjectLabel}`,
          '',
          'Message:',
          message,
          '',
          '---',
          `Submitted: ${timestamp}`,
          `IP: ${ip}`,
        ].join('\n'),
      }),

      // Confirmation to sender
      resend.emails.send({
        from:    'noreply@noizu.direct',
        to:      [email],
        replyTo: adminTo,
        subject: "We've received your message — noizu.direct",
        text: [
          `Hi ${firstName},`,
          '',
          "Thanks for reaching out to noizu.direct. We've received your message",
          'and will get back to you as soon as possible.',
          '',
          "Here's a copy of what you sent:",
          '',
          `Subject: ${subjectLabel}`,
          `Message: ${message}`,
          '',
          'If you have anything urgent, you can reply directly to this email.',
          '',
          'Warm regards,',
          'The noizu.direct Team',
          'noizu.direct',
        ].join('\n'),
      }),
    ])

    if (adminResult.status === 'rejected' && senderResult.status === 'rejected') {
      console.error('[contact] Both emails failed:', adminResult.reason, senderResult.reason)
      return errorResponse(500, 'Something went wrong. Please try again or email us directly.')
    }

    if (adminResult.status  === 'rejected') console.error('[contact] Admin email failed:', adminResult.reason)
    if (senderResult.status === 'rejected') console.error('[contact] Sender email failed:', senderResult.reason)

    console.info(`[contact] Success | name: ${name} | subject: ${subjectLabel} | IP: ${ip} | time: ${ts}`)
    return NextResponse.json({ ok: true }, { headers: API_SECURITY_HEADERS })

  } catch (err) {
    console.error('[contact] Unexpected error:', err)
    return errorResponse(500, 'Something went wrong. Please try again or email us directly.')
  }
}
