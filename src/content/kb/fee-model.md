---
title: Fee model
description: Authoritative reference for the 5/5.5/8 + rail-aware fee structure.
---

## The headline numbers

| Fee                       | Rate | Charged to | Source-of-truth field |
|---------------------------|------|------------|------------------------|
| Creator commission        | 5.0% | Creator (deducted from gross) | `DEFAULT_FEE_RATES.creatorCommissionPercent` |
| Buyer fee — local rails   | 5.5% | Buyer (added at checkout)     | `DEFAULT_FEE_RATES.buyerFeeLocalPercent` |
| Buyer fee — card          | 8.0% | Buyer (added at checkout)     | `DEFAULT_FEE_RATES.buyerFeeCardPercent` |

Defined in [`src/lib/fees.ts`](https://github.com/your-org/noizu-direct/blob/master/src/lib/fees.ts) and overridable via `PlatformSettings` (no redeploy required).

## Which fee applies when

The buyer fee is **chosen by the rail used at payment time**, not the one offered at checkout. The rail goes into the snapshot stored on the order at intent-creation time.

Rails classified in `src/lib/fees.ts`:

```
LOCAL_RAILS = [FPX, DUITNOW, TNG, BOOST, GCASH, FAST, PAYNOW,
               INSTAPAY, BIFAST, PROMPTPAY]
CARD_RAILS  = [CARD]
```

Anything else falls back to `card` (8%) as a safe default.

## Rail-aware snapshot

When a `PaymentIntent` is created, we snapshot the resolved fee rates onto the `Order` (and the `Transaction`). Future audits / refunds use the *snapshotted* rates, not the current `PlatformSettings` — so a fee-model change today doesn't retroactively repricing in-flight orders.

## Worked examples

### USD 20 product, paid via FPX (local rail)
```
Subtotal           20.00
Buyer fee  (5.5%)   1.10
Tax (MY SST 8%)     1.69    ← if MY enabled
─────────────────────
Buyer pays         22.79

Creator nets        18.62    (20.00 − 1.00 commission − ~0.38 rail cost)
Platform           ≈ 2.10
```

### USD 20 product, paid via card (with 3DS)
```
Subtotal           20.00
Buyer fee  (8.0%)   1.60
Tax (MY SST 8%)     1.73    ← if MY enabled
─────────────────────
Buyer pays         23.33

Creator nets        18.62    (same — buyer-side fee covers the higher card cost)
Platform           ≈ 2.15    (after card cost + reserve)
```

## Why both 5.5% and 8% — not flat

Card processing costs ~2.5–3.5% (vs ~1.8% for FPX/DuitNow). A flat buyer fee would either:

- Subsidize card buyers from local-rail margin (bad — local rails have less room)
- Over-charge local-rail buyers (bad — those are price-sensitive)

Charging buyers the rail's actual cost-plus is the cleanest answer. We disclose the difference at checkout.

## Why creator commission is flat 5%

- Comparable to or below most peer marketplaces (Etsy 6.5%, Gumroad 10%).
- Flat is easier for creators to reason about than tiered.
- "Creator math" for a USD 20 sale is: subtract 5% → that's your share. Done.

## Markup logic for tax-inclusive creators

If a creator wants to absorb their origin-tax burden into the listed price, the fee math runs on the *gross listed price* — there's no tax-grossing-up by us. Layer 1 origin tax is the creator's choice; we don't withhold.

## What we don't take

- No per-listing fee
- No monthly creator subscription
- No FX markup beyond Airwallex's published spread
- No "boost / promote" surcharge
- No discount-code-on-creator surcharge (when admin issues a comp code, the platform absorbs it, not the creator)

## How the buyer sees it

Checkout page lines:
```
Subtotal              $20.00
Service fee (FPX)      $1.10
Sales tax (SST 8%)     $1.69
─────────────────────
Total                 $22.79
```

Receipt + invoice mirror this exactly. Refunds reverse line-by-line.

## How the creator sees it

Order detail in `/dashboard/orders/[id]`:
```
Sale                  $20.00
Less: commission      −$1.00
Less: rail cost       −$0.38
─────────────────────
Earnings              $18.62
Status: in escrow, releases YYYY-MM-DD
```

## Adjusting fees

`/admin/settings` → Fees section. Saves to `PlatformSettings`. Takes effect on **new** intents — existing orders use their snapshot.

Changing fees is high-impact. Standing rule: announce at least 30 days in advance to creators if commission is going up; buyer fee changes can be silent because they're per-order at checkout.
