import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { COUNTRIES } from '@/lib/countries'
import { clientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

// Phase 3 of the tax architecture build (2026-04-27 spec, §4.3).
// Public endpoint — pre-signup users hit this from the register-creator page
// when their country isn't in Tier 1. We cap submissions per-IP so the
// waitlist table can't be flooded.

const schema = z.object({
  email: z.string().email().max(254),
  country: z.string().length(2),
})

const RATE = { limit: 10, windowSeconds: 3600 }

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = await rateLimit('creator-waitlist', ip, RATE.limit, RATE.windowSeconds)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rl, RATE.limit) },
    )
  }

  let parsed
  try {
    parsed = schema.safeParse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const email = parsed.data.email.trim().toLowerCase()
  const country = parsed.data.country.toUpperCase()

  if (!COUNTRIES[country]) {
    return NextResponse.json(
      { error: 'Please pick a valid country.' },
      { status: 400 },
    )
  }

  // Idempotent: if (email, country) already exists, treat as success without
  // creating a duplicate. CreatorWaitlist has no unique index — a pure
  // findFirst+conditional-create is good enough for the volumes we expect.
  const existing = await prisma.creatorWaitlist.findFirst({
    where: { email, country },
    select: { id: true },
  })

  if (!existing) {
    await prisma.creatorWaitlist.create({
      data: { email, country },
    })
  }

  return NextResponse.json({ ok: true })
}
