# NOIZU-DIRECT Security Audit

**Date:** 2026-04-18
**Auditor:** Claude Code (automated pen test)
**Commit of fixes:** 966f738

---

## Executive Summary

7 files across 6 distinct vulnerability classes were fixed in commit 966f738.
All CRITICAL and HIGH findings have been remediated. MEDIUM and LOW findings
are documented below with recommended remediation steps.

---

## Findings

### CRITICAL-1 — Arbitrary order status escalation via PATCH /api/orders/[id]

**File:** `src/app/api/orders/[id]/route.ts`
**Severity:** CRITICAL
**Status:** FIXED

**Description:**
The PATCH handler accepted any `status` string from the request body and applied
it directly, with only an ownership check (buyer, creator, or admin). A buyer
could POST `{ "status": "PAID" }` to their own PENDING order and mark it paid
without going through the payment flow. Similarly a creator could set
`CANCELLED` or `REFUNDED` on orders, bypassing the escrow processor.

**Exploit scenario:**
```
PATCH /api/orders/<id>   (authenticated as the buyer of that order)
{ "status": "PAID" }
→ Order immediately marked PAID, digital download token accessible
```

**Fix applied:**
Introduced `CREATOR_ALLOWED_STATUSES` and `ADMIN_ALLOWED_STATUSES` allowlists.
Buyers are blocked from setting any status via this endpoint (they must use the
dedicated `/confirm-receipt` route). Creators are limited to shipping-related
statuses. Any value outside the allowlist returns 403.

---

### CRITICAL-2 — Unauthenticated discount code probing

**File:** `src/app/api/checkout/apply-discount/route.ts`
**Severity:** CRITICAL
**Status:** FIXED

**Description:**
The endpoint had no `auth()` check. Any unauthenticated HTTP client could call
`POST /api/checkout/apply-discount` to enumerate whether discount codes are
valid, check their type/value, and observe expiry behaviour — all without a
session.

**Fix applied:**
Added `auth()` call at the top of the handler; returns 401 if no session.

---

### CRITICAL-3 — Webhook signature bypass (both Airwallex endpoints)

**Files:**
- `src/app/api/webhooks/airwallex/route.ts`
- `src/app/api/airwallex/webhook/route.ts`

**Severity:** CRITICAL
**Status:** FIXED

**Description:**
Both webhook handlers skipped HMAC-SHA256 signature verification when
`AIRWALLEX_WEBHOOK_SECRET` was absent or set to the string `"placeholder"`.
An attacker could POST a forged `payment_intent.succeeded` event and cause
the server to mark orders as PAID, create Transaction records, and issue
download tokens — all without a real payment.

The `/webhooks/airwallex` endpoint had a plain `if (secret) { ... }` guard,
meaning any environment without the secret configured (e.g. staging, early
production) accepted all events unconditionally.

The `/airwallex/webhook` endpoint additionally allowed the literal string
`"placeholder"` as an explicit bypass.

Both endpoints also used a direct string equality comparison (`!==`) for the
signature, which is vulnerable to timing attacks.

**Fix applied:**
Both endpoints now:
1. Return HTTP 500 when the secret is not configured (fail closed).
2. Use `crypto.timingSafeEqual` for constant-time comparison.
3. Reject all requests when the secret is absent or `"placeholder"`.

---

### HIGH-1 — Unrestricted file upload in admin media endpoint

**File:** `src/app/api/admin/media/upload/route.ts`
**Severity:** HIGH
**Status:** FIXED

**Description:**
The admin media upload endpoint accepted any file type and derived the saved
extension from `file.name` (attacker-controlled). An admin could upload an
HTML or JavaScript file that would be served from `/uploads/` with an arbitrary
MIME type, enabling stored XSS or phishing pages hosted on the platform domain.
There was also no size limit.

**Fix applied:**
- Added `ALLOWED_MIME_TYPES` allowlist (images + PDF only).
- Extension is now derived from the validated `file.type` (MIME-to-ext map),
  not from the original filename — prevents `.php` or `.html` smuggling.
- Added 10 MB size limit.

---

### HIGH-2 — Discount code race condition (double-spend)

