---
title: Shipping policy
description: How creator-set shipping rates work — pricing, refunds, free-ship boost, and the publish guard.
---

## TL;DR

- Creators set their own shipping rates per country (10 SEA + ROW fallback). The platform stores them as a JSON map on `CreatorProfile.shippingByCountry` (or `Product.shippingByCountry` for per-listing overrides).
- Shipping is **pure pass-through to the creator** — no platform fee, no tax applied, no reserve.
- A buyer can only check out to a country the creator (or product override) has a rate for.
- **Combined shipping**: when a cart contains multiple items from the same creator, shipping = the **highest** per-item rate (not the sum). Creator-level toggle, default ON.
- **Free-shipping threshold**: optional. If set and the cart subtotal meets it, shipping line drops to USD 0. Adds a small additive trending boost (constant `freeShipBoost = 5` in `TRENDING_CONFIG`).
- PHYSICAL/POD listings **cannot be published** unless either the listing override OR the creator default has at least one rate. Enforced server-side at `POST /api/products` and `PATCH /api/products/[id]` (when toggling `isActive: true`).
- **Refund**: shipping is included if the order has not yet shipped (`escrowStatus = HELD`); retained by the creator once tracking is added. **Chargebacks bypass this** — the card network reverses the full payment including shipping, and we pause the matching transaction via `payoutBlocked`.

## Where things live

| Surface | Path |
|---------|------|
| Creator settings UI | `/dashboard/shipping` ([page](src/app/dashboard/shipping/page.tsx) + [API](src/app/api/dashboard/shipping/route.ts)) |
| Per-listing override | inside `EditListingForm` at [src/app/dashboard/listings/[id]/edit/EditListingForm.tsx](src/app/dashboard/listings/[id]/edit/EditListingForm.tsx) |
| Buyer panel on PDP | `<ShippingRatesPanel />` at [src/components/product/ShippingRatesPanel.tsx](src/components/product/ShippingRatesPanel.tsx) |
| Helpers (parse, resolve, combine) | [src/lib/shipping.ts](src/lib/shipping.ts) |
| Checkout integration | `POST /api/airwallex/payment-intent` ([route](src/app/api/airwallex/payment-intent/route.ts)) |
| Webhook pass-through to Transaction | `POST /api/airwallex/webhook` ([route](src/app/api/airwallex/webhook/route.ts)) |
| Trending boost | `freeShipBoost` in [src/lib/trendingConfig.ts](src/lib/trendingConfig.ts), applied in [src/lib/trendingCalculator.ts](src/lib/trendingCalculator.ts) |
| Refund carve-out | `computeMaxRefundableUsd()` in [src/lib/shipping.ts](src/lib/shipping.ts), applied in `refundEscrow()` at [src/lib/escrow-processor.ts](src/lib/escrow-processor.ts) |

## Country list (10 SEA + ROW)

Defined as `SHIPPING_COUNTRIES` in [src/lib/shipping.ts](src/lib/shipping.ts):

| Code | Country     | Default zone |
|------|-------------|--------------|
| MY   | Malaysia    | Domestic     |
| SG   | Singapore   | SEA-Tier 1   |
| PH   | Philippines | SEA-Tier 1   |
| ID   | Indonesia   | SEA-Tier 1   |
| TH   | Thailand    | SEA-Tier 1   |
| BN   | Brunei      | SEA-Tier 1   |
| VN   | Vietnam     | SEA-Tier 2   |
| KH   | Cambodia    | SEA-Tier 2   |
| MM   | Myanmar     | SEA-Tier 2   |
| LA   | Laos        | SEA-Tier 2   |
| ROW  | Rest of world | fallback   |

The dashboard exposes a 5-zone UI (Domestic-MY / SEA-Tier 1 / SEA-Tier 2 / ROW + per-country override mode) so creators don't have to fill in 11 inputs unless they want fine control.

## Combined-shipping math

When a buyer checks out a cart containing 3 items from the same creator with rates of USD 4, USD 6, and USD 9 to their destination:

- **Combined ON** (default): shipping = USD 9 (highest single-item rate)
- **Combined OFF**: shipping = USD 4 + 6 + 9 = USD 19

The toggle is creator-level (`CreatorProfile.combinedShippingEnabled`) — applies to all of that creator's items in the cart. Multi-creator carts compute per-creator independently.

The cart calculation lives in `combineCartShipping()` in [src/lib/shipping.ts](src/lib/shipping.ts). The result is what `POST /api/airwallex/payment-intent` snapshots onto `Order.shippingCostUsd` and rolls into `grandTotal` before FX conversion.

## Free-shipping threshold

Optional. Set in dollars on `CreatorProfile.shippingFreeThresholdUsd` (or per-listing on `Product.shippingFreeThresholdUsd`).

If the cart subtotal (post-discount, pre-tax) meets the threshold, the shipping line drops to USD 0 and `Order.shippingFreeApplied` is set true. The creator does **not** receive a shipping pass-through on those orders — they're absorbing the carrier cost as a promotion.

### Trending boost

Free-ship-eligible products get a small additive boost in the trending score:

```
freeShipBoost = 5    // see TRENDING_CONFIG
```

Applied in `processTrendingBatch()` in [src/lib/trendingCalculator.ts](src/lib/trendingCalculator.ts):

```ts
const freeShipBoost = (hasRates && freeThreshold != null) ? TRENDING_CONFIG.freeShipBoost : 0
finalScore = decayedScore + manualBoost + freeShipBoost
```

