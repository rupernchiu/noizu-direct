---
title: Feature inventory
description: What's shipped, grouped by surface and audience.
---

## Buyer-facing

### Discovery
- Category browse with rich landing pages (SEO-tuned per category, see `src/lib/categories.ts`)
- Creator directory + per-creator storefronts
- Trending products (4-layer scoring; see [Cron jobs](cron-jobs))
- Recommendations ("frequently bought together")
- Search (text + filters)
- Wishlist + follow creators

### Checkout
- Cart with rail-aware fee preview
- Discount codes (`DiscountCode`)
- Multi-rail payment (cards + APAC local rails)
- 3DS where applicable
- Destination-tax line per buyer country (when enabled)
- Receipt email + on-platform invoice

### Post-purchase
- Order tracking (carrier-aware for physical)
- Digital download access (signed URLs, access-logged)
- Dispute initiation
- "Mark as received" early-release
- Reviews + reply
- DMs with creator (in-app messages)
- Broadcast subscription (per creator)

### Account
- Order history + invoice export
- Wishlist
- Saved addresses
- Notification preferences
- Cart persistence across devices

## Creator-facing

### Onboarding
- KYC application flow (`/start-selling`)
- Status banner with rejection reasons
- Re-application

### Listings
- Product CRUD with TipTap rich editor
- Multi-image uploads (R2)
- Digital file uploads with quota checks
- Variant pricing
- Inactive / suppressed flags

### Orders
- Incoming order queue
- Mark shipped + tracking attach
- Refund initiation
- Dispute response with evidence upload

### Commissions
- Quote workflow (`CommissionRequest` → `CommissionQuote`)
- Milestones (`CommissionMilestone`) with per-milestone release

### Communications
- DMs with buyers
- Broadcast composition (text + media)
- Audience targeting (followers, prior buyers)
- Templates (`BroadcastTemplate`)

### Money
- Earnings summary (gross, fees, net, pending)
- Payout history + per-payout detail
- Bank/SWIFT settings + audit log of changes (`PayoutSettingChange`)
- Storage plan upgrade

### Profile
- Public profile page
- Custom links (social, portfolio)
- Spotlight applications (`CreatorSpotlight`)
- Guestbook (`CreatorGuestbook`)
- Tipping / support tiers (`SupportTier`, `SupportSubscription`)

## Admin-facing

See [Admin tools](admin-tools) for the full breakdown. High level:

- Catalog moderation (creators, products, reviews)
- Money ops (orders, transactions, payouts, finance suite, chargebacks, disputes)
- Risk (fraud queue, CS workbench)
- Marketing (discounts, popups, announcements, email templates, CMS)
- Platform (agreements, KYC housekeeping, settings, staff/permissions)
- Knowledgebase (this thing)

## System / cross-cutting

- CSP per-request with strict-dynamic + nonce
- Hotlink protection on uploads
- Maintenance mode (Redis-backed flag)
- Cron heartbeats with stale-detection
- Audit logs (`AuditEvent`, `AdminAuditEvent`)
- Webhook dedupe (`ProcessedWebhookEvent`)
- File access logging (`PrivateFileAccess`, `DownloadAccessLog`)
- Reserve tracking (`PlatformReserve`, `PlatformReserveEntry`)
- Email delivery log (`EmailLog`)
- Newsletter subscribers (`NewsletterSubscriber`)
- Multi-language support (i18n scaffolding present, EN-only at launch)

## Deliberately not built (or deferred)

- **No mobile app** — PWA-friendly responsive web only.
- **No live chat** — async tickets + DMs.
- **No subscription/recurring product type** — support tiers serve creator-side recurring; product side is one-shot.
- **No multi-currency settlement** — all platform-side accounting in USD; display localizes only.
- **No public API** — admin/dashboard surfaces only.
