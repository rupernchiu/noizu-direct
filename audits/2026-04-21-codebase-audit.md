# noizu.direct — Codebase Audit

**Date:** 2026-04-21
**Scope:** `C:\Users\ruper\noizu-direct` (full repo, review-only)
**Auditor posture:** Senior staff engineer, 25 yrs, Next.js / React / Prisma / Postgres stacks
**Mode:** No code changes. No `npm install`, no migrations. Read-only analysis.

---

## 1. Executive Summary

noizu.direct is an ambitious, feature-complete SEA creator marketplace on a deliberately bleeding-edge stack (Next 16.2, React 19.2, Prisma 7.7, NextAuth v5 beta 30, Vercel Fluid Compute). The product surface area is large and coherent — four product types, escrow, commissions, subscriptions, discovery ranking, admin — and the codebase shows real discipline (72 crons/webhooks, async-params everywhere, centralized `platform-fees.ts` utility, HMAC-verified webhooks, Prisma schema with 60+ models). That discipline has not, however, been extended to **runtime reliability, error observability, or type-safety at module seams**. The single most severe issue is in `src/app/api/airwallex/webhook/route.ts`: every event handler runs inside `void (async () => { ... })()` *after* the 200 response is sent, which on Vercel serverless means the execution context can terminate before the order/notification/email writes complete — this is a silent payments-data-loss class bug. A close second is the **middleware self-fetch on every request** to `/api/internal/maintenance-status` with a production-incompatible allow-list, layering per-request latency and a broken hotlink policy onto every page. A third axis of risk is the pervasive use of `(x as any)` around session, Prisma payloads, and JSON columns, combined with 72 `.catch(() => {})` silent swallows across 31 files and zero tests. None of the findings require rewrites; all of them are surgical. The stack is recoverable with about two focused weeks of backend hardening. **Start with the webhook.**

---

## 2. Severity Legend

| Icon | Meaning | Action Window |
|------|---------|---------------|
| 🔴 | **Critical** — production data loss, security, or availability risk | Fix this week |
| 🟠 | **High** — silent correctness bug or clear architectural hazard | Fix this sprint |
| 🟡 | **Medium** — maintainability, perf, or DX debt that compounds | Schedule |
| 🔵 | **Low** — polish, consistency, nice-to-have | Backlog |

Effort tags: **S** (<2h), **M** (half-day to day), **L** (multi-day), **XL** (week+).

---

## 3. Metrics Snapshot

> **Sandbox note:** `npx tsc --noEmit`, `npx eslint`, `npm outdated`, and `npx depcheck` could **not** be executed — both Bash and PowerShell shells were denied by the harness. Metrics below are derived from Grep/Glob over source.

| Metric | Value | Notes |
|---|---|---|
| Next.js version | 16.2.3 | Cache Components era; async params required |
| React | 19.2.4 | |
| TypeScript | strict, `allowJs: true`, `target: ES2017` | Target is stale given Node 24 / React 19 |
| Prisma | 7.7.0 | Generated client uses `@ts-nocheck` on ~65 files (Prisma 7 default) |
| NextAuth | 5.0.0-beta.30 | Patched via postinstall `sed` — fragile |
| Prisma models | 60+ | Several ≥ 40 fields; many JSON-as-String columns |
| Source files (TS/TSX) | ~1,500+ app/lib files (excluding generated) | |
| Routes under `src/app/api/` | ~150 | Mostly direct Prisma calls, few service boundaries |
| Dynamic `[param]` routes | 88 | All using `params: Promise` — Next 15/16 compliant |
| `'use client'` directives | 236 occurrences (≈54 real client components, rest generated) | |
| `'use server'` directives | **0** — no Server Actions adopted |
| `'use cache'` directives | **0** — no Next 16 Cache Components adoption |
| `generateStaticParams` | **0** — nothing is statically generated |
| `force-dynamic` / `revalidate` exports | 8 | 7 sitemap routes + 1 OG image |
| `any` / `as any` / `as unknown` hits | 414 across 226 files | ~half in generated Prisma; ~200 residual in app code |
| `@ts-nocheck` | ~65 files | All in `src/generated/prisma/**` |
| `@ts-ignore` / `@ts-expect-error` | **0** in app code |
| `eslint-disable` | **0** in app code |
| `TODO` / `FIXME` / `XXX` | **0** |
| `console.log` (non-error) | 3 files | Trending/recommendation calculators, banks route |
| `.catch(() => {})` silent swallows | **72 across 31 files** | Heaviest in auth, webhooks, crons |
| `<img>` raw tags | 5 | vs `next/image` in 47+ files — acceptable ratio |
| `dangerouslySetInnerHTML` | 7 files | All reviewed: theme-init, JSON-LD, analytics injection — safe |
| `prisma.$queryRaw` | minimal | Low raw-SQL surface area |
| `await prisma.` call sites | 1,785 across 250 files | Route-to-DB coupling is *very* tight |
| Loops with `await prisma.` inside | multiple N+1 offenders (crons, search) | |
| Test files (`*.test.*`, `*.spec.*`, `tests/`, `e2e/`) | **0** | `playwright` is installed but unused |
| Vercel crons | 4 (in `vercel.json`) | + 1 duplicate in `.github/workflows/payout-cron.yml` |
| Sentry | `@sentry/nextjs` installed | Not wired — `error.tsx` only `console.error`s |
| Postinstall hook | `sed` monkey-patches `next-auth` ESM imports | Fragile |

