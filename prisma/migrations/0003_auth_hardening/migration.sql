-- 0003_auth_hardening: session-invalidation + Google-link hardening.
--
-- Rationale (see graphify-out/PENTEST-AUTH.md):
-- * User.tokenVersion — bumped on password change/reset, role demotion,
--   soft-delete, admin suspension. NextAuth `jwt` callback compares the
--   token's embedded version against this column and rejects stale
--   tokens, so every live session is invalidated on bump. Fixes C4 + M12.
-- * User.emailVerified — gates the Google OAuth silent account-link
--   guard (C3). An existing credentials row with a password set and a
--   null emailVerified refuses to attach a Google identity, so the
--   pre-register-victim-email attack no longer grants takeover. Reset
--   password flow + successful Google sign-in both stamp this column.
--
-- Both columns default so the migration is safe against populated tables.
-- DO NOT run `migrate deploy` from this agent — hand off to the
-- maintainer per the auth-batch instructions.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "tokenVersion"  INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3);
