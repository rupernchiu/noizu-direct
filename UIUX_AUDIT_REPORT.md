# NOIZU-DIRECT — UI/UX Audit Report

**Date:** 2026-04-16  
**Auditor:** Claude Code (Sonnet 4.6) — Senior UI/UX Engineer perspective  
**Scope:** Full application under `src/` — all user journeys audited

---

## Executive Summary

NOIZU-DIRECT has a **solid dark-mode design foundation** (Tailwind v4 CSS variables, Poppins font, purple/teal brand palette) and several well-implemented components (ProductCard with wishlist, EmptyState, ImageGallery, HeroSection). However the platform has **30+ active UX defects** spanning enum leakage into user-facing text, mobile touch-target failures, missing onboarding flows, inconsistent sidebar patterns, and absent micro-interactions.

The most damaging issues are:
1. **Enum leakage** — users see `DIGITAL_ART`, `COSPLAY_PRINT`, `PHYSICAL`, `PENDING` everywhere
2. **No creator onboarding** — new creators land in dashboard with no guidance
3. **Touch target violations** — wishlist heart (32px), close buttons, tab items all below 44px minimum
4. **Buyer account sidebar** — uses emoji navigation (inconsistent with dashboard which uses Lucide icons)
5. **Product page** — no sticky buy button on mobile, no wishlist button, no related products

---

## Phase 0 — Journey Audit

### GUEST JOURNEY

| Step | Current State | Issues | Priority |
|------|--------------|--------|----------|
| Homepage landing | Hero + sections from CMS DB | Stats hardcoded (500+, 10K+, 50K+) — not real DB counts | Medium |
| Homepage hero | Good gradient, CTA buttons visible | No trust signals below fold | Medium |
| Browse products | Marketplace with filters | Category badge shows `DIGITAL_ART` not "Digital Art" | **Critical** |
| View product | 2-col layout, image gallery | No wishlist, no sticky mobile CTA, no related products | High |
| View creator | Full storefront, tabs | Works well; tab visibility on mobile needs verification | Medium |
| Convert to buy | Buy Now button | Redirects to login if not authenticated — no "continue as guest" | High |

### BUYER JOURNEY

| Step | Current State | Issues | Priority |
|------|--------------|--------|----------|
| Registration | Form page | No progress indicator, no email confirmation UI | Medium |
| Onboarding | None | **No first-time buyer guide** showing escrow protection | High |
| Browse | Marketplace | Filter bottom sheet missing on mobile | High |
| Product evaluation | Product page | No social proof, no "X people bought this", no reviews | Medium |
| Checkout | Single page with order summary | Step clarity unclear; no progress bar | High |
| Post-purchase digital | Downloads page | Works but empty state has no link to downloads | Medium |
| Post-purchase physical | Orders page with tracking | Good progress bar in OrderDetailClient | Low |
| Dispute flow | 4-step form | Good, but dispute button visibility on mobile needs checking | Medium |
| Account management | Sidebar with emoji | **Emoji nav is inconsistent with dashboard** — use icons | **Critical** |
| Orders empty state | "No orders yet." | Text only, no icon or CTA | High |
| Downloads empty state | Not verified | Likely missing | Medium |
| Wishlist empty state | Not verified | Likely missing | Medium |

### CREATOR JOURNEY

| Step | Current State | Issues | Priority |
|------|--------------|--------|----------|
| Registration | Creator-specific form | No indication of what comes next | Medium |
| **First login — onboarding** | Goes straight to dashboard | **No onboarding checklist** — no "Complete your store setup" flow | **Critical** |
| Dashboard overview | 4 stat cards + orders table | Orders table shows raw `PENDING`, `PAID` status enums | **Critical** |
| Add listing | Form page exists | Not audited in depth | Medium |
| Manage orders | Orders page | Escrow status enums exposed to creator | High |
| Messages | Message page | Not verified for mobile UX | Medium |
| Request payout | Earnings page | Needs verification | Medium |
| Store setup | Profile page in dashboard | No indicator of profile completeness | High |

### ADMIN JOURNEY

| Step | Current State | Issues | Priority |
|------|--------------|--------|----------|
| Overview | 4 stat cards + orders table | No critical alerts area, no charts, no urgency indicators | High |
| Disputes | Table page | No urgency color coding, no "days waiting" indicator | High |
| Creators | Table page | No verification toggle inline, no warning count visible | Medium |
| Escrow | Page exists | Need to verify content | Medium |
| Two DollarSign icons | Sidebar has Transactions + Payouts both with DollarSign | Confusing — different icons needed | Medium |

---

## Defect Inventory

### CRITICAL — Must fix first