---

## 4. Findings by Dimension

### 4.1 Next.js 16 Conformance

**F1. [🔵 Low / S] Stale `experimental.serverActions` config key.**
`next.config.ts` sets `experimental.serverActions.bodySizeLimit`. This option is no longer experimental in Next 15+ and the warning should be quiet, but the config key nesting is outdated. Also, `serverActions` are declared enabled but there are **0 `'use server'` directives in the entire codebase** — the setting is dead weight.
*Recommend:* Move `bodySizeLimit` to top-level `serverActions: { bodySizeLimit: '...' }` per Next 16 docs, or remove the block entirely if server actions aren't on the roadmap.

**F2. [🟡 Medium / M] Zero Cache Components adoption.**
The app has `0` `'use cache'` directives and `0` `generateStaticParams`. For a marketplace whose product list, creator profiles, and category pages are the hot paths, this means **every page render hits Postgres**. Next 16's `'use cache'` + `cacheTag`/`cacheLife` primitives are the intended replacement for the old `fetch`-revalidation model.
*Recommend:* Start with `src/app/marketplace/page.tsx`, `src/app/creators/page.tsx`, `src/app/product/[id]/page.tsx`, and the homepage — tag-cache the read path and invalidate on writes through `revalidateTag`.

**F3. [🔵 Low / S] No `poweredByHeader: false`.**
`next.config.ts` does not disable the `X-Powered-By: Next.js` header. Trivial info disclosure.
*Recommend:* `poweredByHeader: false`.

**F4. [🔵 Low / S] No `images.formats`.**
Next 16 defaults are fine but for a marketplace with thousands of product images, explicit `formats: ['image/avif', 'image/webp']` and `minimumCacheTTL` would cut bandwidth.
*Recommend:* Set both in `next.config.ts`.

**F5. [🟡 Medium / M] `AGENTS.md` explicitly says "this is NOT the Next.js you know — read `node_modules/next/dist/docs/` before writing any code." The codebase predates several Next 16 primitives (Cache Components, `after()`, typed routes). The gap between stack capability and code adoption is wide.**

---

### 4.2 Type Safety

**F6. [🟠 High / M] No NextAuth module augmentation.**
`src/lib/auth.ts` and `src/lib/guards.ts` contain multiple `(user as any).role`, `(session.user as any).id`, `(session.user as any).role` casts. NextAuth v5 exposes a `declare module "next-auth"` extension point specifically for typing `session.user.id` and `session.user.role`.
*Recommend:* Create `src/types/next-auth.d.ts` augmenting `Session['user']` with `id: string`, `role: Role`, and any custom claims. Drop ~20+ `as any` casts in one stroke.

**F7. [🟠 High / M] ~200 residual `as any` / `any` in app code.**
Concentrated in webhook payload handling (`Record<string, any>` on Airwallex events), admin editors, and Prisma JSON-column readers. These are the exact seams where schema drift hits production silently.
*Recommend:* Introduce zod schemas for Airwallex webhook payloads (`paymentIntentSchema`, `payoutSchema`, `disputeSchema`) and infer types from them. Replace `Record<string, any>` with `z.infer<typeof schema>`.

