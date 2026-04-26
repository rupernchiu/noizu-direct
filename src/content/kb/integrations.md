---
title: Integrations
description: External services, what they do, and how we talk to them.
---

## Airwallex (payments + payouts)

- **Role:** payment intent creation, card processing, APAC local-rail processing, payout disbursement, chargeback handling.
- **Auth:** OAuth2 client-credentials flow; tokens cached short-lived in memory per isolate.
- **Inbound:** webhooks at `/api/webhooks/airwallex`. Signature-verified (`x-signature` HMAC). Dedupe via `ProcessedWebhookEvent`.
- **Outbound calls:** REST. Idempotency keys per call to survive retries.
- **What we send out:** payment intents, payout instructions, refund instructions, dispute evidence.
- **What we receive:** payment status events, payout status events, dispute notifications, chargeback notifications.
- **Why this PSP:** local-rail coverage in MY/SG/PH/ID/TH (FPX, DuitNow, FAST, PayNow, BI-FAST, GCash, GrabPay, PromptPay) plus card and SWIFT — single integration covers our whole geography.
- **Migration risk:** abstracted in `src/lib/payments/*` so a swap is feasible but not trivial.

## Cloudflare R2 (object storage)

- **Role:** all binary assets — product images, digital downloads, KYC docs, dispute evidence, ticket attachments.
- **Buckets:** public bucket for catalog images; private bucket for KYC + paid downloads + dispute evidence.
- **Why R2:** no egress fees vs. S3 (huge for image-heavy catalog), S3-compatible API.
- **Access pattern:** signed URLs for private content (short-lived, single-purpose). Public bucket served via CDN.
- **Hotlink protection:** middleware checks `Referer` against `allowedReferHosts()` for `/uploads/*` paths.
- **Audit:** every signed-URL grant for KYC or dispute files writes a `PrivateFileAccess` row.

## Resend (transactional email)

- **Role:** order confirmations, KYC status updates, payout notifications, dispute updates, broadcast emails (for users opted in to email).
- **Auth:** API key.
- **Inbound:** webhooks at `/api/webhooks/resend` for delivery / bounce / complaint events. Updates `EmailLog`.
- **Templates:** rendered server-side from React components → HTML; consistent with on-platform notifications.
- **Sender domain:** `noizu.direct` (DKIM/SPF/DMARC configured at registrar).

## Microsoft Clarity (UX analytics)

- **Role:** session recordings, heatmaps, click maps. No PII forwarded.
- **Loaded:** conditionally via `NEXT_PUBLIC_CLARITY_ID` env var (in `src/app/layout.tsx`).
- **CSP allow-list:** `c.clarity.ms` (img/connect) and `c.bing.com` (Clarity routes pixel through Bing).

## Vercel Analytics + SpeedInsights

- **Role:** RUM + Core Web Vitals.
- **No config beyond `<Analytics />` and `<SpeedInsights />`** in `layout.tsx`.

## NextAuth (Auth.js)

- **Role:** session/auth. Email+password (with bcrypt), social providers as configured.
- **Session storage:** JWT-backed.
- **Role propagation:** custom claim from `User.role` plus `loadStaffActor()` for staff scopes.

## Upstash Redis (cache + flags)

- **Role:** maintenance flag, rate-limit windows, short-TTL caches.
- **Auth:** REST API (edge-friendly, no connection pool).
- **Why REST:** middleware can hit it from edge runtime.

## Supabase Postgres (durable store)

- **Role:** primary database.
- **Connection model:** pooled (port 6543) for app traffic, direct (port 5432) for migrations / `prisma db push`.
- **Why pooled:** Vercel functions × concurrent invocations would exhaust direct connections fast.
- **Backups:** managed by Supabase (point-in-time recovery available on Pro).

## Vercel (hosting)

- **Project setup:** GitHub-connected; push to `master` → deploy.
- **Crons:** declared in `vercel.json` (see [Cron jobs](cron-jobs)).
- **Env vars:** managed in Vercel dashboard; mirrored locally via `.env`.
- **Preview deploys:** every PR/branch gets a preview URL.

## Sentry / error tracking

- Not currently integrated. Application errors surface via Vercel logs; CSP violations report to `/api/csp-report`.

## YouTube embeds

- Used for creator profile videos.
- Domains allow-listed in CSP `frame-src` (`youtube.com`, `youtube-nocookie.com`).

## What's NOT integrated (yet)

- **No CDN beyond Vercel** — sufficient for current volume.
- **No search infrastructure (Algolia, Typesense)** — built-in Postgres FTS for now.
- **No ML / recommendation service** — co-purchase + decay-weighted trending in-app is enough.
- **No SMS provider** — email + in-app only.
- **No Slack/Discord webhooks** — admin notifications via email + on-platform only.

## Dependency-rotation notes

| Service     | Rotation cadence  | Where to rotate |
|-------------|--------------------|-----------------|
| DB password | quarterly (target) | Supabase → Vercel env |
| Airwallex API key | yearly + on staff change | Airwallex console → Vercel env |
| Resend key  | yearly + on incident | Resend console → Vercel env |
| R2 keys     | yearly             | Cloudflare → Vercel env |
| Upstash token | as needed        | Upstash → Vercel env |
