---
title: Internal terms
description: Words we use in code, admin tools, and business chat that mean specific things here.
---

## Money & payments

- **Snapshot** — the fee/tax breakdown captured on an `Order` (and `Transaction`) at intent-creation time. Once snapshotted, fee changes don't retro-price the order. See [Fee model](fee-model).
- **Rail** — the payment method used: `FPX`, `DUITNOW`, `CARD`, etc. Determines fee tier and PSP cost. See `LOCAL_RAILS` / `CARD_RAILS` in `src/lib/fees.ts`.
- **Corridor** — the payout route from platform to creator's bank: "local" (FPX/DuitNow/etc.) or "SWIFT" (for VN/KH/MM/LA). Different minimums and fees. See [Escrow & payouts](escrow-payouts).
- **Tier** (creator-tier) — informal: T1 (MY/SG/PH/ID/TH, local rails on both sides), T2 (rest of SEA, card-only buyers), T3 (VN/KH/MM/LA, SWIFT corridor for payout).
- **Reserve** — platform-held funds for chargeback float, tax accrual, ops capital. See `PlatformReserve`.
- **Float** — the portion of platform balance held against future risk (chargebacks, refunds), not freely deployable.
- **Sweep** — moving funds off the PSP balance into our operating bank account. Periodic; not yet automated.
- **Clawback** — reversing a creator-side payout (or balance) when a chargeback after release lands. Per Creator Agreement.
- **Comp** — comping a buyer (free download, discount code) to defuse a marginal complaint. Cheaper than chargeback fee + dispute time.
- **Settle** — when escrow-held funds release to the creator's payout pool (not the same as a payout disbursement to bank).

## Operations

- **Hold** — a temporary block on a payment, payout, or release. Initiated by fraud detector, dispute, or manual admin action.
- **Suppress** — hide from discovery without deleting (`isTrendingSuppressed`, `isListingSuppressed`). Used for fraud-suspect or quality-issue cases.
- **Auto-release** — escrow funds release to creator after the configured release window with no buyer action.
- **Auto-evidence** — context auto-attached to a dispute or chargeback (timeline, tracking, download log).
- **Bypass** (maintenance bypass) — paths that ignore the maintenance flag. See [Maintenance mode](maintenance-mode).
- **Heartbeat** — a `CronHeartbeat` row written by every cron run; admin overview reads these for health.
- **Stale** — a cron whose last heartbeat is older than its expected interval. Surfaced in red on `/admin`.

## People & accounts

- **Buyer** — `User` who buys; no `CreatorProfile`.
- **Creator** — `User` with approved `CreatorProfile`. Role flips on KYC approval.
- **Admin** (capital A) — `User.role === 'ADMIN'`. The operator. Has unrestricted access.
- **Staff** — non-admin operator with scoped permissions via `StaffUser` + `StaffPermission`.
- **Actor** (staffActor) — the resolved permission context for a staff request. From `loadStaffActor()`.
- **Super admin** — staff user marked `isSuperAdmin`; gets all staff scopes implicitly.

## Discovery / ranking

- **Trending score** — 4-layer composite: base + freshness + rotation + relevance. Recomputed daily by `trending` cron.
- **Decay factor** — exponential weight that down-ranks older activity. 0.95 in `TRENDING_CONFIG`.
- **Window** — `windowDays: 7` — only events in the last 7 days feed trending.
- **Rotation** — small random shuffle to surface long-tail listings (anti-rich-get-richer).
- **Suppression** — admin-flagged opt-out from discovery; listing still buyable via direct link.

## Catalog

- **Listing** — a `Product` row that's `isActive: true`.
- **Variant** — pricing/option tier within a product (e.g., A4 vs A3 print).
- **Spotlight** — featured creator slot on landing/category pages (`CreatorSpotlight`).
- **Guestbook** — creator's public comment wall (`CreatorGuestbook`).

## Communications

- **Broadcast** — creator → followers message (text + media). Audience filterable. See `Broadcast`, `BroadcastNotification`.
- **DM** — direct message between buyer and creator inside a `Ticket`-style thread.
- **Notification** — in-app system notification (`Notification`). Distinct from broadcast.
- **Email log** — `EmailLog`; tracks delivery via Resend webhook.

## Codebase

- **rs / rc** — informal: "react server component" / "react client component" (when discussing Next.js App Router).
- **db push** — `prisma db push`; how we apply schema changes (we don't use `migrate deploy`).
- **savepoint tag** — git tag in the form `savepoint-<topic>-<date>` marking a known-good local state. Local only, not pushed unless explicitly stated.
- **Auto-deploy** — pushing to `master` triggers Vercel deploy. Hence the standing rule: **never push without approval**.
