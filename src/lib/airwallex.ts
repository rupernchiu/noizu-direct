const BASE_URL = process.env.AIRWALLEX_BASE_URL ?? 'https://api-demo.airwallex.com'

// Currencies with no sub-units — Airwallex expects whole numbers (e.g. 160000 IDR, not 1600.00)
export const ZERO_DECIMAL_CURRENCIES = new Set(['IDR', 'JPY', 'KRW', 'VND'])

// Returns the divisor to convert our internal minor-unit storage to Airwallex's expected decimal amount
export function getCurrencyFactor(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100
}

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
  customerId,
  savePaymentMethod,
  metadata,
}: {
  amount: number   // in cents
  currency: string
  orderId: string
  buyerEmail?: string
  customerId?: string
  savePaymentMethod?: boolean
  metadata?: Record<string, string | number | boolean>
}): Promise<any> {
  const token = await getAirwallexToken()
  const body: Record<string, unknown> = {
    request_id: orderId,
    amount: amount / getCurrencyFactor(currency),
    currency,
    merchant_order_id: orderId,
    descriptor: 'noizu.direct',
    metadata: { orderId, ...(metadata ?? {}) },
  }
  if (customerId) body.customer_id = customerId
  if (savePaymentMethod) {
    body.payment_method_options = { card: { auto_capture: true } }
    body.save_payment_method = true
  }
  const res = await fetch(`${BASE_URL}/api/v1/pa/payment_intents/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Create intent failed: ${err}`)
  }
  return res.json()
}

// ─── Customer + PaymentConsent (recurring) ───────────────────────────────────

export async function createAirwallexCustomer({
  userId,
  email,
  name,
}: {
  userId: string
  email: string
  name?: string
}): Promise<{ id: string }> {
  const token = await getAirwallexToken()
  const res = await fetch(`${BASE_URL}/api/v1/pa/customers/create`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request_id: `cust_${userId}_${Date.now()}`,
      merchant_customer_id: userId,
      email,
      ...(name ? { first_name: name.split(' ')[0], last_name: name.split(' ').slice(1).join(' ') || name } : {}),
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Create customer failed: ${err}`)
  }
  return res.json()
}

/**
 * List PaymentConsents attached to a customer. The first-charge DropIn stores
 * a consent that we read back by customer to find its ID for future MIT charges.
 */
export async function listPaymentConsents(customerId: string): Promise<Array<{ id: string; status: string; next_triggered_by: string; payment_method?: { id: string } }>> {
  const token = await getAirwallexToken()
  const res = await fetch(`${BASE_URL}/api/v1/pa/payment_consents?customer_id=${customerId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  const data = await res.json() as { items?: Array<{ id: string; status: string; next_triggered_by: string; payment_method?: { id: string } }> }
  return data.items ?? []
}

/**
 * Server-side off-session charge using a stored PaymentConsent.
 * Used by the recurring-renewals cron — no buyer present, no SCA prompt.
 */
export async function chargeWithConsent({
  amount,
  currency,
  requestId,
  customerId,
  paymentConsentId,
  metadata,
}: {
  amount: number          // in cents
  currency: string
  requestId: string       // idempotency key
  customerId: string
  paymentConsentId: string
  metadata?: Record<string, string | number | boolean>
}): Promise<{ id: string; status: string; client_secret?: string }> {
  const token = await getAirwallexToken()

  // 1. Create intent with MIT flag
  const createRes = await fetch(`${BASE_URL}/api/v1/pa/payment_intents/create`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request_id: requestId,
      amount: amount / getCurrencyFactor(currency),
      currency,
      merchant_order_id: requestId,
      customer_id: customerId,
      descriptor: 'noizu.direct',
      metadata: { ...(metadata ?? {}), recurring: true },
    }),
  })
  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Create recurring intent failed: ${err}`)
  }
  const intent = await createRes.json() as { id: string; client_secret: string }

  // 2. Confirm with the stored consent (merchant-triggered, scheduled)
  const confirmRes = await fetch(`${BASE_URL}/api/v1/pa/payment_intents/${intent.id}/confirm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request_id: `${requestId}_confirm`,
      payment_consent_id: paymentConsentId,
      payment_method_options: { card: { auto_capture: true } },
      merchant_trigger_reason: 'scheduled',
    }),
  })
  if (!confirmRes.ok) {
    const err = await confirmRes.text()
    throw new Error(`Confirm recurring intent failed: ${err}`)
  }
  return confirmRes.json()
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

export async function createBeneficiary({
  creatorId,
  accountName,
  bankName,
  accountNumber,
  routingCode,
  swiftCode,
  country,
  currency,
}: {
  creatorId: string
  accountName: string
  bankName: string
  accountNumber: string
  routingCode?: string
  swiftCode?: string
  country: string
  currency: string
}): Promise<{ beneficiary_id: string; status: string }> {
  const token = await getAirwallexToken()
  const res = await fetch(`${BASE_URL}/api/v1/beneficiaries/create`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request_id: creatorId,
      entity_type: 'PERSONAL',
      address: { country_code: country },
      bank_details: {
        account_currency: currency,
        account_name: accountName,
        bank_name: bankName,
        account_number: accountNumber,
        ...(routingCode ? { routing_number: routingCode } : {}),
        ...(swiftCode ? { swift_code: swiftCode } : {}),
      },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Create beneficiary failed: ${err}`)
  }
  return res.json()
}

export async function executeTransfer({
  beneficiaryId,
  amount,
  currency,
  payoutId,
}: {
  beneficiaryId: string
  amount: number  // in cents
  currency: string
  payoutId: string
  creatorName?: string
}): Promise<{ transfer_id?: string; id?: string; status: string }> {
  const token = await getAirwallexToken()
  const res = await fetch(`${BASE_URL}/api/v1/transfers/create`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request_id: payoutId,
      beneficiary_id: beneficiaryId,
      amount: amount / 100,
      currency,
      payment_method: 'LOCAL',
      memo: 'noizu.direct Creator Payout',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Execute transfer failed: ${err}`)
  }
  return res.json()
}

export async function getTransferStatus(transferId: string): Promise<{ status: string; failure_reason?: string }> {
  const token = await getAirwallexToken()
  const res = await fetch(`${BASE_URL}/api/v1/transfers/${transferId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Get transfer status failed: ${res.status}`)
  return res.json()
}

export type AirwallexBalance = {
  currency: string
  available_amount: number
  pending_amount: number
  total_amount: number
}

export async function getAirwallexBalances(): Promise<AirwallexBalance[]> {
  const token = await getAirwallexToken()
  const res = await fetch(`${BASE_URL}/api/v1/balances`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  const data = await res.json() as { items?: AirwallexBalance[] } | AirwallexBalance[]
  return Array.isArray(data) ? data : (data.items ?? [])
}
