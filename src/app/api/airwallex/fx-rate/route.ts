import { NextRequest, NextResponse } from 'next/server'
import { getCurrencyFactor } from '@/lib/airwallex'

const SUPPORTED = ['USD', 'MYR', 'SGD', 'PHP', 'THB', 'IDR']

// In-memory rate cache — refreshed at most once per hour per server instance
let _cache: { rates: Record<string, number>; fetchedAt: number } | null = null
const CACHE_TTL = 60 * 60 * 1000

async function getUsdRates(): Promise<Record<string, number>> {
  if (_cache && Date.now() - _cache.fetchedAt < CACHE_TTL) return _cache.rates
  const res = await fetch(
    `https://api.frankfurter.app/latest?from=USD&to=${SUPPORTED.filter(c => c !== 'USD').join(',')}`,
    { next: { revalidate: 3600 } },
  )
  if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`)
  const data = await res.json() as { rates: Record<string, number> }
  _cache = { rates: { USD: 1, ...data.rates }, fetchedAt: Date.now() }
  return _cache.rates
}

/**
 * GET /api/airwallex/fx-rate?to=MYR&amountUsd=1000
 *
 * amountUsd  — USD amount in cents (e.g. 1000 = $10.00)
 * to         — target currency code
 *
 * Returns:
 *   rate           — 1 USD = X <to>  (major units)
 *   displayAmount  — converted amount in minor units of <to>
 *                    (e.g. 4450 for MYR 44.50, 160000 for IDR 160000)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const to = (searchParams.get('to') ?? 'USD').toUpperCase()
  const amountUsd = parseInt(searchParams.get('amountUsd') ?? '0', 10)

  if (!SUPPORTED.includes(to)) {
    return NextResponse.json({ error: `Currency ${to} not supported` }, { status: 400 })
  }

  try {
    const rates = await getUsdRates()
    const rate = rates[to] ?? 1
    const factor = getCurrencyFactor(to)
    // Convert: (amountUsd cents / 100 USD) × rate (major units/USD) × factor (minor/major)
    const displayAmount = Math.round((amountUsd / 100) * rate * factor)
    return NextResponse.json({ rate, displayAmount, currency: to })
  } catch (e) {
    console.error('[fx-rate]', e)
    return NextResponse.json({ error: 'Could not fetch exchange rates' }, { status: 503 })
  }
}
