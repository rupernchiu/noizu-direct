---
title: Order lifecycle
description: Every state an order passes through from cart to release.
---

## State diagram

```
        cart
         │
         ▼
   ┌─────────────┐
   │ checkout-init│  PaymentIntent created (Airwallex)
   └─────────────┘
         │
         ▼
   ┌─────────────┐
   │   PENDING   │  buyer redirected to PSP, waiting for confirmation
   └─────────────┘
         │  (webhook)
         ▼
   ┌─────────────┐
   │    PAID     │  funds captured, escrow opens
   └─────────────┘
         │
         ▼
   ┌─────────────┐
   │ PROCESSING  │  creator acknowledges
   └─────────────┘
         │
         ▼
   ┌─────────────┐
   │  SHIPPED    │  (physical only) tracking attached
   └─────────────┘
         │
         ▼
   ┌─────────────┐
   │ COMPLETED   │  buyer confirmed OR auto-release window passed
   └─────────────┘
```

Plus side-states:

- `CANCELLED` (pre-payment expiry, fraud reject, creator decline)
- `REFUNDED` (post-payment, full or partial)
- `DISPUTED` (buyer opened dispute)
- `CHARGEBACK` (PSP-side)

## Order types

The same model handles three flows with branching at fulfilment:

1. **Digital download** — buyer paid, files unlock immediately, auto-COMPLETED after a short release window. No SHIPPED state.
2. **Physical** — creator must mark SHIPPED + attach tracking; buyer confirms receipt or release window auto-completes.
3. **Commission** — milestone-based; covered separately.

## Cart → checkout

- `CartItem` stores buyer-side cart entries (`/cart`, `CartProvider`).
- Going to `/checkout` snapshots prices + recomputes fees + applies any discount code.
- A `PaymentIntent` is created via Airwallex; buyer is redirected to the hosted payment page.
- Order row is created in `PENDING` state at intent-creation time so we can reconcile webhook → order.

## Webhook → PAID

- Airwallex webhooks land at `/api/webhooks/airwallex`.
- We verify signature, look up the order by `psp_intent_id`, transition to `PAID`.
- An `EscrowTransaction` row opens for the creator portion.
- A `Transaction` row is written (`status: COMPLETED` after capture, this is the platform-money record).
- Idempotency: `ProcessedWebhookEvent` table dedupes by event ID.

## Fulfilment

- Creator sees order in their dashboard `/dashboard/orders`.
- For physical: marks SHIPPED, attaches tracking; buyer receives email + in-app notification.
- For digital: nothing required — buyer can download immediately from their order page.

## Release window (escrow timeout)

- Digital downloads: short window (~3 days post-PAID).
- Physical orders: longer window, anchored to "shipped + N days" (default ~14 days, longer for international).
- Cron `escrow-processor` scans for windows passed and auto-completes.
- Auto-completion releases the creator portion to their payout pool (see [Escrow & payouts](escrow-payouts)).

## Buyer confirms early

- Buyer can hit "Mark as received" in `/account/orders/[id]` to release funds before the timeout.
- This is the happy-path completion.

## Refund / dispute branches

- A buyer can request a refund up to release. Creator can approve directly; if not, it goes to dispute.
- A dispute moves the order to `DISPUTED`, freezes the escrow, and surfaces in `/admin/disputes` for adjudication.
- See [Disputes & chargebacks](disputes-chargebacks).

## Where the data lives

| Concept                  | Model                  |
|--------------------------|------------------------|
| Order                    | `Order`                |
| Money record             | `Transaction`          |
| Held funds               | `EscrowTransaction`    |
| Payout to creator        | `Payout`               |
| Buyer-side ledger        | `Invoice`              |
| Webhook dedupe           | `ProcessedWebhookEvent`|

(See `prisma/schema.prisma` — these models are stable.)
