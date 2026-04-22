import { NextRequest, NextResponse } from 'next/server'
import { clientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { subscribeToNewsletter, type NewsletterSource } from '@/lib/newsletter'

// 10 submissions per IP per hour — newsletter signup is low-frequency; anyone
// hammering it is almost certainly a bot or abuse.
const NEWSLETTER_RATE = { limit: 10, windowSeconds: 60 * 60 }

const VALID_SOURCES = new Set<NewsletterSource>(['footer', 'checkout', 'modal', 'dashboard', 'other'])

const API_SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'",
  'X-Content-Type-Options': 'nosniff',
}

function errorResponse(status: number, message: string, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json(
    { error: message },
    { status, headers: { ...API_SECURITY_HEADERS, ...extraHeaders } },
  )
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req)

  const rl = await rateLimit('newsletter', ip, NEWSLETTER_RATE.limit, NEWSLETTER_RATE.windowSeconds)
  if (!rl.allowed) {
    return errorResponse(429, 'Too many requests. Please try again later.', rateLimitHeaders(rl, NEWSLETTER_RATE.limit))
  }

  const body = await req.json().catch(() => ({}))

  // Honeypot — silent success so bots don't retry.
  if (body.bot) {
    return NextResponse.json({ ok: true }, { headers: API_SECURITY_HEADERS })
  }

  const emailRaw = typeof body.email === 'string' ? body.email : ''
  const sourceRaw = typeof body.source === 'string' ? body.source : 'footer'
  const localeRaw = typeof body.locale === 'string' ? body.locale : undefined

  const source: NewsletterSource = VALID_SOURCES.has(sourceRaw as NewsletterSource)
    ? (sourceRaw as NewsletterSource)
    : 'other'

  const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null

  const result = await subscribeToNewsletter({
    email: emailRaw,
    source,
    locale: localeRaw?.slice(0, 16),
    userAgent,
    ip,
  })

  if (!result.ok) {
    if (result.error === 'invalid_email') {
      return errorResponse(400, 'Please enter a valid email address.')
    }
    return errorResponse(500, 'Could not subscribe right now. Please try again later.')
  }

  return NextResponse.json(
    {
      ok: true,
      alreadySubscribed: result.alreadySubscribed,
    },
    { headers: API_SECURITY_HEADERS },
  )
}
