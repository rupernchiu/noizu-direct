# noizu.direct — Pre-launch Executive Summary

**Date:** 2026-04-21
**Author:** Senior reviewer synthesizing three parallel audits
**Companions:** `2026-04-21-ui-ux-audit.md`, `2026-04-21-codebase-audit.md`, `2026-04-21-security-audit.md`
**Scope:** Full noizu.direct creator marketplace (Next.js 16, Prisma/Supabase Postgres, NextAuth v5, Cloudflare R2, Airwallex)

---

## 1. Go / No-Go verdict

**Soft no-go until four blockers close.** The codebase is competent and the product is coherent, but four specific issues — each independently exploitable or silently destructive — make a public launch foreseeably-first-incident material. Each of the four is a single-afternoon fix. With them resolved and the ten pre-launch items in §4 done, launch is defensible.

The good news: nothing in any of the three audits calls for a rewrite, a re-platform, or a multi-week architectural change. The bad news: the issues are spread across all three dimensions (security, correctness, UX trust), so none of the three workstreams can be skipped.

The pattern to hold in mind: this is a codebase built by someone who has been burned before — HMAC-verified webhooks with atomic idempotency, centralized fee math, central auth guards, server-side price recompute — and the gaps that remain are the gaps of *the second read-through*: the duplicate legacy route that never got deleted, the env-var fallback meant to be stripped before launch, the `void (async () => {})()` wrapper left in during local testing. Fix those and the shape is launchable.

---

## 2. Severity legend (unified)

| Icon | Meaning |
|------|---------|
| 🔴 | Critical — launch blocker: silent data loss, financial-data exposure, or auth/trust failure |
| 🟠 | High — visible correctness or UX hazard; fix within first 2 weeks of launch |
| 🟡 | Medium — maintainability or user-friction debt that compounds; schedule |
| 🟢 | Nice-to-have — polish |

Effort: **S** <1 day · **M** 1–5 days · **L** 1–2 weeks · **XL** multi-week

---

## 3. Top 10 cross-audit findings

Ranked across the three audits by blast radius × exploitability × visibility to end users.

| # | Finding | Source | Sev | Effort |
|---|---------|--------|-----|--------|
| 1 | **Airwallex webhook fire-and-forget (`void (async () => {})()`)** — handler returns 200 before order writes, email, and escrow transitions complete; on Vercel Fluid Compute the function can terminate mid-work. Silent payments-data-loss class bug. | Code F11 | 🔴 | S |
| 2 | **`PAYOUT_ENCRYPTION_KEY` falls back to a literal placeholder string, AES-256-CBC with no MAC, no KDF.** Any DB-dump leak + one missing-env deploy = offline decryption of every creator's bank/PayPal details. | Sec C-2 | 🔴 | M |
| 3 | **Legacy `POST /api/account/profile` writes avatars to `public/uploads/<id>.<ext>` with client-supplied extension and MIME-only check.** Trivial same-origin stored XSS → session theft → admin takeover. | Sec C-1 | 🔴 | S |
| 4 | **PDP currency conflict: visible prices hardcoded in USD, JSON-LD emits MYR on the same page, checkout converts at runtime.** Pricing-trust failure for buyers, malformed Google Shopping feed for SEO. | UX F-27 | 🔴 | S |
| 5 | **No rate limiting on `/api/auth/*` (login, register, forgot-password) or `/api/track/view`** (which also accepts client-supplied IP/userId). Credential stuffing + trending-score manipulation. | Sec H-1 / H-3 / H-4 | 🟠 | S |
| 6 | **Creator can `PATCH` a product's `type` post-create, bypassing type-gated invariants** (e.g. flip PHYSICAL→DIGITAL with no digital files → buyers pay for broken downloads → dispute-win vector). | Sec H-2 | 🟠 | S |
| 7 | **72 silent `.catch(() => {})` across 31 files + Sentry installed but not wired + 0 tests.** The system has no feedback loop when things go wrong in production. | Code F12 / F13 / F41 | 🟠 | M |
| 8 | **Middleware self-fetches `/api/internal/maintenance-status` on every request**, un-cached, and `ALLOWED_HOSTS = ['localhost:7000','127.0.0.1:7000']` omits the production hostname. Per-request latency on every page + broken hotlink policy in prod. | Code F25 | 🟠 | M |
| 9 | **Inline `style={{}}` + hardcoded hex in Navbar, SecondaryNav, MobileBottomNav, account banners, SearchBar** — dark-mode broken on those surfaces; a future brand-color change costs days. | UX F-1 | 🔴 | L |
| 10 | **Accessibility: inconsistent/missing focus-visible styles, no `aria-describedby`/`aria-invalid` on form errors, emoji-as-icon carrying meaning, 11–13px muted text at 4.47:1 contrast.** Fails WCAG 2.2 AA on focus (2.4.7), error identification (3.3.1/3.3.3), and small-text contrast. | UX F-7 / F-8 / F-10 | 🔴 | M |

