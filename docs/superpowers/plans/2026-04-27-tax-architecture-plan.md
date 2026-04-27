# Tax Architecture & Statements of Account — Implementation Plan

> **For agentic workers:** This plan is executed via Subagent-Driven Development. Each phase dispatches a fresh general-purpose subagent. Phase boundaries are user-approval gates. Commits land at phases 3, 6, 9. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a country-aware tax architecture for the noizu.direct escrow marketplace that handles platform-side obligations (Indonesia PPh withholding, deemed-supplier collection, platform fee tax) while explicitly avoiding creator-tax paternalism. Includes onboarding qualification, creator + admin tax statements (searchable by month/year, PDF-exportable), and tiered creator-country activation.

**Architecture:** Country-variability lives in `src/lib/countries.ts` as a single source of truth. The 3-layer tax engine (Layer 1 origin, Layer 2 destination, Layer 3 corporate) is preserved; this plan activates Layer 1 for Indonesia and adds two new tax application points (creator's own sales tax opt-in, platform fee tax). Receipt and statement framing reflects the platform's escrow position via supply-chain attribution. Universal buyer support, tiered creator-country activation (10 SEA Tier 1 at launch).

**Tech Stack:** Next.js 16 (App Router, Turbopack), Prisma + Supabase Postgres, react-hook-form + zod, existing PDF infra (`src/lib/pdf/`), Airwallex payouts, Playwright for visual verification.

**Spec:** `docs/superpowers/specs/2026-04-27-tax-architecture-design.md` (read this fully before starting any phase).

**Standing constraints:**
- DO NOT push to production. Local commits only. User explicitly approves prod deploy.
- DO NOT skip git hooks (no `--no-verify`).
- Commits at phases 3, 6, 9 only — not after each phase.
- After every phase, stop and await user approval before next phase.
- DB push to dev DB is allowed if needed.
- Existing 3-layer tax engine code must not break — refactors preserve all public APIs.

---

## File structure overview

| File | Responsibility | Phase |
|---|---|---|
| `src/lib/countries.ts` | Single source of truth for country metadata (tier, tax, payout-rail, shipping-zone) | 1 |
| `src/lib/destination-tax.ts` | Layer 2 engine — refactored to read from `countries.ts` | 1 |
| `src/lib/tax-thresholds.ts` | Threshold tracker — refactored to read from `countries.ts` | 1 |
| `src/lib/shipping.ts` | Country list — re-exports from `countries.ts`; keeps zone helpers | 1 |
| `src/lib/payout-rail.ts` | SWIFT countries — re-exports from `countries.ts` | 1 |
| `prisma/schema.prisma` | New CreatorProfile + Order + PlatformSettings + CreatorWaitlist columns | 2 |
| `prisma/migrations/0013_tax_architecture/migration.sql` | Single migration; nullable + default columns | 2 |
| `src/app/dashboard/onboarding/tax/page.tsx` | Post-approval tax qualification step | 3 |
| `src/app/dashboard/onboarding/tax/TaxOnboardingForm.tsx` | Form (country, individual/business, tax-ID, ack) | 3 |
| `src/app/api/dashboard/onboarding/tax/route.ts` | POST handler | 3 |
| `src/app/api/creator-waitlist/route.ts` | Capture email + country for unsupported creators | 3 |
| `src/content/legal/tax-indemnification.md` | Indemnification clause text (versioned) | 3 |
| `src/lib/origin-tax.ts` | Layer 1 engine — `computeOriginTax(creatorCountry, amount, listingType)` | 4 |
| `src/app/api/airwallex/payment-intent/route.ts` | Populate `Order.creatorCountry` + origin/sales/fee tax fields at order time | 4, 7, 8 |
| `src/app/api/cron/payout/route.ts` (or similar) | Aggregate origin tax + accrue to TAX_ORIGIN reserve at payout | 4 |
| `src/app/dashboard/finance/tax/page.tsx` | Creator tax statement | 5 |
| `src/app/dashboard/finance/tax/TaxStatementClient.tsx` | Client component (filters, month/year search) | 5 |
| `src/app/api/dashboard/finance/tax/route.ts` | GET data | 5 |
| `src/app/api/dashboard/finance/tax/export/route.ts` | PDF export | 5 |
| `src/app/api/dashboard/finance/tax/pph-certificate/route.ts` | Annual PPh cert PDF | 5 |
| `src/lib/pdf/CreatorTaxStatement.tsx` | PDF renderer | 5 |
| `src/lib/pdf/PPhCertificate.tsx` | PPh certificate PDF renderer | 5 |
| `src/app/admin/finance/tax/page.tsx` | Extended admin tax dashboard | 6 |
| `src/app/admin/finance/tax/AdminTaxClient.tsx` | Tabs, filters, month/year search, PDF export | 6 |
| `src/app/api/admin/finance/tax/origin/route.ts` | DJP filing aggregate | 6 |
| `src/app/api/admin/finance/exports/origin-tax/route.ts` | DJP-filing-ready report | 6 |
| `src/app/api/admin/finance/tax/creator-sales/route.ts` | Per-creator sales-tax view | 6 |
| `src/app/api/admin/finance/tax/platform-fee/route.ts` | Platform fee tax aggregate | 6 |
| `src/app/dashboard/finance/tax/sales-tax-opt-in/page.tsx` | Creator opt-in flow | 7 |
| `src/app/dashboard/finance/tax/sales-tax-opt-in/SalesTaxOptInForm.tsx` | Form + cert upload | 7 |
| `src/app/api/dashboard/finance/tax/sales-tax-request/route.ts` | Submit opt-in request | 7 |
| `src/app/admin/creators/sales-tax-applications/page.tsx` | Admin approval queue | 7 |
| `src/app/admin/creators/sales-tax-applications/SalesTaxApplicationActions.tsx` | Approve/reject UI | 7 |
| `src/app/api/admin/creators/[id]/sales-tax/route.ts` | PATCH approve/reject | 7 |
| `src/app/account/orders/[id]/OrderDetailClient.tsx` | Buyer receipt with escrow framing + new tax lines | 8 |
| `src/lib/pdf/PurchaseReceipt.tsx` | PDF receipt with escrow framing + new tax lines | 8 |
| `src/content/legal/escrow-disclosure.md` | Footer disclaimer text | 8 |
| `src/lib/platform-fee-tax.ts` | `computePlatformFeeTax(country, side, amount)` — dormant logic | 8 |
| `prisma/seeds/tax-seed.ts` | Seed creators (MY individual, ID individual, SG registered-business) + sample orders | 9 |
| `tests/visual/tax-pages.spec.ts` | Playwright visual smoke tests | 9 |

---

## Phase 1 — Country rules unification (refactor, no behavior change)

**Subagent dispatch:** general-purpose. Scope: refactor only — extract `src/lib/countries.ts`, refactor four consumer files to read from it, ensure no public API changes.

**Files:**
- Create: `src/lib/countries.ts`
- Modify: `src/lib/destination-tax.ts`, `src/lib/tax-thresholds.ts`, `src/lib/shipping.ts`, `src/lib/payout-rail.ts`

- [ ] **1.1 Create `src/lib/countries.ts`** with:
  - `CountryRecord` interface per spec §6.1
  - `COUNTRIES: Record<string, CountryRecord>` covering Tier 1 (10 SEA, all `creatorOnboardingEnabled: true`), Tier 2 (UK/AU/NZ/JP/KR/CA/HK/TW, all `creatorOnboardingEnabled: false`), Tier 3 (US, EU member states — DE/FR/IT/ES/NL/SE/IE — all `creatorOnboardingEnabled: false`)
  - Helpers: `countryFor(iso2)`, `isCreatorCountrySupported(iso2)`, `originTaxRate(creatorCountry)`, `tier1Countries()`, `enabledCreatorCountries()`
  - ID's `creatorOriginTax` configured: `{ rate: 0.005, label: 'PPh Final', appliesTo: 'ALL_PAYOUTS', individualThreshold: null }`
  - All other countries' `creatorOriginTax: null`
  - Destination tax rates from existing `destination-tax.ts` (MY 8%, SG 9%, ID 11%, TH 7%, PH 12%) — preserve

- [ ] **1.2 Refactor `src/lib/destination-tax.ts`** to source rates and metadata from `countries.ts`. Public API (`resolveDestinationTax`, `destinationTaxFromMap`, `loadEnabledTaxCountries`) preserved. Existing callers (payment-intent route, admin finance) unchanged.

- [ ] **1.3 Refactor `src/lib/tax-thresholds.ts`** to source `TAX_JURISDICTIONS` from `countries.ts`. Public API (`jurisdictionFor`, `thresholdStatus`) preserved.

- [ ] **1.4 Refactor `src/lib/shipping.ts`** to source `SHIPPING_COUNTRIES` from `countries.ts`. Keep zone helpers (`SHIPPING_ZONES`, `parseShippingMap`, etc.). Public API preserved.

- [ ] **1.5 Refactor `src/lib/payout-rail.ts`** to derive `SWIFT_COUNTRIES` from `countries.ts` (countries where `payoutRail === 'SWIFT'`). Public API preserved.

- [ ] **1.6 Run typecheck.** `npx tsc --noEmit` must pass with zero errors in shipping/tax/payout files. Pre-existing errors in `scripts/recrawl-*` files are acceptable (per Shipping V2 baseline).

- [ ] **1.7 Verify no behavior regression.** Spot-check that admin finance tax dashboard still loads, payment-intent still snapshots tax. (No automated test required this phase — refactor verified by typecheck + smoke.)

**Success criteria:** `countries.ts` is the single source of truth; all four consumers read from it; typecheck passes; no public API changes.

**Phase boundary: STOP. User approval required before Phase 2.**

---

## Phase 2 — Schema migration + db push

**Subagent dispatch:** general-purpose. Scope: schema changes to `prisma/schema.prisma`, generate migration, apply to dev DB.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/0013_tax_architecture/migration.sql`

- [ ] **2.1 Update `prisma/schema.prisma`:**
  - `CreatorProfile`: add 9 columns per spec §5.1 (`creatorClassification`, `taxOnboardingAcknowledgedAt`, `taxOnboardingTosVersion`, `collectsSalesTax`, `salesTaxRate`, `salesTaxLabel`, `salesTaxStatus`, `salesTaxApprovedAt`, `salesTaxApprovedBy`, `salesTaxCertificateUrl`)
  - `Order`: add 7 columns per spec §5.2 (`creatorCountry`, `creatorSalesTaxAmountUsd`, `creatorSalesTaxRatePercent`, `creatorSalesTaxLabel`, `platformFeeBuyerTaxUsd`, `platformFeeBuyerTaxRate`, `platformFeeCreatorTaxUsd`, `platformFeeCreatorTaxRate`)
  - `PlatformSettings`: add `platformFeeTax String @default("{}")`
  - New model `CreatorWaitlist` per spec §5.4

- [ ] **2.2 Create migration SQL.** Create the directory and `migration.sql` with `ALTER TABLE` statements + new `CreatorWaitlist` table. All columns nullable or defaulted; no data backfill required.

- [ ] **2.3 Apply migration to dev DB.** Use the direct URL workaround (Supabase pooler can't run `prisma db push`):
  ```bash
  DATABASE_URL="$DATABASE_URL_DIRECT" npx prisma db execute --file prisma/migrations/0013_tax_architecture/migration.sql
  npx prisma migrate resolve --applied 0013_tax_architecture
  npx prisma generate
  ```

- [ ] **2.4 Restart dev server** to bust the cached `PrismaClient` (per `feedback_prisma_dev_restart.md`):
  ```bash
  taskkill /PID <next-dev-pid> /F /T
  rm -rf .next/dev
  npm run dev
  ```
  (Subagent should report current PID and wait for user instruction if needed.)

- [ ] **2.5 Run typecheck.** Verify the generated Prisma client compiles with new columns referenced in dummy reads.

**Success criteria:** Migration applied to dev DB, `prisma generate` produces new client types, typecheck passes, dev server restarted.

**Phase boundary: STOP. User approval required before Phase 3.**

---

## Phase 3 — Onboarding tax step (UI + API + waitlist + Tier 1 dropdown)

**Subagent dispatch:** general-purpose. Scope: build the post-approval onboarding tax page + API + waitlist endpoint + indemnification copy.

**Files:**
- Create: `src/app/dashboard/onboarding/tax/page.tsx`
- Create: `src/app/dashboard/onboarding/tax/TaxOnboardingForm.tsx`
- Create: `src/app/api/dashboard/onboarding/tax/route.ts`
- Create: `src/app/api/creator-waitlist/route.ts`
- Create: `src/content/legal/tax-indemnification.md`
- Modify: `src/app/dashboard/onboarding/page.tsx` (gate next-step logic on `taxOnboardingAcknowledgedAt`)
- Modify: `src/app/(auth)/register/creator/page.tsx` (country dropdown filtered to Tier 1, with waitlist link for unsupported)

- [ ] **3.1 Write `src/content/legal/tax-indemnification.md`** with the canonical indemnification clause text. Include version date `2026-04-27` in frontmatter.

- [ ] **3.2 Build `TaxOnboardingForm.tsx`** as react-hook-form + zod client component:
  - Country dropdown (default detected from `x-vercel-ip-country`, filtered to `enabledCreatorCountries()`)
  - Individual / Registered Business radio
  - Conditional tax-ID + tax-jurisdiction inputs (shown if business)
  - Indemnification ack checkbox + clause text
  - Submit button → POST `/api/dashboard/onboarding/tax`
  - Show inline error toasts on validation failures

- [ ] **3.3 Build `src/app/dashboard/onboarding/tax/page.tsx`** server wrapper:
  - Auth guard: must be approved creator
  - Read existing CreatorProfile values; pre-populate form
  - If `taxOnboardingAcknowledgedAt` already set, redirect to next onboarding step
  - Render `<TaxOnboardingForm/>`

- [ ] **3.4 Build `POST /api/dashboard/onboarding/tax/route.ts`:**
  - Validate body with zod (country in enabled-creator-list, classification enum, tax-ID format if business)
  - Update CreatorProfile: `creatorClassification`, `taxId`, `taxJurisdiction`, `payoutCountry` (sync from country if not set), `taxOnboardingAcknowledgedAt = now()`, `taxOnboardingTosVersion = '2026-04-27'`
  - Return updated profile JSON

- [ ] **3.5 Build `POST /api/creator-waitlist/route.ts`:**
  - Validate body (email + country ISO-2)
  - Insert into `CreatorWaitlist`
  - Return success JSON

- [ ] **3.6 Modify `src/app/(auth)/register/creator/page.tsx`:**
  - Add country dropdown: only Tier 1 countries
  - "Don't see your country? Join waitlist" link → modal or separate page that POSTs to `/api/creator-waitlist`

- [ ] **3.7 Modify `src/app/dashboard/onboarding/page.tsx`:**
  - Add tax-onboarding step in the flow
  - Gate "Continue to next step" on `taxOnboardingAcknowledgedAt` being set

- [ ] **3.8 Smoke-test in browser.** Sign in as an approved creator (or create one via seed in phase 9 — for now use existing test creator). Visit `/dashboard/onboarding/tax`, fill form, submit. Verify CreatorProfile updated in DB.

- [ ] **3.9 Typecheck.** Zero errors.

**Success criteria:** Onboarding flow captures classification, tax-ID, country, ack timestamp + ToS version. Waitlist endpoint accepts unsupported countries. Tier 1 countries surface in register dropdown.

**Phase boundary: STOP. User approval required.**

### Commit gate (after Phase 3 approval)

After user approves Phase 3, run:

```bash
git add prisma/ src/lib/countries.ts src/lib/destination-tax.ts src/lib/tax-thresholds.ts src/lib/shipping.ts src/lib/payout-rail.ts src/app/dashboard/onboarding/ src/app/api/dashboard/onboarding/tax/ src/app/api/creator-waitlist/ src/content/legal/tax-indemnification.md src/app/\(auth\)/register/creator/page.tsx
git commit -m "$(cat <<'EOF'
feat(tax): country-rules unification + schema migration + onboarding tax step

Phase 1-3 of tax architecture build (per docs/superpowers/specs/
2026-04-27-tax-architecture-design.md):

- src/lib/countries.ts becomes single source of truth for country metadata
  (tier, tax, payout-rail, shipping-zone). Existing destination-tax.ts /
  tax-thresholds.ts / shipping.ts / payout-rail.ts refactored to read from it.
  Public APIs preserved.
- Migration 0013_tax_architecture: CreatorProfile + Order + PlatformSettings
  columns for classification, sales-tax opt-in, platform fee tax, creator
  country snapshot. New CreatorWaitlist model. Applied to dev DB.
- Onboarding tax step at /dashboard/onboarding/tax: country (Tier 1 only)
  + individual/business + tax-ID + indemnification ack. Waitlist for
  unsupported countries.

Local only. NOT pushed. NOT deployed.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git tag savepoint-tax-phase-1-3-2026-04-27
```

---

## Phase 4 — Indonesia PPh withholding engine

**Subagent dispatch:** general-purpose. Scope: implement Layer 1 — origin tax computation, snapshot at order time, aggregate at payout.

**Files:**
- Create: `src/lib/origin-tax.ts`
- Modify: `src/app/api/airwallex/payment-intent/route.ts` (snapshot `Order.creatorCountry` + `creatorTaxAmountUsd` + `creatorTaxRatePercent`)
- Modify: `src/app/api/cron/payout/route.ts` (or wherever payouts are computed — locate via grep for `payoutBlocked` or `Transaction` create)
- Modify: `src/lib/reserves.ts` (add `TAX_ORIGIN` reserve handling if not present)

- [ ] **4.1 Build `src/lib/origin-tax.ts`** per spec §7.2:
  ```ts
  import { countryFor } from './countries'
  
  export function computeOriginTax(
    creatorCountry: string | null,
    orderAmountUsd: number,
    listingType: 'PHYSICAL' | 'POD' | 'DIGITAL' | 'COMMISSION',
  ): { rate: number; amountUsd: number; label: string | null } {
    if (!creatorCountry) return { rate: 0, amountUsd: 0, label: null }
    const country = countryFor(creatorCountry)
    if (!country?.creatorOriginTax) return { rate: 0, amountUsd: 0, label: null }
    
    const { rate, label, appliesTo } = country.creatorOriginTax
    if (appliesTo === 'ROYALTY_OR_SERVICES' && (listingType === 'PHYSICAL' || listingType === 'POD')) {
      return { rate: 0, amountUsd: 0, label }
    }
    return { rate, amountUsd: Math.round(orderAmountUsd * rate), label }
  }
  ```

- [ ] **4.2 Modify `src/app/api/airwallex/payment-intent/route.ts`:**
  - At order creation, look up creator's `payoutCountry` (or fallback to `taxJurisdiction`)
  - Snapshot to `Order.creatorCountry`
  - Call `computeOriginTax(creatorCountry, order.subtotalUsd, product.type)` → `creatorTaxAmountUsd`, `creatorTaxRatePercent`
  - Save with order

- [ ] **4.3 Locate payout cron route.** Search for `Transaction` create + `payoutBlocked` references. Modify to:
  - Aggregate `Order.creatorTaxAmountUsd` per creator over the payout period
  - Set `Transaction.creatorTaxUsd = aggregate`
  - Reduce creator's payout amount by aggregate
  - Accrue aggregate to `PlatformReserve(kind='TAX_ORIGIN', scope=creatorCountry)` via existing reserve helpers

- [ ] **4.4 Verify reserve infrastructure.** If `TAX_ORIGIN` doesn't exist in `src/lib/reserves.ts`, add the kind. Pattern matches existing `TAX_DESTINATION_*`.

- [ ] **4.5 Manual smoke test.** Use a seeded ID creator + a test order; verify the order row has `creatorTaxAmountUsd > 0` after payment-intent. Trigger payout cron in dev (admin tool or direct call); verify reserve accrued.

- [ ] **4.6 Typecheck.** Zero errors.

**Success criteria:** ID creator orders snapshot 0.5% PPh; payout cron aggregates and accrues to `TAX_ORIGIN/ID` reserve; non-ID creators get $0 in tax fields.

**Phase boundary: STOP. User approval required before Phase 5.**

---

## Phase 5 — Creator tax statement page + PDF + PPh certificate

**Subagent dispatch:** general-purpose. Scope: creator-facing self-serve tax statement at `/dashboard/finance/tax`. Read-only views + PDF + PPh cert.

**Files:**
- Create: `src/app/dashboard/finance/tax/page.tsx`
- Create: `src/app/dashboard/finance/tax/TaxStatementClient.tsx`
- Create: `src/app/api/dashboard/finance/tax/route.ts`
- Create: `src/app/api/dashboard/finance/tax/export/route.ts`
- Create: `src/app/api/dashboard/finance/tax/pph-certificate/route.ts`
- Create: `src/lib/pdf/CreatorTaxStatement.tsx`
- Create: `src/lib/pdf/PPhCertificate.tsx`

- [ ] **5.1 Build `GET /api/dashboard/finance/tax/route.ts`:**
  - Auth: creator only
  - Query params: `from?`, `to?`, `month?`, `year?` (month/year takes precedence if both provided)
  - Return JSON with sections per spec §12.2 (earnings summary, withheld at payout, collected from buyers, collected by platform, sales by buyer country)
  - All amounts in USD cents; client formats

- [ ] **5.2 Build `TaxStatementClient.tsx`:**
  - Period filter dropdown (current month, last month, current quarter, current year, last year, custom)
  - Explicit month + year selects
  - Country filter (All / specific)
  - Sections rendered conditionally per spec §3.4 (zero amounts → no row)
  - "Print PDF" button → calls export endpoint
  - PPh certificate download (only if creator country is ID and at least one withheld payout exists)

- [ ] **5.3 Build `src/app/dashboard/finance/tax/page.tsx`:**
  - Server wrapper, auth guard, render `<TaxStatementClient/>`

- [ ] **5.4 Build `src/lib/pdf/CreatorTaxStatement.tsx`** PDF renderer using existing PDF infrastructure. Single page; sections match the on-screen layout; conditional rendering per zero-amount rule; escrow disclosure footer.

- [ ] **5.5 Build `GET /api/dashboard/finance/tax/export/route.ts`:**
  - Auth: creator
  - Render `<CreatorTaxStatement/>` with same query as the page endpoint
  - Return `application/pdf` with `Content-Disposition: attachment; filename="tax-statement-{year}-{month}.pdf"`

- [ ] **5.6 Build `src/lib/pdf/PPhCertificate.tsx`** annual PPh certificate. Includes creator's full name, tax-ID, total withheld for year, breakdown by month, platform's tax agent details (placeholder for now).

- [ ] **5.7 Build `GET /api/dashboard/finance/tax/pph-certificate/route.ts`:**
  - Auth: creator + must be ID country + must have withheld payouts in target year
  - Render `<PPhCertificate/>` for `?year=2026`
  - Return PDF

- [ ] **5.8 Smoke test.** Visit `/dashboard/finance/tax` as the seeded ID creator; verify all sections render or hide correctly; download PDF and visually verify; download PPh certificate.

- [ ] **5.9 Typecheck.**

**Success criteria:** Creator can view, filter by month/year, and PDF-export their tax statement. ID creators can download annual PPh certificate.

**Phase boundary: STOP. User approval required before Phase 6.**

---

## Phase 6 — Admin tax dashboard enhancements

**Subagent dispatch:** general-purpose. Scope: extend `/admin/finance/tax` with tabs, filters, month/year search, PDF export, DJP filing endpoints.

**Files:**
- Modify: `src/app/admin/finance/tax/page.tsx`
- Create: `src/app/admin/finance/tax/AdminTaxClient.tsx`
- Create: `src/app/api/admin/finance/tax/origin/route.ts`
- Create: `src/app/api/admin/finance/exports/origin-tax/route.ts`
- Create: `src/app/api/admin/finance/tax/creator-sales/route.ts`
- Create: `src/app/api/admin/finance/tax/platform-fee/route.ts`
- Modify: `src/app/api/admin/finance/exports/tax/route.ts` (add `format=pdf` mode)

- [ ] **6.1 Refactor existing admin tax page** into a tabbed layout. Preserve current per-country GMV + threshold tracker as the "Destination" tab.

- [ ] **6.2 Build `AdminTaxClient.tsx`** with five tabs: Destination, Creator-Origin (PPh), Reverse-Charge B2B, Creator's Sales Tax, Platform Fee Tax. Each tab fetches from its own endpoint.

- [ ] **6.3 Add common filters** above tabs: creator typeahead, date-range picker, explicit month/year selects, country filter. State syncs to URL params for deep-linking.

- [ ] **6.4 Build `GET /api/admin/finance/tax/origin/route.ts`:**
  - Aggregate `Order.creatorTaxAmountUsd` grouped by creator + month
  - Filter by `country` (default ID), `period` (`YYYY-MM`)
  - Returns array of `{ creator, taxId, totalWithheldUsd, orderCount }`

- [ ] **6.5 Build `GET /api/admin/finance/exports/origin-tax/route.ts`:**
  - Same query as 6.4
  - `format=csv` (default) or `format=pdf`
  - PDF rendered via existing infra; CSV via standard library

- [ ] **6.6 Build `GET /api/admin/finance/tax/creator-sales/route.ts`:**
  - Per-creator aggregation of `Order.creatorSalesTaxAmountUsd`
  - Filter by creator, period

- [ ] **6.7 Build `GET /api/admin/finance/tax/platform-fee/route.ts`:**
  - Aggregate `Order.platformFeeBuyerTaxUsd + platformFeeCreatorTaxUsd` grouped by country + month
  - Filter by period

- [ ] **6.8 Add PDF export** to existing `/api/admin/finance/exports/tax/route.ts`. Detect `format=pdf` query and render via PDF infra; CSV path unchanged.

- [ ] **6.9 Smoke test.** Visit `/admin/finance/tax` as admin; switch tabs; apply filters; download PDFs and CSVs from each tab.

- [ ] **6.10 Typecheck.**

**Success criteria:** Admin can view + filter + month/year search + PDF-export per tax type. DJP-filing-ready report available for ID PPh.

**Phase boundary: STOP. User approval required.**

### Commit gate (after Phase 6 approval)

```bash
git add src/lib/origin-tax.ts src/app/api/airwallex/payment-intent/route.ts src/app/api/cron/payout/ src/lib/reserves.ts src/app/dashboard/finance/tax/ src/app/api/dashboard/finance/tax/ src/lib/pdf/CreatorTaxStatement.tsx src/lib/pdf/PPhCertificate.tsx src/app/admin/finance/tax/ src/app/api/admin/finance/tax/ src/app/api/admin/finance/exports/
git commit -m "$(cat <<'EOF'
feat(tax): ID PPh withholding + creator/admin tax statements

Phase 4-6 of tax architecture build:

- Layer 1 origin-tax engine: 0.5% PPh Final on every ID creator payout,
  per-order snapshot at payment-intent time, aggregated to TAX_ORIGIN/ID
  reserve at payout cron. Other countries' creators get $0 (engine
  framework supports future activations).
