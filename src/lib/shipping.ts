// Shipping cost helpers (sprint shipping-1, 2026-04-26).
//
// noizu.direct is plumbing-only — creators set rates, ship goods, and receive
// the full shipping fee at payout. Platform charges no fee on shipping and
// applies no tax to it. This module:
//   • normalizes country names ↔ ISO-3166 alpha-2
//   • parses/serializes the JSON map stored in CreatorProfile/Product
//   • resolves the effective rate for a (creator, product, destination) tuple
//   • combines a multi-item cart under the creator's combined-shipping rules
//   • applies free-shipping thresholds
//
// Rates are stored as USD cents.

export const SHIPPING_COUNTRIES = [
  { code: 'MY', name: 'Malaysia',    zone: 'SEA-Tier1' },
  { code: 'SG', name: 'Singapore',   zone: 'SEA-Tier1' },
  { code: 'PH', name: 'Philippines', zone: 'SEA-Tier1' },
  { code: 'ID', name: 'Indonesia',   zone: 'SEA-Tier1' },
  { code: 'TH', name: 'Thailand',    zone: 'SEA-Tier1' },
  { code: 'VN', name: 'Vietnam',     zone: 'SEA-Tier2' },
  { code: 'KH', name: 'Cambodia',    zone: 'SEA-Tier2' },
  { code: 'MM', name: 'Myanmar',     zone: 'SEA-Tier2' },
  { code: 'LA', name: 'Laos',        zone: 'SEA-Tier2' },
  { code: 'BN', name: 'Brunei',      zone: 'SEA-Tier1' },
] as const

export type ShippingCountryCode = typeof SHIPPING_COUNTRIES[number]['code']

export const ROW_KEY = 'ROW' as const

// Zone groups expose a 5-input UI that fans out to the 10 country slots.
// Creators can break out individual countries for finer control.
export const SHIPPING_ZONES = [
  {
    key: 'domestic-my',
    label: 'Domestic (Malaysia)',
    countries: ['MY'] as const,
    helper: 'Lowest rate — typically RM5–RM12 (USD ~1.50–3.00).',
  },
  {
    key: 'sea-tier1',
    label: 'SEA Tier 1 (SG / PH / ID / TH / BN)',
    countries: ['SG', 'PH', 'ID', 'TH', 'BN'] as const,
    helper: 'Established couriers, predictable transit. Typical USD 6–12.',
  },
  {
    key: 'sea-tier2',
    label: 'SEA Tier 2 (VN / KH / MM / LA)',
    countries: ['VN', 'KH', 'MM', 'LA'] as const,
    helper: 'Slower routes, higher cost. Typical USD 10–18.',
  },
  {
    key: 'row',
    label: 'Rest of World',
    countries: [ROW_KEY] as const,
    helper: 'Fallback for buyers outside SEA. Set to a number you can ship for, or leave empty to block ROW orders.',
  },
] as const

// Reference benchmarks used by the dashboard form ("typical" hint copy).
// USD cents. NOT used for pricing — purely display.
export const SHIPPING_BENCHMARKS: Record<string, { lowUsdCents: number; highUsdCents: number; note: string }> = {
  MY:  { lowUsdCents: 150,  highUsdCents: 350,  note: 'PosLaju / J&T flat-rate' },
  SG:  { lowUsdCents: 600,  highUsdCents: 1200, note: 'Pos International / SingPost' },
  PH:  { lowUsdCents: 700,  highUsdCents: 1400, note: 'EMS / J&T cross-border' },
  ID:  { lowUsdCents: 700,  highUsdCents: 1400, note: 'Pos / J&T cross-border' },
  TH:  { lowUsdCents: 700,  highUsdCents: 1400, note: 'Pos / J&T cross-border' },
  BN:  { lowUsdCents: 800,  highUsdCents: 1500, note: 'Limited courier coverage' },
  VN:  { lowUsdCents: 1000, highUsdCents: 1800, note: 'EMS recommended' },
  KH:  { lowUsdCents: 1000, highUsdCents: 1800, note: 'EMS / DHL' },
  MM:  { lowUsdCents: 1200, highUsdCents: 2000, note: 'EMS, longer transit' },
  LA:  { lowUsdCents: 1200, highUsdCents: 2000, note: 'EMS, longer transit' },
  ROW: { lowUsdCents: 2000, highUsdCents: 4500, note: 'EMS / DHL Express' },
}

// ── Country name normalization ──────────────────────────────────────────────
// Existing checkout pages use full names ("Malaysia"); internal code expects
// ISO codes ("MY"). This bidirectional map keeps the two reconciled.

const NAME_TO_CODE: Record<string, ShippingCountryCode> = {}
const CODE_TO_NAME: Record<string, string> = {}
for (const c of SHIPPING_COUNTRIES) {
  NAME_TO_CODE[c.name.toLowerCase()] = c.code
  CODE_TO_NAME[c.code] = c.name
}

