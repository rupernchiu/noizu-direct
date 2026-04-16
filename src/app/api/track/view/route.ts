import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { productId, sessionId, userId, ipAddress } = body

    if (ipAddress && productId) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const existing = await prisma.productView.findFirst({
        where: {
          productId,
          ipAddress,
          createdAt: { gte: oneHourAgo },
        },
      })
      if (existing) {
        return NextResponse.json({ ok: true })
      }
    }

    await prisma.productView.create({
      data: {
        productId,
        sessionId,
        userId: userId ?? null,
        ipAddress: ipAddress ?? null,
      },
    })
  } catch {
    // swallow errors — never throw
  }

  return NextResponse.json({ ok: true })
}
