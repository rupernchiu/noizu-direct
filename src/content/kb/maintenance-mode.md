---
title: Maintenance mode
description: How to enable site-wide maintenance without locking yourself out.
---

## What it does

When `platform:maintenance` is `true` in Upstash Redis, every public request gets rewritten to `/maintenance`. Admin routes (and a small bypass list) continue to work so you can flip the flag back off.

## How to flip it

### Enable

1. Go to `/admin/settings`.
2. Toggle "Maintenance mode" → ON.
3. Wait up to 30 seconds for the per-isolate cache to expire (configurable, currently `MAINTENANCE_TTL_MS = 30_000` in `src/middleware.ts`).
4. Confirm by hitting any non-bypass URL in incognito.

### Disable

1. Go to `/admin/settings`.
2. Toggle "Maintenance mode" → OFF.
3. Same cache delay applies.

## What stays accessible during maintenance

The bypass list lives in `src/middleware.ts` as `MAINTENANCE_BYPASS`:

- `/maintenance` — the maintenance page itself
- `/admin` — main admin panel
- `/staff` — staff login (this is the one that saved us during the 2026-04-22 incident)
- `/api/` — all API routes (so admin tools, webhooks, payment confirmations keep working)
- `/_next/`, `/favicon`, `/uploads`, `/fonts`, `/images`, `/icons` — assets

**Do not remove `/staff` from the bypass list.** Without it, a wrong-toggle locks admins out of the toggle.

## Break-glass (if Redis is down or you locked yourself out)

If you can't reach the admin UI to flip the flag:

1. **Hit `/staff/login` directly** — it's in the bypass list, you can still log in.
2. From there, navigate to `/admin/settings` (admin URLs bypass too).
3. If the toggle isn't responsive, manually delete the Redis key:

   ```bash
   curl -X DELETE \
     -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
     "$UPSTASH_REDIS_REST_URL/del/platform:maintenance"
   ```

4. Within 30 seconds the per-isolate cache expires and the site returns.

## Maintenance during deploys

Vercel deploys are zero-downtime; you don't need maintenance mode for routine deploys. Use it for:

- Database schema changes that briefly break read paths.
- PSP migration windows.
- Disaster recovery / rollback windows.
- Pre-announced "we're taking the site down for X hours" events.

## What the user sees

`/maintenance` is a static page (no DB hits, no auth) showing:
- Friendly explanation
- Estimated time back (admin-configurable via the same settings panel)
- Status link (Twitter / status page) if applicable

## Why we built it this way

- **Redis flag, not env var:** flippable without redeploy.
- **30-second TTL, not infinite cache:** balances toggling speed vs. Redis load.
- **Per-isolate memo, not request-scoped:** survives serverless function reuse efficiently.
- **Bypass list in code, not config:** prevents footguns where a bad config locks everyone out — bypass paths are defined statically and tested.

## Past incident

> **2026-04-22:** maintenance flag accidentally set to `true` in production. Admin login via `/admin/login` failed because `/admin/login` route was redirecting to `/maintenance` before the bypass evaluated. Discovered admin login actually lives at `/staff/login` and added it to bypass. Fix shipped same day.

This is why `/staff` is now hardcoded into the bypass list and why this doc emphasizes **don't remove it.**