export function normalizeCountryToCode(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null
  // Already an ISO-2 code?
  if (trimmed.length === 2) return trimmed.toUpperCase()
  const hit = NAME_TO_CODE[trimmed.toLowerCase()]
  return hit ?? null
}

export function countryNameForCode(code: string | null | undefined): string | null {
  if (!code) return null
  return CODE_TO_NAME[code.toUpperCase()] ?? null
}

// ── Rate map parsing/serialization ──────────────────────────────────────────

export type ShippingRateMap = Partial<Record<ShippingCountryCode | typeof ROW_KEY, number>>

export function parseShippingMap(raw: string | null | undefined): ShippingRateMap | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const out: ShippingRateMap = {}
    for (const [key, value] of Object.entries(parsed)) {
      const k = key.toUpperCase() as keyof ShippingRateMap
      if (k !== ROW_KEY && !SHIPPING_COUNTRIES.some(c => c.code === k)) continue
      const cents = Number(value)
      if (!Number.isFinite(cents) || cents < 0) continue
      out[k] = Math.round(cents)
    }
    return out
  } catch {
    return null
  }
}

export function serializeShippingMap(map: ShippingRateMap | null | undefined): string | null {
  if (!map) return null
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(map)) {
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
      out[k.toUpperCase()] = Math.round(v)
    }
  }
  return Object.keys(out).length === 0 ? null : JSON.stringify(out)
}

// ── Effective rate resolution ───────────────────────────────────────────────

export interface ShippingRateLookupInput {
  productShippingByCountry?: string | null
  productShippingFreeThresholdUsd?: number | null
  creatorShippingByCountry?: string | null
  creatorShippingFreeThresholdUsd?: number | null
  destinationCountry: string | null | undefined // ISO-2 OR full name
}

export interface ShippingRateLookupResult {
  rateUsdCents: number | null // null = no rate set for this destination → block
  freeThresholdUsdCents: number | null
  resolvedCountryCode: string | null
  source: 'product' | 'creator' | null
  appliedRowFallback: boolean
}

export function resolveShippingRate(input: ShippingRateLookupInput): ShippingRateLookupResult {
  const code = normalizeCountryToCode(input.destinationCountry)
  const productMap = parseShippingMap(input.productShippingByCountry)
  const creatorMap = parseShippingMap(input.creatorShippingByCountry)

  const map = productMap ?? creatorMap
  const source: 'product' | 'creator' | null =
    productMap ? 'product' : creatorMap ? 'creator' : null

  const freeThresholdUsdCents =
    input.productShippingFreeThresholdUsd ??
    input.creatorShippingFreeThresholdUsd ??
    null

  if (!map || !code) {
    return {
      rateUsdCents: null,
      freeThresholdUsdCents,
      resolvedCountryCode: code,
      source,
      appliedRowFallback: false,
    }
  }

  const direct = map[code as ShippingCountryCode]
  if (typeof direct === 'number') {
    return {
      rateUsdCents: direct,
      freeThresholdUsdCents,
      resolvedCountryCode: code,
      source,
      appliedRowFallback: false,
    }
  }

  const row = map[ROW_KEY]
  if (typeof row === 'number') {
    return {
      rateUsdCents: row,
      freeThresholdUsdCents,
      resolvedCountryCode: code,
      source,
      appliedRowFallback: true,
    }
  }

  return {
    rateUsdCents: null,
    freeThresholdUsdCents,
    resolvedCountryCode: code,
    source,
    appliedRowFallback: false,
  }
}

// ── Cart combination ────────────────────────────────────────────────────────
// Combined-shipping uses the highest-rate item across the creator's group.
// If combined is OFF, sum every line item's rate (× quantity is intentionally
// NOT applied — physical packing usually consolidates units in one parcel).

export interface CartShippingItem {
  productId: string
  productShippingByCountry?: string | null
  productShippingFreeThresholdUsd?: number | null
  itemSubtotalUsdCents: number // line subtotal *before* shipping (price × qty)
  isPhysical: boolean // false for DIGITAL/COMMISSION — those don't ship
}

export interface CombinedShippingInput {
  creatorShippingByCountry?: string | null
  creatorShippingFreeThresholdUsd?: number | null
  combinedShippingEnabled: boolean
  destinationCountry: string | null | undefined
  items: CartShippingItem[]
}

export interface CombinedShippingResult {
  shippingUsdCents: number
  freeApplied: boolean
  resolvedCountryCode: string | null
  blocked: boolean // true if any physical item lacks a rate for this destination
  blockedItemIds: string[]
  perItemBreakdown: Array<{
    productId: string
    rateUsdCents: number | null
    appliedRowFallback: boolean
  }>
  destinationHasPhysicalItems: boolean
}

