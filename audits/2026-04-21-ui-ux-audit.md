# noizu.direct — UI/UX Audit

**Date:** 2026-04-21
**Auditor:** Senior UX/Design Director (review-only)
**Build context:** Next.js 16.2, React 19, Tailwind v4, post savepoint-P7 mobile UX sweep
**Scope:** Buyer, creator, admin surfaces; homepage → checkout → fulfilment → reviews → commissions

---

## 1. Executive Summary

noizu.direct is feature-complete enough to launch, but the UI is noticeably further along than the UX. The product model is ambitious — three roles, four product types (DIGITAL / PHYSICAL / POD / COMMISSION), escrow, support tiers, commissions with milestones, POD routing, discount codes, subscriptions, guestbook, verification — yet the surfaces for each of those live behind a flat, unlabeled sidebar that is already at ~25 items on the creator side (`src/app/dashboard/layout.tsx:72-134`). There is no information hierarchy for creators past the first 4 nav links.

The design system itself is inconsistent: Tailwind tokens are well-defined in `src/app/globals.css:41-97`, but half the codebase ignores them and reaches for inline `style={{}}` objects, hardcoded hex (`#7c3aed`, `#ef4444`, `#fef2f2`), and ad-hoc color systems (e.g. `src/components/layout/Navbar.tsx:40-70`, the entire `SecondaryNavClient.tsx`, the banner cards in `src/app/account/page.tsx:62-168`). Dark mode is defined but light mode is the default, and many inline-styled sections will not flip (the light-coded banners on `/account` will look broken in dark mode).

The buyer funnel from homepage → PDP → checkout is functional and reasonably pretty, but uses at least three different price-display conventions (`$9.99` hardcoded in USD on PDP, multi-currency with FX conversion at checkout, MYR-tagged JSON-LD on the same PDP that advertises USD — a credibility and SEO conflict, `src/app/product/[id]/page.tsx:218-228` vs `:186-192`). Fee disclosure is unclear: "2.5% processing fee may apply" appears on every PDP with no explanation of why *may*. The escrow promise is repeated inconsistently across PDP, checkout, and order-success, with three different phrasings.

Competitor comparison (Etsy, Gumroad, Fanbox, Booth, VGen, Artists&Clients): noizu is weaker than all of them on **discovery** (no saved searches, no facets beyond 3 pills and a sort, no category landing quality), weaker than Etsy/Booth on **reviews & trust signals** (only a buyer star block; no creator reputation score, response time, or fulfilment-speed metrics) and weaker than VGen/Artists&Clients on **commission workflow** (the buyer RFQ detail page is a bare list; there is no quote-comparison view, no milestone progress visual, no chat inline). Gumroad still does instant digital-file delivery better — noizu makes a 48-hour token link the primary experience, which is unnecessarily fragile.

The mobile sweep (P7) improved the bottom nav and added sticky CTAs on PDP. What remains rough: the double-decker top nav (`Navbar` + `SecondaryNav` + `SearchBar` + optional announcement + optional approval banner + optional rejection banner) can push useful content 250–300px below the viewport fold on a 667px phone. The creator dashboard sidebar is in a side-sheet on mobile, but the 25-item list is itself the navigation problem.

Accessibility is roughly at the "shadcn default" level — fine for interactive primitives, poor everywhere custom CSS was used. Focus rings are inconsistent (some `focus-visible:border-primary`, some `focus:ring-2 focus:ring-ring`, some none). Inline `role="button"` divs, `<button>`s styled as links, `<a href="/login">` that looks identical to form buttons — WCAG 2.2 AA will fail contrast checks on muted-foreground text against surface in light mode (`#58586e` on `#f5f5f8` is 4.47:1 — scrapes by for body, fails for anything ≤13px). Several emoji-as-icon ("🎨 Want to sell", "🎉 You are a verified creator") carry meaning with no accessible name.

The project has strong foundations (escrow, three-role sitemap, SEA currency awareness, POD routing, discovery ranking scaffolding, schema.org markup on every page). It does not yet feel like a product that a first-time visitor can understand in 8 seconds — the homepage stacks 10+ full-width sections, the nav has too many decision points, and fees/trust copy is scattered.

---

## 2. Severity Legend

| Icon | Level | Meaning |
|------|-------|---------|
| 🔴 | Critical | Blocks conversion, accessibility, or trust at launch — fix before go-live |
| 🟠 | High | Visibly hurts UX for a large % of sessions; fix within 2 weeks |
| 🟡 | Medium | Noticeable to attentive users; schedule in 4–6 weeks |
| 🟢 | Nice-to-have | Polish that moves the product from OK → good |

Effort key: **XS** < 2h · **S** < 1 day · **M** 2–5 days · **L** 1–2 weeks

---

## 3. Findings by Area

### 3.1 Visual Design & Consistency