**File:** `src/app/api/airwallex/payment-intent/route.ts`
**Severity:** HIGH
**Status:** FIXED

**Description:**
The discount validation flow was:
1. Read discount code and check `usedCount < maxUses`.
2. Create orders.
3. Increment `usedCount` with a separate `update`.

Between steps 1 and 3, a concurrent request from the same user (or a different
user with the same code) could pass the `usedCount < maxUses` check and also
apply the discount, exceeding the intended usage limit.

Additionally, the endpoint trusted the client-supplied `discountAmount` value
rather than recalculating it server-side, allowing the client to claim an
arbitrarily large discount.

**Fix applied:**
- Replaced the read-then-increment pattern with an atomic `updateMany` with a
  conditional `WHERE maxUses IS NULL OR usedCount < maxUses`. If `count === 0`
  the code was exhausted concurrently; the request is rejected.
- The discount amount is now recalculated server-side from the code's `type`
  and `value` fields; the client-supplied value is ignored.
- The now-redundant second `usedCount` increment at the end of the function
  was removed.

---

### HIGH-3 — Path traversal in digital download endpoint

**File:** `src/app/api/download/[token]/route.ts`
**Severity:** HIGH
**Status:** FIXED

**Description:**
The `digitalFile` field is read from the database (set by a creator when
publishing a product) and joined directly to `process.cwd()/public/` using
`path.join`. If a creator managed to set `digitalFile` to a value like
`../../.env` or `../../src/lib/auth.ts`, `path.join` would resolve the
traversal and `readFileSync` would serve the resulting file to any holder of a
valid download token.

**Fix applied:**
After resolving the absolute path, a prefix check ensures it starts with
`publicRoot + '/'`. Requests where the resolved path escapes `public/` return
403 before any filesystem read.

---

### MEDIUM-1 — No rate limiting on auth endpoints

