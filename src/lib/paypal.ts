const PAYPAL_ENV = process.env.PAYPAL_ENV ?? 'sandbox'
const BASE_URL = PAYPAL_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID ?? ''
  const secret = process.env.PAYPAL_SECRET ?? ''
  const credentials = Buffer.from(`${clientId}:${secret}`).toString('base64')

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`)
  const data = await res.json() as { access_token: string }
  return data.access_token
}

export async function executePayPalPayout({
  payoutId,
  paypalEmail,
  amount,
  currency,
}: {
  payoutId: string
  paypalEmail: string
  amount: number  // in cents
  currency: string
  creatorName?: string
}): Promise<{ batch_id: string; status: string }> {
  const token = await getPayPalAccessToken()

  const res = await fetch(`${BASE_URL}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: payoutId,
        email_subject: 'NOIZU-DIRECT Payout',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: { value: (amount / 100).toFixed(2), currency },
          receiver: paypalEmail,
          note: 'NOIZU-DIRECT Creator Payout',
          sender_item_id: payoutId,
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal payout failed: ${err}`)
  }

  const data = await res.json() as {
    batch_header?: { payout_batch_id?: string; batch_status?: string }
  }
  return {
    batch_id: data.batch_header?.payout_batch_id ?? '',
    status: data.batch_header?.batch_status ?? 'PENDING',
  }
}
