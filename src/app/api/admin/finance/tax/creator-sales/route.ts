/**
 * GET /api/admin/finance/tax/creator-sales
 *
 * Per-creator aggregation of `Order.creatorSalesTaxAmountUsd` (Layer 1.5 —
 * agency-collected sales tax that creators have opted in to). Only creators
 * approved into the sales-tax regime show data; pre-Phase-7 the table is
 * effectively empty.
 *
 * Query params:
 *   period     YYYY-MM
 *   from / to  ISO datetimes
 *   creatorId  optional
 *   country    optional — restrict to creators in country
 *
 * Returns:
 *   {
 *     period,
 *     totalCollectedUsd, creatorCount, orderCount,
 *     creators: [{ creatorId, displayName, country, label, orderCount,
 *                   grossUsd, collectedUsd }]
 *   }
 *
 * Auth: admin only.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

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
  const creatorId = url.searchParams.get('creatorId') || null
  const country = url.searchParams.get('country')?.toUpperCase() || null
  const { from, to, label } = parsePeriod(url)

  const orders = await prisma.order.findMany({
    where: {
      creatorSalesTaxAmountUsd: { gt: 0 },
      createdAt: { gte: from, lt: to },
      escrowStatus: { in: ['HELD', 'TRACKING_ADDED', 'RELEASED', 'PARTIALLY_REFUNDED'] },
      ...(creatorId ? { creatorId } : {}),
      ...(country ? { creatorCountry: country } : {}),
    },
    select: {
      id: true,
      creatorId: true,
      creatorCountry: true,
      amountUsd: true,
      subtotalUsd: true,
      shippingCostUsd: true,
      buyerFeeUsd: true,
      creatorSalesTaxAmountUsd: true,
      creatorSalesTaxRatePercent: true,
      creatorSalesTaxLabel: true,
      creator: {
        select: {
          name: true,
          email: true,
          creatorProfile: {
            select: { displayName: true, taxId: true, salesTaxLabel: true, payoutCountry: true },
          },
        },
      },
    },
  }).catch(() => [])

  const byCreator = new Map<string, {
    creatorId: string
    displayName: string
    email: string | null
    taxId: string | null
    label: string | null
    country: string | null
    orderCount: number
    grossUsd: number
    collectedUsd: number
  }>()
  let totalCollectedUsd = 0

  for (const o of orders) {
    const subtotal = o.subtotalUsd ?? Math.max(0, o.amountUsd - (o.buyerFeeUsd ?? 0))
    const shipping = o.shippingCostUsd ?? 0
    const gross = subtotal + shipping
    const collected = o.creatorSalesTaxAmountUsd ?? 0
    totalCollectedUsd += collected

    const cid = o.creatorId
    const cur = byCreator.get(cid) ?? {
      creatorId: cid,
      displayName: o.creator?.creatorProfile?.displayName ?? o.creator?.name ?? cid,
      email: o.creator?.email ?? null,
      taxId: o.creator?.creatorProfile?.taxId ?? null,
      label: o.creatorSalesTaxLabel ?? o.creator?.creatorProfile?.salesTaxLabel ?? null,
      country: o.creatorCountry ?? o.creator?.creatorProfile?.payoutCountry ?? null,
      orderCount: 0,
      grossUsd: 0,
      collectedUsd: 0,
    }
    cur.orderCount += 1
    cur.grossUsd += gross
    cur.collectedUsd += collected
    byCreator.set(cid, cur)
  }

  const creators = Array.from(byCreator.values()).sort((a, b) => b.collectedUsd - a.collectedUsd)

  return NextResponse.json({
    period: { from: from.toISOString(), to: to.toISOString(), label },
    totalCollectedUsd,
    creatorCount: creators.length,
    orderCount: orders.length,
    creators,
  })
}
