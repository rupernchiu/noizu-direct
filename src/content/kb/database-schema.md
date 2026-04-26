---
title: Database schema
description: Top-level Prisma models grouped by domain.
---

## Source of truth

`prisma/schema.prisma` is canonical. This page is a navigation aid — the schema file has the definitive field lists and indexes.

We use **`prisma db push`** (not `prisma migrate deploy`) to apply schema changes. Migration files in `prisma/migrations/` are kept for audit history but are not the apply path.

## Domain groupings

### Identity & access
- `User` — every account (buyer, creator, admin, staff)
- `CreatorProfile` — promoted user; one-to-one with User
- `StaffUser`, `StaffRole`, `StaffPermission`, `StaffUserPermission`
- `PasswordResetToken`
- `UserBlock`

### Catalog
- `Product`
- `ProductView` — analytics events
- `ProductTrendingScore` — score history with breakdown JSON
- `ProductRecommendation` — co-purchase pairs
- `ProductReview`
- `CreatorPodProvider` — print-on-demand integration metadata
- `CreatorGuestbook`
- `CreatorSpotlight`

### Orders & money
- `Order`
- `Transaction` — money record (PSP-side mirror)
- `EscrowTransaction` — held funds per order
- `Payout` — disbursement to creator
- `Invoice` — buyer-side itemized record
- `Dispute`, `DisputeEvidence`
- `ChargebackDispute`
- `CommissionRequest`, `CommissionQuote`, `CommissionMilestone`

### Reserves & accounting
- `PlatformReserve` — chargeback float, tax accrual, ops capital
- `PlatformReserveEntry` — movements
- `ProcessedWebhookEvent` — webhook dedupe
- `PayoutSettingChange` — audit of bank/SWIFT changes
- `FraudFlag`

### Content & marketing
- `Page` — CMS pages
- `Post` — blog posts
- `Section` — page sections
- `Media` — uploaded assets
- `Announcement`
- `PopupAd`
- `NavItem` — navigation tree (mega-menu data)
- `DiscountCode`

### Communications
- `Notification` — in-app system notifications
- `Broadcast`, `BroadcastNotification` — creator → followers
- `Ticket`, `TicketMessage`, `TicketAttachment`, `TicketReadMarker`
- `EmailLog`
- `NewsletterSubscriber`

### KYC & legal
- `KycUpload`
- `CreatorApplication`
- `AgreementTemplate`, `CreatorAgreement`
- `PrivateFileAccess`, `PrivateFileDeletion` — KYC/dispute file access audit

### Cart & wishlist
- `CartItem`
- `WishlistItem`
- `CreatorFollow`

### Storage
- `StoragePricingConfig`
- `StoragePurchase`
- `StorageSubscription`

### Support tipping
- `SupportTier`, `SupportGoal`, `SupportGift`
- `SupportTransaction`, `SupportSubscription`

### Misc / video
- `Video` — embedded video metadata
- `BuyerTag` — internal buyer tagging

### System
- `PlatformSettings` — single-row config (fees, tax, etc.)
- `CronHeartbeat` — scheduled-job health
- `AuditEvent`, `AdminAuditEvent` — action audit
- `DownloadAccessLog` — paid file access proof

## Notable conventions

- **Money in `usdCents` (Int)** — never floats. Display layer divides by 100.
- **JSON columns** for breakdowns (`ProductTrendingScore.breakdown`, `PlatformSettings.taxDestinationCountries`) — schema is documented in the consumer.
- **`*UpdatedAt` on rows that drive cron jobs** — `Product.trendingUpdatedAt`, `KycUpload.expiresAt`.
- **Soft-delete via `isActive` / `isSuppressed` flags**, not row deletion. Audit trail wins.
- **Per-domain audit trails** rather than one giant audit table — `PayoutSettingChange`, `PrivateFileAccess`, `AdminAuditEvent` each model their own concern.

## Enums worth knowing

- `BroadcastTemplate`, `BroadcastAudience` — `Broadcast` shaping
- `OrderStatus` — see [Order lifecycle](order-lifecycle)

## Index strategy

Indexes documented inline in `schema.prisma`. The hot ones:

- `(creatorId, createdAt)` on `Order` for creator dashboards
- `(buyerId, createdAt)` on `Order` for buyer history
- `trendingScore desc` on `Product` for landing
- `(category, isActive, isTrendingSuppressed)` on `Product` for category browse
- `(cronName)` PK on `CronHeartbeat`

## What's NOT in the schema

- **PSP raw payloads** — we keep the dedupe ID and the relevant fields, not the full webhook body. Stays in PSP dashboard.
- **Email bodies** — `EmailLog` keeps metadata + Resend message ID; full body retrievable from Resend.
- **Search index** — derived; not a stored model. Computed on read for now.
