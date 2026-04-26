---
title: Customer support
description: How tickets flow, who responds, what the SLAs are.
---

## Where tickets come from

- **Buyer-initiated** — `/help` on any order page, `/contact`, or via order/dispute pages.
- **Creator-initiated** — `/dashboard/support` for payouts, KYC questions, listing issues.
- **Admin-initiated** — anyone on the team can open a ticket on behalf of a user.
- **System-initiated** — fraud flags, payout failures, dispute escalations spawn tickets automatically.

## The ticket model

`Ticket` is the container, with `TicketMessage` for thread entries and `TicketAttachment` for files.

- Statuses: OPEN / IN_PROGRESS / WAITING_USER / RESOLVED / CLOSED
- Priorities: LOW / NORMAL / HIGH / URGENT
- Categories: ORDER / PAYMENT / KYC / DISPUTE / SHIPPING / TECHNICAL / OTHER

`TicketReadMarker` tracks last-read per participant so unread counts work.

## CS Workbench

`/admin/cs` is the operator's main view. From there:

- Filter by status, category, priority, assignee.
- Open the ticket → see thread, user history, related order, prior tickets.
- Respond inline; user gets email + in-app notification.
- Apply quick actions: refund, resend tracking, force-release escrow, comp a discount code.
- Close / merge / re-categorize.

## SLAs (target, pre-launch defaults)

| Priority | First response | Resolution target |
|----------|----------------|-------------------|
| URGENT   | < 2 hours      | < 24 hours        |
| HIGH     | < 8 hours      | < 48 hours        |
| NORMAL   | < 24 hours     | < 5 days          |
| LOW      | < 48 hours     | < 10 days         |

URGENT is reserved for: payment captured but order not visible, creator payout failure with KYC blocker, suspected account compromise.

## Escalation paths

- **Payment / refund issue** → CS opens dispute or admin-refunds; routes to Finance review if > USD 100.
- **KYC dispute** → routes to admin reviewer with KYC permission scope.
- **Legal / safety** → flag in admin, freeze accounts, escalate off-platform if needed.
- **Bug / technical** → log in dev tracker (separate); user gets workaround if possible.

## Retention / cleanup

- Closed tickets retained for ~2 years for audit + recurrence detection.
- `ticket-retention` cron (daily 05:00 UTC) prunes attachments older than retention window for resolved tickets.
- KYC-related ticket attachments follow the longer KYC retention rule (5–7 years).

## What admins should remember

- **Always log into the user's order before responding** — context prevents wrong answers.
- **Use canned text only as a starter** — every response should reference specifics (order ID, amount, date).
- **Never share a creator's full KYC info via ticket** — link to admin tools instead.
- **Refund + comp** — small comps (free download, discount code) often save a marginal dispute that would cost more in chargeback fees.

## Self-serve before contact

We deflect support load through:

- Order page (`/account/orders/[id]`) — tracking, files, "open dispute" all inline.
- Help center / FAQ pages (`/help`, `/policies/*`) — covers refund, shipping, account.
- Email templates that link to the relevant self-serve page first.

## Data-flow summary

| Concept              | Model                  |
|----------------------|------------------------|
| Ticket container     | `Ticket`               |
| Message              | `TicketMessage`        |
| Attachment           | `TicketAttachment`     |
| Read state           | `TicketReadMarker`     |
| User block (severe)  | `UserBlock`            |
| Email log (replies)  | `EmailLog`             |
