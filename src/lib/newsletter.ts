import { prisma } from '@/lib/prisma'

export type NewsletterSource = 'footer' | 'checkout' | 'modal' | 'dashboard' | 'other'

export type SubscribeResult =
  | { ok: true; alreadySubscribed: boolean }
  | { ok: false; error: 'invalid_email' | 'already_unsubscribed' | 'server_error' }

// RFC 5322-lite — good enough to reject typos, not a spec parser.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Idempotent subscribe. Safe to call multiple times with the same email.
 * - Brand new email → insert, returns { ok: true, alreadySubscribed: false }
 * - Existing ACTIVE → no-op, returns { ok: true, alreadySubscribed: true }
 * - Existing UNSUBSCRIBED → reactivate (new signup = implicit opt-in)
 *
 * Future Resend audience sync goes here — add a single `await syncToResend(email)`
 * after the DB write and every surface that already calls this picks it up.
 */
export async function subscribeToNewsletter(params: {
  email: string
  source?: NewsletterSource
  locale?: string
  userAgent?: string | null
  ip?: string | null
}): Promise<SubscribeResult> {
  const email = params.email.trim().toLowerCase()
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, error: 'invalid_email' }
  }

  try {
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } })
    if (existing) {
      if (existing.status === 'ACTIVE') {
        return { ok: true, alreadySubscribed: true }
      }
      await prisma.newsletterSubscriber.update({
        where: { email },
        data: {
          status: 'ACTIVE',
          source: params.source ?? existing.source,
          locale: params.locale ?? existing.locale,
          userAgent: params.userAgent ?? existing.userAgent,
          ip: params.ip ?? existing.ip,
          subscribedAt: new Date(),
          unsubscribedAt: null,
        },
      })
      return { ok: true, alreadySubscribed: false }
    }

    await prisma.newsletterSubscriber.create({
      data: {
        email,
        source: params.source ?? 'footer',
        locale: params.locale ?? null,
        userAgent: params.userAgent ?? null,
        ip: params.ip ?? null,
      },
    })
    return { ok: true, alreadySubscribed: false }
  } catch (err) {
    console.error('[newsletter] subscribe failed', {
      email,
      err: err instanceof Error ? err.message : String(err),
    })
    return { ok: false, error: 'server_error' }
  }
}

export async function unsubscribeFromNewsletter(email: string): Promise<SubscribeResult> {
  const normalized = email.trim().toLowerCase()
  if (!EMAIL_RE.test(normalized)) {
    return { ok: false, error: 'invalid_email' }
  }
  try {
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: normalized } })
    if (!existing) return { ok: true, alreadySubscribed: false }
    if (existing.status === 'UNSUBSCRIBED') return { ok: false, error: 'already_unsubscribed' }
    await prisma.newsletterSubscriber.update({
      where: { email: normalized },
      data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
    })
    return { ok: true, alreadySubscribed: false }
  } catch (err) {
    console.error('[newsletter] unsubscribe failed', {
      email: normalized,
      err: err instanceof Error ? err.message : String(err),
    })
    return { ok: false, error: 'server_error' }
  }
}
