# Graph Report - src  (2026-04-16)

## Corpus Check
- Large corpus: 346 files · ~353,181 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 632 nodes · 821 edges · 38 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 49 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `POST()` - 9 edges
2. `uploadFile()` - 5 edges
3. `PATCH()` - 4 edges
4. `requireAdmin()` - 4 edges
5. `selectImage()` - 4 edges
6. `GET()` - 3 edges
7. `extractEmbedId()` - 3 edges
8. `recalcGroups()` - 3 edges
9. `applyQtyChange()` - 3 edges
10. `toDiscoveryCreator()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `checkRateLimit()`  [INFERRED]
  src\app\api\wishlist\route.ts → src\app\api\contact\route.ts
- `POST()` --calls--> `errorResponse()`  [INFERRED]
  src\app\api\wishlist\route.ts → src\app\api\contact\route.ts
- `POST()` --calls--> `sanitizeField()`  [INFERRED]
  src\app\api\wishlist\route.ts → src\app\api\contact\route.ts
- `POST()` --calls--> `hasDangerousContent()`  [INFERRED]
  src\app\api\wishlist\route.ts → src\app\api\contact\route.ts
- `POST()` --calls--> `getMYT()`  [INFERRED]
  src\app\api\wishlist\route.ts → src\app\api\contact\route.ts

## Communities

### Community 0 - "Admin CMS & Content"
Cohesion: 0.02
Nodes (5): getExt(), isImage(), parsePricingTiers(), parseTags(), toDiscoveryCreator()

### Community 1 - "Payment & Auth Core"
Cohesion: 0.06
Nodes (16): createPaymentIntent(), getPaymentIntent(), getToken(), buildBreakdown(), checkRateLimit(), cuid(), DELETE(), errorResponse() (+8 more)

### Community 2 - "Account Management"
Cohesion: 0.05
Nodes (9): handleAvatarChange(), uploadFile(), NotificationsSection(), parseNotifPrefs(), handlePortfolioImageChange(), uploadFile(), handleAvatarChange(), handleBannerChange() (+1 more)

### Community 3 - "UI Components & Product"
Cohesion: 0.06
Nodes (2): getFirstImage(), ProductCard()

### Community 4 - "Data Models & WASM"
Cohesion: 0.14
Nodes (0): 

### Community 5 - "Layout & Announcements"
Cohesion: 0.05
Nodes (0): 

### Community 6 - "Creator Profile Form"
Cohesion: 0.09
Nodes (5): handleAvatarChange(), handleBannerChange(), handleLogoChange(), handlePortfolioImageChange(), uploadFile()

### Community 7 - "Forms & File Upload"
Cohesion: 0.09
Nodes (2): buildDropdownContent(), handleSave()

### Community 8 - "Cart & Checkout"
Cohesion: 0.11
Nodes (6): applyItemRemoval(), applyQtyChange(), handleConfirmPay(), recalcGroups(), updateQuantity(), validateShipping()

### Community 9 - "Dialog & Utilities"
Cohesion: 0.1
Nodes (2): getExt(), isImage()

### Community 10 - "Avatar & Currency UI"
Cohesion: 0.11
Nodes (0): 

### Community 11 - "Image Gallery Viewer"
Cohesion: 0.14
Nodes (10): getPinchDist(), handleTouchMove(), handleTouchStart(), lbNext(), lbPrev(), nextImage(), onKey(), prevImage() (+2 more)

### Community 12 - "Storage Manager"
Cohesion: 0.17
Nodes (2): logPurchaseInterest(), openPurchaseModal()

### Community 13 - "Select & Filter UI"
Cohesion: 0.18
Nodes (0): 

### Community 14 - "TipTap Media Editor"
Cohesion: 0.18
Nodes (0): 

### Community 15 - "Listing Edit & Images"
Cohesion: 0.2
Nodes (2): handleFiles(), handleInputChange()

### Community 16 - "Admin Creator Table"
Cohesion: 0.2
Nodes (2): toggleBadge(), update()

### Community 17 - "Creator Support/Fan"
Cohesion: 0.2
Nodes (0): 

### Community 18 - "Social Share"
Cohesion: 0.2
Nodes (0): 

### Community 19 - "Admin Popup Manager"
Cohesion: 0.25
Nodes (0): 

### Community 20 - "SEO Helpers"
Cohesion: 0.29
Nodes (0): 

### Community 21 - "Admin Escrow"
Cohesion: 0.33
Nodes (0): 

### Community 22 - "Creator Popup"
Cohesion: 0.33
Nodes (0): 

### Community 23 - "Dispute & Order Detail"
Cohesion: 0.33
Nodes (0): 

### Community 24 - "Transaction Filters"
Cohesion: 0.4
Nodes (0): 

### Community 25 - "Videos Manager"
Cohesion: 0.4
Nodes (0): 

### Community 26 - "Page CMS Editor"
Cohesion: 0.67
Nodes (2): handleTitleChange(), slugify()

### Community 27 - "Post CMS Editor"
Cohesion: 0.67
Nodes (2): handleTitleChange(), slugify()

### Community 28 - "Global Search"
Cohesion: 0.5
Nodes (0): 

### Community 29 - "Contact Form"
Cohesion: 0.67
Nodes (2): handleSubmit(), validate()

### Community 30 - "FX Rate Utilities"
Cohesion: 0.5
Nodes (0): 

### Community 31 - "Admin Storage"
Cohesion: 1.0
Nodes (2): AdminStorageClient(), fmtBytes()

### Community 32 - "Middleware"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Error Pages"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Not Found"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Media Delete"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Messages Icon"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Prisma Browser"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Middleware`** (2 nodes): `middleware.ts`, `middleware()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Error Pages`** (2 nodes): `error.tsx`, `Error()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Not Found`** (2 nodes): `not-found.tsx`, `NotFound()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Media Delete`** (2 nodes): `MediaDeleteButton.tsx`, `MediaDeleteButton()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Messages Icon`** (2 nodes): `MessagesIcon.tsx`, `MessagesIcon()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Prisma Browser`** (2 nodes): `browser.ts`, `prismaNamespaceBrowser.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 8 inferred relationships involving `POST()` (e.g. with `requireAdmin()` and `checkRateLimit()`) actually correct?**
  _`POST()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `uploadFile()` (e.g. with `handleAvatarChange()` and `handleBannerChange()`) actually correct?**
  _`uploadFile()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `PATCH()` (e.g. with `requireAdmin()` and `DELETE()`) actually correct?**
  _`PATCH()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `requireAdmin()` (e.g. with `POST()` and `GET()`) actually correct?**
  _`requireAdmin()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `selectImage()` (e.g. with `resetZoom()` and `prevImage()`) actually correct?**
  _`selectImage()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `Admin CMS & Content` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Should `Payment & Auth Core` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._