**F8. [🟡 Medium / S] `tsconfig.json` `target: ES2017`, `allowJs: true`.**
With Node 24 runtime on Vercel Fluid Compute and React 19, `target: ES2022` is safe and unlocks top-level `await`, native `Error.cause`, class fields, etc. `allowJs: true` without any `.js` files in `src/` serves no purpose.
*Recommend:* Bump to `ES2022`, drop `allowJs`.

**F9. [🟡 Medium / S] Generated Prisma client has `@ts-nocheck` across ~65 files.**
This is Prisma 7's own output strategy (types flow through `.d.ts`), not user code smell. Noted here so it isn't mistaken for tech debt the team owes — it's Prisma's. Keep an eye on Prisma 7.x patch notes for the type-flow approach stabilizing.

**F10. [🟡 Medium / M] Prisma JSON columns stored as `String`.**
Fields like `socialLinks`, `categoryTags`, `notifPrefs`, `commissionPricing`, `commissionDefaults`, `badges`, `featuredProductIds`, `sectionOrder`, `breakdown`, `evidence`, `attachments`, `digitalFiles`, `colorVariants`, `sizeVariants`, `deliveryFiles` are declared `String @default("[]")` / `@default("{}")` and JSON-parsed in application code. This forfeits:
  - Postgres GIN indexing / JSONB operators (`@>`, `?`, `->>`)
  - Atomic partial updates
  - Prisma's generated `JsonFilter` types
  - Any validation at the DB layer
*Recommend:* Migrate incrementally to `Json` columns (Prisma type `Json`). Do this behind a zod schema so application invariants are at least enforced at the edge.

---

### 4.3 Error Handling

**F11. [🔴 Critical / S] Airwallex webhook fire-and-forget.**
`src/app/api/airwallex/webhook/route.ts` processes events inside:
```ts
void (async () => { ... handler logic ... })()
// then later:
return new Response('ok', { status: 200 })
```
On Vercel serverless/Fluid Compute, the function instance **can be frozen or terminated once the HTTP response is flushed**. Any remaining work — order state transitions, notification writes, `Resend` email sends, audit-log inserts, escrow updates, chargeback recording — is racing the response. This is **silent data loss for payment-critical events**. Fluid Compute mitigates this somewhat (longer hang-around) but does not guarantee completion. Even if it usually finishes, the reliability contract is "probably."
*Recommend:* Flip the order: do the work, *then* return 200. For heavy work, use `after()` from `next/server` (Next 15.1+) which explicitly keeps the context alive on Vercel. Or enqueue to a durable queue (Upstash QStash, Inngest) and return 200 immediately. **Do not leave `void (async () => { ... })()` in a serverless payment webhook.**

**F12. [🟠 High / S] 72 silent `.catch(() => {})` swallows across 31 files.**
Hot spots: `src/lib/auth.ts` line 32 (`prisma.creatorProfile.updateMany(...).catch(() => {})` on every login), `src/app/api/airwallex/webhook/route.ts` (11+ swallows on notification/order paths), `src/app/api/cron/payout/route.ts` (email send swallowed), `src/lib/redis.ts` (all four helpers swallow).
Silent swallows are invisible to Sentry, invisible to `console`, invisible to logs. These are precisely the class of bug that makes "it sometimes fails" impossible to diagnose.
*Recommend:* Replace every `.catch(() => {})` with `.catch((e) => logger.warn('<operation> failed', { err: e }))`. For truly-ignorable errors, document why with a comment; for anything user-facing, re-throw.

**F13. [🟠 High / S] Sentry installed, not wired.**
`@sentry/nextjs` is in `package.json` but `src/app/error.tsx` only `console.error(error)`s. No `Sentry.captureException` anywhere. No `sentry.client.config.ts` / `sentry.server.config.ts` / `instrumentation.ts` hook.
*Recommend:* Run `npx @sentry/wizard -i nextjs`, commit the three config files, and call `Sentry.captureException(error)` in `error.tsx` and in every webhook/cron catch block.

**F14. [🟡 Medium / S] No centralized error envelope for API routes.**
Routes variously return `NextResponse.json({ error: '...' })`, `{ message: '...' }`, plain `new Response('ok')`. Clients must know the shape per route.
*Recommend:* Introduce `src/lib/http.ts` with `ok(data)` / `fail(code, message, details?)` that produces a consistent envelope. Swap incrementally.

---

### 4.4 Dead Code / Unused Surface

