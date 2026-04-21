# Graph Report - .  (2026-04-21)

## Corpus Check
- Large corpus: 601 files · ~1,750,327 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 1008 nodes · 1284 edges · 107 communities detected
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 147 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `POST()` - 25 edges
2. `GET()` - 10 edges
3. `PATCH()` - 8 edges
4. `getAirwallexToken()` - 7 edges
5. `emailShell()` - 6 edges
6. `runPayoutSweep()` - 5 edges
7. `uploadFile()` - 5 edges
8. `goNext()` - 5 edges
9. `shell()` - 5 edges
10. `btn()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `NOIZU-DIRECT Implementation Plan` --rationale_for--> `ProductCard()`  [INFERRED]
  PLANNING.md → src\components\ui\ProductCard.tsx
- `GET()` --calls--> `getUsdRates()`  [INFERRED]
  src\app\sitemap-video.xml\route.ts → src\app\api\airwallex\fx-rate\route.ts
- `GET()` --calls--> `buildBreakdown()`  [INFERRED]
  src\app\sitemap-video.xml\route.ts → src\app\api\creator\storage\route.ts
- `GET()` --calls--> `getRate()`  [INFERRED]
  src\app\sitemap-video.xml\route.ts → src\app\api\dashboard\statement\route.ts
- `GET()` --calls--> `toMonthKey()`  [INFERRED]
  src\app\sitemap-video.xml\route.ts → src\app\api\dashboard\statement\route.ts

## Hyperedges (group relationships)
- **Media Upload Pipeline** — mediauploadzone_MediaUploadZone, api_upload_route, api_admin_media_route_MediaRoute, prisma_model_Media [EXTRACTED 1.00]
- **Product Creation and Editing Flow** — dashboard_listings_new_page, dashboard_listings_id_edit_page, dashboard_listings_id_edit_editlistingform, api_products_post, api_products_id, model_product [EXTRACTED 0.95]
- **Project Documentation Suite** — planning_noizu_direct, readme_nextjs_project, agents_nextjs_agent_rules [INFERRED 0.80]

## Communities

### Community 0 - "Admin Storage"
Cohesion: 0.01
Nodes (9): AdminStorageClient(), fmtBytes(), formatAccountDetails(), getBanks(), parsePricingTiers(), parseTags(), PayoutRequestPage(), toDiscoveryCreator() (+1 more)

### Community 1 - "Agreement Wall"
Cohesion: 0.03
Nodes (1): SearchBar Component

### Community 2 - "Data Models"
Cohesion: 0.07
Nodes (2): cap(), main()

### Community 3 - "PayPal Payouts"
Cohesion: 0.07
Nodes (43): executePayPalPayout(), getPayPalAccessToken(), getR2Url(), uploadToR2(), accountClosureHtml(), accountRestrictedHtml(), adminOnly(), agreementReminderHtml() (+35 more)

### Community 4 - "UI Components"
Cohesion: 0.05
Nodes (0): 

### Community 5 - "Account Settings"
Cohesion: 0.05
Nodes (9): handleAvatarChange(), uploadFile(), NotificationsSection(), parseNotifPrefs(), handlePortfolioImageChange(), uploadFile(), handleAvatarChange(), handleBannerChange() (+1 more)

### Community 6 - "Agreement Enforcement"
Cohesion: 0.05
Nodes (4): getNewCreatorExtraDays(), isGraduatedCreator(), calculateTrending(), processTrendingBatch()

### Community 7 - "Avatar Upload"
Cohesion: 0.06
Nodes (2): buildDropdownContent(), handleSave()

### Community 8 - "Creator Discovery"
Cohesion: 0.09
Nodes (3): NOIZU-DIRECT Implementation Plan, getFirstImage(), ProductCard()

### Community 9 - "Creator Profile Form"
Cohesion: 0.09
Nodes (5): handleAvatarChange(), handleBannerChange(), handleLogoChange(), handlePortfolioImageChange(), uploadFile()

### Community 10 - "Cart & Checkout"
Cohesion: 0.12
Nodes (6): applyItemRemoval(), applyQtyChange(), handleConfirmPay(), recalcGroups(), updateQuantity(), validateShipping()

### Community 11 - "Image Gallery"
Cohesion: 0.14
Nodes (10): getPinchDist(), handleTouchMove(), handleTouchStart(), lbNext(), lbPrev(), nextImage(), onKey(), prevImage() (+2 more)

### Community 12 - "Admin Creator Table"
Cohesion: 0.15
Nodes (5): toggleBadge(), update(), patch(), reinstate(), suspend()

### Community 13 - "Creator Health Emails"
Cohesion: 0.28
Nodes (14): btn(), creatorFulfillmentWarningHtml(), creatorNudge30Html(), creatorPreSuspensionHtml(), creatorReengagementHtml(), send(), sendCreatorFulfillmentWarning(), sendCreatorNudge30() (+6 more)

### Community 14 - "Creator Onboarding"
Cohesion: 0.17
Nodes (5): goNext(), validateStep1(), validateStep2(), validateStep3(), validateStep4()

### Community 15 - "File Storage Client"
Cohesion: 0.17
Nodes (2): logPurchaseInterest(), openPurchaseModal()

### Community 16 - "Staff Auth"
Cohesion: 0.29
Nodes (10): createStaffToken(), decodeToken(), encodeToken(), getSecret(), getStaffSession(), getStaffSessionFromRequest(), can(), loadStaffActor() (+2 more)

### Community 17 - "Listing Editor"
Cohesion: 0.2
Nodes (2): handleFiles(), handleInputChange()

### Community 18 - "Media Library Modal"
Cohesion: 0.18
Nodes (0): 

### Community 19 - "Support Manager"
Cohesion: 0.2
Nodes (0): 

### Community 20 - "Airwallex Payments"
Cohesion: 0.42
Nodes (8): confirmPaymentIntent(), createBeneficiary(), createPaymentIntent(), executeTransfer(), getAirwallexBalances(), getAirwallexToken(), getCurrencyFactor(), getTransferStatus()

### Community 21 - "Application Review"
Cohesion: 0.32
Nodes (3): handleApprove(), handleRejectSubmit(), patch()

### Community 22 - "Admin Popup System"
Cohesion: 0.25
Nodes (0): 

### Community 23 - "Search Results"
Cohesion: 0.29
Nodes (0): 

### Community 24 - "SEO Config"
Cohesion: 0.29
Nodes (0): 

### Community 25 - "Dispute & Orders"
Cohesion: 0.33
Nodes (0): 

### Community 26 - "Admin Agreements"
Cohesion: 0.4
Nodes (2): closeModal(), handleSubmit()

### Community 27 - "CMS Section Toggle"
Cohesion: 0.4
Nodes (2): updateHero(), uploadThumbnail()

### Community 28 - "Admin Escrow"
Cohesion: 0.33
Nodes (0): 

### Community 29 - "Admin Reviews"
Cohesion: 0.33
Nodes (0): 

### Community 30 - "Creator Popup"
Cohesion: 0.33
Nodes (0): 

### Community 31 - "CMS Seed"
Cohesion: 0.9
Nodes (4): cuid(), now(), upsertPage(), upsertPost()

### Community 32 - "Extra Seed Data"
Cohesion: 0.7
Nodes (4): calcFees(), daysAgo(), main(), pick()

### Community 33 - "Payout Actions"
Cohesion: 0.7
Nodes (4): handleApprove(), handlePaid(), handleReject(), patch()

### Community 34 - "Transaction Filters"
Cohesion: 0.4
Nodes (0): 

### Community 35 - "Account Closure"
Cohesion: 0.4
Nodes (0): 

### Community 36 - "Storefront Messages"
Cohesion: 0.4
Nodes (0): 

### Community 37 - "Product Reviews"
Cohesion: 0.4
Nodes (0): 

### Community 38 - "Videos Manager"
Cohesion: 0.4
Nodes (0): 

### Community 39 - "Transaction Seed"
Cohesion: 0.5
Nodes (0): 

### Community 40 - "Staff Users"
Cohesion: 0.83
Nodes (3): grantPermissions(), main(), upsertUser()

### Community 41 - "Agreement Detail"
Cohesion: 0.5
Nodes (0): 

### Community 42 - "Page Editor"
Cohesion: 0.67
Nodes (2): handleTitleChange(), slugify()

### Community 43 - "Post Editor"
Cohesion: 0.67
Nodes (2): handleTitleChange(), slugify()

### Community 44 - "Admin Media"
Cohesion: 0.5
Nodes (4): CopyUrlButton Component, Admin Media Page, MediaGrid Component, MediaUploadZone Component

### Community 45 - "Role Cards"
Cohesion: 0.5
Nodes (0): 

### Community 46 - "Permissions Grid"
Cohesion: 0.5
Nodes (0): 

### Community 47 - "Global Search"
Cohesion: 0.5
Nodes (0): 

### Community 48 - "Contact Form"
Cohesion: 0.67
Nodes (2): handleSubmit(), validate()

### Community 49 - "Order Reviews"
Cohesion: 0.5
Nodes (0): 

### Community 50 - "Currency FX"
Cohesion: 0.5
Nodes (0): 

### Community 51 - "Vercel Deploy Tasks"
Cohesion: 0.67
Nodes (0): 

### Community 52 - "POD Migration"
Cohesion: 0.67
Nodes (0): 

### Community 53 - "Wishlist Migration"
Cohesion: 0.67
Nodes (0): 

### Community 54 - "Nav Seed"
Cohesion: 1.0
Nodes (2): cuid(), upsert()

### Community 55 - "Agreement Viewer"
Cohesion: 0.67
Nodes (0): 

### Community 56 - "GitHub Tasks"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Supabase Tasks"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Cloudflare Tasks"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Agreements Seed"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Buyers Seed"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Direct Seed"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "POD Seed"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Root Seed"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Supabase Creds"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Middleware"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Error Boundary"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Not Found Page"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "Announcement Manager"
Cohesion: 1.0
Nodes (2): AnnouncementManager Component, Admin Announcements Page

### Community 69 - "Media Delete Button"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Review Visibility"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "Audit Filters"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Messages Icon"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "Prisma Browser"
Cohesion: 1.0
Nodes (0): 

### Community 74 - "Mobile Audit"
Cohesion: 1.0
Nodes (0): 

### Community 75 - "Next.js Env Types"
Cohesion: 1.0
Nodes (0): 

### Community 76 - "Next.js Config"
Cohesion: 1.0
Nodes (0): 

### Community 77 - "Performance Audit"
Cohesion: 1.0
Nodes (0): 

### Community 78 - "Prisma Config"
Cohesion: 1.0
Nodes (0): 

### Community 79 - "Screenshots"
Cohesion: 1.0
Nodes (0): 

### Community 80 - "Screenshots"
Cohesion: 1.0
Nodes (0): 

### Community 81 - "Screenshots"
Cohesion: 1.0
Nodes (0): 

### Community 82 - "Sentry Client"
Cohesion: 1.0
Nodes (0): 

### Community 83 - "Sentry Server"
Cohesion: 1.0
Nodes (0): 

### Community 84 - "Backfill Script"
Cohesion: 1.0
Nodes (1): Backfill Media Dimensions Script

### Community 85 - "WebP Migration"
Cohesion: 1.0
Nodes (1): Migrate Media to WebP Script

### Community 86 - "Settings Form"
Cohesion: 1.0
Nodes (1): SettingsForm Component

### Community 87 - "Signout API"
Cohesion: 1.0
Nodes (1): Force Signout API Route

### Community 88 - "Messages API"
Cohesion: 1.0
Nodes (1): Send Message API

### Community 89 - "Fans Dashboard"
Cohesion: 1.0
Nodes (1): Dashboard Fans Page

### Community 90 - "Listing Actions"
Cohesion: 1.0
Nodes (1): Listings Actions Component

### Community 91 - "New Listing Page"
Cohesion: 1.0
Nodes (1): New Listing Page

### Community 92 - "Order Actions"
Cohesion: 1.0
Nodes (1): Orders Actions Component

### Community 93 - "Categories Section"
Cohesion: 1.0
Nodes (1): Categories Section

### Community 94 - "New Drops Section"
Cohesion: 1.0
Nodes (1): New Drops Section

### Community 95 - "Empty State UI"
Cohesion: 1.0
Nodes (1): Empty State Component

### Community 96 - "Filter Select UI"
Cohesion: 1.0
Nodes (1): Filter Select Component

### Community 97 - "Loading Spinner"
Cohesion: 1.0
Nodes (1): Loading Spinner Component

### Community 98 - "Nav Link UI"
Cohesion: 1.0
Nodes (1): Nav Link Component

### Community 99 - "Next.js Agent Rules"
Cohesion: 1.0
Nodes (1): AGENTS.md Next.js Agent Rules

### Community 100 - "Claude Agent Rules"
Cohesion: 1.0
Nodes (1): AGENTS.md Next.js Agent Rules

### Community 101 - "Readme Docs"
Cohesion: 1.0
Nodes (1): Next.js Project README

### Community 102 - "File SVG Icon"
Cohesion: 1.0
Nodes (1): File Icon

### Community 103 - "Globe SVG Icon"
Cohesion: 1.0
Nodes (1): Globe Icon

### Community 104 - "Next.js SVG Logo"
Cohesion: 1.0
Nodes (1): Next.js Logo

### Community 105 - "Vercel SVG Logo"
Cohesion: 1.0
Nodes (1): Vercel Logo

### Community 106 - "Window SVG Icon"
Cohesion: 1.0
Nodes (1): Window/Terminal Icon

## Knowledge Gaps
- **29 isolated node(s):** `Backfill Media Dimensions Script`, `Migrate Media to WebP Script`, `AnnouncementManager Component`, `Admin Announcements Page`, `CopyUrlButton Component` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `GitHub Tasks`** (2 nodes): `task1-github.js`, `getGitHubUsername()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supabase Tasks`** (2 nodes): `task2-supabase.js`, `appendToEnv()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Cloudflare Tasks`** (2 nodes): `task3-cloudflare.js`, `appendToEnv()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Agreements Seed`** (2 nodes): `seed-agreements.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Buyers Seed`** (2 nodes): `seed-buyers.js`, `cuid()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Direct Seed`** (2 nodes): `seed-direct.js`, `cuid()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `POD Seed`** (2 nodes): `seed-pod.js`, `cuid()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Root Seed`** (2 nodes): `seed-root.js`, `cuid()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supabase Creds`** (2 nodes): `get-supabase-creds.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Middleware`** (2 nodes): `middleware.ts`, `middleware()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Error Boundary`** (2 nodes): `error.tsx`, `Error()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Not Found Page`** (2 nodes): `not-found.tsx`, `NotFound()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Announcement Manager`** (2 nodes): `AnnouncementManager Component`, `Admin Announcements Page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Media Delete Button`** (2 nodes): `MediaDeleteButton.tsx`, `MediaDeleteButton()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Review Visibility`** (2 nodes): `ReviewVisibilityToggle.tsx`, `ReviewVisibilityToggle()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audit Filters`** (2 nodes): `AuditFilters.tsx`, `AuditFilters()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Messages Icon`** (2 nodes): `MessagesIcon.tsx`, `MessagesIcon()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Prisma Browser`** (2 nodes): `browser.ts`, `prismaNamespaceBrowser.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mobile Audit`** (1 nodes): `mobile-audit.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Env Types`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Config`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Performance Audit`** (1 nodes): `perf-audit.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Prisma Config`** (1 nodes): `prisma.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Screenshots`** (1 nodes): `screenshot.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Screenshots`** (1 nodes): `screenshot2.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Screenshots`** (1 nodes): `screenshot3.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sentry Client`** (1 nodes): `sentry.client.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sentry Server`** (1 nodes): `sentry.server.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Backfill Script`** (1 nodes): `Backfill Media Dimensions Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `WebP Migration`** (1 nodes): `Migrate Media to WebP Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Settings Form`** (1 nodes): `SettingsForm Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Signout API`** (1 nodes): `Force Signout API Route`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Messages API`** (1 nodes): `Send Message API`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Fans Dashboard`** (1 nodes): `Dashboard Fans Page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Listing Actions`** (1 nodes): `Listings Actions Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `New Listing Page`** (1 nodes): `New Listing Page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Order Actions`** (1 nodes): `Orders Actions Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Categories Section`** (1 nodes): `Categories Section`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `New Drops Section`** (1 nodes): `New Drops Section`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Empty State UI`** (1 nodes): `Empty State Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Filter Select UI`** (1 nodes): `Filter Select Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Loading Spinner`** (1 nodes): `Loading Spinner Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Nav Link UI`** (1 nodes): `Nav Link Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Agent Rules`** (1 nodes): `AGENTS.md Next.js Agent Rules`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Claude Agent Rules`** (1 nodes): `AGENTS.md Next.js Agent Rules`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Readme Docs`** (1 nodes): `Next.js Project README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `File SVG Icon`** (1 nodes): `File Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Globe SVG Icon`** (1 nodes): `Globe Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js SVG Logo`** (1 nodes): `Next.js Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vercel SVG Logo`** (1 nodes): `Vercel Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Window SVG Icon`** (1 nodes): `Window/Terminal Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 24 inferred relationships involving `POST()` (e.g. with `requireAdmin()` and `convertToDisplayCurrency()`) actually correct?**
  _`POST()` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `GET()` (e.g. with `requireAdmin()` and `getUsdRates()`) actually correct?**
  _`GET()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `PATCH()` (e.g. with `approvedEmailHtml()` and `rejectedEmailHtml()`) actually correct?**
  _`PATCH()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `getAirwallexToken()` (e.g. with `createPaymentIntent()` and `confirmPaymentIntent()`) actually correct?**
  _`getAirwallexToken()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `emailShell()` (e.g. with `handlePaymentSucceeded()` and `handleTransferSucceeded()`) actually correct?**
  _`emailShell()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Backfill Media Dimensions Script`, `Migrate Media to WebP Script`, `AnnouncementManager Component` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin Storage` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._