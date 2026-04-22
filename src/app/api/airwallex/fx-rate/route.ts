import { NextRequest, NextResponse } from 'next/server'
import { convertUsdCentsTo, isAirwallexSupportedCurrency } from '@/lib/fx'

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
 *
 * The heavy lifting lives in `src/lib/fx.ts`; that function is also called
 * in-process by the payment-intent route so we don't self-HTTP (M5 / F8).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const to = (searchParams.get('to') ?? 'USD').toUpperCase()
  const amountUsd = parseInt(searchParams.get('amountUsd') ?? '0', 10)

  if (!isAirwallexSupportedCurrency(to)) {
    return NextResponse.json({ error: `Currency ${to} not supported` }, { status: 400 })
  }

  try {
    const result = await convertUsdCentsTo(amountUsd, to)
    return NextResponse.json(result)
  } catch (e) {
    console.error('[fx-rate]', e)
    return NextResponse.json({ error: 'Could not fetch exchange rates' }, { status: 503 })
  }
}
