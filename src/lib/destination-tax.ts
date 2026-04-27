import { prisma } from '@/lib/prisma'
import { COUNTRIES, countryFor } from '@/lib/countries'

// Phase 2.2 — destination (consumption) tax engine.
//
// Rates per SEA jurisdiction live in src/lib/countries.ts (single source of
// truth). The PlatformSettings.taxDestinationCountries JSON string controls
// which of these are *enabled* (i.e. we've actually crossed the registration
// threshold). Until a country is enabled the rate is effectively 0 — the line
// is suppressed at checkout and on the invoice.
//
// Thresholds are tracked off-platform (CFO + tax counsel) and the admin flips
// the enabled flag once we're registered. Any country without a destinationTax
// block in COUNTRIES is treated as 0% and no destination-tax line is rendered.

export interface DestinationTaxRate {
  country: string
  label: string
  ratePercent: number
}

// Derived view of the destination-tax rates for callers that previously
// imported the constant directly. Built from COUNTRIES at module load.
export const DESTINATION_TAX_RATES: Record<string, DestinationTaxRate> =
  Object.values(COUNTRIES).reduce<Record<string, DestinationTaxRate>>((acc, c) => {
    if (c.destinationTax) {
      acc[c.iso2] = {
        country: c.iso2,
        label: c.destinationTax.label,
        // Convert decimal rate (0.08) to percent (8) and strip FP noise.
        ratePercent: Math.round(c.destinationTax.rate * 100 * 1000) / 1000,
      }
    }
    return acc
  }, {})

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
  const country = countryFor(cc)
  const tax = country?.destinationTax
  if (!tax || tax.rate <= 0) return null

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

  const ratePercent = Math.round(tax.rate * 100 * 1000) / 1000
  return {
    countryCode: cc,
    ratePercent,
    amountUsdCents: Math.round(preTaxSubtotalUsdCents * tax.rate),
    label: tax.label,
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
  const country = countryFor(cc)
  const tax = country?.destinationTax
  if (!tax || tax.rate <= 0) return null
  if (!enabledMap[cc]) return null
  const ratePercent = Math.round(tax.rate * 100 * 1000) / 1000
  return {
    countryCode: cc,
    ratePercent,
    amountUsdCents: Math.round(preTaxSubtotalUsdCents * tax.rate),
    label: tax.label,
  }
}

export async function loadEnabledTaxCountries(): Promise<EnabledMap> {
  try {
    const settings = await prisma.platformSettings.findFirst({
      select: { taxDestinationCountries: true },
    })
    const raw = settings?.taxDestinationCountries ?? '{}'
    const parsed = JSON.parse(raw) as EnabledMap
    // Filter to keys that have a destinationTax block — protects callers from
    // stale settings entries for countries that are no longer eligible.
    const filtered: EnabledMap = {}
    for (const [k, v] of Object.entries(parsed)) {
      const country = countryFor(k)
      if (country?.destinationTax && v === true) {
        filtered[k.toUpperCase()] = true
      }
    }
    return filtered
  } catch {
    return {}
  }
}
