/**
 * Platform fee tax (Layer 3 — buyer/creator-side split) +
 * Creator's own sales tax (Layer 1.5 — agency-collect pass-through).
 *
 * Two separate concepts kept in one file because they are both consumed by
 * the same call sites (web checkout intent + commission-quote accept) and
 * both gate on activation conditions that may be flipped on independently.
 *
 * ── Platform fee tax ─────────────────────────────────────────────────────
 * This is the platform's OWN service-fee tax. It applies to noizu.direct's
 * fees ONLY:
 *   • the buyer-side service fee (`buyerFeeUsd`)
 *   • the creator-side commission deducted at payout (`creatorCommissionUsd`)
 *
 * It does NOT apply to:
 *   • listing price (creator's money — see `computeCreatorSalesTax` below)
 *   • shipping (pure pass-through, no platform take)
 *   • PPh withholding (tax authority's money we hold)
 *
 * Threshold-gated per country via `PlatformSettings.platformFeeTax` (JSON).
 * At launch every country is empty/disabled — admin flips the JSON when
 * platform crosses local registration threshold for service-fee taxation.
 *
 * Per-side activation: the rule's `sides` array includes `'BUYER'` and/or
 * `'CREATOR'`. A country might tax only the buyer-side fee (consumption tax
 * on imported services) or only the creator-side commission (income/service
 * tax on platform's commission revenue), or both.
 *
 * ── Creator's own sales tax ──────────────────────────────────────────────
 * Applies when an APPROVED REGISTERED_BUSINESS creator has opted-in to
 * platform-collected sales tax (Phase 7 approval queue). Tax base is
 * `subtotal + shipping` per spec §11 — most jurisdictions tax shipping with
 * the goods. Platform collects on behalf of the creator and passes it through
 * gross at payout time; creator remits to their own tax authority.
 */

import { prisma } from './prisma'

// ── Platform fee tax ────────────────────────────────────────────────────────

export type FeeTaxSide = 'BUYER' | 'CREATOR'

export interface PlatformFeeTaxRule {
  enabled: boolean
  rate: number         // decimal, e.g. 0.06
  label: string        // 'SST' | 'GST' | 'VAT' | 'PPN'
  sides: FeeTaxSide[]  // which side(s) the tax applies to
}

export interface PlatformFeeTaxResult {
  rate: number
  amountUsd: number    // USD cents
  label: string | null
}

/**
 * Loads the per-country platform-fee-tax rules from PlatformSettings.
 * Returns the parsed JSON map (defaults to {} if not configured or invalid).
 * Filters out malformed entries to harden against admin typos.
 */
export async function loadPlatformFeeTaxRules(): Promise<Record<string, PlatformFeeTaxRule>> {
  const settings = await prisma.platformSettings.findFirst({
    select: { platformFeeTax: true },
  })
  if (!settings?.platformFeeTax) return {}
  try {
    const parsed = JSON.parse(settings.platformFeeTax) as unknown
    if (typeof parsed !== 'object' || parsed === null) return {}
    const out: Record<string, PlatformFeeTaxRule> = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue
      const r = value as Partial<PlatformFeeTaxRule>
      if (
        typeof r.enabled === 'boolean' &&
        typeof r.rate === 'number' &&
        typeof r.label === 'string' &&
        Array.isArray(r.sides) &&
        r.sides.every((s) => s === 'BUYER' || s === 'CREATOR')
      ) {
        out[key.toUpperCase()] = {
          enabled: r.enabled,
          rate: r.rate,
          label: r.label,
          sides: r.sides as FeeTaxSide[],
        }
      }
    }
    return out
  } catch {
    return {}
  }
}

/**
 * Compute platform fee tax for a given side + country + fee amount.
 * Returns 0 if platform isn't registered in that country, or if the rule
 * doesn't include the requested side.
 */
export function computePlatformFeeTax(
  rules: Record<string, PlatformFeeTaxRule>,
  side: FeeTaxSide,
  country: string | null | undefined,
  feeAmountUsdCents: number,
): PlatformFeeTaxResult {
  if (!country || feeAmountUsdCents <= 0) {
    return { rate: 0, amountUsd: 0, label: null }
  }
  const rule = rules[country.toUpperCase()]
  if (!rule?.enabled || !rule.sides.includes(side)) {
    return { rate: 0, amountUsd: 0, label: null }
  }
  return {
    rate: rule.rate,
    amountUsd: Math.round(feeAmountUsdCents * rule.rate),
    label: rule.label,
  }
}

// ── Creator's own sales tax ─────────────────────────────────────────────────

export interface CreatorSalesTaxResult {
  rate: number              // decimal, e.g. 0.06
  amountUsd: number         // USD cents
  label: string | null      // e.g. 'SST', 'GST', 'VAT'
}

export interface CreatorSalesTaxProfile {
  creatorClassification: string | null
  taxId: string | null
  collectsSalesTax: boolean
  salesTaxStatus: string
  salesTaxRate: number | null
  salesTaxLabel: string | null
}

/**
 * Compute the creator's own sales-tax markup, agency-collected by the platform.
 *
 * Activation requires ALL of:
 *   • creatorClassification === 'REGISTERED_BUSINESS'
 *   • taxId populated
 *   • collectsSalesTax === true (creator opted in)
 *   • salesTaxStatus === 'APPROVED' (admin approved the application)
 *   • salesTaxRate is a non-null number
 *
 * If any condition fails, returns 0 and the line is suppressed.
 *
 * Tax base is subtotal + shipping (per spec §11.4) — most jurisdictions tax
 * shipping with the goods.
 */
export function computeCreatorSalesTax(
  profile: CreatorSalesTaxProfile,
  subtotalUsdCents: number,
  shippingUsdCents: number,
): CreatorSalesTaxResult {
  if (
    profile.creatorClassification !== 'REGISTERED_BUSINESS' ||
    !profile.taxId ||
    !profile.collectsSalesTax ||
    profile.salesTaxStatus !== 'APPROVED' ||
    typeof profile.salesTaxRate !== 'number' ||
    profile.salesTaxRate <= 0
  ) {
    return { rate: 0, amountUsd: 0, label: null }
  }
  const taxableBase = Math.max(0, subtotalUsdCents) + Math.max(0, shippingUsdCents)
  if (taxableBase <= 0) {
    return { rate: profile.salesTaxRate, amountUsd: 0, label: profile.salesTaxLabel ?? null }
  }
  return {
    rate: profile.salesTaxRate,
    amountUsd: Math.round(taxableBase * profile.salesTaxRate),
    label: profile.salesTaxLabel ?? null,
  }
}
