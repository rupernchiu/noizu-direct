---
title: Revenue model
description: How money enters the platform and how we get paid.
---

## Where revenue comes from

The platform earns from three sources, in roughly this order of magnitude:

1. **Buyer fees on each order** (5.5% local rails / 8% card)
2. **Creator commission on settled revenue** (5.0% flat)
3. **Storage subscriptions** (creator-side, paid plans for above-quota usage)

There is currently **no listing fee, no monthly subscription for creators, no boosting/ads revenue**. Those are all options for later — kept off the launch surface to keep onboarding frictionless.

## The 5/5.5/8 model

The canonical fee numbers live in [`src/lib/fees.ts`](https://github.com/your-org/noizu-direct/blob/master/src/lib/fees.ts) under `DEFAULT_FEE_RATES`. They are mirrored in `PlatformSettings` so admin can adjust without redeploy.

| Fee                       | Rate | Charged to | Why this rate |
|---------------------------|------|------------|---------------|
| Creator commission        | 5.0% | Creator (deducted from gross) | Below Etsy (6.5%), well below Gumroad (10%) |
| Buyer fee — local rails   | 5.5% | Buyer (added at checkout)     | Covers ~1.8% rail cost + risk + margin |
| Buyer fee — card          | 8.0% | Buyer (added at checkout)     | Covers ~2.5–3.5% card cost + 3DS + fraud reserve |

Both buyer fee tiers are *transparent* — shown line-itemed at checkout and on the receipt, never hidden in the price.

## Per-order math (worked example)

Say a creator sells a USD 20 cosplay print to a buyer paying via FPX (local rail).

| Line                          | Amount     |
|-------------------------------|------------|
| Item subtotal                 | USD 20.00  |
| Buyer fee (5.5% local)        | USD  1.10  |
| Destination tax (MY SST 8%, if enabled) | USD 1.60 |
| **Buyer pays total**          | **USD 22.70** |
|                               |            |
| Item subtotal                 | USD 20.00  |
| Less: PSP cost (~1.8%)        | USD −0.36  |
| Less: creator commission 5%   | USD −1.00  |
| **Creator nets**              | **USD 18.64** |
|                               |            |
| Platform earns: buyer fee     | USD  1.10  |
| Platform earns: commission    | USD  1.00  |
| Platform earns: rail spread   | ≈ USD 0.10 |
| **Platform gross / order**    | **≈ USD 2.20** |

(See `src/lib/fees.ts:calculateFees` for the authoritative split. Tax is collected for remit, not earned.)

## Card vs. local rail economics

Card orders are healthier per-order at the top line (8% vs 5.5%) but burn most of the spread on processing + 3DS friction + chargeback reserve. Local rails are lower-revenue but higher-margin.

This is why the buyer fee is **transparently rail-aware**: we don't subsidize card buyers from local-rail margin.

## Storage subscriptions

Creators get a free storage tier; above that, they buy Creator (USD 6.90/mo, 25 GB) or Pro (USD 14.90/mo, 100 GB) plans. Defaults live in [`src/lib/storage-quota.ts`](https://github.com/your-org/noizu-direct/blob/master/src/lib/storage-quota.ts). Admin-configurable via `StoragePricingConfig` (no redeploy needed).

This is a small line item today, designed to scale linearly with platform usage. Not a load-bearing revenue source pre-launch.

## What we deliberately don't monetize (yet)

- **Listing fees.** Etsy gets ~USD 0.20/listing; we'd rather have the catalog.
- **Promoted listings / paid placement.** Polluts trust; defer until catalog density justifies it.
- **Creator subscriptions.** Premium-creator features (analytics dashboards, custom domains) are a Phase 4+ idea.
- **FX markup beyond rate-card.** We pass through Airwallex FX with the published spread, no hidden markup.

## Where the money sits

See [Escrow & payouts](escrow-payouts) for hold logic. In short:

- Buyer pays → funds enter Airwallex platform balance.
- Order completes / release window passes → creator portion moves to creator's payout pool.
- Creator hits payout threshold → batched payout to local bank or SWIFT corridor.
- Platform fees stay on platform balance, swept to operating account on regular cadence.
