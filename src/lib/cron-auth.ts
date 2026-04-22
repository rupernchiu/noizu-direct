/**
 * Shared authorization for cron routes.
 *
 * Accepts either:
 *   - Authorization: Bearer <CRON_SECRET>
 *   - x-cron-secret: <CRON_SECRET>
 *
 * Compares with `crypto.timingSafeEqual` to avoid timing side-channels, then
 * (optionally) falls back to an admin session so humans can trigger cron jobs
 * manually during incidents.
 *
 * Usage:
 *   if (!(await isCronAuthorized(req))) return unauthorized()
 */

import crypto from 'crypto'
import { auth } from '@/lib/auth'

function safeEqual(a: string, b: string): boolean {
  // timingSafeEqual requires equal-length buffers — bail early on length mismatch
  // to avoid throwing, which itself leaks timing info (shorter path = faster).
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

/**
 * Returns true when the request carries a valid CRON_SECRET via either the
 * Authorization bearer header or the x-cron-secret header.
 *
 * If `allowAdminFallback` is true (default), a logged-in admin session also
 * satisfies the check — useful for manual invocation from the admin UI.
 */
export async function isCronAuthorized(
  req: Request,
  opts: { allowAdminFallback?: boolean } = {},
): Promise<boolean> {
  const allowAdminFallback = opts.allowAdminFallback ?? true

  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = req.headers.get('authorization') ?? ''
    const xHeader = req.headers.get('x-cron-secret') ?? ''

    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (bearer && safeEqual(bearer, secret)) return true
    if (xHeader && safeEqual(xHeader, secret)) return true
  }

  if (allowAdminFallback) {
    try {
      const session = await auth()
      if (session && (session.user as { role?: string } | undefined)?.role === 'ADMIN') {
        return true
      }
    } catch {
      // auth() can throw if the request is cron-only with no cookies — ignore.
    }
  }

  return false
}
