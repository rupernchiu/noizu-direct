-- 0003_security_batch_uploads
--
-- Adds columns/tables required by the upload-batch security fix (C1/C2/H5/H6/H7/H8/H11/H14 + M17–M20):
--   • Order.downloadCount — per-token cap for H11 so a leaked 30-day token
--     can't be replayed indefinitely.
--   • KycUpload — H6 upload→userId binding. /api/upload writes a row when it
--     stores an identity file; /api/creator/apply looks up by id and verifies
--     the submitting user matches.
--
-- Safe to run in-place against existing data. No destructive operations.

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "downloadCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "KycUpload" (
  "id"         TEXT        NOT NULL,
  "userId"     TEXT        NOT NULL,
  "category"   TEXT        NOT NULL,
  "r2Key"      TEXT        NOT NULL,
  "viewerUrl"  TEXT        NOT NULL,
  "mimeType"   TEXT,
  "fileSize"   INTEGER,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KycUpload_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "KycUpload_userId_category_createdAt_idx"
  ON "KycUpload" ("userId", "category", "createdAt");
