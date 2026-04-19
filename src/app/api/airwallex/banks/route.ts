import { NextRequest, NextResponse } from 'next/server'
import { getAirwallexToken } from '@/lib/airwallex'

const BASE_URL = process.env.AIRWALLEX_BASE_URL ?? 'https://api-demo.airwallex.com'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const country = searchParams.get('country')
  const currency = searchParams.get('currency')
  const keyword = searchParams.get('keyword') ?? ''

  if (!country || !currency) {
    return NextResponse.json({ error: 'country and currency are required' }, { status: 400 })
  }

  try {
    const token = await getAirwallexToken()
    const params = new URLSearchParams({
      bank_country_code: country,
      account_currency: currency,
      transfer_method: 'LOCAL',
      ...(keyword ? { keyword } : {}),
    })

    const res = await fetch(`${BASE_URL}/api/v1/bank/beneficiary_banks?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Airwallex error: ${err}` }, { status: res.status })
    }

    const raw = await res.json()
    console.log('[airwallex/banks] status:', res.status, 'raw:', JSON.stringify(raw).slice(0, 800))
    const data = raw as {
      items?: { bank_name?: string; bank_code?: string; label?: string; value?: string }[]
    }
    const banks = (data.items ?? []).map((b) => ({
      label: b.bank_name ?? b.label ?? '',
      value: b.bank_code ?? b.value ?? '',
    })).filter((b) => b.label && b.value)
    return NextResponse.json({ banks, apiAvailable: banks.length > 0 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch banks'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
