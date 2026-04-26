---
title: KYC & onboarding
description: How a person becomes a verified creator on the platform.
---

## Who needs KYC

Anyone selling on the platform — i.e., anyone whose products surface money flow. Buyers don't need KYC. Pure browsing/wishlist/follow doesn't need KYC.

## The flow

1. **Sign up** → standard email/password (or social) creates a `User` with no creator profile.
2. **Apply to sell** → user visits `/start-selling` (the canonical KYC application URL).
3. **Application form** → personal details, country, ID document upload, bank details, sample portfolio link.
4. **Documents go to private R2 bucket** → `KycUpload` rows reference object keys, never expose URLs publicly.
5. **Admin review** → `/admin/creators/applications` shows queue. Admin approves or rejects with reason.
6. **Approval** → `CreatorProfile` is created, user role flips to `CREATOR`, banner clears.
7. **Rejection** → user sees `RejectionBannerWrapper` on dashboard with reason; can re-apply.

## What we collect (and why)

| Field                         | Why |
|-------------------------------|-----|
| Full legal name               | Beneficiary match for payout |
| Date of birth + ID number     | Age verification (18+) + sanction screening |
| ID document (front/back)      | Identity verification |
| Selfie with ID                | Liveness / anti-impersonation |
| Country of residence + tax ID | Jurisdiction-aware tax + payout corridor |
| Bank account (IBAN/local)     | Where payouts go |
| Sample portfolio link         | Quality gate, copyright sanity check |

ID documents and selfies are stored in a **private R2 bucket** with restricted access. Access is logged in `PrivateFileAccess`; staff lookups are auditable in `/admin/staff/audit/file-access`.

## Approval criteria

Admin approves when:

- Identity documents match (face on ID, DOB, name).
- Sample portfolio is original work (not stock, not reseller).
- Country / payout combo is supported (see [Escrow & payouts](escrow-payouts)).
- No sanctioned-list match.

Rejection reasons land in `CreatorApplication.rejectionReason` and are emailed to the user.

## Re-application

A rejected user can resubmit after addressing the reason. Their previous application is preserved (audit) but a new `CreatorApplication` row is created.

## Document retention

- ID and KYC artifacts retained per local financial-records requirement (typically 5–7 years).
- Cron `kyc-orphan-cleanup` (daily 04:00 UTC implied via `/api/cron/creator-health` group) removes uploads from never-completed applications after 60 days.
- Manual purge available in `/admin/private-files/housekeeping`.

## Renewals / re-KYC

- KYC artifacts have an `expiresAt` field (ID expiry).
- 30 days before expiry, cron emails the creator to refresh.
- Past expiry: payouts pause (creator can still sell; funds accumulate in pool).
- Refresh flow: creator uploads new docs, admin re-approves quickly (full re-application not required).

## Edge cases handled

- **Underage applicant** → automatic reject in form validation; review queue should never see them.
- **Bank country ≠ residence country** → flagged but not auto-rejected; admin reviews context.
- **Beneficiary name mismatch** → admin can require corrected docs before approval.
- **Resubmission of identical docs** → admin sees the prior submission inline.

## Crons relevant here

- `creator-health` (daily 04:00 UTC) — refreshes derived creator scoring + flags stale KYC.
- `kyc-orphan-cleanup` — implied housekeeping; tracked in `CronHeartbeat`.

## Where the data lives

| Concept             | Model                  |
|---------------------|------------------------|
| User account        | `User`                 |
| Application form    | `CreatorApplication`   |
| Uploaded docs       | `KycUpload`            |
| Approved profile    | `CreatorProfile`       |
| Doc access log      | `PrivateFileAccess`    |
| Doc deletion log    | `PrivateFileDeletion`  |
