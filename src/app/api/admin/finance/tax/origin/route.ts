/**
 * GET /api/admin/finance/tax/origin
 *
 * Creator-origin (Layer 1) tax aggregate — the platform's monthly DJP filing
 * input for Indonesia's PPh Final 0.5% withholding regime, generalised so any
 * country with a creator-origin rule can be queried.
 *
 * Query params:
 *   country    ISO-2 (default 'ID')
 *   period     YYYY-MM        — single calendar month (UTC)
 *   from / to  ISO datetimes  — custom range (overrides period if both set)
 *   creatorId  optional       — restrict to one creator
 *
 * Returns:
 *   {
 *     period: { from, to, label, country, countryName },
 *     totalGrossUsd, totalWithheldUsd, creatorCount, orderCount,
 *     creators: [{ creatorId, creatorName, displayName, email, taxId, country,
 *                   orderCount, grossUsd, withheldUsd }]
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
    const from = new Date(Date.UTC(y, m - 1, 1))
    const to = new Date(Date.UTC(y, m, 1))
    return { from, to, label: `${MONTH_NAMES[m - 1]} ${y}` }
  }
  if (fromRaw && toRaw) {
    const from = new Date(fromRaw)
    const to = new Date(toRaw)
    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
      return {
        from,
        to,
        label: `${from.toISOString().slice(0, 10)} → ${new Date(to.getTime() - 1).toISOString().slice(0, 10)}`,
      }
    }
  }
  // Default: current calendar month.
  const now = new Date()
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return { from, to, label: `${MONTH_NAMES[from.getUTCMonth()]} ${from.getUTCFullYear()}` }
}

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const country = (url.searchParams.get('country') ?? 'ID').toUpperCase()
  const creatorId = url.searchParams.get('creatorId') || null
  const { from, to, label } = parsePeriod(url)

  const countryRecord = countryFor(country)
  const countryName = countryRecord?.name ?? country
  const originRule = countryRecord?.creatorOriginTax ?? null

  // Pull every paid order with PPh withheld for the creator's country in range.
  const orders = await prisma.order.findMany({
    where: {
      creatorCountry: country,
      creatorTaxAmountUsd: { gt: 0 },
      createdAt: { gte: from, lt: to },
      escrowStatus: { in: ['HELD', 'TRACKING_ADDED', 'RELEASED', 'PARTIALLY_REFUNDED'] },
      ...(creatorId ? { creatorId } : {}),
    },
    select: {
      id: true,
      creatorId: true,
      amountUsd: true,
      subtotalUsd: true,
      shippingCostUsd: true,
      buyerFeeUsd: true,
      creatorTaxAmountUsd: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          legalFullName: true,
          creatorProfile: {
            select: {
              displayName: true,
              taxId: true,
              payoutCountry: true,
              taxJurisdiction: true,
            },
          },
        },
      },
    },
  }).catch(() => [])

  // Aggregate per creator.
  const byCreator = new Map<string, {
    creatorId: string
    creatorName: string
    displayName: string | null
    email: string | null
    taxId: string | null
    country: string
    orderCount: number
    grossUsd: number
    withheldUsd: number
  }>()
  let totalGrossUsd = 0
  let totalWithheldUsd = 0

  for (const o of orders) {
    const subtotal = o.subtotalUsd ?? Math.max(0, o.amountUsd - (o.buyerFeeUsd ?? 0))
    const shipping = o.shippingCostUsd ?? 0
    const gross = subtotal + shipping
    const withheld = o.creatorTaxAmountUsd ?? 0
    totalGrossUsd += gross
    totalWithheldUsd += withheld

    const cid = o.creatorId
    const cur = byCreator.get(cid) ?? {
      creatorId: cid,
      creatorName: o.creator?.legalFullName ?? o.creator?.name ?? '',
      displayName: o.creator?.creatorProfile?.displayName ?? null,
      email: o.creator?.email ?? null,
      taxId: o.creator?.creatorProfile?.taxId ?? null,
      country: (o.creator?.creatorProfile?.payoutCountry ?? o.creator?.creatorProfile?.taxJurisdiction ?? country).toUpperCase(),
      orderCount: 0,
      grossUsd: 0,
      withheldUsd: 0,
    }
    cur.orderCount += 1
    cur.grossUsd += gross
    cur.withheldUsd += withheld
    byCreator.set(cid, cur)
  }

  const creators = Array.from(byCreator.values()).sort((a, b) => b.withheldUsd - a.withheldUsd)

  return NextResponse.json({
    period: {
      from: from.toISOString(),
      to: to.toISOString(),
      label,
      country,
      countryName,
    },
    rule: originRule
      ? { rate: originRule.rate, label: originRule.label, ratePercent: originRule.rate * 100 }
      : null,
    totalGrossUsd,
    totalWithheldUsd,
    creatorCount: creators.length,
    orderCount: orders.length,
    creators,
  })
}
