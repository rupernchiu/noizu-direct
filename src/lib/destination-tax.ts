import { prisma } from '@/lib/prisma'

// Phase 2.2 — destination (consumption) tax engine.
//
// Hard-coded rates per SEA jurisdiction. The PlatformSettings.taxDestinationCountries
// JSON string controls which of these are *enabled* (i.e. we've actually
// crossed the registration threshold). Until a country is enabled the rate is
// effectively 0 — the line is suppressed at checkout and on the invoice.
//
// Thresholds are tracked off-platform (CFO + tax counsel) and the admin flips
// the enabled flag once we're registered. Any country not in this map is
// treated as 0% and no destination-tax line is rendered.

export interface DestinationTaxRate {
  country: string
  label: string
  ratePercent: number
}

export const DESTINATION_TAX_RATES: Record<string, DestinationTaxRate> = {
  MY: { country: 'MY', label: 'SST',  ratePercent: 8 },   // Malaysia
  SG: { country: 'SG', label: 'GST',  ratePercent: 9 },   // Singapore
  ID: { country: 'ID', label: 'PPN',  ratePercent: 11 },  // Indonesia
  TH: { country: 'TH', label: 'VAT',  ratePercent: 7 },   // Thailand
  PH: { country: 'PH', label: 'VAT',  ratePercent: 12 },  // Philippines
}

export interface DestinationTaxLine {
  countryCode: string
  ratePercent: number
  amountUsdCents: number
  label: string
}

interface EnabledMap {
  [countryCode: string]: boolean
}

/**
 * Resolve the destination-tax line for a given buyer country and pre-tax
 * subtotal in USD cents. Returns null when:
 *   - country is missing/unknown
 *   - country has a known rate but is NOT yet enabled in PlatformSettings
 *   - amount is zero
 */
export async function resolveDestinationTax(
  buyerCountry: string | null | undefined,
  preTaxSubtotalUsdCents: number,
): Promise<DestinationTaxLine | null> {
  if (!buyerCountry || preTaxSubtotalUsdCents <= 0) return null
  const cc = buyerCountry.toUpperCase()
  const rate = DESTINATION_TAX_RATES[cc]
  if (!rate || rate.ratePercent <= 0) return null

  let enabled: EnabledMap = {}
  try {
    const settings = await prisma.platformSettings.findFirst({
      select: { taxDestinationCountries: true },
    })
    const raw = settings?.taxDestinationCountries ?? '{}'
    enabled = JSON.parse(raw) as EnabledMap
  } catch {
    // Pre-migration / parse failure: treat as no countries enabled.
    enabled = {}
  }

  if (!enabled[cc]) return null

  return {
    countryCode: cc,
    ratePercent: rate.ratePercent,
    amountUsdCents: Math.round(preTaxSubtotalUsdCents * (rate.ratePercent / 100)),
    label: rate.label,
  }
}

/**
 * Sync version for callers that already loaded PlatformSettings (e.g. the
 * checkout intent route reads several settings in one place).
 */
export function destinationTaxFromMap(
  buyerCountry: string | null | undefined,
  preTaxSubtotalUsdCents: number,
  enabledMap: EnabledMap,
): DestinationTaxLine | null {
  if (!buyerCountry || preTaxSubtotalUsdCents <= 0) return null
  const cc = buyerCountry.toUpperCase()
  const rate = DESTINATION_TAX_RATES[cc]
  if (!rate || rate.ratePercent <= 0) return null
  if (!enabledMap[cc]) return null
  return {
    countryCode: cc,
    ratePercent: rate.ratePercent,
    amountUsdCents: Math.round(preTaxSubtotalUsdCents * (rate.ratePercent / 100)),
    label: rate.label,
  }
}

export async function loadEnabledTaxCountries(): Promise<EnabledMap> {
  try {
    const settings = await prisma.platformSettings.findFirst({
      select: { taxDestinationCountries: true },
    })
    const raw = settings?.taxDestinationCountries ?? '{}'
    return JSON.parse(raw) as EnabledMap
  } catch {
    return {}
  }
}