#### 🔴 F-1. Inline style sprawl breaks theming, dark mode, and maintainability · **L**
**Where:** `src/components/layout/Navbar.tsx:40-70`, all of `src/components/layout/SecondaryNavClient.tsx`, `src/components/layout/MobileBottomNav.tsx:82-310`, `src/app/account/page.tsx:62-168`, `src/components/layout/SearchBar.tsx:78-280`, `src/app/dashboard/page.tsx:88-115` (inline bg colors).
**What's wrong:** At least 6 major navigation and shell components render via `style={{}}` with hardcoded hex values (`#7c3aed`, `#fef2f2`, `#eff6ff`, `#faf5ff`, `#c4b5fd`). These bypass the CSS variable system entirely. Tailwind tokens are defined (`globals.css:7-38`) but not used. The `/account` application-status banners use light-mode hex values explicitly (`background: '#fef2f2'`); they will look wrong in dark mode.
**Why it matters:** Theme tokens exist but are half-respected, which is worse than not having them. A future brand color change = days of find-and-replace. Dark mode users will see white cards on dark pages.
**Fix:** Enforce a lint rule banning `style={{}}` in route/component files except for computed values (progress-bar widths, dynamic transforms). Replace hex with `bg-card`, `bg-destructive/10`, etc. Audit `SecondaryNavClient.tsx` first — it is the worst offender.

#### 🟠 F-2. Primary / CTA / accent colors overlap semantically · **M**
**Where:** `globals.css:50-67`. Light-mode `--primary` (`#7c3aed`) and `--accent` (`#7c3aed`) are identical; `--cta` is `#ea580c` (orange) but no component actually uses it. `Buy Now` buttons on PDP use `--primary`, while hero CTAs, sign-up CTAs, and creator-page CTAs all share the same purple.
**Why it matters:** Etsy reserves orange for checkout-critical actions; Booth does similar. Here purple does six jobs — nav-hover, brand mark, add-to-cart, wishlist-active, pagination-active, verified-badge link. Users can't learn "purple = buy".
**Fix:** Decide a 3-tier color semantic — brand (`primary`), confirmation/buy (`cta`, use the orange), success (`secondary` teal). Update `AddToCartButton`, sticky mobile bar, and checkout submit to `--cta`.

#### 🟠 F-3. Radius tokens defined but buttons/cards disagree · **S**
`--radius-sm/md/lg/xl` exist (`globals.css:34-37`) but components hardcode `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full` in inconsistent combinations. PDP right column uses `rounded-xl` for cards (`product/[id]/page.tsx:320`), marketplace skeletons use `rounded-xl`, but the modal sheets use `16px 16px 0 0` inline. Login card uses `rounded-2xl`; product card uses `rounded-xl`; nav pills use `rounded-full`. No rule.

#### 🟡 F-4. Typography lacks hierarchy · **S**
Only Poppins is loaded (`layout.tsx:8-13`). Every H1 is `text-2xl`–`text-3xl font-bold`, every H2 is `text-base`–`text-lg font-semibold`. Body is everywhere `text-sm`. Muted labels are `text-xs uppercase tracking-wide`. There are no display weights, no serif accents, no numeric tabular figures for prices/stats. The site reads as "admin dashboard dressed up as a marketplace". Etsy, Booth, VGen all use a display/sans contrast.
**Fix:** Add a display font or at minimum reserve `font-extrabold` + tighter leading for hero + section headings, tabular-nums on prices (`font-variant-numeric: tabular-nums`).

#### 🟡 F-5. Emoji used as UI (accessibility + visual drift) · **XS**
`src/app/account/page.tsx:127,154` ("🎉 You are a verified creator", "🎨 Want to sell"), `src/app/marketplace/page.tsx:105` (`{c.icon} {c.name}` where icon is emoji from DB). These appear in a design system that otherwise uses Lucide — looks sloppy and each emoji renders differently across Windows/Android/iOS.
**Fix:** Replace with Lucide glyphs already imported elsewhere (`PartyPopper`, `Palette`, etc.).

#### 🟢 F-6. Scrollbar override breaks macOS/iOS consistency
`globals.css:117-130` replaces the scrollbar with a 6px purple-on-hover thumb. On hover-capable devices this is fine; on trackpads the indicator disappears (Webkit only). Consider removing for `prefers-reduced-motion` or non-hover input.

---

### 3.2 Accessibility (WCAG 2.2 AA)

#### 🔴 F-7. Focus states inconsistent and sometimes removed · **M**
**Where:** `Navbar.tsx:110` uses `outline-none` with no `:focus-visible` replacement on the avatar dropdown trigger. `MobileBottomNav.tsx:337` ("border-none bg-transparent cursor-pointer") has no focus styling. `SecondaryNavClient.tsx` buttons use inline `style` and never set an `:focus-visible` outline. Login/register inputs use `focus-visible:border-primary` but that's a 1px border change — insufficient contrast for a focus indicator per WCAG 2.4.7.
**Why it matters:** Keyboard users cannot reliably see where they are. Fails 2.4.7 and 2.4.11 (Focus Not Obscured).
**Fix:** Global `*:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }` and stop stripping outlines on interactive elements unless replaced.

