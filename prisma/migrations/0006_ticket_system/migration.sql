-- 0006_ticket_system
-- Replaces Conversation/Message with a service-ticket model.
-- Pre-launch: safe to drop the old chat tables; only seed data exists.

-- 1. Drop old chat tables + all FKs pointing at them.
DROP TABLE IF EXISTS "Message"      CASCADE;
DROP TABLE IF EXISTS "Conversation" CASCADE;

-- 2. Ticket — one per inquiry/request/order.
CREATE TABLE "Ticket" (
  "id"                   TEXT PRIMARY KEY,
  "subject"              TEXT NOT NULL,
  "kind"                 TEXT NOT NULL,
  "status"               TEXT NOT NULL DEFAULT 'OPEN',
  "buyerId"              TEXT NOT NULL,
  "creatorId"            TEXT NOT NULL,
  "openedById"           TEXT NOT NULL,
  "openedAutoSource"     TEXT,
  "commissionRequestId"  TEXT,
  "commissionQuoteId"    TEXT,
  "orderId"              TEXT,
  "lastBuyerMessageAt"   TIMESTAMP(3),
  "lastCreatorMessageAt" TIMESTAMP(3),
  "lastMessageAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt"             TIMESTAMP(3),
  "closedById"           TEXT,
  "closeReason"          TEXT,
  "purgeAt"              TIMESTAMP(3),
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "Ticket_commissionRequestId_key" ON "Ticket"("commissionRequestId");
CREATE UNIQUE INDEX "Ticket_commissionQuoteId_key"   ON "Ticket"("commissionQuoteId");
CREATE UNIQUE INDEX "Ticket_orderId_key"             ON "Ticket"("orderId");
CREATE INDEX "Ticket_buyerId_status_lastMessageAt_idx"   ON "Ticket"("buyerId", "status", "lastMessageAt");
CREATE INDEX "Ticket_creatorId_status_lastMessageAt_idx" ON "Ticket"("creatorId", "status", "lastMessageAt");
CREATE INDEX "Ticket_status_lastMessageAt_idx"           ON "Ticket"("status", "lastMessageAt");
CREATE INDEX "Ticket_purgeAt_idx"                        ON "Ticket"("purgeAt");
CREATE INDEX "Ticket_kind_status_idx"                    ON "Ticket"("kind", "status");

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_buyerId_fkey"              FOREIGN KEY ("buyerId")              REFERENCES "User"("id")              ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_creatorId_fkey"            FOREIGN KEY ("creatorId")            REFERENCES "User"("id")              ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_closedById_fkey"           FOREIGN KEY ("closedById")           REFERENCES "User"("id")              ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_commissionRequestId_fkey"  FOREIGN KEY ("commissionRequestId")  REFERENCES "CommissionRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_commissionQuoteId_fkey"    FOREIGN KEY ("commissionQuoteId")    REFERENCES "CommissionQuote"("id")   ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_orderId_fkey"              FOREIGN KEY ("orderId")              REFERENCES "Order"("id")             ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. TicketMessage — individual posts inside a ticket.
CREATE TABLE "TicketMessage" (
  "id"           TEXT PRIMARY KEY,
  "ticketId"     TEXT NOT NULL,
  "senderId"     TEXT NOT NULL,
  "body"         TEXT NOT NULL,
  "systemKind"   TEXT,
  "reportedAt"   TIMESTAMP(3),
  "reportedById" TEXT,
  "isDeleted"    BOOLEAN NOT NULL DEFAULT false,
  "deletedAt"    TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "TicketMessage_ticketId_createdAt_idx" ON "TicketMessage"("ticketId", "createdAt");
CREATE INDEX "TicketMessage_senderId_createdAt_idx" ON "TicketMessage"("senderId", "createdAt");
CREATE INDEX "TicketMessage_reportedAt_idx"         ON "TicketMessage"("reportedAt");

ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id")   ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. TicketAttachment — append-only image/file log.
CREATE TABLE "TicketAttachment" (
  "id"           TEXT PRIMARY KEY,
  "ticketId"     TEXT NOT NULL,
  "messageId"    TEXT,
  "uploaderId"   TEXT NOT NULL,
  "r2Key"        TEXT NOT NULL,
  "viewerUrl"    TEXT NOT NULL,
  "mimeType"     TEXT,
  "fileSize"     INTEGER,
  "supersededBy" TEXT,
  "supersededAt" TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "TicketAttachment_supersededBy_key"      ON "TicketAttachment"("supersededBy");
CREATE INDEX "TicketAttachment_ticketId_createdAt_idx" ON "TicketAttachment"("ticketId", "createdAt");
CREATE INDEX "TicketAttachment_uploaderId_idx"         ON "TicketAttachment"("uploaderId");

ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_ticketId_fkey"  FOREIGN KEY ("ticketId")  REFERENCES "Ticket"("id")        ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TicketMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. TicketReadMarker — per-user unread cursor.
CREATE TABLE "TicketReadMarker" (
  "id"         TEXT PRIMARY KEY,
  "ticketId"   TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "TicketReadMarker_ticketId_userId_key" ON "TicketReadMarker"("ticketId", "userId");
CREATE INDEX "TicketReadMarker_userId_lastReadAt_idx"      ON "TicketReadMarker"("userId", "lastReadAt");

ALTER TABLE "TicketReadMarker" ADD CONSTRAINT "TicketReadMarker_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "TicketReadMarker" ADD CONSTRAINT "TicketReadMarker_userId_fkey"   FOREIGN KEY ("userId")   REFERENCES "User"("id")   ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. UserBlock — creator blocks buyer at user level.
CREATE TABLE "UserBlock" (
  "id"        TEXT PRIMARY KEY,
  "blockerId" TEXT NOT NULL,
  "blockedId" TEXT NOT NULL,
  "reason"    TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "UserBlock_blockerId_blockedId_key" ON "UserBlock"("blockerId", "blockedId");
CREATE INDEX "UserBlock_blockedId_idx"                  ON "UserBlock"("blockedId");

ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
