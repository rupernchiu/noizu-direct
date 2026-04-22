import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { clientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

// 5 registrations per IP per hour stops casual mass-signup bots without
// blocking a household sharing a connection.
const REGISTER_RATE = { limit: 5, windowSeconds: 3600 }

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = await rateLimit('auth-register', ip, REGISTER_RATE.limit, REGISTER_RATE.windowSeconds)
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

    const { name, email, password } = parsed.data
    const normalizedEmail = email.trim().toLowerCase()

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: { name, email: normalizedEmail, password: hashedPassword, role: 'BUYER' },
    })

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      { status: 201 },
    )
  } catch (err) {
    console.error('[auth/register] failed', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
