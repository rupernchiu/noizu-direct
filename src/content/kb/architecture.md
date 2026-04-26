---
title: Architecture overview
description: Stack, hosting, data plane, and the boundaries between them.
---

## Stack

| Layer        | Choice                          | Why |
|--------------|---------------------------------|-----|
| Framework    | Next.js 15 (App Router)         | RSC + edge-friendly + ecosystem |
| Runtime      | Vercel Fluid Compute (Node 24)  | Cold-start amortization, full Node |
| Language     | TypeScript (strict)             | Catch fee/tax math errors at build time |
| Database     | Supabase Postgres               | Managed PG + connection pooler |
| ORM          | Prisma                          | Schema discipline, migrations, type safety |
| Object store | Cloudflare R2                   | Cheap egress, S3-compatible API |
| Email        | Resend                          | Clean API, good deliverability |
| Payments     | Airwallex                       | APAC local rails + cards + payouts in one |
| Cache / Flags| Upstash Redis (REST)            | Edge-friendly, no connection pool |
| Auth         | NextAuth (Auth.js)              | Email + social + role hooks |
| UI           | Tailwind + shadcn/ui            | Headless primitives + utility CSS |
| Editor       | TipTap                          | Rich-text for product/CMS content |
| Analytics    | Vercel Analytics + SpeedInsights + Microsoft Clarity | Lean stack |

## Topology

```
┌──────────────┐
│   Browser    │
│  (Next.js 15 │
│   client)    │
└──────┬───────┘
       │ HTTPS
       ▼
┌──────────────────────────────────────┐
│           Vercel Edge                │
│  (middleware.ts: CSP, maintenance,   │
│   hotlink, nonce)                    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│        Vercel Fluid Compute          │
│  (RSC + route handlers + crons)      │
└──┬─────┬─────┬─────┬─────┬──────────┘
   │     │     │     │     │
   ▼     ▼     ▼     ▼     ▼
┌──────┐┌────┐┌────┐┌────┐┌──────────┐
│Postgres││ R2 ││Resend││Airwallex││ Upstash │
│(Supab)││    ││      ││         ││  Redis  │
└──────┘└────┘└────┘└────┘└──────────┘
```

## Data plane

- **Postgres (Supabase):** primary durable store. Pooled (port 6543) for app traffic, direct (port 5432) for migrations.
- **R2:** all media (product images, downloads, KYC docs). Public bucket for catalog images, private bucket for KYC + paid downloads (signed URLs).
- **Redis (Upstash REST):** maintenance flag, rate-limit counters, short-TTL caches. Stateless from the app's perspective.

## Why these boundaries

- **Edge middleware does only what's safe at the edge:** header CSP, hotlink check, maintenance rewrite. No DB calls beyond the cached Redis flag.
- **All heavy lifting in Fluid Compute:** full Node, Prisma, signed-URL generation. Same cold-start amortization that makes traditional serverless livable.
- **Webhooks land on Fluid Compute:** they need the DB anyway, no point at the edge.
- **No background workers separate from the web app:** crons + serverless are sufficient at our scale.

## Security boundaries

- **CSP per request** — nonce-based with `strict-dynamic` (`src/middleware.ts:buildCsp`).
- **Hotlink protection on `/uploads/*`** — referer must be in `allowedReferHosts()`.
- **Private R2 bucket for KYC** — never proxied directly; signed URL only via authenticated route + access log (`PrivateFileAccess`).
- **CSRF** — NextAuth handles; webhook routes use signature verification.
- **Rate limiting** — Upstash sliding-window on auth + checkout + ticket-create.

## Build & deploy

- Push to GitHub `master` → Vercel deploys.
- Preview branches get preview URLs.
- Migrations: `prisma db push` from local against direct URL (we use db push, not migrate deploy — schema is small enough that the migration ledger is more friction than help).
- Schema versions are still tracked in `prisma/migrations/` for audit even though we don't run `migrate deploy`.

## What doesn't run on Vercel

- Nothing. There is intentionally no separate worker tier, no Kubernetes, no self-hosted DB. The whole stack is managed services + Vercel.
- Trade-off: vendor lock-in to PSP and DB. Mitigated by abstracting fee/tax/payout logic in `src/lib/*` rather than in PSP-shaped types.
