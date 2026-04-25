-- Sprint 0.7: Treasury / Reserve ledgers + cross-feature admin audit log.
-- Adds PlatformReserve (per-reserve header), PlatformReserveEntry (audit-grade
-- movement log), and AdminAuditEvent (unified admin-action audit trail).

-- ── PlatformReserve ──────────────────────────────────────────────────────────
CREATE TABLE "PlatformReserve" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "scope" TEXT,
    "label" TEXT NOT NULL,
    "cumulativeInUsd" INTEGER NOT NULL DEFAULT 0,
    "cumulativeOutUsd" INTEGER NOT NULL DEFAULT 0,
    "balanceUsd" INTEGER NOT NULL DEFAULT 0,
    "targetUsd" INTEGER,
    "policyHoldDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformReserve_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformReserve_kind_scope_key" ON "PlatformReserve"("kind", "scope");
CREATE INDEX "PlatformReserve_kind_isActive_idx" ON "PlatformReserve"("kind", "isActive");

-- ── PlatformReserveEntry ─────────────────────────────────────────────────────
CREATE TABLE "PlatformReserveEntry" (
    "id" TEXT NOT NULL,
    "reserveId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amountUsd" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refOrderId" TEXT,
    "refPayoutId" TEXT,
    "refUserId" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformReserveEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformReserveEntry_reserveId_createdAt_idx" ON "PlatformReserveEntry"("reserveId", "createdAt");
CREATE INDEX "PlatformReserveEntry_direction_createdAt_idx" ON "PlatformReserveEntry"("direction", "createdAt");

ALTER TABLE "PlatformReserveEntry"
    ADD CONSTRAINT "PlatformReserveEntry_reserveId_fkey"
    FOREIGN KEY ("reserveId") REFERENCES "PlatformReserve"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AdminAuditEvent ──────────────────────────────────────────────────────────
CREATE TABLE "AdminAuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "amountUsd" INTEGER,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditEvent_actorId_createdAt_idx" ON "AdminAuditEvent"("actorId", "createdAt");
CREATE INDEX "AdminAuditEvent_action_createdAt_idx" ON "AdminAuditEvent"("action", "createdAt");
CREATE INDEX "AdminAuditEvent_resourceType_resourceId_idx" ON "AdminAuditEvent"("resourceType", "resourceId");
