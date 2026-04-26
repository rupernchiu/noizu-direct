---
title: Escrow & payouts
description: How funds are held, released, and routed to creators.
---

## Why escrow

Cosplay/doujin/art orders are *trust-loaded*: the buyer doesn't know if the package arrives, the creator doesn't know if the buyer will charge back. Escrow inserts the platform between them as a temporary custodian, releasing only when both sides are satisfied — or a sensible timeout passes.

## The escrow lifecycle

1. Buyer pays → funds land in Airwallex platform balance.
2. `EscrowTransaction` row opens with the creator's net portion held.
3. One of:
   - Buyer confirms receipt → release immediately.
   - Auto-release window passes → cron releases.
   - Refund request approved → reverse the hold.
   - Dispute opened → freeze the hold; manual adjudication.
4. On release: creator's portion moves to their payout pool (a balance, not a transfer).
5. When the pool exceeds payout minimum: queued for batched payout.

## Release windows

| Order type            | Default release window   |
|-----------------------|--------------------------|
| Digital download      | 3 days from PAID         |
| Physical (domestic)   | 14 days from SHIPPED     |
| Physical (international) | 21–30 days from SHIPPED |
| Commission milestone  | Per-milestone (set in quote) |

Configurable via `PlatformSettings` — admin can tune without redeploy.

## Payout corridors

Defined in [`src/lib/payout-rail.ts`](https://github.com/your-org/noizu-direct/blob/master/src/lib/payout-rail.ts):

- **Local rails** (lower cost, faster): MY (FPX/DuitNow), SG (FAST/PayNow), PH (InstaPay/GCash), ID (BI-FAST), TH (PromptPay).
  - Payout minimum: **USD 10**
  - Cost: included in our take; usually under USD 1 per payout.
- **SWIFT corridor** (slower, fee-heavy): VN, KH, MM, LA.
  - Payout minimum: **USD 100**
  - Cost: USD 35 per wire (`DEFAULT_SWIFT_FEE_USD_CENTS`), surfaced to creator pre-confirm.

A creator's corridor is determined from their KYC country + bank country.

## Payout cadence

- Cron `payout-reconciler` runs daily 09:00 UTC.
- Eligible balances (above minimum, no holds, KYC current) are batched.
- A `Payout` row is created in `PENDING`, instructing Airwallex to disburse.
- On Airwallex confirmation webhook, status flips to `COMPLETED`.
- On failure (bank rejected, KYC stale), status flips to `FAILED` and surfaces in `/admin/payouts`.

## Creator payout settings

In `/dashboard/settings/payout` the creator sets:

- Bank account details (IBAN/SWIFT/local account number).
- Beneficiary name (must match KYC).
- Whether to auto-payout or hold balance.

Changes are logged in `PayoutSettingChange` (audit trail; finance reviews suspicious last-minute changes before next payout).

## What admin sees

- `/admin/payouts` — pending, succeeded, failed payouts.
- `/admin/finance` — cohort view: payouts vs. fees vs. reserves.
- `/admin/finance/reserves/[id]` — `PlatformReserve` movements (chargeback float, ops working capital).

## Reserves

We hold platform-side reserves for:

- **Chargeback float** — ~1% of card volume held against future card disputes.
- **Tax remit accrual** — destination tax collected but not yet remitted.
- **Operating capital** — discretionary, set by admin.

Each is a `PlatformReserve` with `PlatformReserveEntry` movements. Used by Finance to reason about "real" available cash vs. allocated.

## Failure modes we plan for

- **Stale KYC blocks payout.** We pre-check KYC validity before queuing — a mid-cycle KYC expiry surfaces to creator before we waste a wire fee.
- **Bank-side reject (IBAN typo, name mismatch).** Surfaces as `FAILED` in `/admin/payouts`; admin can edit + retry.
- **Webhook lag from PSP.** `ProcessedWebhookEvent` + reconciliation queries catch missed events; manual "resync from PSP" available in admin.
- **PSP outage.** Payouts queue in `PENDING`; we don't double-pay on retry because order-level idempotency keys flow through.
