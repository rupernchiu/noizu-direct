# In-App Creator Broadcasts — Implementation Plan

Date: 2026-04-24
Status: Planned, not started
Resume token: **"InApp"** (say this in next session to pick up)

---

## Context & intent

Creators need a way to push one-to-many announcements to their followers. Tickets (1-to-1) already exist; this adds a separate **broadcast** surface.

**Scope for this iteration:**
- In-app only (bell notification + feed + detail page)
- No reply affordance (one-way, newsletter-style)
- Creator-side compose with locked-design templates
- Two-tier audience: all followers vs. subscribers-only

**Explicitly deferred (do NOT build in this iteration):**
- Email broadcasts (Resend, credit packs, unsubscribe webhooks) — separate future effort
- Recurring donations / paid subscription flows — v2
- Open-rate / click-rate analytics — polish pass later
- "Following feed" timeline page — not MVP

---

## Mental model

Two axes, independent:

**Axis 1 — Relationship:**
- Not following
- Following (free)
- Following + Subscriber (has donated ≥ $1 in last 90 days)

**Axis 2 — Notification preference:**
- Broadcasts on (default)
- Broadcasts muted (still following, just no pings)

Three distinct buyer actions, clearly separated:

| Action | Behavior |
|---|---|
| **Unfollow** | Ends the relationship. No broadcasts, no discovery, gone. |
| **Mute broadcasts** | Stay a follower/subscriber, silence pings. |
| **Unsubscribe** | (v2 only, requires recurring donations) cancel auto-renewal. |

---

## Data model (additions)

### `CreatorFollow` (new)

```prisma
model CreatorFollow {
  id              String   @id @default(cuid())
  buyerId         String
  creatorId       String
  followedAt      DateTime @default(now())
  broadcastMuted  Boolean  @default(false)

  buyer    User @relation("BuyerFollows", fields: [buyerId], references: [id], onDelete: Cascade)
  creator  User @relation("CreatorFollowers", fields: [creatorId], references: [id], onDelete: Cascade)

  @@unique([buyerId, creatorId])
  @@index([creatorId, broadcastMuted])
  @@index([buyerId])
}
```

### `Donation` (new, required for subscriber tier)

**Prerequisite check before starting:** confirm no Donation/Tip model already exists.

```prisma
model Donation {
  id         String   @id @default(cuid())
  buyerId    String
  creatorId  String
  amount     Decimal  // in platform base currency, minimum $1
  createdAt  DateTime @default(now())

  buyer    User @relation("BuyerDonations", fields: [buyerId], references: [id])
  creator  User @relation("CreatorDonations", fields: [creatorId], references: [id])

  @@index([creatorId, createdAt])
  @@index([buyerId, createdAt])
}
```

Subscriber status is **computed**, not stored:
```ts
isSubscriber(buyerId, creatorId) =
  exists Donation where buyerId, creatorId, createdAt > now - 90d
```

### `Broadcast` (new)

```prisma
model Broadcast {
  id         String            @id @default(cuid())
  creatorId  String
  title      String            // max 60 chars
  body       String            // max 500 chars
  imageKey   String?           // R2 object key for hero image
  ctaText    String?           // max 30 chars
  ctaUrl     String?           // validated — noizu.direct or allow-listed
  template   BroadcastTemplate // enum: NEW_DROP | FLASH_SALE | BEHIND_SCENES | EVENT | THANK_YOU | MILESTONE
  audience   BroadcastAudience // enum: ALL_FOLLOWERS | SUBSCRIBERS_ONLY
  createdAt  DateTime          @default(now())

  creator        User                   @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  notifications  BroadcastNotification[]

  @@index([creatorId, createdAt])
  @@index([createdAt]) // retention sweep
}
```

### `BroadcastNotification` (new, fan-out)

```prisma
model BroadcastNotification {
  id           String    @id @default(cuid())
  broadcastId  String
  recipientId  String
  readAt       DateTime?
  deletedAt    DateTime? // soft-delete: buyer hid their copy
  createdAt    DateTime  @default(now())

  broadcast  Broadcast @relation(fields: [broadcastId], references: [id], onDelete: Cascade)
  recipient  User      @relation(fields: [recipientId], references: [id], onDelete: Cascade)

  @@unique([broadcastId, recipientId])
  @@index([recipientId, createdAt])
  @@index([recipientId, readAt])
}
```

Kept separate from the existing `Notification` table because:
- Different lifecycle (retention rules, delete semantics)
- Different cap logic (500 per buyer FIFO)
- Easier to reason about without entangling unrelated notifications

Bell icon aggregates both tables for display.

---

## UI surfaces

