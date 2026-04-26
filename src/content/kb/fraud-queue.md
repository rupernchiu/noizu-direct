---
title: Fraud queue
description: How suspicious activity gets flagged, triaged, and resolved.
---

## What we treat as fraud signals

Fraud is broader than "stolen card." We track:

- **Card-side:** velocity, BIN-country mismatch with shipping, 3DS bypass attempts, prior chargebacks.
- **Account-side:** newly-created buyer accounts hitting high-value orders, multiple accounts to one device fingerprint, sanctions match.
- **Creator-side:** sudden listing spike, image hash matches existing seller, rapid bank-detail changes pre-payout.
- **Order-side:** unusual value vs. category baseline, repeated buyer↔creator pairs (collusion), shipping address changes after order.

## The queue

`/admin/fraud` surfaces a queue backed by `FraudFlag` rows. Each flag has:

- Subject (`Order`, `User`, `CreatorProfile`, or `Payout`)
- Signal (which detector fired)
- Severity (LOW / MEDIUM / HIGH / CRITICAL)
- Status (OPEN / REVIEWED_OK / ACTIONED / SNOOZED)
- Notes + linked actions

## Detection layers

### Layer 1 — pre-checkout
- BIN check (card country vs. claimed buyer country)
- IP geolocation vs. shipping country
- Velocity (orders per buyer per hour)

### Layer 2 — post-payment
- 3DS escape signals (fallback to non-3DS where allowed)
- Burst behavior on a creator's listings
- New-account pattern checks

### Layer 3 — pre-payout
- Bank-detail change within 48h of payout
- Beneficiary name divergence from KYC name
- Country corridor change without reason

### Layer 4 — manual / admin-triggered
- Admin can manually flag any subject from `/admin/orders`, `/admin/creators`, etc.

## Actioning a flag

From `/admin/fraud` admin can:

- **Mark reviewed OK** — closes the flag with note; subject continues normally.
- **Hold order** — pauses release, blocks creator notification, optionally refunds.
- **Suspend creator listings** — sets `CreatorProfile.isListingSuppressed`.
- **Block user** — `User.isBlocked = true`, prevents new orders + login.
- **Cancel + refund** — reverses the order entirely.

All actions are logged in `AuditEvent`.

## Threshold tuning

Detector thresholds live in code (currently — could move to settings). When a detector misfires too often, we either tune the threshold or add a counter-signal (e.g., "new account but matches an existing reliable email address" → demote severity).

## Card-network ratio guardrails

Visa/Mastercard chargeback ratios above ~0.9% trigger merchant penalty programs. Our internal target is **< 0.4%** of monthly card volume. The fraud queue is the primary lever to keep that number down — proactively pulling suspicious orders before they convert to chargebacks.

## What we don't do (and why)

- **No automated buyer bans** — false positives on fan accounts would lose us volume; humans review first.
- **No machine-learning scoring** — rules-based works at our scale; ML adds operational complexity disproportionate to lift.
- **No public "trust score"** — we don't surface fraud signals to creators in a way that could be gamed.

## Where the data lives

| Concept             | Model              |
|---------------------|--------------------|
| Flag itself         | `FraudFlag`        |
| Audit of action     | `AuditEvent`, `AdminAuditEvent` |
| User block          | `UserBlock`, `User.isBlocked` |
| Suspension state    | `CreatorProfile.isListingSuppressed` |
