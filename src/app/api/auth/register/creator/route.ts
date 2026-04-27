import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { clientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { BCRYPT_COST } from '@/lib/auth'
import { enabledCreatorCountries } from '@/lib/countries'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/),
  displayName: z.string().min(2).max(60),
  bio: z.string().max(500).optional(),
  categoryTags: z.array(z.string()).min(1),
  // Phase 3 (2026-04-27 tax architecture spec): country must be in the
  // creator-onboarding-enabled list. Anything else routes the user to the
  // creator-waitlist endpoint at the page layer instead.
  country: z.string().length(2),
})

// Match the rate limit on /api/auth/register (5/hr/IP). The previous
// absence of a limit here (M13) made this path the easy target for
// mass-signup / credential-stuffing bots.
const REGISTER_RATE = { limit: 5, windowSeconds: 3600 }

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = await rateLimit('auth-register-creator', ip, REGISTER_RATE.limit, REGISTER_RATE.windowSeconds)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rl, REGISTER_RATE.limit) },
    )
  }

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { name, email, password, username, displayName, bio, categoryTags, country } = parsed.data
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedCountry = country.toUpperCase()
    const enabledIso2 = new Set(enabledCreatorCountries().map((c) => c.iso2))
    if (!enabledIso2.has(normalizedCountry)) {
      return NextResponse.json(
        { error: 'Selected country is not currently open for creator onboarding.' },
        { status: 400 },
      )
    }

    const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }

    // Reserve the username on CreatorProfile *and* CreatorApplication to
    // avoid a duplicate grab while the application is pending review.
    const existingUsername = await prisma.creatorProfile.findUnique({ where: { username } })
    if (existingUsername) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST)

    // M13 fix: do NOT grant `role: 'CREATOR'` immediately. The previous
    // behaviour skipped the KYC + admin vetting done by /api/creator/apply,
    // letting anyone self-promote to a full creator with upload / payout
    // access. New accounts start as BUYER; a CreatorApplication row in
    // SUBMITTED state carries their display name, username, bio, and
    // categories through the same admin-review queue as the standard
    // two-step flow (register → /account → /api/creator/apply). Admin
    // approval flips `role` to 'CREATOR' and creates the CreatorProfile.
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'BUYER',
        creatorVerificationStatus: 'PENDING',
      },
    })

    await prisma.creatorApplication.create({
      data: {
        userId: user.id,
        status: 'SUBMITTED',
        displayName,
        username,
        bio: bio ?? '',
        categoryTags: JSON.stringify(categoryTags),
        country: normalizedCountry,
        submittedAt: new Date(),
      },
    })

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      { status: 201 },
    )
  } catch (err) {
    console.error('[auth/register/creator] failed', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
