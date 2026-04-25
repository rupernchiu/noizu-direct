-- 0008_fee_model_5_5_8
-- Phase 0.1 of fee/tax/fraud roadmap (memory: project_fee_tax_fraud_model.md).
-- Switches the platform from a flat 2.5% buyer fee to a rail-aware
-- 5 / 5.5 / 8 model: 5% creator commission, 5.5% buyer fee on local rails
-- (FPX/PayNow/GCash/etc), 8% buyer fee on cards.
--
-- Backward-compatible: legacy orders with NULL paymentRail continue to be
-- read by the old `processingFeePercent` (2.5) helper.

-- 1. PlatformSettings: configurable rates so finance can tune without redeploy.
ALTER TABLE "PlatformSettings"
  ADD COLUMN "creatorCommissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
  ADD COLUMN "buyerFeeLocalPercent"     DOUBLE PRECISION NOT NULL DEFAULT 5.5,
  ADD COLUMN "buyerFeeCardPercent"      DOUBLE PRECISION NOT NULL DEFAULT 8.0;

-- 2. Order: snapshot rail + breakdown at intent-creation time so the webhook
--    and payouts reproduce the exact split even if rates change later.
ALTER TABLE "Order"
  ADD COLUMN "paymentRail"          TEXT,
  ADD COLUMN "subtotalUsd"          INTEGER,
  ADD COLUMN "buyerFeeUsd"          INTEGER,
  ADD COLUMN "creatorCommissionUsd" INTEGER,
  ADD COLUMN "buyerCountry"         TEXT;

-- Per-country GMV tally relies on (buyerCountry, createdAt, status). Index for
-- the threshold dashboard (MY SST 500k, SG GST 100k, ID PPN 600M, TH VAT 1.8M,
-- PH VAT 3M) — see Phase 1 tax engine roadmap.
CREATE INDEX "Order_buyerCountry_createdAt_idx" ON "Order"("buyerCountry", "createdAt");
CREATE INDEX "Order_paymentRail_idx" ON "Order"("paymentRail");

-- 3. Transaction: same breakdown survives into the audit/payout layer.
ALTER TABLE "Transaction"
  ADD COLUMN "paymentRail"          TEXT,
  ADD COLUMN "subtotalUsd"          INTEGER,
  ADD COLUMN "buyerFeeUsd"          INTEGER,
  ADD COLUMN "creatorCommissionUsd" INTEGER,
  ADD COLUMN "buyerCountry"         TEXT;

CREATE INDEX "Transaction_buyerCountry_createdAt_idx" ON "Transaction"("buyerCountry", "createdAt");
CREATE INDEX "Transaction_paymentRail_idx" ON "Transaction"("paymentRail");