The boost is intentionally **outside** `TRENDING_CONFIG.weights` because:

1. It's a binary signal, not a 0–1 ratio of activity.
2. The weights-sum-to-1 invariant is runtime-checked in [src/lib/trendingConfig.ts](src/lib/trendingConfig.ts) and adding a binary flag would silently break it.

## Publish guard

The block-publish rule for PHYSICAL/POD listings:

- `POST /api/products` (create): rejects if creator has no `shippingByCountry` set. Error message points the creator at `/dashboard/shipping`.
- `PATCH /api/products/[id]` (update): rejects only when `body.isActive === true` AND neither the incoming product override nor the creator default has any rate. Lets unpublished drafts be edited freely.

The check uses `hasAnyShippingRate()` in [src/lib/shipping.ts](src/lib/shipping.ts), which accepts either a raw JSON string or an object with `creatorShippingByCountry` / `productShippingByCountry` keys.

The EditListingForm shows an amber inline warning when the creator has no defaults AND the override isn't enabled — saves a round-trip to the dashboard.

## Refund mechanics

Authoritative helper:

```ts
// src/lib/shipping.ts
export function computeMaxRefundableUsd(order: {
  amountUsd: number
  shippingCostUsd: number
  escrowStatus: string
}): number {
  const shipped = order.escrowStatus !== 'HELD'
  return shipped ? order.amountUsd - (order.shippingCostUsd ?? 0) : order.amountUsd
}
```

`refundEscrow()` calls this and **silently caps** the refund amount when a caller passes the full `order.amountUsd` for an already-shipped order. The buyer notification flags the carve-out:

> "USD 18.00 has been refunded for order #ABCD1234 (shipping of USD 4.50 was retained because the order had already shipped)."

Silent cap (vs. throwing) is deliberate — dispute resolution UIs don't have a concept of the shipping carve-out, and forcing every caller to pre-compute it would invite bugs.

### Chargeback bypass

Chargebacks reverse the full payment including shipping at the card-network level — we have no choice. Our records reflect this:

- `escrowStatus → DISPUTED` on chargeback received.
- `Transaction.payoutBlocked → true` on **every** transaction for that order, including the shipping pass-through portion in `Transaction.creatorAmount`. The payout cron excludes blocked transactions from per-creator balance, so the creator doesn't get paid the shipping either.
- If the chargeback is later won (`outcome = WON`), `payoutBlocked` is cleared and the funds become eligible again.

This is in `handleChargebackReceived` and `handleDisputeClosed` in [src/app/api/airwallex/webhook/route.ts](src/app/api/airwallex/webhook/route.ts).

## Buyer-side UX

`<ShippingRatesPanel />` on `/product/[id]` does the auto-detection:

1. Reads `x-vercel-ip-country` (Vercel) or `cf-ipcountry` (Cloudflare) headers.
2. Normalizes via `normalizeCountryToCode()` to a known SHIPPING_COUNTRIES code.
3. Looks up the rate (product override → creator default → ROW fallback).
4. Renders one of: detected-country card with rate, "Cannot ship to..." amber warning, no-rates amber warning, free-shipping emerald callout.
5. Has an expandable "See all rates" grid that highlights the detected country.

If the buyer's country isn't covered (no specific rate AND no ROW fallback), checkout is **blocked** at the payment-intent step with a descriptive 400 error.

## Creator-side UX

`/dashboard/shipping` exposes:

- Zone-grouped UI (5 inputs) with a per-country override mode (11 inputs).
- Live buyer-preview grid showing what each country sees.
- `SHIPPING_BENCHMARKS` typical-rate hints inline (e.g., "Typical: $1.50 – $3.00" for MY).
- Combined-shipping toggle.
- Free-shipping threshold input.
- Coverage badges ("Covers all SEA", "ROW fallback set", etc.).
- Sticky save bar.

## What we're explicitly NOT doing

- No platform fee on shipping. Ever.
- No tax applied to shipping. The 3-layer tax engine (origin / destination / B2B) only operates on subtotal.
- No real-time carrier rate API (USPS / Pos Laju / etc.). Creators set static rates; the live-rate complexity isn't justified at SEA scale.
- No address validation on the buyer side beyond the country dropdown. Buyers enter their own street address; the creator deals with bad addresses through the existing fulfillment-deadline mechanism.
- No shipping insurance product. Creators buying carrier insurance is their decision; we don't surface it.

## Migration & rollout

- Schema changes are in **migration 0011_shipping_costs** ([prisma/migrations/0011_shipping_costs/migration.sql](prisma/migrations/0011_shipping_costs/migration.sql)).
- Existing `Product.shippingMY/SG/PH/Intl` fields are **lead times in days**, not costs — they remain as POD lead-time data and are *separate* from `shippingByCountry`. The schema comments document the distinction.
- Creators who haven't set rates yet won't be able to publish new PHYSICAL/POD listings post-deploy. Existing active listings are unaffected; only new publishes / re-activations trigger the guard.

## When in doubt

- Code path: start with [src/lib/shipping.ts](src/lib/shipping.ts) — it's the single source of truth for parsing, resolving, and combining.
- UI behavior: read `<ShippingRatesPanel />` and the dashboard page; both are intentionally verbose so the buyer/creator never wonders what a rate or a coverage gap means.
- Edge cases: refund carve-out and chargeback bypass are documented above and in the function comments — don't reimplement.
