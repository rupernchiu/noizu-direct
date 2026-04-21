// Direct DDL for savepoint-P5: commission requests/quotes/milestones + storage plans.
// Runs each statement independently; re-entrant via IF NOT EXISTS guards.
// Use: DATABASE_URL=... npx tsx scripts/migrate-p5.ts

import 'dotenv/config'
import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL,
})

const statements: { sql: string; name: string }[] = [
  // ── User: storage plan columns ───────────────────────────────────────────────
  { name: 'User.storagePlan',         sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "storagePlan" TEXT NOT NULL DEFAULT 'FREE'` },
  { name: 'User.storagePlanRenewsAt', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "storagePlanRenewsAt" TIMESTAMP(3)` },
  { name: 'User.storageBonusMb',      sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "storageBonusMb" INTEGER NOT NULL DEFAULT 0` },
  { name: 'User.storageOverageBytes', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "storageOverageBytes" BIGINT NOT NULL DEFAULT 0` },

  // ── Order: quote + milestone flags ───────────────────────────────────────────
  { name: 'Order.commissionQuoteId',          sql: `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "commissionQuoteId" TEXT` },
  { name: 'Order.commissionIsMilestoneBased', sql: `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "commissionIsMilestoneBased" BOOLEAN NOT NULL DEFAULT false` },
  { name: 'Order.commissionQuoteId.unique',   sql: `CREATE UNIQUE INDEX IF NOT EXISTS "Order_commissionQuoteId_key" ON "Order"("commissionQuoteId")` },

  // ── EscrowTransaction: milestoneId ───────────────────────────────────────────
  { name: 'EscrowTransaction.milestoneId', sql: `ALTER TABLE "EscrowTransaction" ADD COLUMN IF NOT EXISTS "milestoneId" TEXT` },

  // ── StoragePricingConfig: add new columns ────────────────────────────────────
  { name: 'SPC.creatorPlanGb',         sql: `ALTER TABLE "StoragePricingConfig" ADD COLUMN IF NOT EXISTS "creatorPlanGb" INTEGER NOT NULL DEFAULT 25` },
  { name: 'SPC.creatorPlanPriceCents', sql: `ALTER TABLE "StoragePricingConfig" ADD COLUMN IF NOT EXISTS "creatorPlanPriceCents" INTEGER NOT NULL DEFAULT 690` },
  { name: 'SPC.overageCentsPerGb',     sql: `ALTER TABLE "StoragePricingConfig" ADD COLUMN IF NOT EXISTS "overageCentsPerGb" INTEGER NOT NULL DEFAULT 8` },
  { name: 'SPC.overageGracePercent',   sql: `ALTER TABLE "StoragePricingConfig" ADD COLUMN IF NOT EXISTS "overageGracePercent" INTEGER NOT NULL DEFAULT 10` },
  // Bump existing pro columns to new v2 meaning (was 5GB @ $9.99 → now 100GB @ $14.90)
  // Only touch the default; keep existing rows untouched so admin can re-save.
  { name: 'SPC.proPlanGb.default',        sql: `ALTER TABLE "StoragePricingConfig" ALTER COLUMN "proPlanGb" SET DEFAULT 100` },
  { name: 'SPC.proPlanPriceCents.default', sql: `ALTER TABLE "StoragePricingConfig" ALTER COLUMN "proPlanPriceCents" SET DEFAULT 1490` },
  { name: 'SPC.freePlanMb.default',        sql: `ALTER TABLE "StoragePricingConfig" ALTER COLUMN "freePlanMb" SET DEFAULT 2048` },
  // Update existing config row if it's still on v1 defaults
  {
    name: 'SPC.upgrade-existing-row',
    sql: `UPDATE "StoragePricingConfig"
            SET "freePlanMb" = 2048, "proPlanGb" = 100, "proPlanPriceCents" = 1490
          WHERE "id" = 'config'
            AND "freePlanMb" = 500
            AND "proPlanGb" = 5`,
  },

  // ── StorageSubscription ──────────────────────────────────────────────────────
  {
    name: 'StorageSubscription.table',
    sql: `CREATE TABLE IF NOT EXISTS "StorageSubscription" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "plan" TEXT NOT NULL,
            "priceCents" INTEGER NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'PENDING',
            "airwallexCustomerId" TEXT NOT NULL,
            "airwallexPaymentConsentId" TEXT,
            "airwallexInitialIntentId" TEXT,
            "currentPeriodStart" TIMESTAMP(3),
            "currentPeriodEnd" TIMESTAMP(3),
            "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
            "canceledAt" TIMESTAMP(3),
            "failedChargeCount" INTEGER NOT NULL DEFAULT 0,
            "lastChargedAt" TIMESTAMP(3),
            "nextRetryAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "StorageSubscription_pkey" PRIMARY KEY ("id")
          )`,
  },
  { name: 'StorageSubscription.userId.unique', sql: `CREATE UNIQUE INDEX IF NOT EXISTS "StorageSubscription_userId_key" ON "StorageSubscription"("userId")` },
  { name: 'StorageSubscription.status.idx',    sql: `CREATE INDEX IF NOT EXISTS "StorageSubscription_status_currentPeriodEnd_idx" ON "StorageSubscription"("status", "currentPeriodEnd")` },

  // ── CommissionRequest ────────────────────────────────────────────────────────
  {
    name: 'CommissionRequest.table',
    sql: `CREATE TABLE IF NOT EXISTS "CommissionRequest" (
            "id" TEXT NOT NULL,
            "buyerId" TEXT NOT NULL,
            "creatorId" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "briefText" TEXT NOT NULL,
            "referenceImages" TEXT NOT NULL DEFAULT '[]',
            "budgetMinUsd" INTEGER,
            "budgetMaxUsd" INTEGER,
            "deadlineAt" TIMESTAMP(3),
            "status" TEXT NOT NULL DEFAULT 'PENDING',
            "declineReason" TEXT,
            "creatorResponseAt" TIMESTAMP(3),
            "expiresAt" TIMESTAMP(3) NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "CommissionRequest_pkey" PRIMARY KEY ("id")
          )`,
  },
  { name: 'CR.buyer.idx',    sql: `CREATE INDEX IF NOT EXISTS "CommissionRequest_buyerId_status_idx"   ON "CommissionRequest"("buyerId", "status")` },
  { name: 'CR.creator.idx',  sql: `CREATE INDEX IF NOT EXISTS "CommissionRequest_creatorId_status_idx" ON "CommissionRequest"("creatorId", "status")` },
  { name: 'CR.expires.idx',  sql: `CREATE INDEX IF NOT EXISTS "CommissionRequest_status_expiresAt_idx"  ON "CommissionRequest"("status", "expiresAt")` },

  // ── CommissionQuote ──────────────────────────────────────────────────────────
  {
    name: 'CommissionQuote.table',
    sql: `CREATE TABLE IF NOT EXISTS "CommissionQuote" (
            "id" TEXT NOT NULL,
            "requestId" TEXT,
            "creatorId" TEXT NOT NULL,
            "buyerId" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "description" TEXT NOT NULL,
            "amountUsd" INTEGER NOT NULL,
            "depositPercent" INTEGER NOT NULL DEFAULT 0,
            "revisionsIncluded" INTEGER NOT NULL DEFAULT 1,
            "turnaroundDays" INTEGER NOT NULL,
            "termsText" TEXT,
            "isMilestoneBased" BOOLEAN NOT NULL DEFAULT false,
            "status" TEXT NOT NULL DEFAULT 'DRAFT',
            "expiresAt" TIMESTAMP(3) NOT NULL,
            "sentAt" TIMESTAMP(3),
            "acceptedAt" TIMESTAMP(3),
            "rejectedAt" TIMESTAMP(3),
            "rejectionReason" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "CommissionQuote_pkey" PRIMARY KEY ("id")
          )`,
  },
  { name: 'CQ.creator.idx', sql: `CREATE INDEX IF NOT EXISTS "CommissionQuote_creatorId_status_idx" ON "CommissionQuote"("creatorId", "status")` },
  { name: 'CQ.buyer.idx',   sql: `CREATE INDEX IF NOT EXISTS "CommissionQuote_buyerId_status_idx"   ON "CommissionQuote"("buyerId", "status")` },
  { name: 'CQ.expires.idx', sql: `CREATE INDEX IF NOT EXISTS "CommissionQuote_status_expiresAt_idx"  ON "CommissionQuote"("status", "expiresAt")` },

  // ── CommissionMilestone ──────────────────────────────────────────────────────
  {
    name: 'CommissionMilestone.table',
    sql: `CREATE TABLE IF NOT EXISTS "CommissionMilestone" (
            "id" TEXT NOT NULL,
            "quoteId" TEXT NOT NULL,
            "orderId" TEXT,
            "order" INTEGER NOT NULL DEFAULT 0,
            "title" TEXT NOT NULL,
            "description" TEXT,
            "amountUsd" INTEGER NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'PENDING',
            "deliveredAt" TIMESTAMP(3),
            "deliveryFiles" TEXT,
            "deliveryNote" TEXT,
            "approvedAt" TIMESTAMP(3),
            "revisionNote" TEXT,
            "autoReleaseAt" TIMESTAMP(3),
            "releasedAt" TIMESTAMP(3),
            "revisionsUsed" INTEGER NOT NULL DEFAULT 0,
            "revisionsAllowed" INTEGER NOT NULL DEFAULT 1,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "CommissionMilestone_pkey" PRIMARY KEY ("id")
          )`,
  },
  { name: 'CM.quote.idx',    sql: `CREATE INDEX IF NOT EXISTS "CommissionMilestone_quoteId_order_idx"   ON "CommissionMilestone"("quoteId", "order")` },
  { name: 'CM.order.idx',    sql: `CREATE INDEX IF NOT EXISTS "CommissionMilestone_orderId_status_idx"  ON "CommissionMilestone"("orderId", "status")` },
  { name: 'CM.autoRel.idx',  sql: `CREATE INDEX IF NOT EXISTS "CommissionMilestone_status_autoReleaseAt_idx" ON "CommissionMilestone"("status", "autoReleaseAt")` },

  // ── Foreign Keys ─────────────────────────────────────────────────────────────
  {
    name: 'fk.StorageSubscription→User',
    sql: `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StorageSubscription_userId_fkey') THEN
              ALTER TABLE "StorageSubscription"
                ADD CONSTRAINT "StorageSubscription_userId_fkey"
                FOREIGN KEY ("userId") REFERENCES "User"("id")
                ON DELETE RESTRICT ON UPDATE CASCADE;
            END IF;
          END $$`,
  },
  {
    name: 'fk.CommissionRequest→User',
    sql: `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommissionRequest_buyerId_fkey') THEN
              ALTER TABLE "CommissionRequest"
                ADD CONSTRAINT "CommissionRequest_buyerId_fkey"
                FOREIGN KEY ("buyerId") REFERENCES "User"("id")
                ON DELETE RESTRICT ON UPDATE CASCADE;
            END IF;
          END $$`,
  },
  {
    name: 'fk.CommissionRequest→CreatorProfile',
    sql: `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommissionRequest_creatorId_fkey') THEN
              ALTER TABLE "CommissionRequest"
                ADD CONSTRAINT "CommissionRequest_creatorId_fkey"
                FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id")
                ON DELETE RESTRICT ON UPDATE CASCADE;
            END IF;
          END $$`,
  },
  {
    name: 'fk.CommissionQuote→CommissionRequest',
    sql: `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommissionQuote_requestId_fkey') THEN
              ALTER TABLE "CommissionQuote"
                ADD CONSTRAINT "CommissionQuote_requestId_fkey"
                FOREIGN KEY ("requestId") REFERENCES "CommissionRequest"("id")
                ON DELETE SET NULL ON UPDATE CASCADE;
            END IF;
          END $$`,
  },
  {
    name: 'fk.CommissionQuote→CreatorProfile',
    sql: `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommissionQuote_creatorId_fkey') THEN
              ALTER TABLE "CommissionQuote"
                ADD CONSTRAINT "CommissionQuote_creatorId_fkey"
                FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id")
                ON DELETE RESTRICT ON UPDATE CASCADE;
            END IF;
          END $$`,
  },
  {
    name: 'fk.CommissionQuote→User',
    sql: `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommissionQuote_buyerId_fkey') THEN
              ALTER TABLE "CommissionQuote"
                ADD CONSTRAINT "CommissionQuote_buyerId_fkey"
                FOREIGN KEY ("buyerId") REFERENCES "User"("id")
                ON DELETE RESTRICT ON UPDATE CASCADE;
            END IF;
          END $$`,
  },
  {
    name: 'fk.CommissionMilestone→CommissionQuote',
    sql: `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommissionMilestone_quoteId_fkey') THEN
              ALTER TABLE "CommissionMilestone"
                ADD CONSTRAINT "CommissionMilestone_quoteId_fkey"
                FOREIGN KEY ("quoteId") REFERENCES "CommissionQuote"("id")
                ON DELETE CASCADE ON UPDATE CASCADE;
            END IF;
          END $$`,
  },
  {
    name: 'fk.CommissionMilestone→Order',
    sql: `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommissionMilestone_orderId_fkey') THEN
              ALTER TABLE "CommissionMilestone"
                ADD CONSTRAINT "CommissionMilestone_orderId_fkey"
                FOREIGN KEY ("orderId") REFERENCES "Order"("id")
                ON DELETE SET NULL ON UPDATE CASCADE;
            END IF;
          END $$`,
  },
  {
    name: 'fk.Order→CommissionQuote',
    sql: `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_commissionQuoteId_fkey') THEN
              ALTER TABLE "Order"
                ADD CONSTRAINT "Order_commissionQuoteId_fkey"
                FOREIGN KEY ("commissionQuoteId") REFERENCES "CommissionQuote"("id")
                ON DELETE SET NULL ON UPDATE CASCADE;
            END IF;
          END $$`,
  },
  {
    name: 'fk.EscrowTransaction→CommissionMilestone',
    sql: `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EscrowTransaction_milestoneId_fkey') THEN
              ALTER TABLE "EscrowTransaction"
                ADD CONSTRAINT "EscrowTransaction_milestoneId_fkey"
                FOREIGN KEY ("milestoneId") REFERENCES "CommissionMilestone"("id")
                ON DELETE SET NULL ON UPDATE CASCADE;
            END IF;
          END $$`,
  },
]

async function main() {
  await client.connect()
  console.log(`[migrate-p5] running ${statements.length} statements`)
  let ok = 0
  for (const { name, sql } of statements) {
    try {
      await client.query(sql)
      console.log(`  ✓ ${name}`)
      ok++
    } catch (e) {
      console.error(`  ✗ ${name}: ${(e as Error).message}`)
      throw e
    }
  }
  console.log(`[migrate-p5] ${ok}/${statements.length} statements applied`)
  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
