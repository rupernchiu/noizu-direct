import { prisma } from '@/lib/prisma'

// ─────────────────────────────────────────────────────────────────────────────
// Rail-aware fee calculator (5/5.5/8 model)
//
// Strategy ratified 2026-04-25 (memory: project_fee_tax_fraud_model.md):
//   • 5%   creator commission (deducted from creator payout)
//   • 5.5% buyer fee on local rails (FPX, FAST/PayNow, InstaPay, BI-FAST,
//          PromptPay, GCash, TnG, Boost, DuitNow QR)
//   • 8%   buyer fee on cards (Visa / Mastercard / AMEX — single tier, no
//          domestic/international split)
//
// This module is pure — DB read is isolated to `getFeeRatesFromSettings`.
// The math is rounding-stable: each fee component is independently rounded so
// the breakdown sums match what we charge / pay out down to the cent.
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentRail =
  // ── Local rails (5.5%) ──
  | 'FPX'        // Malaysia online banking
  | 'DUITNOW'    // Malaysia QR
  | 'TNG'        // Touch'n'Go (MY)
  | 'BOOST'      // Boost (MY)
  | 'GCASH'      // Philippines wallet
  | 'FAST'       // Singapore (alias: PayNow)
  | 'PAYNOW'     // Singapore alias
  | 'INSTAPAY'   // Philippines bank rail
  | 'BIFAST'     // Indonesia
  | 'PROMPTPAY'  // Thailand
  // ── Cards (8%) ──
  | 'CARD'       // Generic card (Visa/MC/AMEX, all geos)

export const LOCAL_RAILS: readonly PaymentRail[] = [
  'FPX', 'DUITNOW', 'TNG', 'BOOST', 'GCASH',
  'FAST', 'PAYNOW', 'INSTAPAY', 'BIFAST', 'PROMPTPAY',
] as const

export const CARD_RAILS: readonly PaymentRail[] = ['CARD'] as const

export function isLocalRail(rail: PaymentRail): boolean {
  return (LOCAL_RAILS as readonly string[]).includes(rail)
}

export function isCardRail(rail: PaymentRail): boolean {
  return (CARD_RAILS as readonly string[]).includes(rail)
}

/**
 * Map an Airwallex `payment_method.type` string to our internal rail.
 * Airwallex uses lowercase strings like `card`, `fpx`, `paynow`. Returns null
 * for unknown methods so callers can keep the unmapped string for audit.
 */
export function railFromAirwallexMethod(method: string | null | undefined): PaymentRail | null {
  if (!method) return null
  const m = method.toLowerCase()
  switch (m) {
    case 'card':       return 'CARD'
    case 'fpx':        return 'FPX'
    case 'duitnow':    return 'DUITNOW'
    case 'tng':
    case 'touchngo':   return 'TNG'
    case 'boost':      return 'BOOST'
    case 'gcash':      return 'GCASH'
    case 'fast':
    case 'paynow':     return 'PAYNOW'
    case 'instapay':   return 'INSTAPAY'
    case 'bi_fast':
    case 'bifast':     return 'BIFAST'
    case 'promptpay':  return 'PROMPTPAY'
    default:           return null
  }
}

export interface FeeRates {
  /** % of subtotal taken from creator at payout time. */
  creatorCommissionPercent: number
  /** Buyer surcharge for local-rail payments (FPX, PayNow, etc.). */
  buyerFeeLocalPercent: number
  /** Buyer surcharge for card payments. */
  buyerFeeCardPercent: number
}

export const DEFAULT_FEE_RATES: FeeRates = {
  creatorCommissionPercent: 5.0,
  buyerFeeLocalPercent: 5.5,
  buyerFeeCardPercent: 8.0,
}

export interface FeeBreakdown {
  /** Pre-fee subtotal in USD cents — what the creator listed the item at. */
  subtotalUsdCents: number
  /** Buyer-side surcharge in USD cents (paid by buyer, kept by platform). */
  buyerFeeUsdCents: number
  /** Total amount the buyer pays (subtotal + buyerFee), USD cents. */
  grossUsdCents: number
  /** Platform's commission deducted from creator at payout, USD cents. */
  creatorCommissionUsdCents: number
  /** What the creator nets (subtotal − commission), USD cents. */
  creatorPayoutUsdCents: number
  /** Total platform gross take (buyerFee + creatorCommission), USD cents. */
  platformGrossUsdCents: number
  paymentRail: PaymentRail
  buyerFeePercent: number
  creatorCommissionPercent: number
}

