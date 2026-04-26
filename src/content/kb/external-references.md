---
title: External references
description: Counterparties, regulators, and dashboards we depend on.
---

## Service dashboards we own

| Service        | URL pattern                   | What for |
|----------------|-------------------------------|----------|
| Vercel         | vercel.com/dashboard          | Deploys, env vars, logs, crons |
| Supabase       | supabase.com/dashboard        | Postgres console, metrics, backups |
| Cloudflare R2  | dash.cloudflare.com/.../r2    | Bucket usage, keys |
| Cloudflare DNS | dash.cloudflare.com/.../dns   | DNS records, page rules |
| Airwallex      | demo / live console           | Payment ops, payouts, disputes |
| Resend         | resend.com/emails             | Email delivery, bounce/complaint metrics |
| Upstash        | console.upstash.com           | Redis usage |
| Microsoft Clarity | clarity.microsoft.com      | Session recordings, heatmaps |
| GitHub         | github.com/your-org/noizu-direct | Code, deploys, issues |

(URLs intentionally generic — actual login URLs and tenant IDs live in your password manager.)

## Regulators we may interact with

| Body             | Country | Role |
|------------------|---------|------|
| RMCD (Royal Malaysian Customs Department) | MY | SST registration + remit |
| IRAS             | SG | GST registration + remit |
| BIR              | PH | VAT registration + remit |
| DGT (Direktorat Jenderal Pajak) | ID | PPN registration + remit |
| RD (Revenue Department) | TH | VAT registration + remit |
| BNM (Bank Negara Malaysia) | MY | Payment-aggregator + e-money rules (Airwallex licensure) |
| MAS              | SG | Payment-services regulation |
| BSP              | PH | Payment systems oversight |

## Card networks (chargeback rules)

- **Visa** — Visa Resolve Online (VROL); chargeback ratio threshold 0.9% / 1.0% under VDMP.
- **Mastercard** — Mastercom; threshold programs ECP/VMP.
- **Amex** — direct dispute API via Airwallex; lower volume in SEA.

We monitor chargeback ratio in `/admin/chargebacks`. Internal target < 0.4% of monthly card volume.

## Convention partners (creator pipeline)

- **NoizuCon** — sister convention brand; primary source of creator discovery.
- **Comic Fiesta** — Malaysia's largest doujin convention.
- **AFA Singapore** — Anime Festival Asia.
- **Cosfest** — Singapore cosplay festival.
- **WCS Malaysia** — World Cosplay Summit MY chapter.

We don't operate these — we recruit creators around them.

## Documentation we lean on

| Library / vendor | Where to look |
|------------------|---------------|
| Next.js 15       | `node_modules/next/dist/docs/` (per AGENTS.md, this is the source — don't trust LLM training data) |
| Prisma           | prisma.io/docs |
| Airwallex API    | airwallex.com/docs |
| Cloudflare R2    | developers.cloudflare.com/r2 |
| Resend           | resend.com/docs |
| Vercel platform  | vercel.com/docs |
| NextAuth (Auth.js)| authjs.dev |
| TipTap           | tiptap.dev/docs |
| shadcn/ui        | ui.shadcn.com |
| Tailwind         | tailwindcss.com |

## Status pages worth bookmarking

- Vercel: vercel-status.com
- Supabase: status.supabase.com
- Cloudflare: cloudflarestatus.com
- Airwallex: status.airwallex.com (login required for some)
- Resend: status.resend.com

## Key off-platform documents

- **Tax registration thresholds spreadsheet** — CFO-maintained off-platform. Drives when admin flips `taxDestinationCountries` flags.
- **Creator Agreement (legal)** — `/admin/agreements` has the live versions; archived versions in legal counsel files.
- **Bank account list** — operating accounts for each currency we settle in. Maintained off-platform.
- **PSP fee schedule** — Airwallex contract; informs `LOCAL_RAILS`/`CARD_RAILS` cost assumptions.

## Outage / incident playbook (where to look)

- App down → Vercel dashboard, then Vercel status page.
- Payments stuck → Airwallex dashboard, check webhook delivery; `/admin/transactions` to reconcile.
- Email not sending → Resend dashboard for bounce/complaint; check sender reputation.
- DB slow → Supabase metrics; check connection pool saturation.
- Maintenance flag stuck → see [Maintenance mode](maintenance-mode) break-glass.