### Creator side (`/dashboard/broadcasts`)

**List page** — table columns:
- Title / snippet
- Template tag
- Audience (All followers / Subscribers only)
- Sent date
- Reach (number of recipients)
- Opens (readAt count)
- Delete button

Navigation: new sidebar item "Broadcasts" with megaphone icon.

**Compose page** (`/dashboard/broadcasts/new`):

1. Template tile picker (6 tiles with thumbnails):
   - NEW_DROP
   - FLASH_SALE
   - BEHIND_SCENES
   - EVENT
   - THANK_YOU
   - MILESTONE

2. Slot-fill form:
   - Title (required, 60 char)
   - Body (required, 500 char)
   - Hero image upload (optional, max 2MB, auto-resize 1600×900, auto-WebP)
   - CTA text + URL (optional, URL validated)

3. Audience radio:
   - `All followers (N reach)`
   - `Subscribers only (M reach)`

4. Live preview panel (right side) showing exactly what buyer sees.

5. Submit → fan-out → redirect to list page.

**Design constraints (lock these):**
- No font picker, no color picker, no alignment toggles
- One template = one layout, fixed
- Creator cannot input raw HTML anywhere (strip on submit)

### Buyer side (`/account/updates`)

**Feed page** — reverse-chronological list of broadcasts from creators they follow:
- Creator avatar + name
- Title (bold if unread)
- Snippet of body
- Timestamp
- Unread dot on unseen
- Per-row `•••` menu: `Mute broadcasts from [creator]` / `Delete this broadcast` (own copy only)

Pagination: 50 per page with "Load more" or infinite scroll.
Bottom nudge when cap reached: *"Showing most recent 500 updates."*

Navigation: new buyer sidebar item "Updates" with megaphone icon.

### Broadcast detail page (`/broadcasts/[id]` — shared entry point)

Accessible from bell notification, Updates feed, and future email CTA:
- Creator avatar + name + follow status
- Title
- Hero image
- Body
- CTA button (if creator added one)
- "More from [creator]" — 3–4 recent products/works
- Discrete "Back to updates" link
- Marks notification as read on load

### Manage subscriptions page (`/account/subscriptions`)

Table of all creators the buyer follows:

| Creator | Status | Notifications | Action |
|---|---|---|---|
| Jane Creator | Subscriber · 47 days left | [🔔 On] | [Unfollow] |
| Bob Creator | Follower | [🔕 Off] | [Unfollow] |

Bell toggle flips `broadcastMuted`. Unfollow deletes `CreatorFollow` row.

### Bell notification integration

New notification kind: `BROADCAST_RECEIVED`
Teaser: `📣 [Creator Name] just posted an update · [relative time]`
Click → `/broadcasts/[id]` detail page

### Creator profile page changes

- Existing follow button stays (`Follow` / `Following`)
- New button: `Support — from $1` (donation CTA, grants subscriber status on success)
- No separate "Subscribe" button — subscription is earned via donation
- Status indicator for logged-in buyer:
  - *"You're following"* (follower only)
  - *"Subscriber — 47 days left"* (counting down)
  - *"Renew your support to stay subscribed"* when <14 days remaining

---

## Broadcast send flow

1. Creator submits compose form
2. Validate: rate limits, image size, URL allowlist, content (no angle brackets, length caps)
3. Upload hero image to R2 (if any) — key format: `broadcasts/{creatorId}/{broadcastId}.webp`
4. Create `Broadcast` row
5. Fan-out query:
   ```sql
   -- for audience = ALL_FOLLOWERS
   INSERT INTO BroadcastNotification (broadcastId, recipientId)
   SELECT :broadcastId, buyerId
   FROM CreatorFollow
   WHERE creatorId = :creatorId AND broadcastMuted = false

   -- for audience = SUBSCRIBERS_ONLY, additionally:
   AND buyerId IN (
     SELECT DISTINCT buyerId FROM Donation
     WHERE creatorId = :creatorId
       AND createdAt > NOW() - INTERVAL '90 days'
   )
   ```
6. For each recipient, enforce FIFO cap:
   ```sql
   DELETE FROM BroadcastNotification
   WHERE recipientId = :userId
     AND id NOT IN (
       SELECT id FROM BroadcastNotification
       WHERE recipientId = :userId
       ORDER BY createdAt DESC
       LIMIT 500
     )
   ```
7. Return `{ reach: N, broadcastId }` to creator

---

## Scalability notes — fan-out burst is the real pressure, not retention

Cutting retention (30d) and cap (500) halves the steady-state table size. But the pressure point at scale isn't **how much** data lives — it's the **burst write amplification** when a creator with many followers sends a broadcast.

### Fan-out write amplification