- Creator tax statement at /dashboard/finance/tax: month/year searchable,
  conditional section rendering (zero amounts hidden), PDF export, ID
  creators get annual PPh certificate download.
- Admin tax dashboard at /admin/finance/tax: 5 tabs (Destination,
  Creator-Origin, Reverse-Charge, Creator's Sales Tax, Platform Fee),
  creator typeahead + month/year filters, DJP-filing CSV + PDF for ID PPh.

Local only. NOT pushed. NOT deployed.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git tag savepoint-tax-phase-4-6-2026-04-27
```

---

## Phase 7 — Creator's sales tax opt-in flow + admin approval queue

**Subagent dispatch:** general-purpose. Scope: opt-in form for registered-business creators + admin approval state machine.

**Files:**
- Create: `src/app/dashboard/finance/tax/sales-tax-opt-in/page.tsx`
- Create: `src/app/dashboard/finance/tax/sales-tax-opt-in/SalesTaxOptInForm.tsx`
- Create: `src/app/api/dashboard/finance/tax/sales-tax-request/route.ts`
- Create: `src/app/admin/creators/sales-tax-applications/page.tsx`
- Create: `src/app/admin/creators/sales-tax-applications/SalesTaxApplicationActions.tsx`
- Create: `src/app/api/admin/creators/[id]/sales-tax/route.ts`
- Create: `src/app/api/admin/creators/[id]/sales-tax/upload-url/route.ts` (or reuse existing upload infra)

- [ ] **7.1 Build `SalesTaxOptInForm.tsx`:**
  - Pre-condition check: `creatorClassification === 'REGISTERED_BUSINESS'` + `taxId` populated. If not, show "Complete tax onboarding first" with link.
  - Inputs: rate (numeric, 0-25%), label (SST/GST/VAT), certificate file upload
  - Submit → POST `/api/dashboard/finance/tax/sales-tax-request`
  - State display: NONE / REQUESTED (pending) / APPROVED / REJECTED

- [ ] **7.2 Build `POST /api/dashboard/finance/tax/sales-tax-request/route.ts`:**
  - Auth: creator
  - Pre-condition: classification + tax-ID
  - Upload cert to existing private file storage (reuse infra from KYC)
  - Update CreatorProfile: `salesTaxStatus = 'REQUESTED'`, `salesTaxRate`, `salesTaxLabel`, `salesTaxCertificateUrl`
  - Don't enable `collectsSalesTax` yet — admin approval flips that

- [ ] **7.3 Build admin queue page** at `/admin/creators/sales-tax-applications`:
  - List CreatorProfile WHERE `salesTaxStatus = 'REQUESTED'`
  - Show creator name, country, claimed rate/label, certificate preview link
  - Approve / Reject buttons (with optional rejection reason)

- [ ] **7.4 Build `PATCH /api/admin/creators/[id]/sales-tax/route.ts`:**
  - Auth: admin
  - Body: `{ action: 'APPROVE' | 'REJECT', reason? }`
  - On approve: `salesTaxStatus = 'APPROVED'`, `salesTaxApprovedAt`, `salesTaxApprovedBy`, `collectsSalesTax = true`
  - On reject: `salesTaxStatus = 'REJECTED'`, store reason in audit log
  - Email notification to creator (use existing email infra)

- [ ] **7.5 Smoke test.** As registered-business creator: submit opt-in. As admin: approve. Verify next order from this creator gets `creatorSalesTaxAmountUsd > 0`.

- [ ] **7.6 Typecheck.**

**Success criteria:** Opt-in flow gated on classification + admin approval. Approved creators have sales tax applied at order time.

**Phase boundary: STOP. User approval required before Phase 8.**

---

## Phase 8 — Buyer checkout + receipt rendering + platform fee tax scaffolding

**Subagent dispatch:** general-purpose. Scope: receipt + checkout escrow framing + conditional tax line rendering + platform fee tax dormant infrastructure.

**Files:**
- Create: `src/lib/platform-fee-tax.ts`
- Create: `src/content/legal/escrow-disclosure.md`
- Modify: `src/app/account/orders/[id]/OrderDetailClient.tsx`
- Modify: `src/lib/pdf/PurchaseReceipt.tsx`
- Modify: `src/app/api/airwallex/payment-intent/route.ts` (compute platform fee tax + creator's sales tax + populate fields)
- Modify: checkout summary client component (locate via grep — wherever `subtotalUsd / buyerFeeUsd / shippingCostUsd` appear together client-side)

- [ ] **8.1 Build `src/lib/platform-fee-tax.ts`:**
  ```ts
  import { prisma } from './prisma'
  
  export async function computePlatformFeeTax(
    side: 'BUYER' | 'CREATOR',
    country: string | null,
    feeAmountUsd: number,
  ): Promise<{ rate: number; amountUsd: number; label: string | null }> {
    if (!country || feeAmountUsd === 0) return { rate: 0, amountUsd: 0, label: null }
    const settings = await prisma.platformSettings.findFirst()
    const map = JSON.parse(settings?.platformFeeTax ?? '{}')
    const rule = map[country]
    if (!rule?.enabled || !rule.sides.includes(side)) {
      return { rate: 0, amountUsd: 0, label: null }
    }
    return {
      rate: rule.rate,
      amountUsd: Math.round(feeAmountUsd * rule.rate),
      label: rule.label,
    }
  }
  ```

- [ ] **8.2 Build creator's sales tax computation helper.** Inline or in a small `src/lib/creator-sales-tax.ts`:
  ```ts
  export function computeCreatorSalesTax(
    profile: CreatorProfile,
    subtotalUsd: number,
    shippingUsd: number,
  ): { rate: number; amountUsd: number; label: string | null } {
    if (
      profile.creatorClassification !== 'REGISTERED_BUSINESS' ||
      !profile.collectsSalesTax ||
      profile.salesTaxStatus !== 'APPROVED' ||
      !profile.salesTaxRate
    ) {
      return { rate: 0, amountUsd: 0, label: null }
    }
    const taxableBase = subtotalUsd + shippingUsd
    return {
      rate: profile.salesTaxRate,
      amountUsd: Math.round(taxableBase * profile.salesTaxRate),
      label: profile.salesTaxLabel ?? null,
    }
  }
  ```

- [ ] **8.3 Modify payment-intent route** to compute and snapshot:
  - `computeCreatorSalesTax` → `creatorSalesTaxAmountUsd`, `creatorSalesTaxRatePercent`, `creatorSalesTaxLabel`
  - `computePlatformFeeTax('BUYER', buyerCountry, buyerFeeUsd)` → `platformFeeBuyerTaxUsd`, `platformFeeBuyerTaxRate`
  - `computePlatformFeeTax('CREATOR', creatorCountry, creatorCommissionUsd)` → `platformFeeCreatorTaxUsd`, `platformFeeCreatorTaxRate`
  - Add to `grandTotalUsd` calculation: + creatorSalesTax + platformFeeBuyerTax (only buyer-side affects buyer total)

- [ ] **8.4 Write `src/content/legal/escrow-disclosure.md`** with the footer disclaimer text per spec §3.3.

- [ ] **8.5 Modify `src/app/account/orders/[id]/OrderDetailClient.tsx`** to render:
  - "FROM CREATOR" section: listing price, shipping (with "fulfilled by creator" note), creator portion subtotal
  - "FROM noizu.direct" section: service fee
  - Subtotal
  - Conditional tax lines (skip if zero):
    - Seller's [LABEL] (rate%) — `creatorSalesTaxAmountUsd`
    - Service-fee [LABEL] (rate%) — `platformFeeBuyerTaxUsd`
    - [BUYER_COUNTRY] [LABEL] (rate%) — `destinationTaxAmountUsd`
  - Total
  - Footer: render `escrow-disclosure.md` content

- [ ] **8.6 Modify `src/lib/pdf/PurchaseReceipt.tsx`** with same structure.

- [ ] **8.7 Modify checkout summary** (the page where buyer sees totals before payment). Same conditional rendering rule.

- [ ] **8.8 Smoke test.**
  - Order from MY individual creator → MY buyer: only creator-portion + service fee + total visible. No tax lines.
  - Order from approved registered-business creator → MY buyer: creator's SST line visible.
  - Toggle a country in `PlatformSettings.platformFeeTax` to enabled in DB; place an order; verify service-fee tax line appears.

- [ ] **8.9 Typecheck.**

**Success criteria:** Buyer-facing checkout, receipt page, and PDF receipt all render escrow framing + conditional tax lines. Platform fee tax dormant but flippable per country via `PlatformSettings`.

**Phase boundary: STOP. User approval required before Phase 9.**

---

## Phase 9 — Seed data + Playwright visual verification

**Subagent dispatch:** general-purpose. Scope: build seed script for tax-relevant scenarios + Playwright smoke tests across all new pages.

**Files:**
- Create: `prisma/seeds/tax-seed.ts`
- Create: `tests/visual/tax-pages.spec.ts`
- Modify: `prisma/seed.ts` or package.json script (add tax-seed entry point)

- [ ] **9.1 Build `prisma/seeds/tax-seed.ts`** that creates:
  - 1 MY individual creator (no tax-ID, classification=INDIVIDUAL)
  - 1 ID individual creator (no tax-ID, classification=INDIVIDUAL — for PPh testing)
  - 1 SG registered-business creator (with tax-ID, classification=REGISTERED_BUSINESS, salesTaxStatus=REQUESTED, sample cert URL)
  - 1 SG registered-business creator with salesTaxStatus=APPROVED, collectsSalesTax=true, salesTaxRate=0.09, salesTaxLabel='GST'
  - 5-10 sample orders per creator across the past 6 months, with a mix of buyer countries (MY, SG, ID, US, JP)
  - Verify orders have `creatorCountry`, `creatorTaxAmountUsd` (for ID), `creatorSalesTaxAmountUsd` (for approved SG), populated.

- [ ] **9.2 Run seed.** `npx tsx prisma/seeds/tax-seed.ts` (or via `npm run seed:tax` if script added).

- [ ] **9.3 Build Playwright spec `tests/visual/tax-pages.spec.ts`** that visits each new page as the appropriate user and asserts:
  - `/dashboard/onboarding/tax` (as new approved creator without ack): form renders, all fields visible, submit works
  - `/dashboard/finance/tax` (as MY individual): no tax lines, just earnings summary
  - `/dashboard/finance/tax` (as ID individual): PPh withheld section visible, certificate link
  - `/dashboard/finance/tax` (as approved SG business): collected-from-buyers section visible
  - PDF export endpoints return 200 + correct content-type
  - `/admin/finance/tax` (as admin): 5 tabs visible, switching works, filters work
  - `/admin/creators/sales-tax-applications` (as admin): one pending application visible
  - `/account/orders/[id]` (as buyer): escrow framing + conditional tax lines render correctly for at least three test orders

- [ ] **9.4 Run Playwright.** Capture screenshots for each page; eyeball for regressions / layout breaks. Report any visual issues.

- [ ] **9.5 Typecheck + final smoke test.** Manually click through each new page once more.

**Success criteria:** Seed produces reproducible test scenarios; all new pages render correctly across creator profiles; no Playwright failures.

**Phase boundary: STOP. User approval required.**

### Commit gate (after Phase 9 approval)

```bash
git add src/lib/platform-fee-tax.ts src/content/legal/escrow-disclosure.md src/app/dashboard/finance/tax/sales-tax-opt-in/ src/app/api/dashboard/finance/tax/sales-tax-request/ src/app/admin/creators/sales-tax-applications/ src/app/api/admin/creators/ src/app/account/orders/ src/lib/pdf/PurchaseReceipt.tsx prisma/seeds/tax-seed.ts tests/visual/tax-pages.spec.ts
git commit -m "$(cat <<'EOF'
feat(tax): sales-tax opt-in + buyer receipt escrow framing + seed + visual tests

Phase 7-9 of tax architecture build:

- Creator's sales-tax opt-in flow at /dashboard/finance/tax/sales-tax-opt-in
  with admin approval queue at /admin/creators/sales-tax-applications.
  State machine: NONE → REQUESTED → APPROVED/REJECTED.
- Buyer checkout, receipt page, and PDF receipt rewritten with escrow
  framing (FROM CREATOR / FROM noizu.direct sections, "fulfilled by
  creator" attribution, footer disclosure) and conditional tax-line
  rendering. Platform fee tax computation scaffolded (dormant; admin
  flips per country in PlatformSettings.platformFeeTax JSON).
- Tax seed script produces reproducible test creators (MY individual,
  ID individual, SG registered-business pending + approved) with sample
  orders. Playwright visual spec smoke-tests all new pages.

Local only. NOT pushed. NOT deployed.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git tag savepoint-tax-phase-7-9-2026-04-27
```

---

## Self-review checklist (run after writing this plan)

- [x] **Spec coverage:** Every section of the design spec maps to a phase task.
  - §3 architectural foundations → Phase 1, 4, 8
  - §4 country activation → Phase 1, 3
  - §5 schema → Phase 2
  - §6 countries.ts → Phase 1
  - §7 ID PPh → Phase 4
  - §8 onboarding → Phase 3
  - §9 creator's sales tax → Phase 2, 7, 8
  - §10 platform fee tax → Phase 2, 8
  - §11 application matrix → Phase 8
  - §12 creator statement → Phase 5
  - §13 admin dashboard → Phase 6
  - §14 buyer checkout/receipt → Phase 8
  - §16 phasing → matches plan structure
  - §17 risks → mitigations baked into phase tasks
- [x] **Placeholder scan:** No "TBD" / "TODO" / "implement later" / "similar to..." patterns. Code blocks present where steps require code.
- [x] **Type consistency:** `computeOriginTax`, `computePlatformFeeTax`, `computeCreatorSalesTax` signatures stable across phases. CountryRecord interface stable. Schema fields stable across phases.