#### 🔴 F-8. Color contrast failures in light mode · **S**
`--muted-foreground: #58586e` on `--surface: #f5f5f8` = 4.47:1. That passes for ≥14px regular text but fails for the many 11–13px muted captions (e.g. "Member since…" on `/account`, card subheadings everywhere, timestamp text in reviews). `text-white/70` on video hero (`HeroSection.tsx:158,163`) against a dimmed video can be 2.5:1.
**Fix:** Bump `--muted-foreground` to `#4a4a60` (5.6:1) in light mode. Ensure hero captions use full white or a solid overlay rather than `/70`.

#### 🔴 F-9. `<img>` tags missing semantic alt; decorative ones not marked · **S**
At least 14 `eslint-disable-next-line @next/next/no-img-element` instances, and several have no `alt` or reuse the display name generically ("reference" for buyer commission references, `alt=""` with no `aria-hidden`). PDP gallery alts re-use the product title 6× in a row. Commission reference images are `alt="reference"` (`account/commissions/requests/[id]/page.tsx:67`).
**Fix:** (a) Switch to `next/image` where possible for CLS and LCP benefits. (b) Establish an alt convention: product gallery → `"{title} — view {n}"`; decorative avatars when a name is present next to them → `alt=""`; reference images → `"Reference image {n}, uploaded by {buyer}"`.

#### 🟠 F-10. Form error handling — errors below input, no `aria-describedby`, no `aria-invalid` · **M**
Login, register, new-listing, checkout shipping, commission quote — none wire their Zod errors to the input via `aria-describedby`/`aria-invalid`. Screen readers won't announce the error on tab-focus. The "Error:" text and red border alone fail 3.3.1 / 3.3.3.
**Fix:** Standard pattern in a shared `<Field>` wrapper: `aria-invalid={!!error}` + `aria-describedby={errorId}` + `<p id={errorId} role="alert">`.

#### 🟠 F-11. Keyboard traps in the agreement wall and mobile bottom-sheets · **S**
`MobileBottomNav.tsx`'s `BottomSheet` (L59–122) locks `document.body.style.overflow = 'hidden'` and closes on outside tap but has no `Esc` handler, no initial focus move, no focus trap, no `role="dialog"`/`aria-modal`. Same pattern likely in `AgreementWall` (wraps the whole dashboard at L174–182).
**Fix:** Replace with Radix/Base UI Dialog (already a dep: `@base-ui/react`). Or at minimum: move focus to the sheet, trap tab, close on Esc, add `role="dialog" aria-modal="true" aria-labelledby`.

#### 🟠 F-12. Reduced motion partially respected · **XS**
`globals.css:153-159` kills animation/transition duration globally — good. But `MobileBottomNav` uses inline `animate-bounce`/inline transforms (`order/success/page.tsx:35-42` has 7 bouncing confetti dots with `animate-bounce`). Reduced-motion users still see these because `animate-bounce` is a keyframe animation, not a CSS transition — the reduce-motion rule zeroes duration but doesn't unset the animation.
**Fix:** Wrap decorative animations in `motion-safe:animate-bounce`, or render confetti only if `!matchMedia('(prefers-reduced-motion: reduce)')`.

#### 🟡 F-13. Landmarks + skip-link missing · **S**
`layout.tsx` has `<header>` + `<main>` + `<footer>` — good. But no `<nav aria-label>`, no skip-link ("Skip to main content"), the mobile bottom nav is a raw `<div>` not `<nav>`. Dashboard/account sidebars are `<aside><nav>` (correct). Add a skip-link as the first focusable element in `RootLayout`.

#### 🟡 F-14. Icon-only buttons without `aria-label` · **XS**
CartIcon is labelled (`aria-label="Shopping cart, X items"` — good). But the password-visibility toggle is labelled, yet the close-buttons in popups, confetti icons, and several "×" buttons in filter chips are not. Audit `ProductCard` wishlist, `AnnouncementBarClient` dismiss, `OnboardingChecklist` close.

#### 🟢 F-15. No language attribute on non-English strings
`locale: 'en_MY'` is set globally but creator bios / product titles may be in Bahasa Melayu / Thai / Indonesian. Without `lang="ms"` on user-generated text, screen readers use English pronunciation. Low priority unless SEA is a named accessibility commitment.

---

### 3.3 Information Architecture & Navigation

#### 🔴 F-16. Creator sidebar is unscannable (25+ items, shallow hierarchy) · **M**
`src/app/dashboard/layout.tsx:72-134` shows 20+ `<NavLink>`s plus 4 separator headers. Ordering mixes store-management (Listings, Commissions, Orders) with merchandising (Support, Subscribers, Videos, Popup, Discount Codes), with settings (POD, Verification, Storage), with buyer-mode items (My Orders, My Downloads, Wishlist, Following, My Statements, Disputes, Messages). There are two "Messages" links (dashboard and account — different inboxes for the same human).
**Why it matters:** Etsy/Booth creators manage stores inside collapsible groups (Listings / Orders / Marketing / Finances / Settings). Here everything is a flat list, and the "Member Account" switch at the bottom duplicates the top-of-sidebar "← Member Account" link. First-time creators won't find Earnings → Payout (it's three levels deep and not visually emphasized despite being the money screen).
**Fix:** Collapse into 5 sections with expandable groups: Storefront / Sales / Marketing / Finances / Settings. Consider a command-K launcher for power users. Kill the duplicated Member-Account block at the bottom of the dashboard nav; the top back-link is enough.

