-- 0007_in_app_broadcasts
-- Adds in-app creator → follower broadcast system. No email. See plan:
-- docs/superpowers/plans/2026-04-24-in-app-broadcasts.md

-- 1. Extend CreatorFollow with broadcast mute toggle.
ALTER TABLE "CreatorFollow" ADD COLUMN "notifyBroadcast" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "CreatorFollow_creatorId_notifyBroadcast_idx" ON "CreatorFollow"("creatorId", "notifyBroadcast");

-- 2. Broadcast enums.
CREATE TYPE "BroadcastTemplate" AS ENUM ('NEW_DROP', 'FLASH_SALE', 'BEHIND_SCENES', 'EVENT', 'THANK_YOU', 'MILESTONE');
CREATE TYPE "BroadcastAudience" AS ENUM ('ALL_FOLLOWERS', 'SUBSCRIBERS_ONLY');

-- 3. Broadcast — one row per send. creatorId → CreatorProfile.id.
CREATE TABLE "Broadcast" (
  "id"        TEXT PRIMARY KEY,
  "creatorId" TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "imageKey"  TEXT,
  "ctaText"   TEXT,
  "ctaUrl"    TEXT,
  "template"  "BroadcastTemplate" NOT NULL,
  "audience"  "BroadcastAudience" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Broadcast_creatorId_createdAt_idx" ON "Broadcast"("creatorId", "createdAt");
CREATE INDEX "Broadcast_createdAt_idx"           ON "Broadcast"("createdAt");

ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. BroadcastNotification — fan-out row per recipient. recipientId → User.id.
CREATE TABLE "BroadcastNotification" (
  "id"          TEXT PRIMARY KEY,
  "broadcastId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "readAt"      TIMESTAMP(3),
  "deletedAt"   TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "BroadcastNotification_broadcastId_recipientId_key" ON "BroadcastNotification"("broadcastId", "recipientId");
CREATE INDEX "BroadcastNotification_recipientId_createdAt_idx"         ON "BroadcastNotification"("recipientId", "createdAt");
CREATE INDEX "BroadcastNotification_recipientId_readAt_idx"            ON "BroadcastNotification"("recipientId", "readAt");

ALTER TABLE "BroadcastNotification" ADD CONSTRAINT "BroadcastNotification_broadcastId_fkey"
  FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BroadcastNotification" ADD CONSTRAINT "BroadcastNotification_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