**F15. [🟡 Medium / S] `playwright` installed, zero spec files.**
Either commit to it (add a `tests/e2e/` and a smoke-test spec for login → browse → add-to-cart) or drop it from `devDependencies`.

**F16. [🟡 Medium / S] `@dnd-kit/*` duplicated in `dependencies` and `devDependencies`.**
`package.json` declares `@dnd-kit/core`, `@dnd-kit/sortable`, etc., in both blocks.
*Recommend:* Remove the `devDependencies` copies.

**F17. [🟡 Medium / S] Runtime deps that should be devDeps.**
`shadcn`, `@types/pg`, `@types/sanitize-html`, `better-sqlite3`, `playwright` are listed in `dependencies`. These bloat the production bundle resolution and install.
*Recommend:* Move to `devDependencies`.

**F18. [🔵 Low / S] Server action config with zero server actions.**
See F1 — `experimental.serverActions` is enabled but no `'use server'` directives exist anywhere.

**F19. [🔵 Low / S] Duplicate payout cron.**
`.github/workflows/payout-cron.yml` runs weekly and hits `/api/cron/payout` — *and* `vercel.json` has a payout-reconciler cron at 09:00. Two schedulers, one endpoint. Risk: double-processing of payouts if timing overlaps.
*Recommend:* Pick one. Vercel Cron is simpler and colocated with the deploy.

---

### 4.5 Dependencies

**F20. [🟠 High / S] Postinstall `sed` monkey-patches NextAuth ESM imports.**
`package.json`:
```
"postinstall": "sed -i 's/from \"next\\/server\"/from \"next\\/server.js\"/g' node_modules/next-auth/lib/env.js node_modules/next-auth/lib/index.js"
```
This is a workaround for an upstream NextAuth v5 beta ESM resolution bug. It will break:
  - On Windows dev machines without `sed` in PATH (this is a Windows project)
  - When NextAuth publishes a patch that moves the import
  - In CI if `sed` flavor differs (GNU vs BSD `-i` semantics)
*Recommend:* File/follow a NextAuth issue, pin the exact beta that works, and replace the `sed` with a `patch-package` diff so it's versioned and portable.

**F21. [🟡 Medium / S] NextAuth v5 beta 30 in production.**
Beta in a payments-adjacent auth layer is a liability. Beta 30 is late enough that the API is stable, but you still own every regression.
*Recommend:* Watch for GA. In the meantime, lock the version exactly (no caret) and add a smoke test for login in CI.

**F22. [🟡 Medium / S] Prisma 7.7.0 is the latest major.**
Prisma 7 changed the client-generation model (hence the `@ts-nocheck` in generated files). The team has already absorbed that change. Just be aware: during Prisma 7.x patch releases, regenerate + re-audit.

**F23. [🔵 Low / S] Couldn't run `npm outdated` / `depcheck` in sandbox.**
The team should run both locally and triage.

---

### 4.6 Architecture / Boundaries

**F24. [🟠 High / L] Route handlers import Prisma directly — no service layer.**
`await prisma.` appears 1,785 times across 250 files, predominantly inside `src/app/api/**/route.ts`. Business rules (fee calculation, escrow state transitions, discount validation) live inline in route handlers. The one genuine service module — `src/lib/platform-fees.ts` — proves the pattern works and should be extended.
*Recommend:* Extract `src/lib/services/{orders,payouts,commissions,discovery}.ts` with pure functions that take a `PrismaClient`/`Tx` and return domain objects. Routes become thin: parse → auth → call service → respond. Makes the system testable.

**F25. [🟠 High / M] Middleware self-fetch on every request.**
`src/middleware.ts` performs `await fetch(url.toString(), ...)` to `/api/internal/maintenance-status` on every incoming request. This is:
  - An extra network hop per request (edge → function → edge)
  - Un-cached — the maintenance flag is re-fetched on every pageview
  - A production outage vector — if the internal route is slow, every page is slow
Plus: `ALLOWED_HOSTS = ['localhost:7000', '127.0.0.1:7000']` — **missing the production hostname**, so hotlink protection either blocks production or is off entirely.
*Recommend:* Read maintenance state from an env var (`MAINTENANCE_MODE=1`) or an edge-config KV with `unstable_cache`/`'use cache'` — not a self-fetch. Add `noizu.direct` to `ALLOWED_HOSTS` and anything else you serve from.

