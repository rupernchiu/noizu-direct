---
title: Terms summary
description: Plain-English read of the ToS and Creator Agreement. NOT a substitute for the legal text.
---

> **Disclaimer:** this page is the *operator's* plain-English read of the legal documents in `/admin/agreements`. The legally binding text is whatever the user actually agreed to. When in doubt, the signed version wins.

## Buyer Terms of Service — what users actually agree to

### Account
- Must be 18+ (or local age of majority).
- One person per account; no shared accounts.
- We can suspend accounts for violations; right to appeal.

### Purchases
- Prices in USD; local currency for display only.
- Buyer fees disclosed at checkout.
- Buyer protection per [Buyer protection](buyer-protection); refund per [Refund policy](refund-policy).
- Disputes follow our process before card chargebacks.

### Conduct
- No fraud, no chargebacks-as-shopping.
- No harassment of creators in DMs or reviews.
- Reviews must be honest; no fake/incentivized reviews.
- Don't share, redistribute, or torrent paid digital downloads.

### Liability
- Marketplace platform; not the seller.
- Liability capped (typically transaction value).
- We're not party to creator↔buyer commission terms beyond escrow.

### Termination
- Either party can close account at any time.
- Open orders / disputes survive account closure until resolved.

## Creator Agreement — what creators actually agree to

### Eligibility
- 18+ legal age.
- Pass KYC (identity + bank + tax-ID).
- Authorized to sell the work (own creation OR licensed).
- Comply with local business / tax rules in their country.

### Content rules
- Original work or properly licensed.
- No copyright/trademark infringement (DMCA process applies).
- No prohibited content (violence, exploitation, etc. — concrete list in agreement).
- Adult content: TBD (not enabled at launch).

### Pricing & payouts
- Creator sets prices.
- 5% commission deducted; clear in earnings view.
- Payouts per [Escrow & payouts](escrow-payouts) — local rail vs SWIFT corridor.
- KYC must stay current to receive payouts.

### Fulfilment
- Ship physical orders within reasonable time (target 5 business days for in-stock).
- Provide tracking when available.
- Deliver digital files immediately on order.
- Honor commissions per accepted milestones.

### Dispute response
- Respond to dispute requests within 7 days.
- Provide reasonable evidence (tracking, photos, work-in-progress).
- Repeated lost disputes affect listing visibility.

### Termination
- Creator can leave any time; outstanding orders + funds settle on schedule.
- We can suspend/ban for violations or fraud; appeal process available.
- Funds owed at termination: paid out after final dispute window.

### Liability
- Creator responsible for content legality.
- Creator indemnifies platform against third-party claims (reasonable terms).
- Platform liability capped at fees paid by creator.

## Privacy

- We collect: account info, order history, KYC docs (creators), payment info (via PSP), behavioral analytics.
- We don't sell personal data.
- KYC docs: private bucket, access-logged.
- Buyers' personal data accessible to creators only as needed for fulfilment (name + shipping address; not full profile).

## Versioning

- Agreements are versioned in `AgreementTemplate`.
- A material change forces re-acceptance (`CreatorAgreement` row tracks who signed which version when).
- Buyer ToS changes are notified via email + announcement bar; continued use = acceptance.

## Where to find the live text

- Buyer ToS: `/policies/terms`
- Privacy: `/policies/privacy`
- Refund: `/policies/refund`
- Shipping: `/policies/shipping`
- Creator Agreement: linked from `/start-selling` and on `/dashboard` for accepted creators.
- All agreement templates: `/admin/agreements`.

## Pre-launch caveat

The shipped policy pages currently contain **placeholder copy**. Counsel review is on the to-do list before public launch. This summary describes intent — the legal text must catch up.
