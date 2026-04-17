const BASE_URL = process.env.AIRWALLEX_BASE_URL ?? 'https://api-demo.airwallex.com'

let _cachedToken: { value: string; expiresAt: number } | null = null

export async function getAirwallexToken(): Promise<string> {
  const now = Date.now()
  if (_cachedToken && _cachedToken.expiresAt > now + 60_000) return _cachedToken.value

  const res = await fetch(`${BASE_URL}/api/v1/authentication/login`, {
    method: 'POST',
    headers: {
      'x-client-id': process.env.AIRWALLEX_CLIENT_ID ?? '',
      'x-api-key': process.env.AIRWALLEX_API_SECRET ?? '',
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Airwallex auth failed: ${res.status}`)
  const data = await res.json() as { token: string }
  _cachedToken = { value: data.token, expiresAt: now + 30 * 60 * 1000 }
  return _cachedToken.value
}

export async function createPaymentIntent({
  amount,
  currency,
  orderId,
  buyerEmail: _buyerEmail,
}: {
  amount: number   // in cents
  currency: string
  orderId: string
  buyerEmail?: string
}): Promise<any> {
  const token = await getAirwallexToken()
  const res = await fetch(`${BASE_URL}/api/v1/pa/payment_intents/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      request_id: orderId,
      amount: amount / 100,
      currency,
      merchant_order_id: orderId,
      descriptor: 'NOIZU-DIRECT',
      metadata: { orderId },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Create intent failed: ${err}`)
  }
  return res.json()
}

export async function confirmPaymentIntent(intentId: string): Promise<any> {
  const token = await getAirwallexToken()
  const res = await fetch(`${BASE_URL}/api/v1/pa/payment_intents/${intentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Get intent failed: ${res.status}`)
  return res.json()
}

// Backward-compat alias
export const getPaymentIntent = confirmPaymentIntent
