---
title: Page map
description: Every public, dashboard, and admin route grouped by surface.
---

## Public surface

### Marketing / discovery
- `/` — landing
- `/explore` — browse all
- `/categories/[slug]` — category landing (Digital Art, Doujin, Cosplay Prints, etc.)
- `/creators` — creator directory
- `/creators/[username]` — creator storefront
- `/product/[id]` — product detail
- `/search` — search results
- `/start-selling` — KYC application landing (auth-gated)
- `/how-it-works` — explainer
- `/about`, `/contact`, `/help`

### Auth
- `/login`, `/register`, `/logout`
- `/auth/forgot-password`, `/auth/reset-password`
- `/staff/login` — admin/staff login (NOT `/admin/login`)

### Buyer account
- `/account` — overview
- `/account/orders` — order history
- `/account/orders/[id]` — order detail (download, dispute, mark-received)
- `/account/messages` — DMs / broadcast inbox
- `/account/wishlist`
- `/account/settings`
- `/account/broadcasts` — broadcast subscriptions
- `/cart`, `/checkout`

### Static / policy
- `/policies/terms`, `/policies/privacy`, `/policies/refund`, `/policies/shipping`
- `/fees-payouts`
- `/maintenance` (only shown when flag is on)

## Creator dashboard (`/dashboard`)

- `/dashboard` — overview, banners (KYC, payout, fulfillment reminders)
- `/dashboard/products` — listings CRUD
- `/dashboard/products/new`, `/dashboard/products/[id]/edit`
- `/dashboard/orders` — incoming orders
- `/dashboard/orders/[id]` — fulfilment view
- `/dashboard/commissions` — commission requests + active jobs
- `/dashboard/messages` — inbound DMs
- `/dashboard/broadcasts` — compose + history
- `/dashboard/earnings` — settlement view
- `/dashboard/earnings/payout` — payout history (was `/dashboard/payouts`)
- `/dashboard/storage` — quota + plan
- `/dashboard/analytics` — views, conversion
- `/dashboard/settings` — profile, links, preferences
- `/dashboard/settings/kyc` — KYC status (was `/dashboard/verification`)
- `/dashboard/settings/payout` — bank/SWIFT details
- `/dashboard/support` — open ticket

## Admin surface (`/admin`)

### Main
- `/admin` — overview (stats, cron health, recent orders)
- `/admin/kb` — this knowledgebase
- `/admin/creators`, `/admin/creators/applications`
- `/admin/products`
- `/admin/orders`
- `/admin/transactions`
- `/admin/payouts`
- `/admin/finance` — finance suite home
  - `/admin/finance/ops`, `/finance/tax`, `/finance/insights`, `/finance/treasury`
  - `/admin/finance/reserves/[id]`
  - `/admin/finance/exports/...`
- `/admin/chargebacks`
- `/admin/disputes`
- `/admin/fraud`
- `/admin/cs` — customer support workbench
- `/admin/discounts`
- `/admin/emails`
- `/admin/cms`, `/admin/cms/navigation`
- `/admin/popups`
- `/admin/announcements`
- `/admin/media`
- `/admin/settings`

### Storage
- `/admin/storage` — usage by creator
- `/admin/storage/pricing` — plan pricing config

### Platform
- `/admin/agreements` — agreement template manager
- `/admin/private-files/housekeeping` — KYC retention
- `/admin/reviews` — moderate reviews

### Staff
- `/admin/staff`, `/admin/staff/roles`, `/admin/staff/permissions`
- `/admin/staff/audit` — actions log
- `/admin/staff/audit/file-access` — KYC/dispute file access log

## API surface (`/api`)

Grouped roughly:

- `/api/auth/*` — NextAuth
- `/api/checkout/*` — intent creation, confirmation
- `/api/webhooks/airwallex` — payment events
- `/api/webhooks/resend` — email events
- `/api/cron/*` — scheduled jobs (see [Cron jobs](cron-jobs))
- `/api/account/*`, `/api/creator/*`, `/api/admin/*` — REST/RPC for the matching dashboards
- `/api/csp-report` — CSP violation sink
- `/api/upload`, `/api/uploads/[...path]` — R2 proxy with auth

Auth context is enforced per-route — admin routes call `loadStaffActor` + `can()`; dashboard routes call `auth()` + creator-role check.
