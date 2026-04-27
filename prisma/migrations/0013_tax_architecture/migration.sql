-- Tax Architecture (2026-04-27).
--
-- Adds the schema fields the tax-architecture design depends on:
--   * CreatorProfile: classification, onboarding ack, opt-in sales-tax fields
--   * Order:          creator-country snapshot, creator sales tax, platform-fee tax
--   * PlatformSettings: per-country platform-fee-tax config (JSON)
--   * CreatorWaitlist: new model for not-yet-supported countries
--
-- All additions are nullable / defaulted — no data backfill required, no
-- destructive change. Existing rows continue to compute the same way until
-- downstream phases start writing to these columns.
--
-- Phasing reference: docs/superpowers/specs/2026-04-27-tax-architecture-design.md §5

-- ── CreatorProfile additions ───────────────────────────────────────────────
ALTER TABLE "CreatorProfile" ADD COLUMN "creatorClassification" TEXT;
ALTER TABLE "CreatorProfile" ADD COLUMN "taxOnboardingAcknowledgedAt" TIMESTAMP(3);
ALTER TABLE "CreatorProfile" ADD COLUMN "taxOnboardingTosVersion" TEXT;
ALTER TABLE "CreatorProfile" ADD COLUMN "collectsSalesTax" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CreatorProfile" ADD COLUMN "salesTaxRate" DOUBLE PRECISION;
ALTER TABLE "CreatorProfile" ADD COLUMN "salesTaxLabel" TEXT;
ALTER TABLE "CreatorProfile" ADD COLUMN "salesTaxStatus" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "CreatorProfile" ADD COLUMN "salesTaxApprovedAt" TIMESTAMP(3);
ALTER TABLE "CreatorProfile" ADD COLUMN "salesTaxApprovedBy" TEXT;
ALTER TABLE "CreatorProfile" ADD COLUMN "salesTaxCertificateUrl" TEXT;

-- ── Order additions ────────────────────────────────────────────────────────
ALTER TABLE "Order" ADD COLUMN "creatorCountry" TEXT;
ALTER TABLE "Order" ADD COLUMN "creatorSalesTaxAmountUsd" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "creatorSalesTaxRatePercent" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN "creatorSalesTaxLabel" TEXT;
ALTER TABLE "Order" ADD COLUMN "platformFeeBuyerTaxUsd" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "platformFeeBuyerTaxRate" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN "platformFeeCreatorTaxUsd" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "platformFeeCreatorTaxRate" DOUBLE PRECISION;

-- ── PlatformSettings additions ─────────────────────────────────────────────
ALTER TABLE "PlatformSettings" ADD COLUMN "platformFeeTax" TEXT NOT NULL DEFAULT '{}';

-- ── CreatorWaitlist new table ──────────────────────────────────────────────
CREATE TABLE "CreatorWaitlist" (
  "id"         TEXT NOT NULL,
  "email"      TEXT NOT NULL,
  "country"    TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notifiedAt" TIMESTAMP(3),
  CONSTRAINT "CreatorWaitlist_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CreatorWaitlist_country_idx" ON "CreatorWaitlist"("country");
