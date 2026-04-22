import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { clientIp, rateLimit } from '@/lib/rate-limit'

// 60 requests per minute per IP is enough for a normal browsing session while
// stopping obvious view-count abuse. Window is short so a real user never
// notices even if they blast through products in a minute.
const VIEW_RATE = { limit: 60, windowSeconds: 60 }

export async function POST(req: NextRequest) {
  const ip = clientIp(req)

  const rl = await rateLimit('track-view', ip, VIEW_RATE.limit, VIEW_RATE.windowSeconds)
  if (!rl.allowed) {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  try {
    const body = await req.json().catch(() => ({})) as { productId?: unknown; sessionId?: unknown }
    const productId = typeof body.productId === 'string' ? body.productId : null
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.slice(0, 128) : null

    if (!productId || productId.length > 64 || !sessionId) {
      return NextResponse.json({ ok: true })
    }

    const session = await auth().catch(() => null)
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const existing = await prisma.productView.findFirst({
      where: { productId, ipAddress: ip, createdAt: { gte: oneHourAgo } },
      select: { id: true },
    })
    if (existing) return NextResponse.json({ ok: true })

    await prisma.productView.create({
      data: { productId, sessionId, userId, ipAddress: ip },
    })
  } catch (err) {
    console.error('[track/view] failed', err)
  }

  return NextResponse.json({ ok: true })
}
