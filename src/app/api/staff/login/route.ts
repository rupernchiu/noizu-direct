import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createStaffToken, STAFF_COOKIE_NAME, STAFF_COOKIE_MAX_AGE } from '@/lib/staffAuth'
import { clientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

const MAX_FAILED = 5
const LOCKOUT_MS  = 30 * 60 * 1000 // 30 minutes

// IP-based rate limit (C5). Stops credential-spray across many staff emails
// from a single host — the per-account 5-fail lockout below is useless
// against that attack because each bad email resets failedAttempts to 0.
const STAFF_LOGIN_RATE = { limit: 10, windowSeconds: 900 } // 10 / 15m / IP

// Stable dummy bcrypt hash for timing equalization. We hash once at module
// load (cold-start cost only — ~250ms) so every "unknown email" branch
// does a full bcrypt.compare against a hash of the same cost factor.
// Response timing is then indistinguishable from "known email, wrong
// password." The plaintext is a long random string the attacker cannot
// guess, so bcrypt.compare always returns false.
const DUMMY_BCRYPT_HASH = bcrypt.hashSync(
  'ZzZ-timing-equalization-never-matches-' + Math.random(),
  12,
)

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = await rateLimit('staff-login', ip, STAFF_LOGIN_RATE.limit, STAFF_LOGIN_RATE.windowSeconds)
  if (!rl.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders(rl, STAFF_LOGIN_RATE.limit),
          'Retry-After': String(retryAfter),
        },
      },
    )
  }

  let email: string, password: string
  try {
    const body = await req.json()
    email = body.email?.trim()
    password = body.password
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const user = await prisma.staffUser.findUnique({ where: { email } })

  // Single generic error string for all "auth failed" paths so the response
  // body doesn't distinguish unknown-email from wrong-password. Pair that
  // with a dummy bcrypt compare on the unknown-email branch so response
  // timing is also indistinguishable.
  const GENERIC_ERROR = 'Invalid email or password'

  if (!user || !user.isActive) {
    // Burn ~250ms in bcrypt to match the success path's timing profile.
    await bcrypt.compare(password, DUMMY_BCRYPT_HASH).catch(() => false)
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
  }

  // Check lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
    return NextResponse.json(
      { error: `Account locked. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.` },
      { status: 403 },
    )
  }

  const valid = await bcrypt.compare(password, user.passwordHash)

  if (!valid) {
    const newFailed = user.failedAttempts + 1
    await prisma.staffUser.update({
      where: { id: user.id },
      data: {
        failedAttempts: newFailed,
        lockedUntil: newFailed >= MAX_FAILED ? new Date(Date.now() + LOCKOUT_MS) : null,
      },
    })
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
  }

  // Success — reset lockout, stamp lastLogin
  await prisma.staffUser.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null, lastLogin: new Date() },
  })

  const token = createStaffToken({ staffUserId: user.id, isSuperAdmin: user.isSuperAdmin })
  const res = NextResponse.json({ ok: true })
  res.cookies.set(STAFF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: STAFF_COOKIE_MAX_AGE,
    path: '/',
  })
  return res
}