**F26. [🟡 Medium / M] `CreatorProfile` is a god model.**
~50 fields including `commissionPricing`, `commissionDefaults`, `notifPrefs`, `socialLinks`, `categoryTags`, `portfolioItems`, `badges`, `featuredProductIds`, `sectionOrder`, `boostMultiplier`, `lastFeaturedAt`. Several logically distinct domains (commission config, notification prefs, discovery tuning, profile content) collapsed into one row.
*Recommend:* Split into `CreatorCommissionConfig`, `CreatorNotificationPrefs`, `CreatorDiscoverySettings` as 1:1 relations. Payoff: smaller updates, targeted indexes, easier admin tooling.

**F27. [🟡 Medium / M] No service-level idempotency helper.**
The webhook uses an atomic CAS claim for idempotency (good), but nothing else in the cron/job fleet does. Re-running a payout reconciler, a chargeback handler, or an agreement-enforcement pass should be a no-op on the second run.
*Recommend:* Extract `src/lib/idempotency.ts` with `claim(key, ttl)` → `boolean`.

---

### 4.7 Data Layer

**F28. [🟠 High / S] Missing indexes on hot-path columns.**

From `prisma/schema.prisma`:
  - `Order.airwallexIntentId` — queried by every webhook, **no index**.
  - `Order.escrowAutoReleaseAt` — queried by the escrow-release cron, **no index**.
  - `Order.status` (and combined `[status, createdAt]`) — dashboard queries, **no composite index**.
  - `User.role` — admin listings, **no index**.
  - `User.accountStatus` — moderation queries, **no index**.
  - `Conversation.lastMessageAt` — chat list ordering, **no index**.

*Recommend:* Add via a new Prisma migration:
```prisma
@@index([airwallexIntentId])
@@index([escrowAutoReleaseAt])
@@index([status, createdAt])
```
On `User`: `@@index([role])`, `@@index([accountStatus])`. On `Conversation`: `@@index([lastMessageAt])`.

**F29. [🟠 High / M] JSON-as-String on ~15 columns.**
See F10. Migrate to `Json`/`Jsonb` (Postgres `jsonb` via Prisma `Json`) with zod validation at the app boundary.

**F30. [🟡 Medium / M] No Prisma `enum` types.**
`status`, `escrowStatus`, `type`, `commissionStatus`, `reason`, and several others are `String` with docstring unions. Prisma `enum` gives you exhaustive-switch checking and DB-level constraint.
*Recommend:* Introduce Prisma enums per field. Each is a single migration.

**F31. [🟡 Medium / M] N+1 in `src/app/api/cron/agreement-enforcement/route.ts`.**
Sequential loop per creator: `findUnique(profile)` + `updateMany(products)` + `create(notification)` + `resend.send`. For N creators this is 4N queries + N emails, all awaited serially.
*Recommend:* Batch: `findMany({ where: { id: { in: ids } } })`, `createMany(notifications)`, and either batch-enqueue emails or `Promise.all` with a concurrency limiter (e.g. `p-limit(5)`).

**F32. [🟡 Medium / M] `src/app/api/search/route.ts` pulls full filtered set before paginating.**
In-memory scoring requires `Product.findMany()` on the full filtered result, *then* slices for pagination. As the catalog grows, this is a cliff.
*Recommend:* Push the scoring into SQL (materialized score column or a `SELECT ... ORDER BY score DESC LIMIT/OFFSET`). Alternatively, front with Meilisearch/Typesense.

**F33. [🟡 Medium / S] `src/lib/redis.ts invalidatePattern` uses `redis.keys(pattern)`.**
`KEYS` is O(N) and blocks Upstash. Fine at 100 keys, problem at 10k.
*Recommend:* Maintain explicit tag sets (e.g. `SADD tag:product:{id} cache:key1`) and use `SMEMBERS` + `DEL` for invalidation. Or front with Next 16's `cacheTag`.

---

### 4.8 Performance

**F34. [🟡 Medium / M] Every page is SSR-from-DB.**
0 `'use cache'`, 0 `generateStaticParams`, 8 `force-dynamic`/`revalidate` across 150+ routes. Homepage, marketplace, creator profile, product detail — all re-fetched per request.
*Recommend:* Cache the three hottest read paths with `'use cache'` + `cacheTag`, then `revalidateTag` on mutations.

