---
title: Disputes & chargebacks
description: Two distinct workflows — buyer-initiated (Dispute) and PSP-initiated (Chargeback).
---

## Two different things

It's important to keep these straight:

- **Dispute** — a buyer opens a complaint *with us*. The funds are still on platform (in escrow). We adjudicate; we keep the money or refund it. No card-network involvement.
- **Chargeback** — a buyer goes to *their card issuer*. The card network pulls funds from us. We submit evidence; we either win the funds back or eat the loss.

Disputes are common, expected, and resolvable. Chargebacks are rare, expensive, and ratio-tracked.

## Dispute workflow

### Trigger

- Buyer hits "Open dispute" in `/account/orders/[id]` after delivery (or after expected delivery passes).
- `Dispute` row created, order moves to `DISPUTED`, escrow funds frozen.

### Evidence collection

- Buyer is asked to describe the issue + upload proof (photos, screenshots).
- Creator is notified, asked to respond + upload proof (shipping receipt, tracking, work-in-progress photos for commissions).
- Both sides have a window (default 7 days) to submit.

### Adjudication

- Surfaces in `/admin/disputes`.
- Admin reviews evidence, communicates if needed via `Ticket` thread.
- Decision: refund full / partial / none. Plus optional creator credit/strike.

### Resolution

- **Refund:** funds reverse from escrow back to buyer's original payment method (via Airwallex). Order moves to `REFUNDED`.
- **Reject:** funds release to creator on schedule. Order moves to `COMPLETED`.
- **Partial:** split per admin decision.

### Auto-evidence packaging

The platform auto-attaches contextual evidence when a dispute opens:

- Order timeline (paid, shipped, tracking events).
- Buyer's prior order history with creator.
- Creator's KYC status + agreement signature timestamp.
- For physical: tracking carrier + delivery confirmation if available.
- For digital: download access log (`DownloadAccessLog`) — proves whether buyer downloaded the file.

## Chargeback workflow

### Trigger

- Card issuer initiates via Airwallex webhook → `/api/webhooks/airwallex`.
- `ChargebackDispute` row created. Funds are already pulled.

### Auto-response

- We auto-package evidence (same sources as dispute auto-evidence) into the format Airwallex expects.
- For card-not-present (CNP) physical orders: tracking + delivery confirmation is the strongest single piece.
- For digital: download log + IP + 3DS authentication (if the order used 3DS, win rate is dramatically higher).

### Submission

- Surfaces in `/admin/chargebacks` for human review before final submit.
- Admin can adjust the evidence package, add notes.
- Submit deadline: typically 7–10 days; we set internal deadline to 5 days.

### Outcome

- **Win:** funds reversed back to platform; chargeback fee still charged (~USD 15).
- **Lose:** funds gone, fee charged. We update creator-side: depending on negligence (no shipping proof, etc.) we may claw back from creator's pool per the agreement.

### Reserves

- 1% of card volume held as `PlatformReserve` (chargeback float).
- Threshold to avoid: card networks penalize merchants above 0.9% chargeback ratio over rolling windows. We monitor in `/admin/chargebacks`.

## Common dispute patterns and how we handle them

| Pattern                              | Default lean |
|--------------------------------------|--------------|
| "Never received" + tracking shows delivered | Lean creator (we have proof) |
| "Never received" + no tracking attached     | Lean buyer (creator failure to track) |
| "Item different from listing" + photos      | Case-by-case; partial refund common |
| "Wrong size/color"                          | Lean creator if listing was clear; partial otherwise |
| "Commission not delivered"                  | Check milestone state; refund unfinished portion |
| "Buyer's remorse" without product issue     | Lean creator (digital and convention goods are non-returnable) |
| "Quality not as expected" (subjective)      | Partial; adjust creator standing if recurring |

## Creator-side consequences

- A creator with rising dispute rate sees warnings in their dashboard.
- Repeated lost disputes affect `CreatorProfile` health score (used in trending suppression).
- Severe pattern → admin can suspend listings while investigating.

## Audit & accountability

- All admin decisions on disputes are logged in `AuditEvent` and `AdminAuditEvent`.
- `DisputeEvidence` rows are immutable once submitted.
- Staff access to dispute files is logged in `PrivateFileAccess` and surfaced in `/admin/staff/audit/file-access`.
