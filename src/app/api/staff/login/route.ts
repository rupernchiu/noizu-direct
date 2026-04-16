import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createStaffToken, STAFF_COOKIE_NAME, STAFF_COOKIE_MAX_AGE } from '@/lib/staffAuth'

const MAX_FAILED = 5
const LOCKOUT_MS  = 30 * 60 * 1000 // 30 minutes

export async function POST(req: NextRequest) {
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

  if (!user || !user.isActive) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
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
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
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