**F35. [🟡 Medium / S] `Resend` instantiated at module scope in several routes.**
Fine on warm Vercel invocations, wasteful on cold starts if the key isn't needed. Minor.
*Recommend:* Lazy-instantiate inside the handler, or colocate with a singleton wrapper.

**F36. [🔵 Low / S] Middleware self-fetch adds per-request RTT.**
Already covered in F25.

**F37. [🔵 Low / S] 236 `'use client'` directives (≈54 real after excluding generated).**
Reasonable for a rich marketplace UI. Spot-check whether any could be server components — the `Navbar`, `Footer`, `AnnouncementBar` chain in `src/app/layout.tsx` already appears to mix correctly.

---

### 4.9 Accessibility

**F38. [🟡 Medium / M] Mixed aria hygiene.**
Grep shows healthy use of `aria-label`, `htmlFor`, and `role=` but the distribution is uneven — some form components have labeled inputs, others rely on placeholder text only.
*Recommend:* A one-pass sweep of every `<input>` / `<select>` / `<textarea>` / icon-only `<button>` with a lint rule (`eslint-plugin-jsx-a11y`) that fails the build.

**F39. [🔵 Low / S] 5 raw `<img>` tags.**
Not an a11y concern per se but `next/image` brings free `alt`-required warnings.
*Recommend:* Convert when touching those files.

**F40. [🔵 Low / S] No `aria-live` on toast mount (`Toaster position="bottom-right"`).**
Sonner's `Toaster` has an accessible default but double-check `lang="en"` + `<Toaster />` is announced to SR.

---

### 4.10 Testing

**F41. [🔴 Critical / XL] Zero tests.**
No `*.test.*`, no `*.spec.*`, no `tests/`, no `e2e/`, no `vitest.config`, no `playwright.config`. For a payments/escrow/commission marketplace, this is the single biggest maturity gap after the webhook.
*Recommend:* Tier it.
  1. **Unit** — `platform-fees.ts`, `discovery.ts` scoring, `guards.ts`, any pure function in `src/lib/`. (Vitest, 1 day.)
  2. **Integration** — webhook idempotency, payout reconciler, escrow state machine against a Postgres test DB. (3 days.)
  3. **E2E smoke** — login → browse → add-to-cart → checkout (test mode) → webhook received → order in terminal state. (Playwright, 2 days.)

**F42. [🟠 High / S] No CI test step.**
Even once tests exist, `package.json` has no `"test"` script.
*Recommend:* Add `"test": "vitest run"`, `"test:e2e": "playwright test"`. Wire to GitHub Actions.

---

### 4.11 Logging / Observability

**F43. [🟠 High / M] No structured logger.**
`console.error` / `console.log` scattered across routes. No request correlation id, no structured fields, no log level.
*Recommend:* Adopt `pino` (or `consola`) with a `requestId` from middleware (`crypto.randomUUID`) piped through `AsyncLocalStorage`. Send to a sink (Axiom / Logtail / Datadog).

**F44. [🟠 High / S] No metrics for payment webhook.**
Webhook throughput, latency, idempotency-hit rate, handler error rate — all unobservable.
*Recommend:* Emit counters at webhook boundary once a logger is in place. Minimum: `webhook.received`, `webhook.duplicate`, `webhook.processed`, `webhook.failed`.

**F45. [🟡 Medium / S] Silent swallows in `src/lib/redis.ts`.**
Covered in F12 — but specifically the cache layer should log cache misses vs. Redis outages differently.

---

### 4.12 Build & Deploy

**F46. [🟡 Medium / S] Duplicate payout scheduling.**
See F19. `vercel.json` + `.github/workflows/payout-cron.yml` both trigger `/api/cron/payout`.

**F47. [🟡 Medium / S] No `--max-warnings` on lint.**
`"lint": "eslint"` — warnings don't fail the build.
*Recommend:* `"lint": "eslint --max-warnings=0"`.

**F48. [🟡 Medium / S] AES key handling in payout route.**
`src/app/api/cron/payout/route.ts` uses `Buffer.from(key.slice(0, 32))` — assumes the env key is ≥32 ASCII chars. Non-ASCII or shorter keys would silently truncate.
*Recommend:* `Buffer.from(key, 'hex')` with a 64-hex-char key, and `assert(buf.length === 32)` at boot.

