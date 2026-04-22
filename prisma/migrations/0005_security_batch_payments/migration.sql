-- 0005_security_batch_payments
--
-- Adds columns/tables required by the payments-batch security fix
-- (F3, F4, F9 — webhook replay protection, payout cooldown/audit,
-- chargeback-aware payout):
--
--   - ProcessedWebhookEvent: Airwallex event-id dedupe so a replayed
--     (body + signature) pair is a no-op. UNIQUE on airwallexEventId.
--
--   - PayoutSettingChange: audit trail + 48h cooldown when a creator
--     rotates their payout destination. Payout cron reads this and
--     only uses the new beneficiary after activatesAt has passed,
--     giving the real account owner a window to revoke an ATO.
--
--   - Transaction.payoutBlocked / payoutBlockReason: set by the
--     payment.dispute.created webhook when a chargeback fires *after*
--     the transaction is already COMPLETED, so the payout cron
--     excludes the amount from the creator's available balance until
--     the dispute resolves.
--
-- Safe to run in-place against existing data. No destructive
-- operations. IF NOT EXISTS guards everywhere so the migration is
-- idempotent.

ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "payoutBlocked" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "payoutBlockReason" TEXT;

CREATE INDEX IF NOT EXISTS "Transaction_payoutBlocked_idx"
  ON "Transaction" ("payoutBlocked");

CREATE TABLE IF NOT EXISTS "ProcessedWebhookEvent" (
  "id"                TEXT         NOT NULL,
  "airwallexEventId"  TEXT         NOT NULL,
  "eventName"         TEXT,
  "processedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProcessedWebhookEvent_airwallexEventId_key"
  ON "ProcessedWebhookEvent" ("airwallexEventId");

CREATE INDEX IF NOT EXISTS "ProcessedWebhookEvent_processedAt_idx"
  ON "ProcessedWebhookEvent" ("processedAt");

CREATE TABLE IF NOT EXISTS "PayoutSettingChange" (
  "id"                   TEXT         NOT NULL,
  "userId"               TEXT         NOT NULL,
  "previousPayoutMethod" TEXT,
  "newPayoutMethod"      TEXT         NOT NULL,
  "newPayoutDetails"     TEXT         NOT NULL,
  "newBeneficiaryId"     TEXT,
  "newPayoutCountry"     TEXT,
  "newPayoutCurrency"    TEXT,
  "activatesAt"          TIMESTAMP(3) NOT NULL,
  "appliedAt"            TIMESTAMP(3),
  "revokedAt"            TIMESTAMP(3),
  "ipAddress"            TEXT,
  "userAgent"            TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PayoutSettingChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PayoutSettingChange_userId_activatesAt_idx"
  ON "PayoutSettingChange" ("userId", "activatesAt");

CREATE INDEX IF NOT EXISTS "PayoutSettingChange_appliedAt_idx"
  ON "PayoutSettingChange" ("appliedAt");
