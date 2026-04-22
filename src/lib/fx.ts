import { getCurrencyFactor } from '@/lib/airwallex';

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
// Previously the `POST /api/airwallex/payment-intent` route made an HTTP call
// back to its own `GET /api/airwallex/fx-rate` route to convert USD to the
// buyer's display currency. That self-call bypassed our own auth middleware and
// added a needless round-trip (F8 / M5). `convertUsdCentsTo` replaces it with
// an in-process call against the same cache.

const FX_SUPPORTED_AIRWALLEX = ['USD', 'MYR', 'SGD', 'PHP', 'THB', 'IDR'] as const;

let _airwallexRateCache: { rates: Record<string, number>; fetchedAt: number } | null = null;
const AIRWALLEX_RATE_TTL_MS = 60 * 60 * 1000;

async function getAirwallexUsdRates(): Promise<Record<string, number>> {
  if (_airwallexRateCache && Date.now() - _airwallexRateCache.fetchedAt < AIRWALLEX_RATE_TTL_MS) {
    return _airwallexRateCache.rates;
  }
  const targets = FX_SUPPORTED_AIRWALLEX.filter((c) => c !== 'USD').join(',');
  const res = await fetch(
    `https://api.frankfurter.app/latest?from=USD&to=${targets}`,
    { next: { revalidate: 3600 } },
  );
  if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`);
  const data = (await res.json()) as { rates: Record<string, number> };
  _airwallexRateCache = { rates: { USD: 1, ...data.rates }, fetchedAt: Date.now() };
  return _airwallexRateCache.rates;
}

export function isAirwallexSupportedCurrency(code: string): boolean {
  return (FX_SUPPORTED_AIRWALLEX as readonly string[]).includes(code);
}

/**
 * Convert a USD-cents amount to the target currency's minor units using the
 * cached live rate. USD is a no-op. Used by both the FX-rate route and
 * internal callers (e.g. the payment-intent creator).
 *
 * @throws if `to` is unsupported or the upstream FX provider fails.
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
  const rates = await getAirwallexUsdRates();
  const rate = rates[code] ?? 1;
  const factor = getCurrencyFactor(code);
  // (amountUsd cents / 100 USD) × rate (major units/USD) × factor (minor/major)
  const displayAmount = Math.round((amountUsdCents / 100) * rate * factor);
  return { rate, displayAmount, currency: code };
}
