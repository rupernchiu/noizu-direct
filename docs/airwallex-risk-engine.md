# Airwallex Risk Engine — Console Configuration Runbook

This document is the **operator reference** for what to configure inside the Airwallex
Risk Engine console (https://www.airwallex.com → Payments → Risk Engine). The
code-side 3DS posture and rail-aware fee model is already implemented — this runbook
covers the dashboard rules that complement it.

> Last updated: **2026-04-25** (Phase 0 close-out). Re-review every chargeback
> incident or whenever a new payment rail is enabled.

## Why this exists

The platform's fraud posture has two layers:

1. **Code side** — `src/lib/fees.ts::decideThreeDsAction` forces 3DS on digital
   products / commission deposits / storage subscriptions. Already shipped.
2. **Dashboard side** — Airwallex's geo / velocity / BIN / IP rules. Configured
   manually in the console; no API. **This document.**

If the console rules drift from this runbook, fraud loss budget will spike before
liability coverage ratio (visible in `/admin/finance`) catches the bleed.

## Standing rules (always-on)

### 3DS forcing rules

Airwallex's default 3DS posture is "soft 3DS for high-risk, none otherwise". We
force a stricter posture in code (see `decideThreeDsAction`), but the console
should match for defense-in-depth:

| Condition | Action |
| --- | --- |
| Card BIN country ≠ buyer billing country | `Require 3DS` |
| Transaction amount ≥ USD 200 | `Require 3DS` |
| Buyer country in {NG, BR, RU, ZA} *(historically high CB rate, none of our SEA)* | `Require 3DS` |
| Velocity: same card 3+ attempts in 24h | `Require 3DS` |

### Hard-block rules

Airwallex blocks the auth attempt before it reaches the issuing bank. Use
sparingly — false positives kill conversion.

| Condition | Action |
| --- | --- |
| Card BIN country in OFAC sanctions list | `Block` |
| Same IP 5+ failed 3DS in 1h | `Block 24h` |
| Same email 3+ different cards in 24h | `Block 24h` |
| Buyer IP from VPN / Tor exit node (Airwallex-supplied list) | `Block` |

### Soft-flag rules (review queue)

Don't block; route to admin fraud review queue (`/admin/fraud` once Phase 1.3 ships).

| Condition | Action |
| --- | --- |
| First-time buyer + amount > USD 100 | `Flag for review` |
| Buyer country ≠ shipping country (physical orders) | `Flag for review` |
| Card BIN country = US/UK/EU + buyer IP from SEA | `Flag for review` |
| Email domain age < 30 days (Airwallex enrichment) | `Flag for review` |

## Rail-specific posture

| Rail | 3DS | Risk Engine notes |
| --- | --- | --- |
| Card (Visa/MC/Amex) | **Force 3DS** for digital + ≥ USD 25 physical | Tightest posture; chargeback liability is highest |
| FPX (MY) | N/A — bank login is the auth | Allow without extra rules |
| DuitNow QR / TouchnGo / Boost | N/A — wallet auth | Allow |
| GCash (PH) / FAST (SG) / PayNow (SG) | N/A — wallet/bank auth | Allow |
| InstaPay (PH) / BI-FAST (ID) / PromptPay (TH) | N/A — bank auth | Allow |

Local rails have ~0% chargeback rate by design (no card network involved), so we
don't need 3DS or geo rules — just velocity caps.

## Per-product posture

| Product type | Code 3DS | Console review-queue rule |
| --- | --- | --- |
| Digital download | Force 3DS (any amount) | First-purchase + amount > USD 50 → flag |
| Commission deposit | Force 3DS | First-purchase + amount > USD 100 → flag |
| Storage subscription | Force 3DS (recurring) | New card on first MIT → flag |
| Support subscription (one-time tip) | EXTERNAL_3DS (issuer-driven) | None (low fraud signal) |
| Physical product | Force 3DS if ≥ USD 25 | Cross-border ship-to vs bill-to → flag |

## Velocity thresholds

These are **soft caps** — exceeding them flags the transaction; doesn't block.

| Velocity metric | Threshold |
| --- | --- |
| Same card / 24h | 5 successful charges |
| Same email / 24h | 5 successful charges |
| Same IP / 1h | 10 attempts (any state) |
| Same buyer / 7d | USD 1,000 cumulative |

## Recommended Airwallex rule presets

Airwallex ships a set of named presets; enable these:

- ✅ `Standard 3DS Strategy`
- ✅ `Cross-border BIN Mismatch`
- ✅ `Velocity High-Frequency`
- ✅ `Sanctions BIN List`
- ⛔ Do **not** enable `Aggressive Block` — it blocks ~3% of legit SEA traffic.

## Webhook wiring (already shipped)

Airwallex fires `payment.dispute.created` and `payment.dispute.won` to:

- `src/app/api/airwallex/webhook/route.ts`

When `dispute.created` fires, the corresponding `Transaction.payoutBlocked`
flips to `true`. When `dispute.won` fires, it flips back.

This means the Risk Engine console only needs to tune the **pre-auth** layer
(3DS / blocks / flags). Post-auth chargebacks are handled in code.

## Audit checklist (run quarterly)

1. Pull `/admin/finance` chargeback ratio for the last 90 days.
   - Healthy: < 0.65% (Visa Dispute Monitoring "monitor" boundary)
   - Warning: 0.65% – 0.9%
   - Urgent: ≥ 0.9% — Visa Dispute Monitoring Program triggers
2. If ratio is ≥ 0.65%, tighten the rules above one notch:
   - Lower velocity caps by 25%
   - Add cross-border BIN mismatch to `Block` (not `Require 3DS`)
   - Force 3DS on physical orders ≥ USD 10 (down from 25)
3. If ratio drops below 0.3% sustainably, evaluate loosening:
   - First-time buyer flag threshold could rise to USD 200
   - Velocity caps could rise 25%

## Console access checklist

- [ ] Two admins have console access (CEO + CFO redundancy)
- [ ] Webhook URL set to: `https://noizu.direct/api/airwallex/webhook`
- [ ] Webhook secret stored in `.env` as `AIRWALLEX_WEBHOOK_SECRET`
- [ ] Risk Engine `Standard 3DS Strategy` ON
- [ ] Test mode disabled (production only)

## Related code

- `src/lib/fees.ts::decideThreeDsAction` — code-side 3DS posture
- `src/lib/airwallex.ts::createPaymentIntent` — accepts `threeDsAction` param
- `src/app/api/airwallex/webhook/route.ts` — dispute event handler
- `src/app/admin/finance/page.tsx` — chargeback ratio + traffic light
