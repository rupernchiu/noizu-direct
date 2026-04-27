-- Shipping V2: per-product-only model (2026-04-27).
--
-- Replaces shipping-1's creator-default + per-listing-override hierarchy with
-- per-product rates as the only source of truth. Free-shipping threshold and
-- combined-cart toggle stay creator-level (cart-level concepts).
--
-- Steps:
--   1. Backfill: copy CreatorProfile.shippingByCountry into every PHYSICAL/POD
--      product where Product.shippingByCountry IS NULL — preserves runtime
--      behavior for already-published listings that relied on the fallback.
--   2. Drop Product.shippingFreeThresholdUsd — free threshold is creator-level.
--   3. CreatorProfile.shippingByCountry stays nullable in the schema but is no
--      longer read at runtime (soft-deprecated; kept as a safety net + for the
--      Phase-3d UX that lets creators bulk-apply a starting-point map).

-- ── 1. Backfill product shipping from creator default ──────────────────────
UPDATE "Product" p
SET "shippingByCountry" = cp."shippingByCountry"
FROM "CreatorProfile" cp
WHERE p."creatorId" = cp."id"
  AND p."type" IN ('PHYSICAL', 'POD')
  AND p."shippingByCountry" IS NULL
  AND cp."shippingByCountry" IS NOT NULL;

-- ── 2. Drop per-product free-ship threshold (creator-level only now) ───────
ALTER TABLE "Product" DROP COLUMN "shippingFreeThresholdUsd";
