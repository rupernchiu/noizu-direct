import { getAirwallexFxRate, getCurrencyFactor } from '@/lib/airwallex';

export const SUPPORTED_CURRENCIES = ['USD', 'MYR', 'SGD', 'PHP', 'IDR', 'THB'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export async function getFxRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch(
      'https://api.frankfurter.app/latest?from=USD&to=MYR,SGD,PHP,IDR,THB',
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    return { USD: 1, ...data.rates };
  } catch {
    return { USD: 1, MYR: 4.7, SGD: 1.35, PHP: 58, IDR: 16000, THB: 36 };
  }
}

export function convertFromUSD(amountCents: number, rate: number): number {
  return Math.round((amountCents / 100) * rate * 100);
}

export function formatWithCurrency(amountCents: number, currency: string, rate: number): string {
  const converted = (amountCents / 100) * rate;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(converted);
}

// ─── Airwallex checkout helpers ───────────────────────────────────────────────
// Buyer-facing FX. Pulls Airwallex's own quote first (closer to what their
// merchant settlement actually uses); falls back to Frankfurter (ECB) if the
// Airwallex call fails. Cached per-currency for 30 min — short enough to track
// FX moves, long enough that we don't hammer Airwallex on every checkout view.

const FX_SUPPORTED_AIRWALLEX = ['USD', 'MYR', 'SGD', 'PHP', 'THB', 'IDR'] as const;

const AIRWALLEX_RATE_TTL_MS = 30 * 60 * 1000; // 30 minutes
type RateCacheEntry = { rate: number; fetchedAt: number; source: 'airwallex' | 'frankfurter' };
const _usdRateCache = new Map<string, RateCacheEntry>();

async function fetchFrankfurterUsdRate(code: string): Promise<number> {
  const res = await fetch(
    `https://api.frankfurter.app/latest?from=USD&to=${code}`,
    { next: { revalidate: 1800 } },
  );
  if (!res.ok) throw new Error(`Frankfurter ${code} failed: ${res.status}`);
  const data = (await res.json()) as { rates: Record<string, number> };
  const rate = data.rates[code];
  if (rate == null) throw new Error(`Frankfurter returned no rate for ${code}`);
  return rate;
}

async function getUsdRateFor(code: string): Promise<number> {
  if (code === 'USD') return 1;
  const cached = _usdRateCache.get(code);
  if (cached && Date.now() - cached.fetchedAt < AIRWALLEX_RATE_TTL_MS) {
    return cached.rate;
  }
  let rate: number;
  let source: RateCacheEntry['source'];
  try {
    rate = await getAirwallexFxRate('USD', code);
    source = 'airwallex';
  } catch (e) {
    console.warn(`[fx] Airwallex FX USD->${code} failed, falling back to Frankfurter:`, e);
    try {
      rate = await fetchFrankfurterUsdRate(code);
      source = 'frankfurter';
    } catch (e2) {
      // Both upstreams down — serve stale cache rather than 503 the buyer.
      if (cached) {
        console.error(`[fx] Both Airwallex and Frankfurter failed for ${code}, serving stale cache`);
        return cached.rate;
      }
      throw e2;
    }
  }
  _usdRateCache.set(code, { rate, fetchedAt: Date.now(), source });
  return rate;
}

export function isAirwallexSupportedCurrency(code: string): boolean {
  return (FX_SUPPORTED_AIRWALLEX as readonly string[]).includes(code);
}

/**
 * Convert a USD-cents amount to the target currency's minor units using the
 * cached live rate. USD is a no-op. Used by both the FX-rate route and
 * internal callers (e.g. the payment-intent creator).
 *
 * @throws if `to` is unsupported or both upstream FX providers fail with no
 *         cached rate to fall back to.
 */
export async function convertUsdCentsTo(
  amountUsdCents: number,
  to: string,
): Promise<{ rate: number; displayAmount: number; currency: string }> {
  const code = to.toUpperCase();
  if (!isAirwallexSupportedCurrency(code)) {
    throw new Error(`Currency ${code} not supported`);
  }
  if (code === 'USD') {
    return { rate: 1, displayAmount: amountUsdCents, currency: 'USD' };
  }
  const rate = await getUsdRateFor(code);
  const factor = getCurrencyFactor(code);
  // (amountUsd cents / 100 USD) × rate (major units/USD) × factor (minor/major)
  const displayAmount = Math.round((amountUsdCents / 100) * rate * factor);
  return { rate, displayAmount, currency: code };
}
