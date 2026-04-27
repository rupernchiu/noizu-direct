import { NextResponse } from 'next/server'
import { requireCreatorProfile } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

// Shipping V2: per-product rates live on Product. This endpoint only handles
// the two cart-level prefs that stay creator-wide: free-shipping threshold and
// combined-cart toggle. Per-product rate CRUD goes through /api/products/[id].

export async function GET() {
  const guard = await requireCreatorProfile()
  if (!guard) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { profile } = guard
  return NextResponse.json({
    freeThresholdUsdCents: profile.shippingFreeThresholdUsd ?? null,
    combinedShippingEnabled: profile.combinedShippingEnabled,
  })
}

export async function PATCH(req: Request) {
  const guard = await requireCreatorProfile()
  if (!guard) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { profile } = guard

  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (body.freeThresholdUsdCents !== undefined) {
    if (body.freeThresholdUsdCents === null || body.freeThresholdUsdCents === '') {
      data.shippingFreeThresholdUsd = null
    } else {
      const n = Number(body.freeThresholdUsdCents)
      if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
        return NextResponse.json({ error: 'freeThresholdUsdCents out of range' }, { status: 400 })
      }
      data.shippingFreeThresholdUsd = Math.round(n)
    }
  }

  if (body.combinedShippingEnabled !== undefined) {
    data.combinedShippingEnabled = Boolean(body.combinedShippingEnabled)
  }

  const updated = await prisma.creatorProfile.update({ where: { id: profile.id }, data })
  return NextResponse.json({
    freeThresholdUsdCents: updated.shippingFreeThresholdUsd ?? null,
    combinedShippingEnabled: updated.combinedShippingEnabled,
  })
}