#### 🔴 F-17. Dashboard vs Account mental model is unclear · **S**
A creator is *also* a buyer. `/account/messages` and `/dashboard/messages` both exist. `/account/orders` = purchases; `/dashboard/orders` = sales. `/account/statements` ≠ `/dashboard/statement`. Navbar dropdown (`Navbar.tsx:130`) sends creators to `/dashboard`, forcing them to cross-navigate to access their own wishlist.
**Fix:** Add a clear mode-switch pill in the global shell ("Viewing as: Creator / Buyer"), not just a secondary link. Or, merge `/account` into `/dashboard` with a `?view=buyer` filter and a visible toggle.

#### 🟠 F-18. Top-of-page header stack is too tall · **M**
`RootLayout` renders, top-to-bottom: `AnnouncementBar` (variable), `RejectionBannerWrapper` (conditional), `ApprovalBannerWrapper` (conditional), `Navbar` (56px), mobile secondary-links row (40px), `CartProvider` (drawer), `SecondaryNav` (desktop only), then `SearchBar` (52px, not sticky). On mobile with one active announcement that's ~160px of chrome before content. Hero content on PDP sits further down than competitors' "above-the-fold".
**Fix:** Collapse `Navbar` + mobile secondary row into a single 48px bar on mobile (nav inside the hamburger). Move the persistent search to the Navbar with a collapsed icon on mobile that expands. Move banners below the fold except on pages where the user must act on them.

#### 🟠 F-19. Breadcrumbs inconsistent · **S**
PDP has breadcrumbs (good, `product/[id]/page.tsx:235-241`). Marketplace category landing has them (`marketplace/page.tsx:89-95`). Creator profile does not (`creator/[username]/page.tsx` renders no breadcrumb component even though the JSON-LD breadcrumb is emitted). Checkout has none. Order-success has none. Dashboard pages have a single back-arrow text link at best.
**Fix:** Add a tiny breadcrumb component and render on every non-root route. Consistency improves orientation on the funnel.

