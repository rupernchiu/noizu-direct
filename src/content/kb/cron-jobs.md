---
title: Cron jobs
description: All scheduled jobs, what they do, and how to tell when they're sick.
---

## Where they're declared

`vercel.json` lists every cron with its schedule. The job code lives in `src/app/api/cron/<name>/route.ts`. Every job writes a heartbeat (`CronHeartbeat`) so `/admin` overview can show health.

## The schedule

| Cron                       | Schedule (UTC) | Stale threshold | Purpose |
|----------------------------|----------------|-----------------|---------|
| `/api/cron/trending`       | 02:00 daily    | 24h             | Recompute product trending scores |
| `/api/cron/recommendations`| 03:00 daily    | 24h             | Refresh "frequently bought together" pairs |
| `/api/cron/creator-health` | 04:00 daily    | 24h             | Update creator-side metrics + KYC freshness |
| `/api/cron/ticket-retention` | 05:00 daily | 24h           | Prune old ticket attachments |
| `/api/cron/broadcast-retention` | 06:00 daily | 24h          | Prune delivered broadcast notifications |
| `/api/cron/fulfillment-reminders` | 08:00 daily | 24h         | Email creators about un-shipped paid orders |
| `/api/cron/payout-reconciler` | 09:00 daily | 8 days         | Stage and confirm payout batches |

There are also implicit jobs running inside route handlers (escrow-processor pattern) — these heartbeat the same way and surface in admin.

## Trending recompute (`trending`)

- Scores active products by 7-day weighted activity: orders 0.40, wishlist 0.25, cart 0.15, views 0.15, reviews 0.05.
- Decay factor 0.95 (configured in [`src/lib/trendingConfig.ts`](https://github.com/your-org/noizu-direct/blob/master/src/lib/trendingConfig.ts)).
- Writes `Product.trendingScore` + `ProductTrendingScore` history with breakdown JSON.
- `Product.isTrendingSuppressed = true` opt-out (admin lever for fraud-suspect listings).

## Recommendations (`recommendations`)

- Co-purchase pairs ("buyers of X also bought Y") via `ProductRecommendation`.
- Computed from order-graph; respects creator opt-out.

## Creator health (`creator-health`)

- Refreshes creator-side scoring used in discovery.
- Flags KYC docs expiring in 30 days → email reminder.
- Cleans orphan KYC uploads (apps abandoned > 60 days).

## Payout reconciler (`payout-reconciler`)

- Sweeps eligible balances (above min, no holds, KYC current).
- Creates `Payout` rows in `PENDING`, instructs Airwallex.
- Reconciles prior batch: confirms COMPLETED via webhook lag, marks FAILED with retry ticket.

## Fulfillment reminders (`fulfillment-reminders`)

- Finds orders in `PAID` (physical) older than 48h with no shipment.
- Emails creator + adds dashboard banner.
- Repeated misses lower creator-health score.

## Retention cleanups (`ticket-retention`, `broadcast-retention`)

- `ticket-retention` — drops attachments on resolved tickets > 2 years (KYC-tagged tickets retained longer).
- `broadcast-retention` — prunes `BroadcastNotification` rows older than retention window (broadcasts themselves kept; only the per-recipient delivery row is pruned).

## How to tell a cron is sick

`/admin` overview has a "Cron Health" section:

- Each row shows: name, last ran, status, duration, run count, failure count, last error.
- Stale = past expected interval (per the table above).
- Red row → investigate. Common culprits: expired webhook secrets, Airwallex auth token rotation, Supabase pool exhaustion.

## Manual triggers

For non-money-moving jobs: admin can hit `Trigger now` buttons on `/admin` (e.g., trending recalc, recommendations recompute).

For money-moving (payout-reconciler): no UI trigger; we run it on schedule. Manual re-run is a deploy-side action to avoid double-payout risk.

## Heartbeats schema

```
CronHeartbeat {
  cronName       String  @id
  lastRanAt      DateTime
  lastStatus     String  // OK / FAIL
  lastDurationMs Int
  runCount       Int
  failureCount   Int
  lastError      String?
}
```

Every cron writes the heartbeat in a `try/finally` so even crashed runs leave a marker.