| ID | Page/Component | Issue | Fix |
|----|---------------|-------|-----|
| C1 | `ProductCard` | Category badge shows raw enum: `DIGITAL_ART`, `COSPLAY_PRINT`, `PHYSICAL_MERCH`, `STICKERS` | Map to display labels |
| C2 | `ProductCard` | Type badge shows raw enum: `PHYSICAL`, `DIGITAL`, `POD` | Map to display labels |
| C3 | `MarketplaceClient` | Type toggle shows `ALL / PHYSICAL / DIGITAL` (missing POD) | Add POD; use display labels |
| C4 | Dashboard orders table | Status column shows raw enums: `PENDING`, `PAID`, `SHIPPED` | Map to friendly labels |
| C5 | Admin orders table | Same raw enum issue | Same fix |
| C6 | Creator dashboard | No onboarding checklist on first visit | Implement setup checklist |
| C7 | Buyer account sidebar | Uses emoji (👤 📦 ⬇️) — inconsistent with dashboard's Lucide icons | Replace with Lucide icons |
| C8 | `account/page.tsx` | Role badge shows raw `BUYER`, `CREATOR`, `ADMIN` | Map to friendly labels |

### HIGH — Fix in this pass

| ID | Page/Component | Issue | Fix |
|----|---------------|-------|-----|
| H1 | `ProductCard` wishlist btn | 32×32px — below 44px minimum touch target | Increase to 44×44px |
| H2 | Product page | No wishlist button on product detail | Add WishlistButton component |
| H3 | Product page (mobile) | No sticky "Buy Now" CTA at bottom | Add sticky bottom bar on mobile |
| H4 | Product page | No related products section | Add "More from [Creator]" + "Similar products" |
| H5 | Marketplace (mobile) | Filters are a top row — no bottom sheet pattern | Implement FilterSheet for mobile |
| H6 | Checkout | No step progress indicator | Add breadcrumb steps: Cart → Details → Payment → Done |
| H7 | Dashboard overview | No quick action buttons | Add: [+ Add Product] [View Orders] [Request Payout] |
| H8 | Dashboard overview | Empty order state: plain text only | Add EmptyState component with icon + CTA |
| H9 | Creator onboarding | No profile completeness indicator in dashboard | Add progress bar/checklist |
| H10 | Account orders list | Empty state: plain text | Add EmptyState component |
| H11 | Account downloads | Empty state not verified — likely plain text | Add EmptyState component |
| H12 | Account wishlist | Empty state not verified | Add EmptyState component |
| H13 | Account following | Empty state not verified | Add EmptyState component |
| H14 | Admin overview | No critical alerts section | Add alert cards for pending disputes, payouts |
| H15 | Admin disputes | No urgency color coding | Add age-based color (green/yellow/orange/red) |
| H16 | `globals.css` line 98 | Global `transition` on `*` causes layout/paint jank | Remove from `*`, apply only to specific properties on specific elements |

### MEDIUM — Improve in this pass

| ID | Page/Component | Issue | Fix |
|----|---------------|-------|-----|
| M1 | Dashboard sidebar | Navigation is horizontal scroll on mobile | Collapsible slide-in sidebar on mobile |
| M2 | Dashboard sidebar | No visual grouping of related items | Add `---` dividers between groups |
| M3 | Admin sidebar | Two `DollarSign` icons for Transactions + Payouts | Use `CreditCard` for Payouts |
| M4 | Marketplace pagination | Uses traditional pages | Prefer "Load more" button on marketplace |
| M5 | Homepage stats | Hardcoded "500+, 10K+, 50K+" | Pull real counts from DB |
| M6 | HeroSection | No "How it works" section below CTA | Add 3-step explainer |
| M7 | ProductCard | Category badge text not human-readable | Fixed by C1 |
| M8 | Creator storefront | Tab content visibility on mobile needs check | Verify tab scrolling |
| M9 | Checkout page | `63 lines` — very thin, needs real checkout flow | Expand with step UI |
| M10 | Dashboard orders | Escrow status shows raw `TRACKING_ADDED`, `HELD` | Map to friendly labels |
| M11 | Various | Button hover states missing `cursor: pointer` | Ensure all `<button>` has cursor |
| M12 | Product page breadcrumb | Missing category in breadcrumb path | Add category crumb |
| M13 | Account page | "Danger Zone" section has only "Export My Data" | Could be labeled "Account Data" instead |
| M14 | Footer | Needs verification of all links | Audit all footer hrefs |
| M15 | All modal close buttons | Need to verify 44px touch target + Escape key | Audit |

### LOW — Nice to have

