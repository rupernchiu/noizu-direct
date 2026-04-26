import { NextResponse } from 'next/server'
import { requireCreatorProfile } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import {
  parseShippingMap,
  serializeShippingMap,
  ShippingRateMap,
  ROW_KEY,
  SHIPPING_COUNTRIES,
} from '@/lib/shipping'

export async function GET() {
  const guard = await requireCreatorProfile()
  if (!guard) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { profile } = guard
  return NextResponse.json({
    rates: parseShippingMap(profile.shippingByCountry) ?? {},
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

  if (body.rates !== undefined) {
    if (body.rates === null) {
      data.shippingByCountry = null
    } else if (typeof body.rates === 'object' && !Array.isArray(body.rates)) {
      const validKeys = new Set<string>([ROW_KEY, ...SHIPPING_COUNTRIES.map(c => c.code)])
      const cleaned: ShippingRateMap = {}
      for (const [k, v] of Object.entries(body.rates as Record<string, unknown>)) {
        const key = k.toUpperCase()
        if (!validKeys.has(key)) continue
        if (v === null || v === '') continue
        const num = Number(v)
        if (!Number.isFinite(num) || num < 0 || num > 50_000) continue
        cleaned[key as keyof ShippingRateMap] = Math.round(num)
      }
      data.shippingByCountry = serializeShippingMap(cleaned)
    } else {
      return NextResponse.json({ error: 'Invalid rates payload' }, { status: 400 })
    }
  }

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
    rates: parseShippingMap(updated.shippingByCountry) ?? {},
    freeThresholdUsdCents: updated.shippingFreeThresholdUsd ?? null,
    combinedShippingEnabled: updated.combinedShippingEnabled,
  })
}