**F49. [🔵 Low / S] `metadataBase` hard-fallback to `https://noizu.direct`.**
Fine for prod, but preview/staging will produce wrong OG URLs unless `NEXT_PUBLIC_CANONICAL_DOMAIN` is set per-env.
*Recommend:* Set it in every Vercel environment, not just production.

**F50. [🔵 Low / S] Postinstall `sed` fails on Windows without Git Bash.**
See F20.

---

## 5. Top 10 Prioritized Recommendations

| # | Finding | Severity | Effort | Impact | Why this order |
|---|---------|----------|--------|--------|----------------|
| 1 | **Remove `void (async () => {})()` in Airwallex webhook** (F11) | 🔴 | S | Stops silent payment data loss on Vercel | Payments-critical, silent, already in prod |
| 2 | **Wire Sentry + replace `.catch(() => {})` with logging catches** (F12, F13) | 🟠 | M | Every other failure becomes visible | Prereq for debugging everything else |
| 3 | **Fix middleware self-fetch + `ALLOWED_HOSTS` prod hostname** (F25) | 🟠 | M | Removes per-request latency + fixes hotlink policy in prod | Every page served today pays this tax |
| 4 | **Add missing Prisma indexes** (F28) | 🟠 | S | Webhook and cron query performance | Cheapest perf win in the repo |
| 5 | **NextAuth module augmentation, delete `(session.user as any)` casts** (F6) | 🟠 | M | Type safety at auth boundary | Prevents a whole class of role-bypass bugs |
| 6 | **Bootstrap tests: unit for `platform-fees`/`discovery`, integration for webhook idempotency** (F41, F42) | 🔴 | L | Regressions become catchable | Every future change needs this |
| 7 | **Replace `sed` postinstall with `patch-package`** (F20) | 🟠 | S | Portable, versioned, survives upstream churn | One-line fragility in CI |
| 8 | **Adopt `'use cache'` on marketplace / creators / product-detail** (F2, F34) | 🟡 | M | Cuts DB load on hot reads | Unlocks Next 16 value prop |
| 9 | **Migrate JSON-as-String columns to `Json` with zod validation** (F10, F29) | 🟡 | L | Recovers JSONB indexing, atomic updates, validation | Foundation for filter/search at scale |
| 10 | **De-duplicate payout cron; remove `@dnd-kit/*` / `playwright` / `shadcn` from `dependencies`** (F16, F17, F19) | 🟡 | S | Smaller install, no double-processing risk | Housekeeping wins |

---

## 6. Three-Pattern Synthesis

**Pattern A — "Ship the happy path, bury the sad path."**
The webhook fire-and-forget, the 72 silent catches, the un-wired Sentry, the absent tests — they all share a signature: the happy path is implemented with care; the failure path is implemented with `.catch(() => {})`. Any one of these alone is fixable; together they mean **the system has no feedback loop when things go wrong in production**. The fix is structural, not code-by-code: adopt a logger, capture exceptions, and ban the empty catch via an ESLint rule (`no-empty-function`, `@typescript-eslint/no-empty-function`).

**Pattern B — "The route is the service."**
1,785 `await prisma.` calls across 250 files, with business logic (fee math, escrow transitions, discovery scoring) interleaved with HTTP parsing. The one successful counter-example — `src/lib/platform-fees.ts`, which the team introduced in Phase 0 and rolled out to 6 call-sites — proves the shape. Extend that pattern: every domain concept (`orders`, `payouts`, `commissions`, `subscriptions`, `discovery`) gets a `src/lib/services/<domain>.ts` that owns the Prisma calls and returns domain objects. Routes become 20-line wrappers: parse → auth → call → respond. Testability, caching, and re-use follow.

**Pattern C — "Stack is ahead of the code."**
The team picked Next 16, React 19, Prisma 7, NextAuth v5, Vercel Fluid Compute — every one bleeding-edge. But: 0 `'use server'`, 0 `'use cache'`, 0 `generateStaticParams`, no `after()`, no `instrumentation.ts`. The stack's most valuable new primitives are unused. The backlog of "adopt Next 16 Cache Components" is a strategic investment the team has already paid for in upgrade effort but not yet harvested.

---

## 7. What to Tackle First

**Start with the Airwallex webhook.** Delete the `void (async () => {})()` wrapper, `await` every handler, return 200 only after work completes, and wire Sentry around the whole route — you stop silently losing payment processing this afternoon and every subsequent finding becomes easier to diagnose.