| ID | Issue |
|----|-------|
| L1 | No page transition animations |
| L2 | No confetti on order success |
| L3 | Toast messages not verified to be action-specific |
| L4 | No `@media (prefers-reduced-motion: reduce)` for animations |
| L5 | SearchBar not verified on mobile (full-screen overlay?) |
| L6 | Creator commission tab terms not collapsible |
| L7 | No loading state on wishlist toggle (shows immediately) — actually it does loading state, verify spinner |
| L8 | Product description not expandable if long |

---

## Design System Status

### Typography
- ✅ Poppins loaded via Google Fonts in `globals.css`
- ✅ Applied globally via `--font-sans`
- ⚠️ No documented type scale — font sizes set ad-hoc per component
- ⚠️ Some components use inline styles with hardcoded `fontSize` values

### Colors
- ✅ CSS variables defined for both light/dark mode
- ✅ Primary `#7c3aed` (purple), Secondary `#00d4aa` (teal)
- ⚠️ `OrderDetailClient.tsx` uses 25+ hardcoded hex values (`#7c3aed`, `#ef4444`, etc) — should use CSS vars
- ⚠️ `HeroSection` hardcoded `rgba(124,58,237,0.15)` in gradient
- ⚠️ `globals.css:98` — `transition` on `*` affects ALL elements including images, SVGs — performance risk

### Spacing
- ✅ Tailwind spacing scale used
- ⚠️ Card padding inconsistent: `p-3` (ProductCard), `p-4` (admin cards), `p-5` (order detail cards), `p-6` (account cards)
- Decision: standardize on `p-4` (compact) or `p-5` (comfortable) — **pick p-5 for content cards, p-3 for list items**

### Components

| Component | State |
|-----------|-------|
| `Button` (shadcn) | ✅ Exists |
| `Card` (shadcn) | ✅ Exists |
| `Input` (shadcn) | ✅ Exists |
| `Select` (shadcn) | ✅ Exists |
| `Dialog` (shadcn) | ✅ Exists |
| `Sheet` (shadcn) | ✅ Exists (mobile drawers) |
| `Tabs` (shadcn) | ✅ Exists |
| `Avatar` (shadcn) | ✅ Exists |
| `Badge` (shadcn) | ✅ Exists |
| `Skeleton` (shadcn) | ✅ Exists |
| `EmptyState` | ✅ Custom, good pattern — icon + title + description + action |
| `ProductCard` | ✅ Good — fix enum labels, touch target |
| `ImageGallery` | ✅ Exists |
| `BuyButton` | ✅ Exists |
| `NotificationBell` | ✅ Exists |
| `LoadingSpinner` | ✅ Exists |

---

## Agent Work Plan

### Agent 1 — Design System Consistency
**Files:** `globals.css`, `ProductCard.tsx`, `OrderDetailClient.tsx`, all admin pages, all dashboard pages
**Key work:** Fix enum leakage (C1-C8), standardize card padding, remove hardcoded hex values from non-token files

### Agent 2 — Homepage & Discovery
**Files:** `src/app/page.tsx`, `HeroSection.tsx`, `FeaturedCreatorsSection.tsx`, `CategoriesSection.tsx`, `NewDropsSection.tsx`, `MarketplaceClient.tsx`
**Key work:** Dynamic stats, "How it works" section, marketplace load-more, filter improvements (H5, M4, M5, M6)

### Agent 3 — Creator Storefront
**Files:** `src/app/creator/[username]/page.tsx`
**Key work:** Tab mobile UX, portfolio lightbox verify, commission tab styling, about tab formatting

### Agent 4 — Product Page & Checkout
**Files:** `src/app/product/[id]/page.tsx`, `src/app/checkout/[orderId]/page.tsx`, `src/app/order/success/`
**Key work:** Sticky mobile buy button (H3), wishlist button (H2), related products (H4), checkout steps (H6), M12

