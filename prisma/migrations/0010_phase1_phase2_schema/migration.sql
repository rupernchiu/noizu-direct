-- Phase 1 + Phase 2 schema additions (2026-04-25 follow-up to 433a5ca).
--
-- Splits into the following functional groups:
--   • PlatformSettings — clawback exposure window + tax engine config
--   • CreatorProfile   — SWIFT corridor + creator personal-tax (Layer 1)
--   • User             — B2B reverse-charge tax ID (Layer 2)
--   • Order            — destination + creator tax snapshot, download cap
--   • Transaction      — destination + creator tax cents, reverse-charge flag
--   • DownloadAccessLog (NEW) — anti-fraud download audit trail
--
-- Additive only: no data loss risk. Run `npx prisma migrate deploy` to apply.

-- ── PlatformSettings ─────────────────────────────────────────────────────────
ALTER TABLE "PlatformSettings"
  ADD COLUMN "clawbackExposureWindowDays" INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN "taxDestinationCountries" TEXT NOT NULL DEFAULT '{}',
  ADD COLUMN "defaultCreatorTaxRatePercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- ── CreatorProfile ───────────────────────────────────────────────────────────
ALTER TABLE "CreatorProfile"
  ADD COLUMN "payoutRail" TEXT NOT NULL DEFAULT 'LOCAL',
  ADD COLUMN "swiftBankName" TEXT,
  ADD COLUMN "swiftBankCode" TEXT,
  ADD COLUMN "swiftIntermediaryFeeUsd" INTEGER,
  ADD COLUMN "taxRegistered" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "taxId" TEXT,
  ADD COLUMN "taxRatePercent" DOUBLE PRECISION,
  ADD COLUMN "taxJurisdiction" TEXT;

-- ── User (B2B reverse-charge) ────────────────────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN "businessTaxId" TEXT,
  ADD COLUMN "businessTaxCountry" TEXT;

-- ── Order — tax snapshot + download cap ──────────────────────────────────────
ALTER TABLE "Order"
  ADD COLUMN "destinationTaxAmountUsd" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "destinationTaxRatePercent" DOUBLE PRECISION,
  ADD COLUMN "destinationTaxCountry" TEXT,
  ADD COLUMN "creatorTaxAmountUsd" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "creatorTaxRatePercent" DOUBLE PRECISION,
  ADD COLUMN "reverseChargeApplied" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "buyerBusinessTaxId" TEXT,
  ADD COLUMN "maxDownloadsAllowed" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "downloadCapReachedAt" TIMESTAMP(3);

-- ── Transaction — tax breakdown ──────────────────────────────────────────────
ALTER TABLE "Transaction"
  ADD COLUMN "destinationTaxUsd" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "creatorTaxUsd" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reverseCharge" BOOLEAN NOT NULL DEFAULT false;

-- ── DownloadAccessLog (NEW) ──────────────────────────────────────────────────
CREATE TABLE "DownloadAccessLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "outcome" TEXT NOT NULL,
    "bytesServed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DownloadAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DownloadAccessLog_orderId_createdAt_idx" ON "DownloadAccessLog"("orderId", "createdAt");
CREATE INDEX "DownloadAccessLog_ipAddress_createdAt_idx" ON "DownloadAccessLog"("ipAddress", "createdAt");
CREATE INDEX "DownloadAccessLog_outcome_createdAt_idx" ON "DownloadAccessLog"("outcome", "createdAt");
