# Tax Architecture & Statements of Account — Design Spec

**Date:** 2026-04-27
**Status:** Approved (autonomous execution authorized)
**Author:** Claude (with rupert)
**Supersedes:** N/A — net-new architecture, builds on existing 3-layer tax engine

## 1. Goals

1. Capture creator tax-classification at onboarding so every downstream calculation has the inputs it needs.
2. Withhold Indonesia PPh Final 0.5% on every payout to ID creators — the only operationally active tax at launch.
3. Give creators a self-serve statement of account (per-country, with PDF, searchable by month/year).
4. Give admin a per-country, per-tax-type, per-creator filterable view + PDF for filings (searchable by month/year).
5. Country variability lives in **one** canonical lookup (`src/lib/countries.ts`), not scattered across three files.
6. Tier creator-country activation: 10 SEA at launch, ROW (Tier 2 / Tier 3) by waitlist + admin opt-in.
7. Receipt and statement framing must reflect the platform's escrow position — supply is creator → buyer; platform supplies escrow service only.

## 2. Non-goals

- Cross-border WHT lookup matrix (typed scaffold only; populate when traffic justifies).
- Minimum-payout aggregation (separable feature, defer to its own spec).
- Tax-API integration (Avalara / Fonoa / TaxJar). Future.
- US / EU creator onboarding (deemed-supplier traps require separate infrastructure).
- Creator-paternalism: no obligations education, no threshold meters for creators' own tax registration. Indemnification only.

## 3. Architectural foundations

### 3.1 Three-layer model (existing)

- **Layer 1 — Creator origin tax**: withholding deducted from creator's payout. ID PPh Final 0.5% is the only active rule at launch.
- **Layer 2 — Destination tax**: SST/GST/VAT collected from buyer when platform is deemed supplier in their country. Already shipped for MY/SG/ID/TH/PH; off by default per country until threshold crossed.
- **Layer 3 — Platform corporate tax**: annual P&L on profit, MY-resident entity. Out of scope for this spec; covered by existing monthly P&L export.

### 3.2 Two new tax application points

- **Creator's own sales tax** (opt-in for registered businesses): SST/GST/VAT charged on the sale at checkout, collected by platform, passed through in creator's payout for them to remit.
- **Platform fee tax** (admin-controlled per country): SST/GST/VAT on the platform's own commission and/or buyer-side service fee, applied per-country threshold-gated, with side selectors `('BUYER' | 'CREATOR')[]`.

### 3.3 Escrow framing

The platform never sells, ships, or takes title. Receipts and statements explicitly attribute every line to its actual party:

- "FROM CREATOR" — listing price + shipping (creator-fulfilled)
- "FROM noizu.direct" — escrow + payment-handling service fee
- Tax lines carry remittance attribution: "remitted by noizu.direct to RMCD on behalf of [creator]" / "remitted by creator to LHDN" etc.
- Footer disclaimer: "noizu.direct provides escrow and payment-handling for this transaction. Goods are sold and shipped by the creator."

### 3.4 Conditional rendering rule

Universal across all surfaces (buyer checkout, buyer receipt, creator statement, admin dashboard):

```
if (taxAmountUsd === 0) → do not render the line
```

No "0.00" rows, no "Not applicable" placeholders. If a tax doesn't apply, the line doesn't exist.

## 4. Country activation strategy

### 4.1 Tiered creator support

| Tier | Countries | At launch |
|---|---|---|
| 1 | 🇲🇾 🇸🇬 🇮🇩 🇹🇭 🇵🇭 🇻🇳 🇰🇭 🇲🇲 🇱🇦 🇧🇳 (10 SEA) | Active for creator signup |
| 2 | 🇬🇧 🇦🇺 🇳🇿 🇯🇵 🇰🇷 🇨🇦 🇭🇰 🇹🇼 | Defined, disabled — waitlist only |
| 3 | 🇺🇸 🇪🇺 (per member state) | Defined, disabled — waitlist only |
| ROW | All other countries | Not in COUNTRIES table — fallback to "creator signup blocked, waitlist only" |

