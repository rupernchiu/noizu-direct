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

/**
 * Pick a 3DS posture for a given purchase.
 *
 * Spec (memory: project_fee_tax_fraud_model.md): digital goods of any amount,
 * and physical goods ≥ USD 25, must FORCE 3DS. Below that threshold for
 * physical we hand off to Airwallex Risk Engine via EXTERNAL_3DS so the issuer
 * decides. SKIP_3DS is intentionally never returned — call sites can opt in
 * manually if they need it for a test fixture.
 */
export function decideThreeDsAction(args: {
  productType: 'DIGITAL' | 'PHYSICAL' | 'POD' | 'COMMISSION' | string
  amountUsdCents: number
}): 'FORCE_3DS' | 'EXTERNAL_3DS' {
  const { productType, amountUsdCents } = args
  // Digital surfaces (downloads, subscriptions, commissions) are highest-fraud:
  // dispute-win-rate is <50% even with perfect evidence and the goods are
  // already delivered. Mandatory 3DS shifts liability to issuer.
  const isDigital =
    productType === 'DIGITAL' ||
    productType === 'COMMISSION' ||
    productType === 'SUBSCRIPTION' ||
    productType === 'STORAGE'
  if (isDigital) return 'FORCE_3DS'
  // Physical/POD: force above USD 25 threshold (matches industry chargeback
  // sweet spot; below that fraud cost-to-loss ratio rarely justifies friction).
  if (amountUsdCents >= 2500) return 'FORCE_3DS'
  return 'EXTERNAL_3DS'
}

// Three-DS posture flags accepted by Airwallex `payment_method_options.card.three_ds_action`.
// FORCE_3DS — always challenge; mandatory for digital goods + physical ≥ USD 25 per
//             our fraud spec (project_fee_tax_fraud_model.md).
// EXTERNAL_3DS — issuer/risk-engine decides. We rely on Airwallex Risk Engine rules.
// SKIP_3DS  — never challenge. Reserved for low-value test paths only — do not ship.
export type ThreeDsAction = 'FORCE_3DS' | 'EXTERNAL_3DS' | 'SKIP_3DS'

export async function createPaymentIntent({
  amount,
  currency,
  orderId,
  buyerEmail: _buyerEmail,
  customerId,
  savePaymentMethod,
  metadata,
  threeDsAction,
}: {
  amount: number   // in cents
  currency: string
  orderId: string
  buyerEmail?: string
  customerId?: string
  savePaymentMethod?: boolean
  metadata?: Record<string, string | number | boolean>
  threeDsAction?: ThreeDsAction
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
  // Build payment_method_options.card incrementally so save-payment + 3DS can co-exist.
  const cardOpts: Record<string, unknown> = {}
  if (savePaymentMethod) {
    cardOpts.auto_capture = true
    body.save_payment_method = true
  }
  if (threeDsAction) {
    cardOpts.three_ds_action = threeDsAction
  }
  if (Object.keys(cardOpts).length > 0) {
    body.payment_method_options = { card: cardOpts }
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

/**
 * Live FX quote from Airwallex. We use this for buyer-facing display rates so
 * the indicative figure shown at checkout tracks Airwallex's own settlement
 * rate rather than ECB/Frankfurter mid-market (which lags up to 3 days on
 * weekends/holidays).
 *
 * @returns rate such that 1 fromCurrency = X toCurrency (major units)
 */
export async function getAirwallexFxRate(
  fromCurrency: string,
  toCurrency: string,
): Promise<number> {
  if (fromCurrency === toCurrency) return 1
  const token = await getAirwallexToken()
  const url = `${BASE_URL}/api/v1/fx/conversion_rate?buy_currency=${toCurrency}&sell_currency=${fromCurrency}&sell_amount=1`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Airwallex FX rate ${fromCurrency}->${toCurrency} failed: ${res.status} ${err}`)
  }
  const data = (await res.json()) as { client_rate: number }
  return data.client_rate
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