export function combineCartShipping(input: CombinedShippingInput): CombinedShippingResult {
  const code = normalizeCountryToCode(input.destinationCountry)
  const physical = input.items.filter(i => i.isPhysical)
  const breakdown: CombinedShippingResult['perItemBreakdown'] = []
  const blockedItemIds: string[] = []

  if (physical.length === 0) {
    return {
      shippingUsdCents: 0,
      freeApplied: false,
      resolvedCountryCode: code,
      blocked: false,
      blockedItemIds,
      perItemBreakdown: breakdown,
      destinationHasPhysicalItems: false,
    }
  }

  for (const item of physical) {
    const lookup = resolveShippingRate({
      productShippingByCountry: item.productShippingByCountry,
      productShippingFreeThresholdUsd: item.productShippingFreeThresholdUsd,
      creatorShippingByCountry: input.creatorShippingByCountry,
      creatorShippingFreeThresholdUsd: input.creatorShippingFreeThresholdUsd,
      destinationCountry: code,
    })
    breakdown.push({
      productId: item.productId,
      rateUsdCents: lookup.rateUsdCents,
      appliedRowFallback: lookup.appliedRowFallback,
    })
    if (lookup.rateUsdCents == null) blockedItemIds.push(item.productId)
  }

  if (blockedItemIds.length > 0) {
    return {
      shippingUsdCents: 0,
      freeApplied: false,
      resolvedCountryCode: code,
      blocked: true,
      blockedItemIds,
      perItemBreakdown: breakdown,
      destinationHasPhysicalItems: true,
    }
  }

  const rates = breakdown.map(b => b.rateUsdCents!).filter(n => n > 0)
  const baseShipping = input.combinedShippingEnabled
    ? (rates.length === 0 ? 0 : Math.max(...rates))
    : rates.reduce((sum, r) => sum + r, 0)

  const physicalSubtotal = physical.reduce((sum, i) => sum + i.itemSubtotalUsdCents, 0)
  const threshold =
    input.creatorShippingFreeThresholdUsd ?? null

  const productThreshold = physical
    .map(i => i.productShippingFreeThresholdUsd ?? null)
    .find(t => t != null) ?? null
  const effectiveThreshold = productThreshold ?? threshold

  if (effectiveThreshold != null && physicalSubtotal >= effectiveThreshold) {
    return {
      shippingUsdCents: 0,
      freeApplied: true,
      resolvedCountryCode: code,
      blocked: false,
      blockedItemIds,
      perItemBreakdown: breakdown,
      destinationHasPhysicalItems: true,
    }
  }

  return {
    shippingUsdCents: baseShipping,
    freeApplied: false,
    resolvedCountryCode: code,
    blocked: false,
    blockedItemIds,
    perItemBreakdown: breakdown,
    destinationHasPhysicalItems: true,
  }
}

// ── Validation ──────────────────────────────────────────────────────────────

export const PHYSICAL_PRODUCT_TYPES = ['PHYSICAL', 'POD'] as const
export type PhysicalProductType = typeof PHYSICAL_PRODUCT_TYPES[number]

export function isPhysicalType(type: string | null | undefined): boolean {
  if (!type) return false
  return (PHYSICAL_PRODUCT_TYPES as readonly string[]).includes(type.toUpperCase())
}

// Returns true when the input has at least one country rate set.
// Accepts either a raw JSON string or an object with creator/product fields.
// Used to block-publish PHYSICAL/POD listings.
export function hasAnyShippingRate(
  input:
    | string
    | null
    | undefined
    | {
        creatorShippingByCountry?: string | null
        productShippingByCountry?: string | null
      },
): boolean {
  let map: ShippingRateMap | null = null
  if (input == null) return false
  if (typeof input === 'string') {
    map = parseShippingMap(input)
  } else {
    map =
      parseShippingMap(input.productShippingByCountry) ??
      parseShippingMap(input.creatorShippingByCountry)
  }
  if (!map) return false
  return Object.values(map).some(v => typeof v === 'number')
}

// Compute the maximum amount that can be refunded to a buyer. If the order has
// already been shipped (escrowStatus advanced past HELD), shipping is retained
// by the creator — they paid the carrier. Chargebacks bypass this and reverse
// the full amount; that path is in the Airwallex webhook handler.
export function computeMaxRefundableUsd(order: {
  amountUsd: number
  shippingCostUsd: number
  escrowStatus: string
}): number {
  const shipped = order.escrowStatus !== 'HELD'
  return shipped ? order.amountUsd - (order.shippingCostUsd ?? 0) : order.amountUsd
}

// True if creator (or product override) has a ROW fallback or covers every
// SEA country we operate in. Used by the dashboard "you're good to go" badge.
export function shippingCoversAllSEA(input: {
  creatorShippingByCountry?: string | null
  productShippingByCountry?: string | null
}): boolean {
  const map = parseShippingMap(input.productShippingByCountry) ?? parseShippingMap(input.creatorShippingByCountry)
  if (!map) return false
  if (typeof map[ROW_KEY] === 'number') return true
  return SHIPPING_COUNTRIES.every(c => typeof map[c.code] === 'number')
}
