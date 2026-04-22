import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { clientIp, rateLimit } from '@/lib/rate-limit'

// 10 attempts per IP per hour — a user re-entering their password a few
// times is fine; a token-guessing script hits the wall quickly.
const RESET_RATE = { limit: 10, windowSeconds: 3600 }

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = await rateLimit('auth-reset', ip, RESET_RATE.limit, RESET_RATE.windowSeconds)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }
  try {
    const body = await req.json() as { token?: string; password?: string; confirmPassword?: string }
    const { token, password, confirmPassword } = body

    if (!token || !password || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const record = await prisma.passwordResetToken.findUnique({ where: { token } })

    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 })
    }
    if (record.usedAt) {
      return NextResponse.json({ error: 'This reset link has already been used.' }, { status: 400 })
    }
    if (record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This reset link has expired. Please request a new one.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: record.email } })
    if (!user) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password: hashed } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ])

    console.info(`[reset-password] Password reset for ${record.email}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[reset-password] Error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
