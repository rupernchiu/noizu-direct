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
