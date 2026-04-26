---
title: Buyer protection
description: What we cover, what we don't, and how the protection actually works.
---

## The promise

If a buyer pays through noizu.direct and **doesn't get what they ordered, in the condition described, within a reasonable time**, they get their money back. The mechanism is escrow + dispute, not a separate insurance product.

## What's covered

- **Order never arrives** — physical product, no tracking shows delivery.
- **Order arrives substantially different from listing** — wrong item, wrong size, missing components, damaged in a way that makes it unusable.
- **Digital download is unrecoverable** — file corrupt, file missing, link expired before any successful download.
- **Commission abandoned** — creator stops responding mid-job, no milestone progress.

## What's NOT covered

- **Buyer's remorse** — bought it, changed mind. Cosplay/doujin is creative work, generally non-returnable.
- **Subjective quality** — "I expected it to look like the reference more closely." Adjudicated case-by-case; usually a partial at best.
- **Damaged in shipping** when creator can prove correct packaging + carrier confirmed delivery.
- **Address mismatch caused by buyer** — wrong address on order, package returned/lost.
- **Long-tail commission disputes** when buyer abandoned mid-process and creator delivered milestone work in good faith.
- **Anything outside the dispute window** — see below.

## Dispute window

| Situation                          | Window |
|------------------------------------|--------|
| Order paid but never marked SHIPPED| Until 21 days post-PAID |
| Physical, marked SHIPPED, no tracking confirmation | 30 days post-SHIPPED |
| Physical, tracking shows delivered | 7 days post-delivery |
| Digital download                   | 7 days post-PAID |
| Commission                         | 14 days post-final-milestone |

After window: order auto-releases to creator. Buyer can still reach out via support; we'll mediate, but the "automatic" protection doesn't apply.

## How buyer initiates

`/account/orders/[id]` → "Open a dispute" → describe issue + upload proof (photos, screenshots).

Order status flips to `DISPUTED`. Escrow funds freeze. Both sides get a window to submit evidence (default 7 days).

## How we adjudicate

See [Disputes & chargebacks](disputes-chargebacks) for the full workflow. Headline: human review of evidence + auto-packaged context (tracking, download log, prior history).

Outcomes: full refund, partial refund, release-to-creator.

## What we charge for protection

Nothing extra. The 5.5% / 8% buyer fee includes the cost of running this protection.

## Shipping in disputes

- **Order disputed before shipping** (escrowStatus = HELD) → full refund including shipping cost. Creator hasn't paid the carrier yet.
- **Order disputed after shipping** (escrowStatus past HELD) → shipping is **retained by the creator**. The carrier was paid; reversing that money would punish the creator for a service they actually rendered. Buyer's refund excludes the shipping line.
- **Chargeback (any state)** → full reversal including shipping. The card network pulls everything back; we pause payout via `payoutBlocked` so the creator doesn't get paid the shipping pass-through either. Documented in the [Shipping policy](shipping-policy).

## Card chargebacks vs. our dispute path

Buyers can always go straight to their card issuer (chargeback). We prefer they use our dispute first because:

- Faster (days vs. weeks).
- We have full context (order, creator, tracking).
- Doesn't damage creator's standing automatically.
- No card-network fees.

We tell buyers this at every dispute touchpoint. We don't *prevent* chargebacks (can't, legally), but we make the in-platform path obviously better.

## Creator implications

- Lost dispute → creator returns funds (escrow already frozen, so no clawback needed).
- Pattern of lost disputes → impacts creator-health score, surfaces in trending suppression.
- Egregious / fraudulent listings → suspension via fraud queue.

## Edge cases & posture

- **Buyer + creator both at fault** → we lean toward partial refund, document precedent.
- **Buyer is a serial disputer** (multiple orders, multiple disputes, all rejected) → we eventually de-prioritize their disputes; severe → block.
- **Creator is repeat-offender** → suspension, then ban. Unpaid balances offset against ongoing disputes.
- **High-value commission, partial delivery** → milestone-by-milestone refund, not all-or-nothing.

## The honest version

Buyer protection is the single most important trust signal a marketplace offers. We make it work because:

- Escrow holds the money — there's nothing to "claw back" from the creator.
- Disputes are reviewed by humans, not bots, with full context.
- We don't auto-favor the buyer or the creator — the auto-evidence packaging keeps the call grounded.

When we get it wrong (and we will), the remedy is a manual override + apology, not a policy lawyer-up.
