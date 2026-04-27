---
title: Shipping policy
description: How per-product shipping rates work — pricing, refunds, free-ship boost, and the publish guard.
---

## TL;DR

- Every PHYSICAL/POD listing carries its own per-country shipping map (10 SEA + ROW fallback) on `Product.shippingByCountry`. There is **no creator-default fallback** — Shipping V2 (2026-04-27) made the per-product map the sole source of truth.
- Shipping is **pure pass-through to the creator** — no platform fee, no tax applied, no reserve.
- A buyer can only check out to a country the listing has a rate for.
- **Combined shipping**: when a cart contains multiple items from the same creator, shipping = the **highest** per-item rate (not the sum). Creator-level toggle on `CreatorProfile.combinedShippingEnabled`, default ON.
- **Free-shipping threshold**: optional, creator-level on `CreatorProfile.shippingFreeThresholdUsd`. If set and the cart subtotal meets it, the shipping line drops to USD 0. Adds a small additive trending boost (constant `freeShipBoost = 5` in `TRENDING_CONFIG`).
- PHYSICAL/POD listings **cannot be published** unless the listing's own `shippingByCountry` has at least one rate. Enforced server-side at `POST /api/products` and `PATCH /api/products/[id]` (when toggling `isActive: true`).
- **Refund**: shipping is included if the order has not yet shipped (`escrowStatus = HELD`); retained by the creator once tracking is added. **Chargebacks bypass this** — the card network reverses the full payment including shipping, and we pause the matching transaction via `payoutBlocked`.

## Why per-product, not per-creator?

Shipping V1 had two layers — a creator-default map plus per-listing overrides — on the assumption that most listings would inherit. In practice creators sell objects of wildly different size/weight (a sticker vs a 1/4 scale figure) and the inherited default was always wrong for half the catalog. Shipping V2 collapses to one layer per listing, with **Commission** as the escape hatch for genuinely unusual orders (bulk, oversized, fragile) where rates need to be quoted per-buyer.

## Where things live

| Surface | Path |
|---------|------|
| Cart-level prefs UI (free-ship + combined toggle) + per-listing CRUD | `/dashboard/shipping` ([page](src/app/dashboard/shipping/page.tsx) + [API](src/app/api/dashboard/shipping/route.ts)) |
| Listings list endpoint (drives the CRUD table) | `GET /api/dashboard/listings?shippingOnly=1` ([route](src/app/api/dashboard/listings/route.ts)) |
| Reusable rate-input component | [src/components/dashboard/ShippingRateInputs.tsx](src/components/dashboard/ShippingRateInputs.tsx) — used by new-listing form, edit-listing form, and the dashboard CRUD table |
| New-listing form | [src/app/dashboard/listings/new/page.tsx](src/app/dashboard/listings/new/page.tsx) |
| Edit-listing form | [src/app/dashboard/listings/[id]/edit/EditListingForm.tsx](src/app/dashboard/listings/[id]/edit/EditListingForm.tsx) |
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

`<ShippingRateInputs />` collapses these into a 4-zone UI (Domestic-MY / SEA-Tier 1 / SEA-Tier 2 / ROW) — one input per zone fans out to all countries in that zone. Empty ROW means "block buyers outside SEA on this listing."

## Combined-shipping math

When a buyer checks out a cart containing 3 items from the same creator with rates of USD 4, USD 6, and USD 9 to their destination:

- **Combined ON** (default): shipping = USD 9 (highest single-item rate)
- **Combined OFF**: shipping = USD 4 + 6 + 9 = USD 19

The toggle is creator-level (`CreatorProfile.combinedShippingEnabled`) — applies to all of that creator's items in the cart. Multi-creator carts compute per-creator independently.

The cart calculation lives in `combineCartShipping()` in [src/lib/shipping.ts](src/lib/shipping.ts). The result is what `POST /api/airwallex/payment-intent` snapshots onto `Order.shippingCostUsd` and rolls into `grandTotal` before FX conversion.

## Free-shipping threshold

Optional. Set in dollars on `CreatorProfile.shippingFreeThresholdUsd`. This stays creator-level because it operates on the cart subtotal, not on individual items.

If the cart subtotal (post-discount, pre-tax) meets the threshold, the shipping line drops to USD 0 and `Order.shippingFreeApplied` is set true. The creator does **not** receive a shipping pass-through on those orders — they're absorbing the carrier cost as a promotion.

### Trending boost

Free-ship-eligible products get a small additive boost in the trending score:

```
freeShipBoost = 5    // see TRENDING_CONFIG
```

Applied in `processTrendingBatch()` in [src/lib/trendingCalculator.ts](src/lib/trendingCalculator.ts):