Items 1–6 are the non-negotiable launch blockers. Items 7–10 are the "please don't ship without these" tier: each is a known way the product breaks in public on day two.

---

## 4. Pre-launch blockers (consolidated checklist)

Do all of these before the first external user hits production. Each is a single PR.

1. **Webhook correctness.** In `src/app/api/airwallex/webhook/route.ts`, replace every `void (async () => { ... })()` with `await`. Return 200 only after the handler completes. If any single handler exceeds 10s, move it to a durable queue (Upstash QStash / Inngest) and record inbound events to an `InboundWebhookEvent` table first. *(Code F11, Sec M-11.)*
2. **Payout encryption.** Throw at process start if `PAYOUT_ENCRYPTION_KEY` is missing. Migrate from AES-256-CBC to AES-256-GCM with per-record IV + AAD bound to creator id. Require a base64-encoded 32-byte key; reject anything shorter. Plan a one-off re-encryption migration. *(Sec C-2.)*
3. **Delete `POST /api/account/profile` avatar upload.** Route avatar uploads through the hardened `POST /api/upload` pipeline with `category: 'profile_avatar'`. *(Sec C-1.)*
4. **Product `type` immutability.** In `PATCH /api/products/[id]`, explicitly zod-pick the allowed fields and do not include `type`. Or gate `type` transitions through a server-side validator that re-runs the create-time invariants. *(Sec H-2.)*
5. **Auth + view-tracking rate limits.** Add Upstash Redis sliding-window limits on `/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/callback/credentials`, `/api/auth/reset-password`, and `/api/track/view`. Derive IP server-side from `cf-connecting-ip` / `x-forwarded-for`; ignore client-supplied `userId` and `ipAddress` on view tracking. *(Sec H-1, H-3, H-4.)*
6. **SVG uploads.** Remove `image/svg+xml` from `ALLOWED_IMAGE_TYPES` in `/api/upload`, or gate to `profile_logo` with DOMPurify-SVG sanitization. *(Sec M-6.)*
7. **Currency truth.** On PDP, show one currency (the buyer's local via their browser's locale or a profile preference) and emit JSON-LD with the *same* currency. Put a single "all prices are in MYR; FX to your card's currency happens at checkout" line near the price. Strip "may apply" from the "2.5% processing fee" copy. *(UX F-27, F-28.)*
8. **Focus + forms a11y.** Add a global `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }`. Wire `aria-invalid` + `aria-describedby` on every form input with a zod error. Add a skip-link as the first focusable element in `RootLayout`. Add Esc + focus-trap on the agreement wall and mobile bottom-sheets (or replace with the existing `@base-ui/react` Dialog). *(UX F-7, F-10, F-11, F-13.)*
9. **Secret hygiene.** Run `git log --all --diff-filter=A -- '**/.env*' '**/*.pem'` and rotate anything ever committed. Run `npm audit --production` and triage HIGH/CRITICAL. Grep `src/` for `??` near `(key|secret|password|token)` — the `PAYOUT_ENCRYPTION_KEY` fallback is unlikely to be the only one. *(Sec I-11, I-6.)*
10. **R2 bucket posture.** Confirm in the Cloudflare dashboard: private bucket is non-public, CORS on public bucket does not echo credentials with `*` origin, lifecycle rule exists to expire orphan uploads. *(Sec I-8.)*

---

## 5. Three cross-cutting patterns

Each audit independently landed on its own three-pattern synthesis. When aligned side-by-side, three meta-patterns appear that cut across all three dimensions:

### Pattern 1 — "Happy path shipped, sad path buried."
- **Security side:** `catch { return '' }` on the payout-decryption path, fallback encryption key, silent webhook race conditions.
- **Code side:** 72 `.catch(() => {})`, Sentry installed but not wired, zero tests, `error.tsx` only `console.error`s.
- **UX side:** Form errors without `aria-describedby`, no live validation, no success confirmations on listing-save, confetti animates even under `prefers-reduced-motion`.

The fix is structural, not file-by-file: adopt a logger (pino), wire Sentry, ban empty catches via an ESLint rule (`@typescript-eslint/no-empty-function`), and write one integration test per critical path (webhook idempotency, payout reconciler, escrow release cron). Until this feedback loop exists, every other fix is blind.

### Pattern 2 — "The route is the service."
- **Security side:** Auth guards exist but validation is done inline in every route; zod is used in one place (register). Input validation and business invariants are scattered rather than centralized.
- **Code side:** 1,785 `await prisma.` calls across 250 files; business logic (fee math, escrow transitions, discount validation) interleaved with HTTP parsing. The one exemplar — `src/lib/platform-fees.ts` — proves the shape works.
- **UX side:** Fee/escrow/refund copy exists in four different places with three different phrasings. There is no shared `TrustCopy` component; each surface re-invents.

