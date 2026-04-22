-- 0002_audit_indexes: indexes surfaced by 2026-04-21 codebase audit.
--
-- Rationale:
-- * Order.airwallexIntentId — webhook lookup by intent on every payment event.
-- * Order.escrowAutoReleaseAt — cron scan for orders due for auto-release.
-- * Order.(status, createdAt) — admin/order list filtering and buyer history.
-- * Order.(buyerId, createdAt) / (creatorId, status) — dashboard pages.
-- * User.role / accountStatus / creatorVerificationStatus — admin filters.
-- * Conversation.lastMessageAt and composite user indexes — inbox ordering.
--
-- All indexes are CONCURRENT-safe when applied against Postgres in production,
-- but Prisma emits non-concurrent CREATE INDEX statements. Run during a low
-- traffic window. On Supabase the MV locks are short for tables at current
-- scale (< 100k rows).

CREATE INDEX IF NOT EXISTS "Order_airwallexIntentId_idx"    ON "Order" ("airwallexIntentId");
CREATE INDEX IF NOT EXISTS "Order_escrowAutoReleaseAt_idx"  ON "Order" ("escrowAutoReleaseAt");
CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx"     ON "Order" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_buyerId_createdAt_idx"    ON "Order" ("buyerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_creatorId_status_idx"     ON "Order" ("creatorId", "status");

CREATE INDEX IF NOT EXISTS "User_role_idx"                       ON "User" ("role");
CREATE INDEX IF NOT EXISTS "User_accountStatus_idx"              ON "User" ("accountStatus");
CREATE INDEX IF NOT EXISTS "User_creatorVerificationStatus_idx"  ON "User" ("creatorVerificationStatus");

CREATE INDEX IF NOT EXISTS "Conversation_lastMessageAt_idx"           ON "Conversation" ("lastMessageAt");
CREATE INDEX IF NOT EXISTS "Conversation_buyerId_lastMessageAt_idx"   ON "Conversation" ("buyerId", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "Conversation_creatorId_lastMessageAt_idx" ON "Conversation" ("creatorId", "lastMessageAt");
