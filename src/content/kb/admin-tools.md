---
title: Admin tools
description: What every /admin page does and when to reach for it.
---

## Main

| Page                          | What it's for |
|-------------------------------|---------------|
| `/admin`                      | Stats overview + cron health. First stop every morning. |
| `/admin/kb`                   | This knowledgebase. |
| `/admin/creators`             | All creators (approved profiles). Suspend, view orders, edit. |
| `/admin/creators/applications`| KYC application review queue. Approve / reject. |
| `/admin/products`             | All products. Suppress trending, force-deactivate, edit. |
| `/admin/orders`               | Every order across the platform. Filter by status, creator, buyer. |
| `/admin/transactions`         | Money-record view (per `Transaction`). Reconcile against PSP. |
| `/admin/payouts`              | Pending / completed / failed payouts. Retry failed. |
| `/admin/finance`              | Finance suite home — links to four sub-areas: |
| `/admin/finance/ops`          | Day-to-day ops view (gross, fees, net, refunds). |
| `/admin/finance/tax`          | Per-jurisdiction collected destination tax + remit accrual. |
| `/admin/finance/insights`     | Cohort + trend analytics. |
| `/admin/finance/treasury`     | Reserves, working capital, sweep schedule. |
| `/admin/finance/reserves/[id]`| Per-reserve detail with movements. |
| `/admin/finance/exports/...`  | CSVs: monthly P&L, tax-by-country, creator earnings, payout register. |
| `/admin/chargebacks`          | Card-network chargebacks. Submit evidence, track ratio. |
| `/admin/disputes`             | Buyer-initiated disputes. Adjudicate. |
| `/admin/fraud`                | Fraud flag queue. Review + action. |
| `/admin/cs`                   | CS Workbench — ticket triage and reply. |
| `/admin/discounts`            | Discount code CRUD. |
| `/admin/emails`               | Email template editor + send-test + send-log. |
| `/admin/cms`                  | CMS pages (about, help, policies). |
| `/admin/cms/navigation`       | Navigation menu builder (mega-menu structure in `NavItem`). |
| `/admin/popups`               | Site-wide modal popup management. |
| `/admin/announcements`        | Top-of-page announcement bar (`AnnouncementBar`). |
| `/admin/media`                | Asset library across all uploads. |
| `/admin/settings`             | Platform settings: fees, maintenance toggle, tax-country enables. |

## Storage

| Page                          | What it's for |
|-------------------------------|---------------|
| `/admin/storage`              | Per-creator usage; oversoft / overhard flags. Comp bonus storage. |
| `/admin/storage/pricing`      | `StoragePricingConfig` — set plan prices and quotas. |

## Platform

| Page                          | What it's for |
|-------------------------------|---------------|
| `/admin/agreements`           | Versioned agreement templates (creator agreement, ToS). |
| `/admin/private-files/housekeeping` | Manual KYC retention purge. |
| `/admin/reviews`              | Moderate buyer reviews on products. |

## Staff (for admins managing the team)

| Page                          | What it's for |
|-------------------------------|---------------|
| `/admin/staff`                | Staff users CRUD. |
| `/admin/staff/roles`          | Role definitions. |
| `/admin/staff/permissions`    | Permission grid (per-action capabilities). |
| `/admin/staff/audit`          | All staff actions. Filter by user, action, date. |
| `/admin/staff/audit/file-access` | KYC + dispute file access log (sensitive). |

## How they're authorized

- **Main + Storage + Platform sections** — only `User.role === 'ADMIN'` (the operator) sees them.
- **Staff section** — visible to ADMIN OR to staff users with `staff.view` permission.
- **Action-level permissions** — finer-grained via `StaffPermission`. E.g., `payouts.refund`, `kyc.approve`, `disputes.adjudicate`.

The auth check pattern (`src/lib/staffPolicy.ts`):

```ts
const staffActor = await loadStaffActor()
if (!staffActor || !can(staffActor, 'payouts.refund')) redirect('/admin')
```

## Audit trail

Every action through admin tools that changes state writes either:

- `AdminAuditEvent` — for the operator (`User.role === 'ADMIN'`)
- `AuditEvent` — for staff users
- Domain-specific audit tables — `PayoutSettingChange`, `PrivateFileAccess`, `PrivateFileDeletion`

These are queryable via `/admin/staff/audit` and the per-domain audit pages.

## Common workflows

### Approving a creator
`/admin/creators/applications` → open application → review docs → click Approve / Reject (with reason).

### Resolving a dispute
`/admin/disputes` → open dispute → review auto-evidence + buyer/creator submissions → decide refund/release/partial.

### Comping a buyer
`/admin/cs` → open ticket → quick-action "Send discount code" → buyer receives auto-generated single-use code.

### Investigating a chargeback
`/admin/chargebacks` → open chargeback → review auto-packaged evidence → adjust / submit by deadline.

### Flipping maintenance
`/admin/settings` → toggle maintenance → wait 30s for cache. See [Maintenance mode](maintenance-mode) for full procedure.

### Adjusting fees
`/admin/settings` → fee section → adjust → save. New rates apply to *new* orders only; in-flight orders use the snapshot taken at intent-creation time.