#### 🟠 F-20. Dead-end / orphan pages · **S**
- Creator page hero CTA "Browse other creators" links to `/explore` (`creator/[username]/page.tsx:291`) — that route does not exist in the app tree (only `/creators`). Dead link.
- `src/app/[slug]/page.tsx` catch-all for CMS pages — no way to know which slugs exist from the UI unless the footer was updated.
- `dashboard/support` (creator's support tiers) vs `/support` (help center?) — potentially confusing.
**Fix:** Replace `/explore` with `/creators` or `/marketplace`. Add a CMS-pages index for admins.

---

### 3.4 User Journeys

#### Buyer: discover → PDP → cart → checkout → post-purchase → tracking → review → message

| Step | Friction | Severity | Effort |
|------|---------|----------|--------|
| Discover (`/`) | Homepage has 10+ sections (Hero, TrustBar, Pain Points, How it Works, Creator Spotlight, Commission Spotlight, plus DB-driven sections). No "back to top" on mobile, scrolling is endless. | 🟠 | S |
| Discover (`/marketplace`) | 5 category pills + 6 sort options + 4 type chips + search + pagination — but no facets by price range, rating, delivery type, creator verified, country. Compared to Etsy (20+ facets), this is barren. | 🟠 | L |
| PDP (`/product/[id]`) | Price shown in USD hardcoded (`product/[id]/page.tsx:64-66` uses `$`); schema.org emits both USD *and* MYR on the same page (L186-188 vs L220-222). Breadcrumb doesn't include creator name. "2.5% processing fee may apply" is vague — *when* may it apply? | 🔴 | S |
| PDP variants | Size + color variants rendered — good. Stock display for physical is numerical (`In stock: 47`) which can reveal supply to competitors and creates "only 2 left" anxiety inconsistently. | 🟡 | XS |
| Add to cart | Cart drawer is provider-injected at the root — good pattern. No confirmation of variant selection before it adds. Cross-creator cart is fine but the grouping-by-creator at checkout is not previewed in the drawer. | 🟡 | S |
| Checkout (`/checkout`) | `CheckoutPageClient.tsx:111-130` hardcodes a SEA-first country list, then a giant flat `OTHER_COUNTRIES` array — no search. Alphabetically listing 100+ countries in a `<select>` is painful on mobile. No autofill hints beyond `autoComplete`. FX conversion happens client-side after render (`:216-235`) — the visible total flashes from USD to local on first paint. | 🔴 | M |
| Checkout — escrow / delivery | "Payment held in escrow until delivery" shown at PDP (`product/[id]/page.tsx:387`), then again (worded differently) on checkout, then silent at payment. 14-day dispute window mentioned only on PDP for physical. | 🟠 | S |
| Payment | Airwallex drop-in is embedded but `paymentError` surfaces via `setPaymentError` — need to verify this renders prominently, above the drop-in. | 🟠 | S (verify) |
| Order success | Confetti dots animate regardless of reduced-motion (`order/success/page.tsx:35-42`). Order ID truncated to 16 chars + "…" — buyer must guess the full ID for support. 48h download token clock is mentioned but not shown as a timer. | 🟠 | S |
| Tracking (`/account/orders/[id]`) | 5-step progress bar is good. But courier code → link relies on `lib/courier-tracking` lookup; if unknown courier, no link. No email/push when status advances (server side — not audited here). | 🟡 | S |
| Review (post-completion) | `ProductReviewForm` is rendered on PDP always, gated by "already reviewed" server check — good. But there's no prompt post-delivery; buyer must return to PDP to leave a review. Etsy/Booth email a CTA; Airwallex receipts could do the same. | 🟠 | M |
| Message creator | PDP has a "Message" only via the creator profile, not from PDP directly. Buyers often want to ask about a specific listing. The `MessagesIcon` component is top-nav only. | 🟡 | S |

#### Creator: sign-up → onboarding → listing → order → fulfilment → payout

| Step | Friction | Severity |
|------|---------|----------|
| Register (`/register/creator`) | 2-step form, bio + category tags step 2 — good. But 3-char+ lowercase-only username rule is enforced with no live availability check; users only find out on submit. | 🟠 |
| After signup | `dashboard/page.tsx:31-65` has a recovery path that auto-creates a profile if missing. This is a symptom — the registration→profile handoff is not atomic. Fix the root cause. | 🟡 |
| Start Selling flow (for existing buyers) | `/start-selling` is a separate route from `/register/creator`. Two entry points, one flow — confusing. | 🟡 |
| Onboarding checklist | `OnboardingChecklist.tsx` is minimal: "Add profile photo / banner / bio / social / first product / complete profile". No rich preview, no "skip for now", no estimate of time. One click-to-dismiss. Compare Etsy onboarding (guided progressive form). | 🟠 |
| New listing (`/dashboard/listings/new`) | One 700-line form that conditionally shows POD/commission blocks. No image-upload preview before save; no save-as-draft; no rich-text for description (despite Tiptap being installed). Category dropdown shows generic label "Select a category" as the first option but the field is required — poor error UX. | 🔴 |
| Variants (size/color) | UI exists but uploading per-color mockup is buried and the JSON shape is a raw `{ name, mockupImage }[]` with no guardrails — easy to produce malformed data. | 🟡 |
| Digital file upload | `DigitalFilesUpload` is custom; no indication of file size limits vs storage quota until save fails. | 🟠 |
| Order received (creator view) | Sidebar link exists. Not audited in depth, but grouping orders by status + "needs action" counter would match Etsy/Booth. | 🟠 |
| Fulfilment | Creator enters tracking number + courier code. Courier list is hardcoded via `lib/courier-tracking`. No bulk action for multiple orders. | 🟡 |
| Payout (`/dashboard/earnings/payout`) | Not opened in depth. Airwallex payouts — verify that minimum balance, KYC gate, and fee (4%) are disclosed in-line, not only on `/fees`. | 🟠 |

#### Commission flow: buyer RFQ → quote → accept → milestones → delivery

| Step | Friction | Severity |
|------|---------|----------|
| Send request | On creator page, not clear from top-level nav. RFQ form accepts references but no live image preview before upload confirm. | 🟠 |
| Buyer's request detail (`/account/commissions/requests/[id]`) | `src/app/account/commissions/requests/[id]/page.tsx:32-107` is an unstyled dense page. No timeline, no visual "you sent it, creator has 48h to respond" indicator. Quote list is text-only; no preview of milestone structure unless you click into the quote. | 🟠 |
| Quote review | Quote detail likely has milestone breakdown (not read) but the index view only shows `SENT/ACCEPTED` status as raw enum text. Capitalise or map to human labels. | 🟡 |
| Accept / pay deposit | Deposit-% UX — the field is free-form integer on creator side (`dashboard/listings/new/page.tsx:24`), so buyers could see anything from 0–100. No standard anchors (25/50/100). | 🟡 |
| Milestone progress | No single-glance view of "milestone 2 of 4 in progress, creator last updated 3 days ago". Missing vs. VGen which shows a milestone timeline front-and-center. | 🟠 |
| Delivery | Artists&Clients lets the creator "deliver file + request approval" — unclear if this exists here. | 🟡 |

#### Admin
`src/app/admin/*` — CMS, moderation, agreements, billing, finance, disputes, escrow, fraud, payouts, creators, staff, storage, reviews, transactions. This is a big surface but the admin overview (`admin/page.tsx:9-80`) is just stat cards + trending debug buttons + recent orders + top recommendation pairs. No queue-based "needs attention" view (e.g. "3 disputes open > 48h", "2 payouts pending > 24h", "5 creator applications awaiting review"). Admin staff will not find their daily work easily. 🟠

---

### 3.5 Onboarding & First-Run

- 🟠 **Buyer first-run:** No onboarding at all. After register, redirected to `/marketplace` via `signIn` callback (`register/page.tsx:49`). No product tour, no "here's how escrow works", no prompt to follow a creator. Compared to Booth's welcome popup: minimal.
- 🟠 **Creator first-run:** `OnboardingChecklist` is good-but-bare. Missing: "Preview your store", "See your public profile", "Estimated time to complete each step". The checklist is at the *bottom* of the dashboard page — new creators will miss it under their (empty) stat cards.
- 🟡 **Empty states** — `EmptyState.tsx` is a decent primitive but inconsistently used. Dashboard orders empty state is bespoke (`dashboard/page.tsx:170-177`); marketplace empty state uses the primitive. Settle on one.
- 🟡 **Tooltips / progressive disclosure** — virtually none. Complex features (POD provider routing, commission deposit %, milestone-based-quote vs single-payment) need inline `?` tooltips.
- 🟢 **First-run toast** — using Sonner for toasts (good). No use of toasts for celebrating firsts (first product, first sale, first payout).

---

### 3.6 Forms & Error Handling

- 🔴 **F-21.** Validation timing is submit-only. `react-hook-form` with `zodResolver` defaults to `onSubmit` mode — users get no live feedback until they click. Change mode to `onTouched` or `onBlur` for email/password/username. · **XS**
- 🟠 **F-22.** Error copy is technical. "At least 8 characters" is fine; but the commission-deposit field has no help text. "Invalid email" is fine; but username error "Lowercase letters, numbers and underscores only" is rule-focused not goal-focused ("This will be your @handle — no spaces"). · **S**
- 🟠 **F-23.** No success confirmations. After editing profile or changing a password, there's a toast (confirmed in `EditNameForm` / `ChangePasswordForm` — assumed). But no success state on the listing-new form beyond a route change. A "Saved ✓" inline would help. · **S**
- 🟠 **F-24.** Currency inputs use `<input type="number" step="0.01">` (`dashboard/listings/new/page.tsx:172-180`). On iOS this triggers number pad without decimal on some locales. Use `inputMode="decimal"` + validation. · **XS**
- 🟡 **F-25.** Password field lacks a strength indicator. 8-char minimum is lax; no upper/number/symbol prompt. · **XS**
- 🟡 **F-26.** No autosave / draft state anywhere. Commission-quote builder, new-listing form, profile editor — all lose state if the user navigates away. At minimum, warn-on-leave. · **S**

---

### 3.7 Trust & Payment UX

- 🔴 **F-27. Currency inconsistency undermines trust.** PDP prices are in USD (hardcoded `$`), checkout converts to local at a dynamically-fetched rate, but JSON-LD (`product/[id]/page.tsx:216-228`) declares `priceCurrency: 'MYR'` with the same cent-denominated value. Google Shopping will receive wrong structured data. Users who see `$12` and pay `RM52` (for a $12 item at 4.3) will feel pricing is slippery. · **S**
- 🔴 **F-28. "2.5% processing fee may apply" is vague.** On `/fees` it says 2.5% is always added at checkout. On PDP it says "may apply". Remove "may" — it's a nocebo phrase. Better: "A 2.5% processing fee is added at checkout." · **XS**
- 🟠 **F-29. Refund / dispute policy visibility.** Mentioned on PDP as "14-day dispute window" for physical. Not mentioned on digital or POD. `/fees` does not link to refund/dispute policy. `/terms` likely carries it but there's no in-context reassurance. · **S**
- 🟠 **F-30. Escrow explanation is three different phrasings.** PDP: "Payment held in escrow until you confirm delivery." Checkout: probably different. Homepage: "Escrow Protected Payments". "Escrow" is jargon in SEA markets. At least one occurrence should expand: "We hold your payment securely. The creator doesn't receive it until you confirm your item arrived." · **S**
- 🟡 **F-31. No visible badges for platform trust.** Airwallex logo / payment-methods icons at checkout are inside the drop-in; not visible before committing. Add a "We accept" row at cart-to-checkout transition. · **XS**

---

### 3.8 Microcopy & Tone

- 🟠 **F-32. SEA localization is declared but not applied.** `locale: 'en_MY'`, `areaServed: ['MY','SG','PH','ID','TH']`. But all copy is US-style casual English ("Browse Creator Products", "Buy Now", "Add Product"). Nothing switches to MY-English idioms ("RM" already used in currency, but no `lah`/local phrasing — and that's fine, but then drop the `en_MY` claim or actually localize). More importantly: no translation for the four non-English user bases claimed. · **L**
- 🟠 **F-33. Verb/noun collisions.** Dashboard nav: "Statement" (singular). Account nav: "Statements" (plural). Dashboard "Support" (creator accepting tips). Global "Support" (help desk — potential confusion). Dashboard "Messages" + Account "Messages" are two inboxes. · **S**
- 🟡 **F-34. "Buyer" vs "Member" vs "Fan" vs "Supporter".** PDP says "noizu.direct Member Protection covers this purchase" (`product/[id]/page.tsx:378`). Role map calls them "BUYER". Navbar dropdown shows "Member". Creator sidebar has "Fans" tab. Support has "Subscribers". Pick a canonical word for the customer. · **XS**
- 🟡 **F-35. Tone is flat.** Hero "noizu.direct — SEA Creator Marketplace | Buy Direct" — functional, unmemorable. `Your fave creators. Direct to you.` (footer) — better but only lives in the footer. Lift that voice. · **S**
- 🟡 **F-36. Date/number formats.** `createdAt.toISOString().slice(0,10)` used in several pages (`account/commissions/requests/[id]/page.tsx:37,58`). That's US-format-agnostic but also ugly (`2026-04-21`). Use `date-fns` (already installed) for `21 Apr 2026` or similar SEA-friendly format. · **XS**

---

### 3.9 Mobile (Post-P7)

- 🟠 **F-37. Chrome stack still too tall (see F-18).**
- 🟠 **F-38. Horizontal scroll on marketplace pagination.** Page-number row (`MarketplaceClient.tsx:324-351`) has up to 7–10 buttons — spills on narrow phones. Consider compacted `1 … 5 6 7 … 42`. · **S**
- 🟠 **F-39. PDP sticky bottom CTA collides with mobile bottom nav.** PDP renders its own sticky bar at `bottom-0` (`product/[id]/page.tsx:523`); layout.tsx also renders `MobileBottomNavServer`. They're both `z-40`/`z-50` at `bottom: env(safe-area-inset-bottom)`. Need to verify the product sticky bar sits above the nav *and* that `pb-24 md:pb-8` on the PDP's content adequately offsets. Screenshot check needed. · **S**
- 🟡 **F-40. Category pills on marketplace wrap into 3 rows on 375px.** Acceptable but consider horizontal scroll-snap instead. · **S**
- 🟡 **F-41. Bottom-sheet nav drawer locks body scroll but not the underlying content's scroll restoration on close.** Minor. · **XS**
- 🟡 **F-42. Input font-size < 16px on some forms triggers iOS zoom.** Checkout inputs are `text-sm` (14px). Zooms on focus. Use `text-base` (16px) for inputs on mobile. · **XS**
- 🟢 **F-43. Haptics / tap targets.** `MobileBottomNav` button is `min-h-[44px]` — meets minimum. Pagination buttons are `size-9` (36px) — below the 44px comfortable target.

---

### 3.10 Performance as UX

- 🟠 **F-44. Layout shift on homepage and PDP from late FX rate + sections loading in.** Checkout displays USD then swaps to local currency. PDP's "Buyers also purchased" loads server-side — fine. · **S**
- 🟠 **F-45. Heavy homepage.** 10+ sections, including a full-bleed video in the hero (`HeroSection.tsx:61-73`). No poster fallback strategy for slow connections beyond `poster={content.videoThumbnail}`. LCP likely suffers on 3G. `screenshot-hero-mobile.png` is in the repo root suggesting someone measured; `mobile-perf-3g.png` too — consider acting on those. · **M**
- 🟠 **F-46. `next/image` not used on key creator/product images in multiple places.** `product/[id]/page.tsx:336`, `creator/[username]/page.tsx:453,473,488`, checkout cart items — plain `<img>` tags. Missed auto-optimization and responsive sizing. · **M**
- 🟡 **F-47. Skeletons are thin.** `MarketplaceClient.tsx:75-86` has a decent skeleton. But most dashboard pages either show nothing or pop in. Add skeletons for `/dashboard/orders`, `/account/orders`, and commission lists. · **S**
- 🟡 **F-48. Announcement and banner bars render server-side every nav.** Each header wrapper does a Prisma call. With 3 banners × every page load, DB load will spike on traffic. Cache for 60s. · **S**

---

### 3.11 Discovery & Ranking Surface

Project memory cites a 4-layer ranking system (base + fresh + rotation + relevance) with admin boost. Surface implications:

- 🟠 **F-49. "For You" sort is the default but unexplained.** `MarketplaceClient.tsx:56` lists `DISCOVERY` first labelled "For You" — but with no onboarding, it's just a label. Tooltip: "Ranked by popularity, freshness, and your recent views." · **XS**
- 🟠 **F-50. No facets tied to the 4-layer ranking.** Ranking considers relevance but users can't see or override it. No "Only verified creators", no "Ships to Malaysia", no "Under $20", no "Digital only → instant", no "New in last 7 days" (product.isNew flag exists in `creator/[username]/page.tsx:402` but isn't surfaced as a filter). · **L**
- 🟠 **F-51. Homepage Trending section vs marketplace Trending sort.** Different ranking inputs (`TrendingSection` is pulled straight from `prisma.product` with a trendingScore, marketplace sort sends `sort=TRENDING` to API). They should use the same ranker and surface the same set, or be clearly differentiated ("Hot this week" vs "Trending now"). · **M**
- 🟠 **F-52. Search landing (`/search`) not read but likely minimal.** A search result page should offer the same facets as marketplace. Worth confirming. · **S**
- 🟡 **F-53. Category pages have weak copy.** `/marketplace?category=doujin` gets CATEGORY_META H1 + 1 sentence + related category chips. Competitors do 300-word editorial intro for SEO and orientation. · **M**
- 🟡 **F-54. No personalization signals to the buyer.** "Because you viewed X" strip is absent on homepage and marketplace. Recommendations exist in DB (`productRecommendation` table) but are only surfaced on PDP. · **M**
- 🟢 **F-55. No saved searches / alerts.** Missing feature. Not blocker.

---

## 4. Top 10 Prioritized Recommendations

| # | Recommendation | Severity | Effort | Why now |
|---|---------------|----------|--------|---------|
| 1 | Fix USD/MYR currency conflict on PDP + structured data; declare single displayed currency with clear FX explanation at checkout | 🔴 | S | Pricing trust + SEO correctness |
| 2 | Replace inline `style={{}}` with tokenized Tailwind classes in nav, search, mobile nav, account banners | 🔴 | L | Unblocks consistent theming & dark mode |
| 3 | Restructure creator sidebar into 5 collapsible sections (Storefront / Sales / Marketing / Finances / Settings) | 🔴 | M | Every creator action starts here |
| 4 | Add a global focus-visible style + `aria-describedby/invalid` on all forms; skip-link; Esc + focus trap on sheets and agreement wall | 🔴 | M | WCAG 2.2 AA compliance before launch |
| 5 | Collapse top chrome to one 48px bar on mobile; move banners below the fold except when actionable | 🟠 | M | Post-P7 it's still too tall |
| 6 | Standardize fee / escrow / refund copy across PDP, checkout, `/fees`, `/terms`; add tooltip on "processing fee" | 🟠 | S | Removes "may apply" ambiguity, raises trust |
| 7 | Add facets to marketplace & search (price range, verified, ships-to-country, delivery time, digital-only, new-7d, rating) | 🟠 | L | Biggest gap vs Etsy/Booth |
| 8 | Merge the two "Messages" inboxes or make the switch explicit; add a persistent "Viewing as Creator/Buyer" pill | 🟠 | M | Fixes the dual-role mental model |
| 9 | Commission workflow polish: timeline component, human-readable statuses, milestone progress bar, in-page chat on RFQ detail | 🟠 | L | Biggest competitive gap vs VGen/A&C |
| 10 | Improve onboarding: buyer "how escrow works" interstitial; creator checklist moved to top, with time estimates and previews | 🟠 | M | First-run currently invisible |

---

## 5. Strategic Call-outs

Five patterns that, if fixed, compound across the product:

1. **"Token system exists, isn't enforced."** CSS variables, Tailwind scale, radius tokens are all defined but half the components bypass them. A lint rule that forbids hex in JSX + a Figma-to-tokens contract will eliminate 40% of the visual inconsistency in one pass. Without it, every new feature drifts further.

2. **"Two users sharing one shell."** Creators are buyers. Admins are creators. The site treats these roles as mutually exclusive routes (`/dashboard`, `/account`, `/admin`) when the human is one person switching modes. A visible mode-switch in the global shell — plus unifying messaging, orders, and statements with a filter rather than a duplicate route — would make the whole app feel 2× simpler.

3. **"Trust promises are scattered."** Escrow, verification, 14-day dispute, fan-art-friendly, 0% platform fee all live in 4–5 different places with subtly different wording. A single `TrustCopy` component (with role/context variants) + a "Our protections" interstitial shown once per buyer would do more for conversion than any visual polish.

4. **"The 4-layer ranker has no corresponding UI."** Ranking logic on the backend with only a single "For You" sort pill wastes the investment. Expose relevance signals as filters; show buyers why they're seeing this product ("new this week", "ships from your country"); let admins preview the effect of boosts. The ranker *becomes* a UX feature only when it surfaces.

5. **"Commissions are the differentiator; they're under-designed."** SEA's creator economy is heavy on commissions (cosplay, doujin, fan illustration). noizu has the data model (`CommissionRequest`, `CommissionQuote`, `Milestone`) but the UI treats it as a form-and-list feature. A commission workflow visual (timeline, creator-vs-buyer lanes, milestone diffs, inline attachments) is table stakes for VGen/A&C competitiveness and would justify the entire platform for a thousand SEA illustrators.

---

## What to tackle first

**Before launch: pricing/currency truth (F-27/F-28), focus states & form a11y (F-7/F-10), creator sidebar restructure (F-16), and escrow/fee copy standardization (F-28/F-30) — in that order.**
