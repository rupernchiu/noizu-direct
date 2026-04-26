-- Shipping costs (sprint shipping-1, 2026-04-26).
--
-- Plumbing-only shipping fees: creators set per-country rates, platform passes
-- the full amount through to the creator at payout (no fee, no markup, no tax).
-- Lead-time fields (CreatorPodProvider/Product shippingMY/SG/PH/Intl) are
-- preserved unchanged — those are *days*, not cost.
--
-- Storage layout:
--   • CreatorProfile.shippingByCountry  — JSON: { [iso2|"ROW"]: usdCents }
--   • Product.shippingByCountry         — same shape; null = inherit creator
-- Snapshot:
--   • Order.shippingCostUsd             — frozen at intent creation
--   • Transaction.shippingCostUsd       — mirrored at webhook time
--
-- Additive only. No data loss.

-- ── CreatorProfile ──────────────────────────────────────────────────────────
ALTER TABLE "CreatorProfile"
  ADD COLUMN "shippingByCountry" TEXT,
  ADD COLUMN "shippingFreeThresholdUsd" INTEGER,
  ADD COLUMN "combinedShippingEnabled" BOOLEAN NOT NULL DEFAULT true;

-- ── Product (per-listing override) ──────────────────────────────────────────
ALTER TABLE "Product"
  ADD COLUMN "shippingByCountry" TEXT,
  ADD COLUMN "shippingFreeThresholdUsd" INTEGER;

-- ── Order (snapshot) ────────────────────────────────────────────────────────
ALTER TABLE "Order"
  ADD COLUMN "shippingCostUsd" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "shippingDestinationCountry" TEXT,
  ADD COLUMN "shippingFreeApplied" BOOLEAN NOT NULL DEFAULT false;

-- ── Transaction (pass-through to creator) ───────────────────────────────────
ALTER TABLE "Transaction"
  ADD COLUMN "shippingCostUsd" INTEGER NOT NULL DEFAULT 0;