```ts
const hasRates = parseShippingMap(product.shippingByCountry) != null
const freeThreshold = creator.shippingFreeThresholdUsd
const freeShipBoost = (hasRates && freeThreshold != null) ? TRENDING_CONFIG.freeShipBoost : 0
finalScore = decayedScore + manualBoost + freeShipBoost
```

The boost is intentionally **outside** `TRENDING_CONFIG.weights` because:

1. It's a binary signal, not a 0–1 ratio of activity.
2. The weights-sum-to-1 invariant is runtime-checked in [src/lib/trendingConfig.ts](src/lib/trendingConfig.ts) and adding a binary flag would silently break it.

## Publish guard

The block-publish rule for PHYSICAL/POD listings is now strictly per-listing:

- `POST /api/products` (create): rejects when the incoming `shippingByCountry` payload is empty/missing for a PHYSICAL or POD listing. Error message points the creator at `/dashboard/shipping` or the listing form's shipping section.
- `PATCH /api/products/[id]` (update): rejects only when `body.isActive === true` AND the resulting product has no `shippingByCountry`. Lets unpublished drafts be edited freely.

The check uses `hasAnyShippingRate(product.shippingByCountry)` in [src/lib/shipping.ts](src/lib/shipping.ts) — single argument, single source of truth.

The new- and edit-listing forms render `<ShippingRateInputs />` inline so the rates can be set in the same form pass; no round-trip to `/dashboard/shipping` is needed unless the creator wants the master CRUD view.

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
3. Looks up the rate (per-country → ROW fallback).
4. Renders one of: detected-country card with rate, "Cannot ship to..." amber warning, no-rates amber warning, free-shipping emerald callout.
5. Has an expandable "See all rates" grid that highlights the detected country.

If the buyer's country isn't covered (no specific rate AND no ROW fallback), checkout is **blocked** at the payment-intent step with a descriptive 400 error.

## Creator-side UX

Two surfaces, sharing the same `<ShippingRateInputs />` component:

1. **In-form** on `/dashboard/listings/new` and `/dashboard/listings/[id]/edit` — the rates live with the listing they belong to, so creators set them at create-time.
2. **Master view** at `/dashboard/shipping`:
    - Top: cart-level prefs (free-ship threshold + combined-cart toggle).
    - Below: a CRUD table of every PHYSICAL/POD listing with status badges (covers all SEA, partial coverage, no rates set) and inline expand-to-edit.
    - "+ New listing" link out to the create flow.

The amber "No rates set — listing won't accept orders" badge replaces the old creator-default warning. If a listing has no rates, the publish guard blocks activation; existing-active listings keep working until edited.

## Commission as the escape hatch

For bulk, oversized, or otherwise non-standard fulfillment, creators are nudged toward **Commission** listings — the rate-input component shows a hint linking to `/dashboard/listings/new?type=COMMISSION`. Commission listings quote shipping per-buyer at the deposit stage (no static `shippingByCountry`), avoiding the trap of trying to encode every edge case as a per-country rate.

## What we're explicitly NOT doing

- No platform fee on shipping. Ever.
- No tax applied to shipping. The 3-layer tax engine (origin / destination / B2B) only operates on subtotal.
- No creator-default fallback. Removed in Shipping V2 because the inherited default was almost always wrong.
- No real-time carrier rate API (USPS / Pos Laju / etc.). Creators set static rates; the live-rate complexity isn't justified at SEA scale.
- No address validation on the buyer side beyond the country dropdown. Buyers enter their own street address; the creator deals with bad addresses through the existing fulfillment-deadline mechanism.
- No shipping insurance product. Creators buying carrier insurance is their decision; we don't surface it.

## Migration & rollout

- Initial schema in **migration 0011_shipping_costs** ([prisma/migrations/0011_shipping_costs/migration.sql](prisma/migrations/0011_shipping_costs/migration.sql)).
- Shipping V2 in **migration 0012_shipping_v2_per_product** — backfills `Product.shippingByCountry` from the (now-deprecated) creator default for every PHYSICAL/POD listing whose product map was empty, then drops `Product.shippingFreeThresholdUsd`. `CreatorProfile.shippingByCountry` is left in place but soft-deprecated (no read path).
- Existing `Product.shippingMY/SG/PH/Intl` fields are **lead times in days**, not costs — they remain as POD lead-time data and are *separate* from `shippingByCountry`. The schema comments document the distinction.
- Listings that were active under the old creator-default model and didn't have their own product map were backfilled by migration 0012, so no active listing was de-published. New publishes / re-activations enforce the per-product rule.

## When in doubt

- Code path: start with [src/lib/shipping.ts](src/lib/shipping.ts) — single source of truth for parsing, resolving, and combining.
- Inputs UX: `<ShippingRateInputs />` is the only place rates are entered; everything else either reads or summarizes.
- Edge cases: refund carve-out and chargeback bypass are documented above and in the function comments — don't reimplement.
