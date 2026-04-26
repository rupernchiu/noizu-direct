---
title: Storage policy
description: Plans, quotas, grace, retention. What creators get, what we charge.
---

## Plans

Defaults from [`src/lib/storage-quota.ts`](https://github.com/your-org/noizu-direct/blob/master/src/lib/storage-quota.ts), overridable via `StoragePricingConfig`:

| Plan     | Quota | Price (USD/mo) |
|----------|-------|----------------|
| FREE     | 2 GB  | included       |
| CREATOR  | 25 GB | 6.90           |
| PRO      | 100 GB| 14.90          |

Buyers don't have a quota — only creators consume storage (their listings, downloads, profile media).

## What counts toward quota

- Product images
- Digital download files
- Profile / cover images
- Video uploads
- Commission deliverables uploaded for buyer
- KYC docs (small contribution; not optimized away)

## What does NOT count

- Order metadata, messages, broadcasts (text — negligible)
- Trash / soft-deleted items past retention (cleaned up)

## Grace band

- Above 100% of quota, the creator is "soft-over" — listings still work, uploads still allowed.
- Above 100% + grace (default 10%, `overageGracePercent`), the creator is "hard-over" — new uploads blocked.
- Hard-over creators see a clear banner with "Upgrade or remove files" CTA.
- Existing files don't get auto-deleted — creator chooses what to remove.

## Bonus storage

Admin can grant `storageBonusMb` to a user (in `/admin/storage`):

- Useful for goodwill (creator with edge case), beta partners, comp for outage.
- Stacks on top of plan quota.

## Plan upgrade / downgrade

- Upgrade: immediate, prorated charge.
- Downgrade: takes effect next billing cycle. If new quota wouldn't accommodate current usage, downgrade is blocked until creator reduces.

## Billing

- Storage subs use `StorageSubscription` (recurring) and `StoragePurchase` (one-shot for ad-hoc bonuses if we ever offer that).
- Charged via Airwallex card-on-file or invoice.
- Failed renewal → grace period (currently 7 days) → downgrade to FREE if not resolved.

## Storage retention

- Files attached to **active** products: kept indefinitely.
- Files for **deleted** products: 30-day grace, then purged.
- KYC docs: longer retention (5–7 years per financial-records rule).
- Dispute evidence: held until dispute closes + 90 days.
- Ticket attachments: 2 years for resolved tickets (KYC-related: longer).

## Where files live

- All on Cloudflare R2 (see [Integrations](integrations)).
- Public bucket for catalog images (CDN-served).
- Private bucket for downloads, KYC, dispute evidence (signed URLs only).

## Quota observability

- Creator: `/dashboard/storage` shows usage, plan, % used, projected days at current rate.
- Admin: `/admin/storage` shows all creators, sortable by usage, with oversoft / overhard flags.

## Edge cases

- **Bulk upload failure mid-batch** — already-uploaded files count toward usage even if the batch failed; creator can remove via UI.
- **R2 outage during upload** — quota check is pre-upload; if R2 fails, upload fails, no quota impact.
- **Hard-over from a single large file** — pre-upload check rejects with clear message before bytes leave the browser.
- **Plan downgrade with bonus** — bonus stays; check happens on (planQuota + bonus).

## What we don't do

- **Per-file pricing** — too granular, friction in checkout.
- **Pay-as-you-go above plan** — would need accurate per-byte billing; deferred.
- **Auto-delete on hard-over** — too risky for creator livelihood; we soft-block instead.

## Pre-launch caveat

Pricing values shown here are launch defaults. The actual `StoragePricingConfig` row in production may diverge — `/admin/storage/pricing` is the live source of truth.
