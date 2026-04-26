---
title: Refund policy
description: Eligibility windows by category and the practical rules.
---

## TL;DR

| Category            | Refund window | Default lean |
|---------------------|--------------|--------------|
| Digital download    | 7 days post-PAID, before download | Refund if not downloaded |
| Cosplay print (digital) | Same as above | Same |
| Cosplay print (physical) | 30 days post-SHIPPED | Lean creator if tracking confirms delivery |
| Doujin / Physical merch | 30 days post-SHIPPED | Lean creator if tracking confirms delivery |
| Stickers            | 30 days post-SHIPPED | Same |
| Commission          | Per milestone, before final acceptance | Refund unfinished milestone work |

After the window: dispute path closed automatically; manual support escalation only.

## The mechanics

1. Buyer requests refund from `/account/orders/[id]`.
2. Creator gets 48h to approve or counter-offer.
3. If creator approves → instant refund.
4. If creator declines → dispute opens, admin adjudicates.
5. If creator silent for 48h → escalated to admin queue.

## Refund methods

- Refunds go back to the **original payment method**.
- Card refunds: 3–10 business days to appear (issuer-dependent).
- Local rail refunds: usually 1–3 business days.
- Partial refunds supported.

## What gets refunded

- **Item subtotal** — yes, always (refundable portion).
- **Buyer fee (5.5% / 8%)** — refunded proportional to refund amount. We don't keep the buyer fee on a refunded order.
- **Destination tax** — refunded with the order; reserve adjusts.
- **Card-network fees** — not refunded by Airwallex on refund (lost cost). Documented in unit economics as refund drag.

## Digital downloads — special rules

- If buyer downloaded the file, default is **no refund** unless the file itself is corrupt/wrong.
- `DownloadAccessLog` is the source of truth — IP, timestamp, success/fail.
- "I downloaded it but it's not what I expected" → not eligible (use a free preview / sample if creator offered one).

## Physical orders — special rules

- Tracking is the single most important refund signal.
- "Never arrived" + tracking shows delivered to claimed address → lean creator (case-by-case for known carrier issues).
- "Never arrived" + no tracking attached → lean buyer (creator failure).
- "Damaged in transit" with photos → partial refund typical; may pursue carrier claim.
- Wrong item shipped → full refund + return to creator's expense.

## Commission orders — special rules

- Refund per milestone, not order-wide.
- Completed milestones: not refundable (work delivered).
- Active milestone: refund proportional to creator's documented progress.
- Untouched milestones: full refund.

## Refund timing by status

| Order status         | Can buyer self-request refund? |
|----------------------|--------------------------------|
| PENDING              | Auto-cancelled if expires; no refund needed |
| PAID                 | Yes — within window |
| PROCESSING           | Yes — creator must approve or admin adjudicates |
| SHIPPED              | Yes — within window |
| COMPLETED            | Only via admin escalation |
| REFUNDED / CANCELLED | N/A |
| DISPUTED             | Already in process |

## What buyers see

`/account/orders/[id]` shows:

- Refund eligibility status (eligible / not eligible / under dispute)
- Window remaining
- "Request refund" button when eligible
- Refund history (if partial refunds happened)

## What creators see

`/dashboard/orders/[id]` shows:

- Pending refund requests with 48h timer
- Approve / counter-offer / decline buttons
- History of resolutions

## Admin overrides

`/admin/orders/[id]` can:

- Force refund (full or partial) regardless of window — used for ops decisions, ticket comps, fraud reversal.
- Reverse a refund (rare, only if it was a mistake and PSP allows).
- Freeze/unfreeze escrow without resolving.

All admin overrides log to `AdminAuditEvent`.

## Pre-launch caveat

This page is the **operational policy**. The customer-facing legal text in `/policies/refund` is currently **placeholder copy** and must be rewritten by counsel before launch. The mechanics described here should match the eventual legal copy.