### 4.2 Buyer support — universal

Buyers can be from anywhere. Buyer's country only affects:
- Shipping rate lookup (per-product map; ROW fallback per Shipping V2)
- Destination tax (only if their country has destination tax enabled — none active at launch)
- Import duties (buyer's country handles at border, not platform)

### 4.3 Tier 2/3 onboarding

Creator signup country dropdown lists only Tier 1. "Don't see your country? Join waitlist" link captures email + selected country to `CreatorWaitlist`. Admin watches concentration; opens countries when demand justifies tax-agent and KYC setup.

## 5. Schema changes

### 5.1 `CreatorProfile` additions

```prisma
model CreatorProfile {
  // existing fields preserved
  creatorClassification         String?      // 'INDIVIDUAL' | 'REGISTERED_BUSINESS'
  taxOnboardingAcknowledgedAt   DateTime?
  taxOnboardingTosVersion       String?      // e.g. "2026-04-27"
  
  // creator's own sales tax — opt-in agency-collect
  collectsSalesTax              Boolean      @default(false)
  salesTaxRate                  Float?       // e.g. 0.06
  salesTaxLabel                 String?      // 'SST' | 'GST' | 'VAT'
  salesTaxStatus                String       @default("NONE")  // NONE|REQUESTED|APPROVED|REJECTED
  salesTaxApprovedAt            DateTime?
  salesTaxApprovedBy            String?      // admin user id
  salesTaxCertificateUrl        String?      // upload of reg cert
}
```

### 5.2 `Order` additions

```prisma
model Order {
  // existing creatorTaxAmountUsd / creatorTaxRatePercent (Layer 1 — origin/PPh) preserved
  // existing destinationTaxAmountUsd / destinationTaxRatePercent / destinationTaxCountry (Layer 2) preserved
  // existing reverseChargeApplied / buyerBusinessTaxId preserved
  // existing buyerCountry preserved
  
  // creator country snapshot at order creation (NEW — mirrors buyerCountry pattern)
  creatorCountry                String?      // ISO-2; locked at order time, drives PPh attribution
  
  // creator's own sales tax (NEW)
  creatorSalesTaxAmountUsd      Int          @default(0)
  creatorSalesTaxRatePercent    Float?
  creatorSalesTaxLabel          String?
  
  // platform fee tax — buyer side (NEW)
  platformFeeBuyerTaxUsd        Int          @default(0)
  platformFeeBuyerTaxRate       Float?
  
  // platform fee tax — creator side (NEW)
  platformFeeCreatorTaxUsd      Int          @default(0)
  platformFeeCreatorTaxRate     Float?
}
```

### 5.3 `PlatformSettings` additions

```prisma
model PlatformSettings {
  // existing taxDestinationCountries preserved (Layer 2 enable map)
  platformFeeTax                String       @default("{}")   // JSON: { [iso2]: { enabled, rate, label, sides[] } }
}
```

### 5.4 `CreatorWaitlist` (new model)

```prisma
model CreatorWaitlist {
  id          String    @id @default(cuid())
  email       String
  country     String    // ISO-2
  createdAt   DateTime  @default(now())
  notifiedAt  DateTime?
  
  @@index([country])
}
```

### 5.5 Migration

Single migration `0013_tax_architecture`. All columns nullable / defaulted; no data backfill required. Existing creators get prompted to complete tax onboarding on next login via redirect-once gate.

## 6. `src/lib/countries.ts` — single source of truth

### 6.1 Type

```ts
export type CreatorTier = 1 | 2 | 3 | null
export type TaxApplication = 'ALL_PAYOUTS' | 'ROYALTY_OR_SERVICES'
export type FeeTaxSide = 'BUYER' | 'CREATOR'

export interface CountryRecord {
  iso2: string
  name: string
  
  creatorTier: CreatorTier
  creatorOnboardingEnabled: boolean
  payoutRail: 'LOCAL' | 'SWIFT'
  shippingZone: 'domestic-my' | 'sea-tier1' | 'sea-tier2' | 'row'
  
  destinationTax: {
    rate: number
    label: 'SST' | 'GST' | 'VAT' | 'PPN'
    registrationThreshold: number       // platform-fee threshold (USD cents)
    deemedSupplierB2C: boolean
  } | null
  
  creatorOriginTax: {
    rate: number
    label: 'PPh Final' | 'WHT'
    appliesTo: TaxApplication
    individualThreshold: number | null   // null = no floor
  } | null
}

export const COUNTRIES: Record<string, CountryRecord>
export function countryFor(iso2: string): CountryRecord | null
export function isCreatorCountrySupported(iso2: string): boolean
export function originTaxRate(creatorCountry: string): number
```

### 6.2 Refactor strategy

`destination-tax.ts`, `tax-thresholds.ts`, `shipping.ts`, `payout-rail.ts` become **consumers** of `countries.ts`. Public APIs preserved (no breaking changes). `PlatformSettings.taxDestinationCountries` continues as runtime override.

## 7. ID PPh Final 0.5% withholding

### 7.1 Mechanics

- **Per-order snapshot**: `Order.creatorTaxAmountUsd = orderAmountUsd × 0.005` for ID creators (any listing type, any buyer country).
- **Per-payout aggregation**: `Transaction.creatorTaxUsd = sum of Order.creatorTaxAmountUsd` over the period.
- **Reserve**: `PlatformReserve.kind='TAX_ORIGIN', scope='ID'` accrues; admin drains via remittance entry.
- **Annual PPh certificate**: per-creator PDF generated from order-level data, downloadable from creator dashboard, emailed in January for prior tax year.

### 7.2 New module: `src/lib/origin-tax.ts`

```ts
export function computeOriginTax(
  creatorCountry: string,
  orderAmountUsd: number,
  listingType: 'PHYSICAL' | 'POD' | 'DIGITAL' | 'COMMISSION',
): { rate: number; amountUsd: number; label: string | null }
```

### 7.3 Lock at order time

`creatorCountry` is locked at order-creation snapshot. If creator later changes country in their profile, the order keeps its original PPh attribution. Mirrors `Order.buyerCountry` behavior.

## 8. Onboarding tax qualification

### 8.1 Flow

Two-stage:

| Stage | When | Captures |
|---|---|---|
| Register | Pre-application (existing creator signup) | + Country of residence (default detected from `x-vercel-ip-country`) |
| Post-approval onboarding (`/dashboard/onboarding/tax`) | After admin approves CreatorApplication, before first listing | Individual or Registered Business; tax-ID (if business); indemnification ack |

### 8.2 UI

- Country dropdown: only Tier 1 countries with `creatorOnboardingEnabled === true`. "Don't see your country? Join waitlist" → `CreatorWaitlist` entry.
- Individual / Registered Business radio.
- (If business) tax registration ID + jurisdiction inputs.
- Single indemnification checkbox + ToS clause text from `src/content/legal/tax-indemnification.md`.

### 8.3 Endpoints

- `POST /api/dashboard/onboarding/tax` — captures classification, tax-ID, ack timestamp, ToS version.
- `POST /api/creator-waitlist` — captures email + country for not-yet-supported countries.

## 9. Creator's own sales tax (opt-in agency-collect)

### 9.1 Activation conditions (all required)

1. `creatorClassification === 'REGISTERED_BUSINESS'`
2. `taxId` and `taxJurisdiction` populated
3. `collectsSalesTax === true` (creator opts in via profile/settings)
4. `salesTaxStatus === 'APPROVED'` (admin reviews + approves uploaded reg certificate)

If any condition fails, no sales tax line on creator's orders.

### 9.2 Application

At order time:
```
creatorSalesTaxAmountUsd = (subtotalUsd + shippingCostUsd) × salesTaxRate
```

(Shipping is taxed with the goods in most jurisdictions — MY/SG/ID etc. — for purposes of creator's own SST/VAT.)

### 9.3 Pass-through, not platform-remit

Creator gets paid the gross of the sales tax in their payout. Creator remits to their tax authority themselves under their own registration. Platform's role: collect at checkout, surface in payout breakdown, generate ledger for creator. Distinct from PPh (which IS platform-remitted).

### 9.4 UI

- **Profile / settings page**: opt-in toggle, rate/label fields, certificate upload.
- **Admin approval queue**: review uploaded certificate, approve/reject; status → `APPROVED` enables collection on next order.

## 10. Platform fee tax

### 10.1 Configuration

`PlatformSettings.platformFeeTax`:

```ts
{
  MY: { enabled: true,  rate: 0.06, label: 'SST',
        sides: ['CREATOR'] },         // tax our commission to MY creators
  SG: { enabled: false, rate: 0.09, label: 'GST',
        sides: ['BUYER', 'CREATOR'] }
}
```

All countries default `enabled: false` at launch. Admin flips per country once threshold crossed.

### 10.2 Buyer-side application

If `sides` includes `'BUYER'` AND buyer country has `enabled: true`:
```
platformFeeBuyerTaxUsd = buyerFeeUsd × rate
```
Adds a "Service fee tax" line to the buyer's checkout/receipt.

### 10.3 Creator-side application

If `sides` includes `'CREATOR'` AND creator country has `enabled: true`:
```
platformFeeCreatorTaxUsd = creatorCommissionUsd × rate
```
Adds a "Commission tax" line to creator's payout/statement breakdown. Deducted from creator's net.

### 10.4 Critical: applies only to platform's own fees

Per the table in §11, platform fee tax is **never** applied to listing price, shipping, or any pass-through amount. Only on `buyerFeeUsd` (our buyer service fee) and `creatorCommissionUsd` (our commission).

## 11. Tax application matrix

| Component | Whose money is it? | Subject to platform fee tax? | Subject to creator's sales tax? | Subject to destination tax? |
|---|---|---|---|---|
| Listing price | Creator's | No | Yes (if creator opted in) | Yes (deemed-supplier rules) |
| Shipping | Creator's (pure pass-through) | No | Yes (if creator opted in) | Yes (deemed-supplier rules) |
| Buyer service fee | noizu.direct's | **Yes** (when platform registered in buyer country) | No | No |
| Commission deducted from creator | noizu.direct's | **Yes** (when platform registered in creator country) | No | No |
| PPh withholding from creator | Tax authority's (we hold) | No | No | No |

## 12. Creator-facing statement

### 12.1 Path: `/dashboard/finance/tax`

### 12.2 Sections (each conditional on having data)

- **EARNINGS SUMMARY** — gross / commission / commission-tax / withheld PPh / net.
- **WITHHELD AT PAYOUT** — only if PPh > 0. Breakdown + PPh certificate download (year-end).
- **COLLECTED FROM BUYERS ON YOUR BEHALF** — only if creator's sales tax > 0. Ledger of SST/GST/VAT collected, owed to tax authority by creator. Includes downloadable ledger.
- **COLLECTED BY noizu.direct** — informational; destination tax + service-fee tax. Clearly marked "not your money."
- **SALES BY BUYER COUNTRY** — table with country, orders, gross, net.
- **Footer disclaimer** — escrow disclosure + tax-advisor referral.

### 12.3 Search / filter

- **Period filter**: dropdown with current month, last month, current quarter, current year, last year, custom range.
- **Month/year picker**: explicit `month` and `year` selects for "show me August 2026" lookups.
- **Country filter**: All / specific buyer country.

### 12.4 PDF export

- `GET /api/dashboard/finance/tax/export?format=pdf&from=&to=` — full statement PDF using existing `src/lib/pdf/` infra.
- `GET /api/dashboard/finance/tax/pph-certificate?year=2026` — ID-only annual cert.

## 13. Admin tax dashboard enhancements

### 13.1 Existing `/admin/finance/tax` extends with

- **Tax-type tabs**: Destination / Creator-Origin (PPh) / Reverse-Charge / Creator's Sales Tax / Platform Fee Tax.
- **Creator filter**: typeahead, drill into one creator's full tax footprint across all tabs.
- **Date-range filter** + explicit **month/year** selects.
- **PDF export**: per-tab, current filters applied.
- **CSV export** (existing) preserved.

### 13.2 New endpoints

- `GET /api/admin/finance/tax/origin?country=ID&period=2026-04` — DJP monthly filing aggregate.
- `GET /api/admin/finance/exports/origin-tax?country=ID&period=2026-04&format=pdf|csv` — DJP-filing-ready report.
- `GET /api/admin/finance/tax/creator-sales?creatorId=...` — admin view of opted-in creator's collected sales tax.
- `GET /api/admin/finance/tax/platform-fee?country=&period=` — platform fee tax aggregate.

### 13.3 Admin sales-tax approval queue

`/admin/creators/sales-tax-applications` — list creators with `salesTaxStatus === 'REQUESTED'`, view uploaded certificate, approve / reject.

## 14. Buyer checkout & receipt rendering

### 14.1 Checkout breakdown

```
FROM CREATOR (Sakura Tanaka — Sdn Bhd)
  Listing price:                  $20.00
  Shipping (fulfilled by creator): $ 5.00
  Subtotal — creator's portion:   $25.00

FROM noizu.direct (escrow & payment service)
  Service fee:                    $ 2.50

Subtotal:                         $27.50

[Conditional tax lines, hidden when 0]
  Seller's SST (6%) on $25.00     $ 1.50
  Service-fee SST (6%) on $2.50   $ 0.15
  SG GST (9%)                     $ 2.48
                                  
Total                             $31.63

Footer: "noizu.direct provides escrow and payment-handling for this 
transaction. Goods are sold and shipped by the creator."
```

### 14.2 Email receipt (post-payment)

Same structure rendered as PDF + HTML email.

### 14.3 Refund + chargeback handling

Existing `computeMaxRefundableUsd` (Shipping V2) extends — refund logic must preserve tax line attribution. PPh withholding is irreversible from creator side once remitted; refund logic for shipped+then-disputed orders covered by existing chargeback handling.

## 15. Files to add / modify

### 15.1 New files

- `src/lib/countries.ts`
- `src/lib/origin-tax.ts`
- `src/app/dashboard/onboarding/tax/page.tsx`
- `src/app/dashboard/onboarding/tax/TaxOnboardingForm.tsx`
- `src/app/api/dashboard/onboarding/tax/route.ts`
- `src/app/api/creator-waitlist/route.ts`
- `src/app/dashboard/finance/tax/page.tsx`
- `src/app/dashboard/finance/tax/TaxStatementClient.tsx`
- `src/app/api/dashboard/finance/tax/route.ts`
- `src/app/api/dashboard/finance/tax/export/route.ts`
- `src/app/api/dashboard/finance/tax/pph-certificate/route.ts`
- `src/lib/pdf/CreatorTaxStatement.tsx`
- `src/lib/pdf/PPhCertificate.tsx`
- `src/app/api/admin/finance/tax/origin/route.ts`
- `src/app/api/admin/finance/exports/origin-tax/route.ts`
- `src/app/api/admin/finance/tax/creator-sales/route.ts`
- `src/app/api/admin/finance/tax/platform-fee/route.ts`
- `src/app/admin/creators/sales-tax-applications/page.tsx`
- `src/app/admin/creators/sales-tax-applications/SalesTaxApplicationActions.tsx`
- `src/app/api/admin/creators/[id]/sales-tax/route.ts`
- `src/content/legal/tax-indemnification.md`
- `src/content/legal/escrow-disclosure.md`
- `prisma/migrations/0013_tax_architecture/migration.sql`
- `prisma/seeds/tax-seed.ts` (or extension to existing seed)

### 15.2 Modified files

- `prisma/schema.prisma`
- `src/lib/destination-tax.ts` — read from `countries.ts`
- `src/lib/tax-thresholds.ts` — read from `countries.ts`
- `src/lib/shipping.ts` — country list from `countries.ts`
- `src/lib/payout-rail.ts` — SWIFT countries from `countries.ts`
- `src/app/api/airwallex/payment-intent/route.ts` — populate Order tax fields
- `src/app/api/cron/payout/route.ts` (or wherever payouts compute) — aggregate origin tax + reserve
- `src/app/admin/finance/tax/page.tsx` — tabs, filters, month/year search, PDF export
- `src/app/admin/finance/tax/TaxDashboardClient.tsx` (or equivalent)
- `src/app/dashboard/onboarding/page.tsx` — gate on `taxOnboardingAcknowledgedAt`
- `src/app/(auth)/register/creator/page.tsx` — country dropdown filtered to Tier 1
- `src/app/account/orders/[id]/OrderDetailClient.tsx` — escrow framing + new tax line rendering
- `src/lib/pdf/PurchaseReceipt.tsx` — escrow framing + new tax line rendering

## 16. Phasing (9 phases, 3 commits)

| Phase | Scope | Commit? |
|---|---|---|
| 1 | `countries.ts` unification + refactor existing consumers (no behavior change) | — |
| 2 | Schema migration + db push to dev DB | — |
| 3 | Onboarding tax step (UI + API + waitlist + Tier 1 country dropdown) | **commit-1** |
| 4 | ID PPh withholding engine (origin-tax + payout integration + reserve) | — |
| 5 | Creator tax statement page + PDF + PPh certificate + month/year search | — |
| 6 | Admin tax dashboard enhancements (tabs, filters, month/year search, DJP exports, PDF) | **commit-2** |
| 7 | Creator sales tax opt-in flow + admin approval queue | — |
| 8 | Buyer checkout + receipt: escrow framing + conditional tax lines + platform fee tax scaffolding | — |
| 9 | Seed data + Playwright/Chrome visual verification + final polish | **commit-3** |

User checkpoint at every phase boundary ("continue?"). Production deploy not until user explicitly approves.

## 17. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Existing creators have no `creatorClassification` set | Onboarding-redirect gate. Admin can backfill via SQL for known creators. |
| Tier-2 country activation requires per-country tax-agent + KYC validation | Encoded as `creatorOnboardingEnabled` flag; admin flips one country at a time after manual setup. |
| ID PPh deducted on a non-ID payout | `Order.creatorCountry` snapshotted at order-creation time; PPh attaches to snapshot, not current profile country. |
| Reserve drift if DJP filing fails | `TAX_ORIGIN` reserve dashboard shows accrual + drain; admin alerted at threshold. |
| Creator's PDF statement format not accepted by their accountant | Iterate format based on creator feedback; statement structure decoupled from schema. |
| Sales-tax opt-in misuse (creator claims to be registered when not) | Required certificate upload + admin review gate before `salesTaxStatus → APPROVED`. |
| Country-tier ROW creator signups blocked at launch | `CreatorWaitlist` captures demand; waitlist notification fires on activation. |
| Receipt rendering accidentally implies platform is supplier | "FROM CREATOR" / "FROM noizu.direct" sections + escrow footer disclaimer on every receipt and statement. |

## 18. Open questions for post-launch (not blocking)

- Cross-border WHT lookup matrix population (services/royalties for non-ID payouts) — when cross-border traffic justifies.
- Minimum-payout aggregation threshold (USD 50?) — separate spec.
- Tax-API integration (Avalara / Fonoa) — when Tier 3 (US/EU) activates.
- DAC7 (EU) / 1099-K (US) reporting — when Tier 3 activates.
- Fiscal calendar variations (some jurisdictions don't use Jan-Dec; deferred until Tier 2 scale).
