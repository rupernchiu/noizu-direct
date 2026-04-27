// Shipping cost helpers (sprint shipping-2, per-product model, 2026-04-27).
//
// noizu.direct is plumbing-only — creators set rates per product, ship goods,
// and receive the full shipping fee at payout. Platform charges no fee on
// shipping and applies no tax to it.
//
// Rates live ONLY on Product.shippingByCountry. CreatorProfile.shippingByCountry
// is soft-deprecated — kept nullable in the schema but no longer read at
// runtime. The free-shipping threshold and combined-cart toggle remain
// creator-level (cart-wide concepts).
//
// Rates are stored as USD cents.
//
// 2026-04-27: country list now derived from src/lib/countries.ts (single
// source of truth). The exported shape (SHIPPING_COUNTRIES, ShippingCountryCode)
// is preserved so existing call-sites don't break.

import { COUNTRIES } from '@/lib/countries'

// Const-asserted code list — Tier 1 SEA in the historical iteration order.
// We keep this hand-rolled (rather than computed) so ShippingCountryCode
// stays a literal-string union, which other files rely on for type narrowing.
const SHIPPING_COUNTRY_CODES = ['MY', 'SG', 'PH', 'ID', 'TH', 'VN', 'KH', 'MM', 'LA', 'BN'] as const

export type ShippingCountryCode = typeof SHIPPING_COUNTRY_CODES[number]

export interface ShippingCountry {
  code: ShippingCountryCode
  name: string
  zone: 'SEA-Tier1' | 'SEA-Tier2'
}

function shippingZoneLabel(
  zone: 'domestic-my' | 'sea-tier1' | 'sea-tier2' | 'row',
): 'SEA-Tier1' | 'SEA-Tier2' {
  return zone === 'sea-tier2' ? 'SEA-Tier2' : 'SEA-Tier1'
}

export const SHIPPING_COUNTRIES: readonly ShippingCountry[] = SHIPPING_COUNTRY_CODES.map((code) => {
  const c = COUNTRIES[code]
  if (!c) {
    throw new Error(`countries.ts is missing required shipping country ${code}`)
  }
  return {
    code,
    name: c.name,
    zone: shippingZoneLabel(c.shippingZone),
  }
})

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
  creatorShippingFreeThresholdUsd?: number | null // creator-level free-ship threshold (cart-wide)
  destinationCountry: string | null | undefined // ISO-2 OR full name
}

export interface ShippingRateLookupResult {
  rateUsdCents: number | null // null = no rate set for this destination → block
  freeThresholdUsdCents: number | null
  resolvedCountryCode: string | null
  appliedRowFallback: boolean
}

export function resolveShippingRate(input: ShippingRateLookupInput): ShippingRateLookupResult {
  const code = normalizeCountryToCode(input.destinationCountry)
  const map = parseShippingMap(input.productShippingByCountry)
  const freeThresholdUsdCents = input.creatorShippingFreeThresholdUsd ?? null

  if (!map || !code) {
    return {
      rateUsdCents: null,
      freeThresholdUsdCents,
      resolvedCountryCode: code,
      appliedRowFallback: false,
    }
  }

  const direct = map[code as ShippingCountryCode]
  if (typeof direct === 'number') {
    return {
      rateUsdCents: direct,
      freeThresholdUsdCents,
      resolvedCountryCode: code,
      appliedRowFallback: false,
    }
  }

  const row = map[ROW_KEY]
  if (typeof row === 'number') {
    return {
      rateUsdCents: row,
      freeThresholdUsdCents,
      resolvedCountryCode: code,
      appliedRowFallback: true,
    }
  }

  return {
    rateUsdCents: null,
    freeThresholdUsdCents,
    resolvedCountryCode: code,
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
  itemSubtotalUsdCents: number // line subtotal *before* shipping (price × qty)
  isPhysical: boolean // false for DIGITAL/COMMISSION — those don't ship
}

export interface CombinedShippingInput {
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
  const effectiveThreshold = input.creatorShippingFreeThresholdUsd ?? null

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

// Returns true when the product's rate map has at least one country rate set.
// Used to block-publish PHYSICAL/POD listings without shipping configured.
export function hasAnyShippingRate(productShippingByCountry: string | null | undefined): boolean {
  const map = parseShippingMap(productShippingByCountry)
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

// True if the product has a ROW fallback or covers every SEA country we
// operate in. Used by the dashboard CRUD table's "fully covered" badge.
export function shippingCoversAllSEA(productShippingByCountry: string | null | undefined): boolean {
  const map = parseShippingMap(productShippingByCountry)
  if (!map) return false
  if (typeof map[ROW_KEY] === 'number') return true
  return SHIPPING_COUNTRIES.every(c => typeof map[c.code] === 'number')
}
