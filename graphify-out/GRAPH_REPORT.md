# Graph Report - C:/Users/ruper/noizu-direct/src  (2026-04-15)

## Corpus Check
- Large corpus: 220 files · ~223,190 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 401 nodes · 537 edges · 27 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `PATCH()` - 7 edges
2. `DELETE()` - 5 edges
3. `requireAdmin()` - 5 edges
4. `uploadFile()` - 5 edges
5. `selectImage()` - 4 edges
6. `POST()` - 3 edges
7. `GET()` - 3 edges
8. `getCreatorProfile()` - 3 edges
9. `verifyOwnership()` - 3 edges
10. `getOwned()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `AccountPage()` --calls--> `formatDate()`  [INFERRED]
  C:\Users\ruper\noizu-direct\src\app\account\page.tsx → C:\Users\ruper\noizu-direct\src\app\dashboard\orders\page.tsx
- `PATCH()` --calls--> `requireAdmin()`  [INFERRED]
  C:\Users\ruper\noizu-direct\src\app\api\videos\[id]\route.ts → C:\Users\ruper\noizu-direct\src\app\api\admin\popup\route.ts
- `PATCH()` --calls--> `getCreatorProfile()`  [INFERRED]
  C:\Users\ruper\noizu-direct\src\app\api\videos\[id]\route.ts → C:\Users\ruper\noizu-direct\src\app\api\dashboard\popup\route.ts
- `PATCH()` --calls--> `verifyOwnership()`  [INFERRED]
  C:\Users\ruper\noizu-direct\src\app\api\videos\[id]\route.ts → src\app\api\products\[id]\route.ts
- `PATCH()` --calls--> `getOwned()`  [INFERRED]
  C:\Users\ruper\noizu-direct\src\app\api\videos\[id]\route.ts → C:\Users\ruper\noizu-direct\src\app\api\support\tiers\[id]\route.ts

## Communities

### Community 0 - "Marketplace UI & Popups"
Cohesion: 0.03
Nodes (7): AccountPage(), formatDate(), getExt(), isImage(), parsePricingTiers(), parseTags(), toDiscoveryCreator()

### Community 1 - "Prisma ORM & DB Layer"
Cohesion: 0.18
Nodes (0): 

### Community 2 - "Auth, Checkout & Layout"
Cohesion: 0.08
Nodes (0): 

### Community 3 - "Account & Form Components"
Cohesion: 0.09
Nodes (2): buildDropdownContent(), handleSave()

### Community 4 - "Creator Profile Manager"
Cohesion: 0.09
Nodes (5): handleAvatarChange(), handleBannerChange(), handleLogoChange(), handlePortfolioImageChange(), uploadFile()

### Community 5 - "Shared UI Primitives"
Cohesion: 0.09
Nodes (0): 

### Community 6 - "Avatar, Currency & Nav"
Cohesion: 0.09
Nodes (0): 

### Community 7 - "Dialog & Copy Utilities"
Cohesion: 0.1
Nodes (2): getExt(), isImage()

### Community 8 - "Image Gallery & Lightbox"
Cohesion: 0.14
Nodes (10): getPinchDist(), handleTouchMove(), handleTouchStart(), lbNext(), lbPrev(), nextImage(), onKey(), prevImage() (+2 more)

### Community 9 - "Airwallex Payments"
Cohesion: 0.22
Nodes (13): createPaymentIntent(), getPaymentIntent(), getToken(), DELETE(), extractEmbedId(), GET(), getCreatorProfile(), getOwned() (+5 more)

### Community 10 - "Creator Discovery & Tabs"
Cohesion: 0.15
Nodes (2): getFirstImage(), ProductCard()

### Community 11 - "Filter & Select Controls"
Cohesion: 0.18
Nodes (0): 

### Community 12 - "Admin Creator Table"
Cohesion: 0.2
Nodes (2): toggleBadge(), update()

### Community 13 - "Product Listing & Upload"
Cohesion: 0.2
Nodes (2): handleFiles(), handleInputChange()

### Community 14 - "TipTap CMS Editor"
Cohesion: 0.18
Nodes (0): 

### Community 15 - "Support Tiers & Goals"
Cohesion: 0.2
Nodes (0): 

### Community 16 - "Admin Popups Manager"
Cohesion: 0.25
Nodes (0): 

### Community 17 - "Transaction Filters"
Cohesion: 0.4
Nodes (0): 

### Community 18 - "Videos Manager"
Cohesion: 0.4
Nodes (0): 

### Community 19 - "Announcements Manager"
Cohesion: 0.5
Nodes (0): 

### Community 20 - "Page Editor (CMS)"
Cohesion: 0.67
Nodes (2): handleTitleChange(), slugify()

### Community 21 - "Post Editor (CMS)"
Cohesion: 0.67
Nodes (2): handleTitleChange(), slugify()

### Community 22 - "FX Currency Conversion"
Cohesion: 0.5
Nodes (0): 

### Community 23 - "Middleware & Auth Guard"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Not Found Page"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Media Delete Button"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Prisma Browser Client"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Middleware & Auth Guard`** (2 nodes): `middleware.ts`, `middleware()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Not Found Page`** (2 nodes): `not-found.tsx`, `NotFound()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Media Delete Button`** (2 nodes): `MediaDeleteButton.tsx`, `MediaDeleteButton()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Prisma Browser Client`** (2 nodes): `browser.ts`, `prismaNamespaceBrowser.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 6 inferred relationships involving `PATCH()` (e.g. with `requireAdmin()` and `getCreatorProfile()`) actually correct?**
  _`PATCH()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `DELETE()` (e.g. with `requireAdmin()` and `verifyOwnership()`) actually correct?**
  _`DELETE()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `requireAdmin()` (e.g. with `GET()` and `POST()`) actually correct?**
  _`requireAdmin()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `uploadFile()` (e.g. with `handleAvatarChange()` and `handleBannerChange()`) actually correct?**
  _`uploadFile()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `selectImage()` (e.g. with `resetZoom()` and `prevImage()`) actually correct?**
  _`selectImage()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `Marketplace UI & Popups` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Auth, Checkout & Layout` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._