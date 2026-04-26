---
title: Tax architecture
description: 3-layer model — origin (creator), destination (buyer), platform (us).
---

## Three layers, three different problems

### Layer 1 — Origin tax (creator country)
The creator may owe income tax / business tax in their country of residence on what they earn. **We don't withhold this** for most jurisdictions — we report (1099-equivalent forms / annual statements) and the creator is responsible for filing.

- Implementation: per-creator tax-info on `CreatorProfile` (tax ID, filing status).
- Annual statement export from `/admin/finance/exports` (creator-earnings CSV).

### Layer 2 — Destination tax (buyer country)
SST, GST, VAT, PPN — consumption tax owed in the buyer's jurisdiction. As the marketplace operator we're often required to **collect and remit** once we cross a country's registration threshold.

Implementation: [`src/lib/destination-tax.ts`](https://github.com/your-org/noizu-direct/blob/master/src/lib/destination-tax.ts).

| Country | Label | Rate |
|---------|-------|------|
| MY      | SST   | 8%   |
| SG      | GST   | 9%   |
| ID      | PPN   | 11%  |
| TH      | VAT   | 7%   |
| PH      | VAT   | 12%  |

Rates are **enabled per-country** via `PlatformSettings.taxDestinationCountries` JSON. Until a country is enabled (because we're registered), the destination-tax line is suppressed at checkout — we don't collect tax we can't remit.

Thresholds tracked off-platform (CFO + tax counsel). Admin flips the enabled flag once registration is in place.

### Layer 3 — Platform tax (us)
We owe corporate income tax on platform revenue (commissions + buyer fees − costs) in our jurisdiction (MY, currently). Standard accounting handled outside the app, but the app must produce clean P&L exports.

Implementation: `/admin/finance/exports/monthly-pl` produces monthly platform-revenue summary.

## How tax appears at checkout

```
Item subtotal              USD 20.00
Buyer fee (5.5%)           USD  1.10
─────────────────────────────────────
Pre-tax subtotal           USD 21.10
Destination tax (SST 8%)   USD  1.69    ← only if MY-enabled
─────────────────────────────────────
Buyer pays                 USD 22.79
```

The buyer fee is part of the taxable subtotal because we are providing the marketplace service (which is taxable in most jurisdictions).

## How tax appears on the receipt

Every order's invoice itemizes:
- Item line (creator's product)
- Buyer fee line (platform service)
- Destination-tax line (with label per buyer country)

Receipts are stored as `Invoice` rows + rendered HTML/PDF on demand from `/account/orders/[id]`.

## How we collect & hold remit funds

- Destination tax collected at payment time stays on platform balance.
- A `PlatformReserve` ("tax accrual") tracks the running liability per country.
- Quarterly remit cycle: admin exports `/admin/finance/exports/tax/[country]` (CSV by jurisdiction) and remits via local tax authority's portal.
- Remit movements recorded as `PlatformReserveEntry`.

## Edge cases

- **Buyer country unknown / VPN** → fall back to billing-address country, then card-issuer country.
- **Cross-border digital downloads** → most SEA jurisdictions treat these as taxable under destination rules; same engine applies.
- **Mixed cart (multi-country shipping)** → enforce single shipping country per order.
- **Refunds** → tax line reverses with the refund; reserve adjusts down.

## Things we deliberately don't do

- **No withholding of buyer-side card-network taxes** — that's between the issuer and buyer.
- **No automatic creator-side income-tax withholding** — out of scope for marketplace operator role; varies wildly by jurisdiction.
- **No "VAT-inclusive" pricing display option** — keeps the pre-tax/with-tax distinction crisp for buyers comparing cross-border.

## Where the data lives

| Concept                  | Model / file                          |
|--------------------------|----------------------------------------|
| Per-country rate table   | `src/lib/destination-tax.ts`           |
| Country enable map       | `PlatformSettings.taxDestinationCountries` (JSON) |
| Tax line on order        | Order/invoice JSON snapshot           |
| Tax reserve              | `PlatformReserve` (tax-accrual type)  |
| Reserve movements        | `PlatformReserveEntry`                |