The fix is the same shape on both sides of the wire: extract shared modules for the concepts the system keeps re-computing. Services for orders/payouts/commissions/discovery on the backend; copy + form-field wrappers on the frontend; zod schemas on both. Routes and components become thin adapters.

### Pattern 3 — "The platform investment isn't harvested."
- **Stack side:** Next 16, React 19, Prisma 7, NextAuth v5, Vercel Fluid Compute — all bleeding-edge. But: 0 `'use server'`, 0 `'use cache'`, 0 `generateStaticParams`, no `after()`, no `instrumentation.ts`. The stack's most valuable new primitives are unused.
- **Design side:** CSS variables + Tailwind tokens + radius tokens + theme dark-mode are all defined, but half the nav/shell bypasses them for inline `style={{}}` with hardcoded hex. The design system exists on paper and is ignored in code.
- **Product side:** A 4-layer discovery ranker is implemented, but the UI exposes it as a single "For You" sort pill with no facets, no "because you viewed X," no admin preview.

The fix is harvesting: one PR to add `'use cache'` + `cacheTag` to the three hottest read paths (marketplace, creator profile, PDP); one PR to enforce tokens via a lint rule forbidding hex in JSX; one PR to surface ranking signals as facets. Each is small and each pays for itself within a week.

---

## 6. Two-week post-launch plan

Order assuming blockers in §4 are closed. Effort totals ~two engineer-weeks.

**Week 1 — observability and auth hardening.**
- Wire Sentry (client + server + edge) and add `instrumentation.ts`. *(S)*
- Replace every `.catch(() => {})` with a logging catch; add the ESLint rule. *(M)*
- Add metrics counters at the webhook boundary (`webhook.received`, `webhook.duplicate`, `webhook.processed`, `webhook.failed`). *(S)*
- Email verification gate on new buyer accounts before checkout/review. *(S)*
- NextAuth session invalidation on password change + `sessionsInvalidatedAt` column. *(S)*
- Missing Prisma indexes: `Order.airwallexIntentId`, `Order.escrowAutoReleaseAt`, `Order.[status,createdAt]`, `User.role`, `User.accountStatus`, `Conversation.lastMessageAt`. *(S)*
- Fix the middleware self-fetch; move maintenance to an env var or edge config with `'use cache'`; add production hostname to `ALLOWED_HOSTS`. *(M)*
- Replace the `sed` postinstall with `patch-package`. *(S)*

**Week 2 — trust, accessibility, and discovery surface.**
- Unified currency display on PDP; fix JSON-LD; standardize fee/escrow/refund copy. *(S)*
- Global focus-visible style; `aria-describedby`/`aria-invalid` on every form; skip-link; replace agreement wall + bottom sheets with the Base UI Dialog already installed. *(M)*
- Convert the inline-style offenders (Navbar, SecondaryNav, MobileBottomNav, account banners, SearchBar) to tokenized Tailwind classes. *(M)*
- Bump `--muted-foreground` to `#4a4a60` for AA-contrast on muted captions. *(XS)*
- Add facets to marketplace/search: price range, verified creator, ships-to-country, digital-only, new-7d, rating. *(L — may spill into week 3.)*
- Lock NextAuth v5 beta 30 exactly (no caret), add a login smoke test to CI. *(S)*

**Week 3+ — structural investments.**
- Adopt `'use cache'` + `cacheTag` on marketplace / creator profile / PDP read paths. *(M)*
- Extract service layer: `src/lib/services/{orders,payouts,commissions,discovery}.ts`. *(L, rolling.)*
- Migrate JSON-as-String columns to Prisma `Json` with zod schemas. *(L, rolling.)*
- Bootstrap Vitest + Playwright; start with `platform-fees`, `discovery`, webhook idempotency, login → add-to-cart → checkout. *(L.)*
- Creator sidebar restructure into 5 collapsible sections; merge `/account` and `/dashboard` messages with a visible mode-switch pill. *(M.)*

---

## 7. Confidence and scope caveats

- `npm audit`, `npm outdated`, `depcheck`, `tsc --noEmit`, and `eslint` could not be executed from the audit harness — run locally pre-launch and triage.
- Live Airwallex sandbox payment flow was not exercised; webhook HMAC + idempotency were read-only verified from source.
- R2 bucket public-access and CORS posture must be confirmed in the Cloudflare dashboard — not visible from source.
- Supabase row-level security policies were not reviewed (application-level access control is enforced via Prisma + `guards.ts`; RLS would be a defense-in-depth layer, not an audit finding).
- UX findings were structural (code-reviewed) not user-tested; post-launch analytics + a short moderated usability session will surface issues this audit cannot.

---

## 8. Bottom line

Four launch blockers: **the Airwallex webhook, the payout encryption key, the legacy avatar upload, and the PDP currency conflict.** Close those by end of week and the rest of the list is tractable in the first fortnight of live traffic. The codebase is serious work and it deserves a serious launch — that means the ten items in §4 *before*, not after, the first real buyer clicks "Buy".