### Agent 5 — Dashboards
**Files:** `src/app/dashboard/page.tsx`, `src/app/dashboard/layout.tsx`, `src/app/account/layout.tsx`, all account/* and dashboard/* pages
**Key work:** Creator onboarding checklist (C6), fix buyer sidebar icons (C7), dashboard empty states (H7-H13), mobile sidebar (M1), status label fixes (C4, M10)

### Agent 6 — Admin Panel
**Files:** `src/app/admin/page.tsx`, `src/app/admin/layout.tsx`, `src/app/admin/disputes/`, `src/app/admin/creators/`
**Key work:** Alert section (H14), dispute urgency colors (H15), admin sidebar icon fix (M3), raw enum fix (C5)

### Agent 7 — Mobile UX
**Files:** `MarketplaceClient.tsx`, `ProductCard.tsx`, `src/app/product/[id]/page.tsx`, `src/app/creator/[username]/page.tsx`, all layout files
**Key work:** Bottom sheet filters (H5), touch targets (H1, H15), sticky buy button (H3), mobile dashboard navigation (M1)

### Agent 8 — Microcopy, Empty States & Onboarding
**Files:** All pages with empty states, `src/app/(auth)/`, toasts
**Key work:** Creator onboarding flow (C6), all empty states (H8-H13), button label audit, error message audit, tooltip system

---

## Additional Code Findings

### Enum Leakage — Full Inventory

The following raw enum values are rendered directly to users:

| Value | Where shown | Fix |
|-------|-------------|-----|
| `DIGITAL_ART` | ProductCard category badge (line 122) | Map via CATEGORY_LABELS |
| `COSPLAY_PRINT` | ProductCard category badge | Map via CATEGORY_LABELS |
| `PHYSICAL_MERCH` | ProductCard category badge | Map via CATEGORY_LABELS |
| `DOUJIN` | ProductCard category badge | Map via CATEGORY_LABELS |
| `STICKERS` | ProductCard category badge | Map via CATEGORY_LABELS |
| `PHYSICAL` | ProductCard type badge (line 131), orders page (line 158) | Map via TYPE_LABELS |
| `DIGITAL` | ProductCard type badge, orders page | Map via TYPE_LABELS |
| `POD` | ProductCard type badge, orders page | Map via TYPE_LABELS |
| `PENDING` | dashboard/page.tsx orders table (line 127), dashboard/orders/page.tsx (line 125) | Map via STATUS_LABELS |
| `PAID` | All order tables | Map via STATUS_LABELS |
| `SHIPPED` | All order tables | Map via STATUS_LABELS |
| `TRACKING_ADDED` | Escrow status references | Map via ESCROW_LABELS |
| `HELD` | Escrow status references | Map via ESCROW_LABELS |
| `BUYER` | account/page.tsx role badge (line 68) | Map: BUYER → "Buyer", CREATOR → "Creator" |
| `CREATOR` | account/page.tsx role badge | As above |
| `ADMIN` | account/page.tsx role badge | As above |

**Solution:** Create `src/lib/labels.ts` as single source of truth for all enum → display mappings.

### Mobile Issues — Specific Code Locations

| Issue | File | Line | Fix |
|-------|------|------|-----|
| Wishlist btn 32×32px | ProductCard.tsx | 143-158 | Change to min-h-11 min-w-11 (44px) |
| "Buy" mobile button 24px height | ProductCard.tsx | 209 | `py-1.5` → `py-2` (approx. 36px, acceptable for secondary) |
| Filter row not bottom-sheet | MarketplaceClient.tsx | 174+ | Add `<FilterSheet>` component for mobile |
| No sticky buy on product page | product/[id]/page.tsx | 240+ | Add `<div class="fixed bottom-0 ...">` on mobile |
| Dashboard nav horizontal scroll | dashboard/layout.tsx | 21 | Add hamburger on mobile |
| Account sidebar emoji nav | account/layout.tsx | 21-29 | Replace with Lucide icons |

### Checkout Current State

`checkout/[orderId]/page.tsx` delegates to `CheckoutClient` component (file not yet read). The server page is 63 lines — thin wrapper. Need to read `CheckoutClient` to audit the actual flow.

### Navbar Assessment

Navbar is well-built:
- ✅ Sticky, backdrop-blur
- ✅ Mobile hamburger with Sheet
- ✅ Cart icon with dropdown empty state  
- ✅ Theme toggle
- ✅ Role-based links
- ⚠️ Cart icon button is 36×36px (below 44px minimum)
- ⚠️ Cart button uses inline styles with hardcoded `#ef4444` and `#7c3aed`

### Dashboard Overview Quick Actions — Missing

`dashboard/page.tsx` has no quick action buttons. Users must use the sidebar to navigate. Add:
```
[+ Add Product] → /dashboard/listings/new
[View Orders]   → /dashboard/orders  
[Request Payout] → /dashboard/earnings/payout
[Messages]       → /dashboard/messages (with unread count badge)
```

## Changes Made

*This section will be updated as agents complete their work.*

---

## Deferred to V2

- Reviews / ratings system (no data model exists yet)
- Social proof counters ("X bought this")  
- Push notifications
- Commission request flow (currently just shows status)
- Analytics dashboard for creators (charts)
- Pull to refresh (requires Service Worker)
- Pinch-to-zoom (ImageGallery may already handle this)
- Stripe/alternative payment for non-Airwallex markets