**Files:**
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`

**Severity:** MEDIUM
**Status:** OPEN — not fixed (requires infrastructure-level solution)

**Description:**
None of these endpoints implement rate limiting. An attacker can:
- Brute-force password reset token enumeration (tokens are 32 random hex bytes;
  not practically enumerable, but the endpoint still accepts unlimited attempts).
- Spam the forgot-password endpoint to flood a victim's inbox.
- Submit unlimited registration attempts to harvest email existence information
  (the register endpoint returns `"Email already in use"` on duplicate).

Note: the `/api/contact` route correctly implements in-memory rate limiting
(3 requests/hour per IP). The auth routes should receive similar treatment.

**Recommended fix:**
Apply rate limiting at the reverse proxy (nginx/Vercel Edge) or use a Redis-
backed middleware (e.g. `upstash/ratelimit`) on these three endpoints:
- Register: 5 attempts per IP per 15 minutes
- Forgot-password: 3 attempts per email per hour
- Reset-password: 10 attempts per token per hour (tokens are single-use anyway)

The staff login at `/api/staff/login` already implements account lockout after
5 failed attempts — the same pattern should be applied to the user-facing auth
routes.

---

### MEDIUM-2 — Internal error messages leaked in checkout/intent 500 responses

**File:** `src/app/api/checkout/intent/route.ts` (lines 67-70)
**Severity:** MEDIUM
**Status:** OPEN

**Description:**
The catch block returns the raw JavaScript `Error.message` in the JSON response:
```typescript
const msg = e instanceof Error ? e.message : 'Unknown error'
return NextResponse.json({ error: msg }, { status: 500 })
```
Airwallex SDK exceptions and Prisma errors may contain internal details such as
connection strings, query structure, or upstream API error codes that aid
reconnaissance.

**Recommended fix:**
Log the full error server-side and return a generic message to the client:
```typescript
console.error('[checkout/intent]', e)
return NextResponse.json({ error: 'Payment initialisation failed' }, { status: 500 })
```

---

### MEDIUM-3 — Message attachments accessible by any authenticated user

**File:** `src/app/api/files/[...path]/route.ts` (lines 32-34)
**Severity:** MEDIUM
**Status:** OPEN

**Description:**
The `message-attachment` category in the private file serving route allows any
authenticated user to access any message attachment by guessing its path, with
no check that the requesting user is a participant in the conversation that
produced the attachment:
```typescript
} else if (category === 'message-attachment') {
  // Any authenticated user for prototype; tighten per message ownership in production
}
```
The comment acknowledges this is a known gap.

**Recommended fix:**
Store a `messageId` or `conversationId` alongside each private attachment in
the Media table. Before serving, verify the requesting user is either the
`senderId` or `receiverId` of that message, or a participant in that
conversation.

---

### LOW-1 — Discount code application endpoint has no CSRF protection comment

**File:** `src/app/api/checkout/apply-discount/route.ts`
**Severity:** LOW
**Status:** OPEN (partially mitigated by CRITICAL-2 fix)

**Description:**
NextAuth v5 JWT sessions rely on cookies and do not automatically inject CSRF
tokens for custom API routes. However, because discount code application now
requires an authenticated session (CRITICAL-2 fix) and the endpoint is
read-only (it only calculates a discount, it does not increment `usedCount`),
the practical CSRF risk is low. The actual `usedCount` increment in
`/api/airwallex/payment-intent` is similarly protected by session auth.

No code change required; document as accepted.

---

### LOW-2 — Staff session shares AUTH_SECRET with NextAuth

**File:** `src/lib/staffAuth.ts` (line 21)
**Severity:** LOW
**Status:** OPEN

**Description:**
The HMAC key for staff session tokens is `process.env.AUTH_SECRET`, the same
secret used by NextAuth for its JWT sessions. If `AUTH_SECRET` rotates (e.g.
after a suspected compromise), staff sessions and NextAuth sessions both
invalidate simultaneously, which is desirable. However, a bug in either the
NextAuth JWT or the staff token decoder could theoretically allow one token type
to be confused with the other.

**Recommended fix:**
Use a dedicated `STAFF_SESSION_SECRET` environment variable. This also allows
independent rotation of the two secrets.

---

### LOW-3 — `.env` wildcard in .gitignore (good — confirmed)

**File:** `.gitignore`
**Severity:** INFORMATIONAL

`.env*` is listed in `.gitignore`, meaning no `.env`, `.env.local`, or
`.env.production` files will be committed. No secrets were found hardcoded in
any source file during this audit. The `NEXT_PUBLIC_` variables exposed to the
client are limited to safe values: app URL, canonical domain, Airwallex
environment name, and an analytics tracking ID — none are secret.

---

### LOW-4 — No SQL injection surface (confirmed safe)

All database access uses the Prisma ORM with parameterised queries. A grep for
`$queryRaw` and `$executeRaw` in application code (excluding generated Prisma
internals) returned no results. No raw SQL is used.

---

### LOW-5 — No dangerouslySetInnerHTML with user content (confirmed safe)

A grep for `dangerouslySetInnerHTML`, `eval(`, and `innerHTML` across all `.tsx`
files returned no results. Email templates use template literals with
user-controlled data but those are server-rendered HTML sent via Resend, not
rendered in the browser DOM.

---

## Files Changed in This Audit

| File | Severity Fixed |
|------|---------------|
| `src/app/api/orders/[id]/route.ts` | CRITICAL |
| `src/app/api/checkout/apply-discount/route.ts` | CRITICAL |
| `src/app/api/webhooks/airwallex/route.ts` | CRITICAL |
| `src/app/api/airwallex/webhook/route.ts` | CRITICAL |
| `src/app/api/admin/media/upload/route.ts` | HIGH |
| `src/app/api/airwallex/payment-intent/route.ts` | HIGH |
| `src/app/api/download/[token]/route.ts` | HIGH |

## Open Items Requiring Follow-up

| ID | Severity | Description |
|----|----------|-------------|
| MEDIUM-1 | MEDIUM | Rate limit auth endpoints (register, forgot-password, reset-password) |
| MEDIUM-2 | MEDIUM | Sanitise 500 error messages in checkout/intent |
| MEDIUM-3 | MEDIUM | Restrict message-attachment access to conversation participants |
| LOW-2 | LOW | Use dedicated STAFF_SESSION_SECRET separate from AUTH_SECRET |
