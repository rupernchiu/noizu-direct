/**
 * Staff session management using HMAC-signed cookies.
 * Completely separate from the main NextAuth session.
 */

import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

export const STAFF_COOKIE_NAME = 'staff-session'
export const STAFF_COOKIE_MAX_AGE = 12 * 60 * 60 // 12 hours

export interface StaffSessionData {
  staffUserId: string
  isSuperAdmin: boolean
}

type TokenPayload = StaffSessionData & { exp: number }

function getSecret(): string {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET env var is not set')
  return s
}

function encodeToken(data: TokenPayload): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function decodeToken(token: string): TokenPayload | null {
  try {
    const dot = token.lastIndexOf('.')
    if (dot === -1) return null
    const payload = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
    // Constant-time comparison
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
    const data: TokenPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (data.exp < Math.floor(Date.now() / 1000)) return null
    return data
  } catch {
    return null
  }
}

export function createStaffToken(data: StaffSessionData): string {
  return encodeToken({
    ...data,
    exp: Math.floor(Date.now() / 1000) + STAFF_COOKIE_MAX_AGE,
  })
}

/** For use in Server Components, layouts, and pages. */
export async function getStaffSession(): Promise<StaffSessionData | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(STAFF_COOKIE_NAME)?.value
  if (!token) return null
  const data = decodeToken(token)
  if (!data) return null
  return { staffUserId: data.staffUserId, isSuperAdmin: data.isSuperAdmin }
}

/** For use in API route handlers (has access to NextRequest). */
export function getStaffSessionFromRequest(req: NextRequest): StaffSessionData | null {
  const token = req.cookies.get(STAFF_COOKIE_NAME)?.value
  if (!token) return null
  const data = decodeToken(token)
  if (!data) return null
  return { staffUserId: data.staffUserId, isSuperAdmin: data.isSuperAdmin }
}
