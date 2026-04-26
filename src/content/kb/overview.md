---
title: What we do
description: One-page elevator pitch for noizu.direct.
---

## In one sentence

**noizu.direct is a Southeast Asian creator marketplace where fans buy directly from cosplayers, doujin authors, anime artists, and indie merchandisers — with escrow-backed payments and creator-friendly economics.**

## What we sell

Six product categories live in the catalog:

| Category         | What it is                                         | Fulfilment |
|------------------|----------------------------------------------------|------------|
| Digital Art      | Wallpapers, illustrations, fan art                 | Instant download |
| Doujin           | Self-published comics, zines, artbooks             | Physical or digital |
| Cosplay Prints   | Convention photos, character portraits             | Physical or digital |
| Physical Merch   | Apparel, pins, accessories, custom goods           | Creator-shipped |
| Stickers         | Die-cut sticker sheets, kawaii art                 | Creator-shipped |
| Other            | Unique creator goods that don't fit a category     | Mixed |

We also support **commissions** — buyers request bespoke work, the creator quotes, milestones release in stages.

## What makes us different

- **SEA-first.** We support local payment rails (FPX, DuitNow, GCash, GrabPay, FAST, PayNow, BI-FAST, PromptPay) and cover SWIFT corridors for the rest of SEA — places generic global tools quietly leave behind.
- **Direct relationship.** No middleman re-sellers. Each product page links to the creator's profile; followers get broadcast updates.
- **Buyer protection without strangling creators.** Escrow holds funds until delivery confirms or a release window passes; disputes are worked by humans with structured evidence packaging.
- **Honest fee model.** Flat 5% creator commission, then a buyer fee that depends on the rail used (5.5% local rails, 8% cards). No hidden FX markups beyond the published spread.

## Who runs it

Single-operator project right now. The admin (you) runs everything: catalog moderation, KYC review, payouts, tax registration, dispute adjudication, customer support. The platform is built so most of that work is one-click — escrow auto-releases, payouts pre-stage, fraud scoring pre-flags.

## Where it lives

- **Domain:** `noizu.direct`
- **Hosting:** Vercel (Next.js 15 App Router, Fluid Compute)
- **Database:** Supabase Postgres (pooled + direct URL for migrations)
- **Storage:** Cloudflare R2 (assets, downloads, KYC docs in private bucket)
- **Payments:** Airwallex (cards + APAC local rails + payouts)
- **Email:** Resend
- **Analytics:** Vercel Analytics + SpeedInsights + Microsoft Clarity

## Stage

Pre-launch / soft-launch. Core flows shipped: catalog, checkout, escrow, payouts, KYC, broadcasts, in-app messaging, dispute pipeline, admin finance suite. Policy copy is mostly placeholder until live.