One broadcast to N followers = N `INSERT` rows into `BroadcastNotification`, written in the single request handling the compose. A creator with 10,000 followers triggers 10,000 inserts before the compose response returns. That's the scaling failure mode.

**Tiered strategy by follower count:**

| Follower count | Strategy |
|---|---|
| < 1,000 | Inline fan-out in the compose request, batched `INSERT ... VALUES (...), (...), ...` (up to 500 per batch). Fast enough. |
| 1,000 – 10,000 | Inline fan-out still, but batched more aggressively (500/batch). Monitor p95 latency. |
| > 10,000 | **Async fan-out** via a queued job. Compose returns immediately after writing the `Broadcast` row + enqueueing the fan-out task. Queue worker writes `BroadcastNotification` rows in chunks. |

For MVP: **inline fan-out up to 10,000 followers is fine.** Add async queueing later only if creators push past that.

### Image serving bandwidth

If 10,000 followers all click through to the same broadcast detail page, that's 10,000 image loads. To prevent Vercel bandwidth burn:

- Serve hero images **directly from R2 public URL**, not proxied through Next.js `/api/image`.
- Use Cloudflare's cache in front of R2 (`cache-control: public, max-age=31536000, immutable`) — broadcasts are created-once, never edited, so permanent caching is safe.
- Image keys should include a content hash (`broadcasts/{creatorId}/{broadcastId}.webp` is fine since broadcastId is unique and immutable).

### FIFO cap cost

The 500-cap DELETE runs per recipient per broadcast — that's a DELETE query multiplied by follower count. At scale this dominates the fan-out cost.

**Mitigation:** don't run the FIFO trim on every insert. Run it opportunistically:
- On the insert path, only trim if recipient already has > 500 rows (cheap COUNT check, indexed)
- Or move trim to the daily retention cron entirely — cap enforcement becomes "best-effort, eventually consistent." A buyer might briefly see 510 broadcasts before the next cron run. Fine.

### Revised steady-state math

Under the new 30d / 500 cap (avg 4 broadcasts/creator/month, 100 followers each):
- 10k creators × 4/month × 100 followers × 1 month retention = **4M rows steady state** (~4GB)
- Down from 128M rows in the original 60d/1000 plan (~128GB)

That's a 32× reduction. **User is right — tightening these pays off significantly.**

---

## Retention & cleanup

**New cron:** `/api/cron/broadcast-retention` (schedule: `0 6 * * *` daily)

Two sweeps:

1. **Broadcast purge** — broadcasts older than 30 days:
   ```sql
   SELECT * FROM Broadcast WHERE createdAt < NOW() - INTERVAL '30 days'
   ```
   For each:
   - Delete R2 image (if imageKey present)
   - Delete broadcast row (cascades notifications)

2. **Orphan notification cleanup** — safety net: any BroadcastNotification rows older than 30 days not already cascaded.

Add to `vercel.json`:
```json
{ "path": "/api/cron/broadcast-retention", "schedule": "0 6 * * *" }
```

---

## Rate limits & guardrails

### Creator compose

| Limit | Value |
|---|---|
| Broadcasts per creator per day | 3 |
| Broadcasts per creator per month | 30 |
| Title length | 60 chars |
| Body length | 500 chars |
| Image size | 2MB raw |
| Image dimensions | auto-resize to max 1600×900 |
| Image format | auto-convert to WebP |
| CTA URL | must be on `noizu.direct` or allowlisted creator domain |
| HTML input | stripped on submit (plain text only) |

Enforcement live via a helper (`canCreatorBroadcast(creatorId)`) returning `{ allowed, reason }` — reused by compose route and UI preview.

### Buyer inbox

| Limit | Value |
|---|---|
| Max retained broadcasts | 500 per buyer (FIFO) |
| Auto-purge | 30 days |
| Rate limit on reads | None |
| Follow count cap | 2,000 creators per buyer (prevents follow-spam) |

---

## Build chunks (execution order)

### Chunk 1 — Schema + prerequisites (~1 day)

- [ ] Verify `Donation` / `Tip` model does NOT already exist in schema
- [ ] Verify `CreatorFollow` does NOT already exist
- [ ] Add `CreatorFollow`, `Donation`, `Broadcast`, `BroadcastNotification` models
- [ ] Add enums `BroadcastTemplate`, `BroadcastAudience`
- [ ] Run migration
- [ ] Add helper `lib/broadcasts.ts` with:
  - `canCreatorBroadcast(creatorId)` — rate limit check
  - `isSubscriber(buyerId, creatorId)` — 90-day donation window check
  - `getAudienceCount(creatorId, audience)` — preview count
  - `createBroadcast(args)` — full send with fan-out
  - `enforceFifoCap(userId)` — trims to 500

