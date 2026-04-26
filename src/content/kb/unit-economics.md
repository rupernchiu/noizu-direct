---
title: Unit economics
description: Per-order P&L, sensitivity to mix, and what breakeven looks like.
---

## Per-order contribution

Indicative numbers — assumes a USD 20 average order value (AOV), no destination tax, no refund.

### Local-rail order (FPX/DuitNow/etc.)

| Line                    | Amount    | Notes |
|-------------------------|-----------|-------|
| Buyer pays (gross)      | USD 21.10 | 20.00 + 5.5% buyer fee |
| Less: rail cost (~1.8%) | −0.38     | Airwallex local-rail rate |
| Less: payout to creator | −18.62    | 95% of subtotal, after creator-side rail cost |
| **Platform contribution** | **USD 2.10** | ≈ 10% of gross |

### Card order (with 3DS)

| Line                     | Amount    | Notes |
|--------------------------|-----------|-------|
| Buyer pays (gross)       | USD 21.60 | 20.00 + 8% buyer fee |
| Less: card cost (~2.9%)  | −0.63     | Card+3DS+intl spread |
| Less: chargeback reserve | −0.20     | ~1% reserved per card order |
| Less: payout to creator  | −18.62    | Same as above |
| **Platform contribution**| **USD 2.15** | ≈ 10% of gross |

Card and local-rail orders end up at similar margin once costs are absorbed. The buyer fee tier difference exists to *cover* the cost difference, not capture more margin from card buyers.

### Shipping is pass-through

Shipping cost is **not** part of the contribution math above. It's a creator-set fee that flows 100% to the creator at payout — we don't take commission on it, don't tax it, and don't reserve against it. The buyer pays `subtotal + buyer-fee + tax + shipping`; the creator nets `0.95 × subtotal + shipping`. Shipping is only refundable while the order is unshipped (escrowStatus = HELD); once the carrier is paid the creator keeps it. See [Shipping policy](shipping-policy).

## SWIFT payout impact

For tier-3 SEA creators (VN/KH/MM/LA), payout is via SWIFT at USD 35 per wire (`DEFAULT_SWIFT_FEE_USD_CENTS` in [`src/lib/payout-rail.ts`](https://github.com/your-org/noizu-direct/blob/master/src/lib/payout-rail.ts)). Payout minimum is USD 100 (vs USD 10 local) to keep wire-fee drag below 35%.

For a creator with USD 200/month settled gross, SWIFT cost is 17.5% of payout — material. We surface this in the creator's payout settings so they can choose to consolidate (let balance accumulate) or accept the drag.

## Refund and dispute drag

Approximate drag assumptions (revised at quarterly review):

| Scenario      | Frequency | Cost per event |
|---------------|-----------|----------------|
| Buyer-side refund (no chargeback) | 2–4% of orders | Lose the buyer fee + ~50% of commission (admin write-down) |
| Chargeback (won)  | 0.2% of card orders | USD 15 dispute fee + several hours of manual evidence |
| Chargeback (lost) | 0.1% of card orders | USD 15 dispute fee + full reversal + reserved 1% |

Chargeback rate must stay under 0.9% of monthly card volume (Visa/Mastercard threshold) — we monitor in `/admin/chargebacks` and reserve 1% of card volume in `PlatformReserve` to cushion.

## Fixed costs (monthly, indicative pre-launch)

| Item                        | Cost (USD/mo) |
|-----------------------------|----------------|
| Vercel (Pro)                | ~20 |
| Supabase (Pro)              | ~25 |
| Cloudflare R2 storage       | ~5–15 (scales with assets) |
| Resend (transactional email)| ~20 |
| Domain + Cloudflare         | ~5 |
| Airwallex                   | per-transaction, no monthly base |
| **Pre-launch fixed**        | **~75–85** |

## Breakeven

At ~USD 2.10 platform contribution per USD 20 order:

- **40 orders/month** covers infra + email
- **200 orders/month** ≈ USD 420 contribution — covers infra and starts paying for ops time
- **2,000 orders/month** ≈ USD 4,200 contribution — first meaningful revenue tier

These targets shift down (in order count) as AOV climbs above USD 20 — physical merch and limited-run print sets typically push AOV to USD 35–60.

## Sensitivity levers

- **Card vs. local-rail mix.** Higher local-rail share → better margin (lower rail cost), worse global reach.
- **AOV.** Above USD 35, fixed admin/dispute cost per order amortizes well.
- **Refund rate.** Largest swing factor; primary mitigation is shipping confirmation discipline + creator KYC quality.
- **SWIFT corridor share.** Material drag if many tier-3 creators sell low volume.

## What's NOT in the model

- Marketing/CAC (we're not running paid acquisition pre-launch)
- Founder time
- Future revenue lines (storage subs at scale, promoted listings, premium creator features)
