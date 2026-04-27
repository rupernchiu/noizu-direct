/**
 * GET /api/admin/finance/tax/reverse-charge
 *
 * B2B reverse-charge orders. When `Order.reverseChargeApplied = true`, the
 * platform did NOT collect destination tax — the buyer's business self-assesses.
 * This tab is a forensic / audit view: who claimed reverse-charge, what's the
 * notional tax that was NOT collected, and what tax IDs they provided.
 *
 * Query params:
 *   period   YYYY-MM
 *   from/to  ISO datetimes
 *   country  optional — buyer's business country
 *
 * Returns:
 *   {
 *     period,
 *     orderCount, totalGrossUsd, totalNotionalTaxUsd,
 *     byCountry: [{ country, orderCount, grossUsd, notionalTaxUsd }],
 *     orders: [{ id, createdAt, buyerCountry, businessTaxId, grossUsd,
 *                 notionalTaxUsd, ratePercent, label,
 *                 buyerName, creatorDisplayName }]
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
  const creatorId = url.searchParams.get('creatorId') || null
  const { from, to, label } = parsePeriod(url)

  const orders = await prisma.order.findMany({
    where: {
      reverseChargeApplied: true,
      createdAt: { gte: from, lt: to },
      escrowStatus: { in: ['HELD', 'TRACKING_ADDED', 'RELEASED', 'PARTIALLY_REFUNDED'] },
      ...(country ? { buyerCountry: country } : {}),
      ...(creatorId ? { creatorId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id: true,
      createdAt: true,
      amountUsd: true,
      subtotalUsd: true,
      shippingCostUsd: true,
      buyerFeeUsd: true,
      buyerCountry: true,
      buyerBusinessTaxId: true,
      destinationTaxAmountUsd: true,
      destinationTaxRatePercent: true,
      destinationTaxCountry: true,
      buyer: { select: { name: true, email: true } },
      creator: {
        select: {
          name: true,
          creatorProfile: { select: { displayName: true } },
        },
      },
    },
  }).catch(() => [])

  let totalGrossUsd = 0
  let totalNotionalTaxUsd = 0
  const byCountryMap = new Map<string, { country: string; label: string; orderCount: number; grossUsd: number; notionalTaxUsd: number }>()

  const rows = orders.map((o) => {
    const subtotal = o.subtotalUsd ?? Math.max(0, o.amountUsd - (o.buyerFeeUsd ?? 0))
    const shipping = o.shippingCostUsd ?? 0
    const gross = subtotal + shipping
    // Notional tax: if rate is snapshotted use it; otherwise look up the country.
    const c = (o.buyerCountry ?? 'XX').toUpperCase()
    const rec = countryFor(c)
    const rate = o.destinationTaxRatePercent ?? (rec?.destinationTax?.rate ? rec.destinationTax.rate * 100 : 0)
    const notional = o.destinationTaxAmountUsd && o.destinationTaxAmountUsd > 0
      ? o.destinationTaxAmountUsd
      : Math.round((gross * rate) / 100)
    totalGrossUsd += gross
    totalNotionalTaxUsd += notional

    const cur = byCountryMap.get(c) ?? {
      country: c,
      label: rec?.destinationTax?.label ?? '—',
      orderCount: 0,
      grossUsd: 0,
      notionalTaxUsd: 0,
    }
    cur.orderCount += 1
    cur.grossUsd += gross
    cur.notionalTaxUsd += notional
    byCountryMap.set(c, cur)

    return {
      id: o.id,
      createdAt: o.createdAt.toISOString(),
      buyerCountry: c,
      businessTaxId: o.buyerBusinessTaxId ?? null,
      grossUsd: gross,
      notionalTaxUsd: notional,
      ratePercent: rate,
      label: rec?.destinationTax?.label ?? '—',
      buyerName: o.buyer?.name ?? null,
      buyerEmail: o.buyer?.email ?? null,
      creatorDisplayName: o.creator?.creatorProfile?.displayName ?? o.creator?.name ?? null,
    }
  })

  return NextResponse.json({
    period: { from: from.toISOString(), to: to.toISOString(), label },
    orderCount: orders.length,
    totalGrossUsd,
    totalNotionalTaxUsd,
    byCountry: Array.from(byCountryMap.values()).sort((a, b) => b.notionalTaxUsd - a.notionalTaxUsd),
    orders: rows,
  })
}
