const BASE_URL = 'https://api-demo.airwallex.com/api/v1'

async function getToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/authentication/login`, {
    method: 'POST',
    headers: {
      'x-client-id': process.env.AIRWALLEX_CLIENT_ID ?? '',
      'x-api-key': process.env.AIRWALLEX_API_KEY ?? '',
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Airwallex auth failed: ${res.status}`)
  const data = await res.json()
  return data.token as string
}

export async function createPaymentIntent(params: {
  orderId: string
  amountCents: number
  currency: string
  merchantOrderId: string
}) {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}/pa/payment_intents/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      request_id: params.orderId,
      amount: params.amountCents / 100,
      currency: params.currency,
      merchant_order_id: params.merchantOrderId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/order/success?orderId=${params.orderId}`,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Create intent failed: ${err}`)
  }
  return res.json()
}

export async function getPaymentIntent(intentId: string) {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}/pa/payment_intents/${intentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Get intent failed: ${res.status}`)
  return res.json()
}
