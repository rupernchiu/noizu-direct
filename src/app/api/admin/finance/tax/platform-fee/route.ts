/**
 * GET /api/admin/finance/tax/platform-fee
 *
 * Aggregate of platform service-fee tax — both buyer-side
 * (`platformFeeBuyerTaxUsd`) and creator-side (`platformFeeCreatorTaxUsd`).
 * Buyer-side bucketed by buyerCountry, creator-side bucketed by creatorCountry.
 *
 * Pre-Phase-8 the values are zero and the tab renders an empty state.
 *
 * Query params:
 *   period   YYYY-MM
 *   from/to  ISO datetimes
 *   country  optional — filter to one country (matches either side)
 *
 * Returns:
 *   {
 *     period,
 *     totalBuyerSideUsd, totalCreatorSideUsd, totalUsd, orderCount,
 *     byCountry: [{ country, label, side, totalUsd, orderCount }]
 *   }
 *
 * Auth: admin only.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { countryFor } from '@/lib/countries'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function parsePeriod(url: URL): { from: Date; to: Date; label: string } {
  const period = url.searchParams.get('period')
  const fromRaw = url.searchParams.get('from')
  const toRaw = url.searchParams.get('to')
  if (period && /^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-').map((s) => parseInt(s, 10))
    return {
      from: new Date(Date.UTC(y, m - 1, 1)),
      to: new Date(Date.UTC(y, m, 1)),
      label: `${MONTH_NAMES[m - 1]} ${y}`,
    }
  }
  if (fromRaw && toRaw) {
    const from = new Date(fromRaw)
    const to = new Date(toRaw)
    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
      return {
        from, to,
        label: `${from.toISOString().slice(0, 10)} → ${new Date(to.getTime() - 1).toISOString().slice(0, 10)}`,
      }
    }
  }
  const now = new Date()
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return { from, to, label: `${MONTH_NAMES[from.getUTCMonth()]} ${from.getUTCFullYear()}` }
}

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const country = url.searchParams.get('country')?.toUpperCase() || null
  const { from, to, label } = parsePeriod(url)

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { platformFeeBuyerTaxUsd: { gt: 0 } },
        { platformFeeCreatorTaxUsd: { gt: 0 } },
      ],
      createdAt: { gte: from, lt: to },
      escrowStatus: { in: ['HELD', 'TRACKING_ADDED', 'RELEASED', 'PARTIALLY_REFUNDED'] },
      ...(country
        ? {
            OR: [{ buyerCountry: country }, { creatorCountry: country }],
          }
        : {}),
    },
    select: {
      id: true,
      buyerCountry: true,
      creatorCountry: true,
      platformFeeBuyerTaxUsd: true,
      platformFeeCreatorTaxUsd: true,
    },
  }).catch(() => [])

  type Bucket = { country: string; label: string; side: 'BUYER' | 'CREATOR'; totalUsd: number; orderCount: number }
  const buckets = new Map<string, Bucket>()
  let totalBuyerSideUsd = 0
  let totalCreatorSideUsd = 0

  for (const o of orders) {
    const buyerTax = o.platformFeeBuyerTaxUsd ?? 0
    const creatorTax = o.platformFeeCreatorTaxUsd ?? 0
    if (buyerTax > 0) {
      const c = (o.buyerCountry ?? 'XX').toUpperCase()
      const key = `${c}:BUYER`
      const cur = buckets.get(key) ?? {
        country: c,
        label: countryFor(c)?.destinationTax?.label ?? '—',
        side: 'BUYER' as const,
        totalUsd: 0,
        orderCount: 0,
      }
      cur.totalUsd += buyerTax
      cur.orderCount += 1
      buckets.set(key, cur)
      totalBuyerSideUsd += buyerTax
    }
    if (creatorTax > 0) {
      const c = (o.creatorCountry ?? 'XX').toUpperCase()
      const key = `${c}:CREATOR`
      const cur = buckets.get(key) ?? {
        country: c,
        label: countryFor(c)?.destinationTax?.label ?? '—',
        side: 'CREATOR' as const,
        totalUsd: 0,
        orderCount: 0,
      }
      cur.totalUsd += creatorTax
      cur.orderCount += 1
      buckets.set(key, cur)
      totalCreatorSideUsd += creatorTax
    }
  }

  const byCountry = Array.from(buckets.values()).sort((a, b) => b.totalUsd - a.totalUsd)

  return NextResponse.json({
    period: { from: from.toISOString(), to: to.toISOString(), label },
    totalBuyerSideUsd,
    totalCreatorSideUsd,
    totalUsd: totalBuyerSideUsd + totalCreatorSideUsd,
    orderCount: orders.length,
    byCountry,
  })
}