/**
 * Compute the full fee breakdown for a single subtotal + rail.
 *
 * Buyer pays: subtotal + buyerFee
 * Creator nets: subtotal − creatorCommission
 * Platform keeps: buyerFee + creatorCommission (before Airwallex processing)
 *
 * All inputs/outputs are in USD cents (integer minor units). Each fee component
 * is rounded independently with banker-safe `Math.round`.
 */
export function calculateFees(
  subtotalUsdCents: number,
  rail: PaymentRail,
  rates: FeeRates = DEFAULT_FEE_RATES,
): FeeBreakdown {
  if (!Number.isInteger(subtotalUsdCents) || subtotalUsdCents < 0) {
    throw new Error(`calculateFees: subtotalUsdCents must be a non-negative integer (got ${subtotalUsdCents})`)
  }

  const buyerFeePercent = isLocalRail(rail)
    ? rates.buyerFeeLocalPercent
    : rates.buyerFeeCardPercent

  const buyerFeeUsdCents = Math.round(subtotalUsdCents * (buyerFeePercent / 100))
  const grossUsdCents = subtotalUsdCents + buyerFeeUsdCents

  const creatorCommissionUsdCents = Math.round(
    subtotalUsdCents * (rates.creatorCommissionPercent / 100),
  )
  const creatorPayoutUsdCents = subtotalUsdCents - creatorCommissionUsdCents

  return {
    subtotalUsdCents,
    buyerFeeUsdCents,
    grossUsdCents,
    creatorCommissionUsdCents,
    creatorPayoutUsdCents,
    platformGrossUsdCents: buyerFeeUsdCents + creatorCommissionUsdCents,
    paymentRail: rail,
    buyerFeePercent,
    creatorCommissionPercent: rates.creatorCommissionPercent,
  }
}

/**
 * Reverse of `calculateFees`: given a gross amount the buyer paid (e.g. from a
 * webhook intent.amount), recover the subtotal + buyerFee split. Used by the
 * webhook when the rail-aware split wasn't snapshotted on the order.
 */
export function feesFromGross(
  grossUsdCents: number,
  rail: PaymentRail,
  rates: FeeRates = DEFAULT_FEE_RATES,
): FeeBreakdown {
  const buyerFeePercent = isLocalRail(rail)
    ? rates.buyerFeeLocalPercent
    : rates.buyerFeeCardPercent
  // gross = subtotal × (1 + buyerFeePct/100)  →  subtotal = gross / (1 + buyerFeePct/100)
  const subtotalUsdCents = Math.round(grossUsdCents / (1 + buyerFeePercent / 100))
  return calculateFees(subtotalUsdCents, rail, rates)
}

/**
 * Read configured fee rates from PlatformSettings, falling back to the
 * 5/5.5/8 defaults when the columns aren't populated yet (pre-migration).
 *
 * Rates are stored as percent values (5.5 means 5.5%, NOT 0.055). Reading
 * uses `select` for forwards-compat — if the columns don't exist yet (migration
 * 0008 not applied), Prisma will throw and we fall back to defaults.
 */
export async function getFeeRatesFromSettings(): Promise<FeeRates> {
  try {
    const settings = await prisma.platformSettings.findFirst({
      select: {
        creatorCommissionPercent: true,
        buyerFeeLocalPercent: true,
        buyerFeeCardPercent: true,
      } as never,
    }) as {
      creatorCommissionPercent: number | null
      buyerFeeLocalPercent: number | null
      buyerFeeCardPercent: number | null
    } | null

    return {
      creatorCommissionPercent: settings?.creatorCommissionPercent ?? DEFAULT_FEE_RATES.creatorCommissionPercent,
      buyerFeeLocalPercent: settings?.buyerFeeLocalPercent ?? DEFAULT_FEE_RATES.buyerFeeLocalPercent,
      buyerFeeCardPercent: settings?.buyerFeeCardPercent ?? DEFAULT_FEE_RATES.buyerFeeCardPercent,
    }
  } catch {
    // Migration 0008 not applied yet — use defaults.
    return DEFAULT_FEE_RATES
  }
}