### Chunk 2 — Creator compose + send (~2 days)

- [ ] `/api/broadcasts` POST endpoint (compose, validate, send)
- [ ] `/api/broadcasts/[id]` DELETE endpoint (hard delete + R2 cleanup)
- [ ] `/dashboard/broadcasts/page.tsx` — list page
- [ ] `/dashboard/broadcasts/new/page.tsx` — compose UI
- [ ] 6 template components with locked designs
- [ ] Client-side image compress before upload
- [ ] Add "Broadcasts" nav item to creator dashboard

### Chunk 3 — Buyer feed + detail (~1 day)

- [ ] `/account/updates/page.tsx` — feed page
- [ ] `/broadcasts/[id]/page.tsx` — detail page (shared by buyer clicks from bell or feed)
- [ ] `/account/subscriptions/page.tsx` — manage follows/mute page
- [ ] `/api/broadcasts/[id]/read` POST — mark notification as read
- [ ] `/api/follows/[creatorId]/mute` PATCH — toggle broadcast mute
- [ ] `/api/follows/[creatorId]` DELETE — unfollow
- [ ] Add "Updates" nav item to buyer account sidebar
- [ ] Bell integration: surface `BROADCAST_RECEIVED` alongside existing notifications

### Chunk 4 — Retention cron + polish (~0.5 day)

- [ ] `/api/cron/broadcast-retention/route.ts`
- [ ] Add entry to `vercel.json`
- [ ] R2 batch delete helper if not already present
- [ ] Dry-run GET mode for admin preview

### Chunk 5 — Donation prerequisite flow (~2–3 days)

> If Donation model doesn't exist, this chunk becomes a blocker for subscriber-tier broadcasts.

- [ ] Airwallex donation checkout flow (reuse existing order patterns)
- [ ] `/creators/[username]/support` page with amount picker
- [ ] Webhook to create `Donation` row on successful payment
- [ ] Update creator profile to show `Support` button
- [ ] Subscriber countdown display on profile

**Note:** Chunks 1–4 are buildable without Chunk 5 — the `SUBSCRIBERS_ONLY` audience just yields 0 recipients until donations exist. Ship 1–4 first, add 5 when ready.

**Total:** ~5–7 days for broadcasts core (1–4), +2–3 days for donation prerequisite.

---

## Open questions to confirm before starting

1. **Does `Donation` or equivalent model already exist?** (Grep the schema)
2. **Does a creator `Follow` relationship already exist?** (Check `CreatorFollow`, `UserFollow`, `Subscription` models)
3. **Is there an existing `avatar` / creator profile page route we're extending, or a new one?**
4. **Should the creator profile `Support` button use Airwallex (existing order infra) or something else?**
5. **Do we want the broadcast detail page to require login, or be publicly viewable (shareable)?** Default: require login, matches private-inbox feel.

---

## Session resume checklist

When user says "InApp" in a fresh session:

1. Read this file in full
2. Run the three "Open questions" verifications (Donation model, follow model, profile route)
3. Report findings and confirm starting chunk
4. Start Chunk 1 (schema + helpers)
5. Before any migration: user approval on exact schema

---

## Files expected to be created/modified

**New files:**
- `prisma/schema.prisma` — append new models
- `prisma/migrations/*/migration.sql` — generated
- `src/lib/broadcasts.ts`
- `src/app/api/broadcasts/route.ts`
- `src/app/api/broadcasts/[id]/route.ts`
- `src/app/api/broadcasts/[id]/read/route.ts`
- `src/app/api/follows/[creatorId]/route.ts`
- `src/app/api/follows/[creatorId]/mute/route.ts`
- `src/app/api/cron/broadcast-retention/route.ts`
- `src/app/dashboard/broadcasts/page.tsx`
- `src/app/dashboard/broadcasts/new/page.tsx`
- `src/app/account/updates/page.tsx`
- `src/app/account/subscriptions/page.tsx`
- `src/app/broadcasts/[id]/page.tsx`
- `src/components/broadcasts/TemplatePicker.tsx`
- `src/components/broadcasts/ComposeForm.tsx`
- `src/components/broadcasts/BroadcastPreview.tsx`
- `src/components/broadcasts/templates/*.tsx` (6 files)

**Modified:**
- `vercel.json` — add cron entry
- Creator profile page — add Support button + subscriber countdown
- Navbar / creator dashboard sidebar — add Broadcasts nav item
- Buyer account sidebar — add Updates nav item
- Bell notification component — include broadcast kind

---

*End of plan. Resume with the word `InApp`.*
