// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', 'dev.db')
const db = new Database(DB_PATH)

function columnExists(table, col) {
  const info = db.prepare(`PRAGMA table_info("${table}")`).all()
  return info.some(r => r.name === col)
}

function tableExists(table) {
  return !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table)
}

console.log('Applying POD / escrow / notifications migration...')

// ── User: warningCount, isFlaggedForReview ────────────────────────────────────
if (!columnExists('User', 'warningCount')) {
  db.prepare(`ALTER TABLE "User" ADD COLUMN "warningCount" INTEGER NOT NULL DEFAULT 0`).run()
  console.log('  User.warningCount added')
}
if (!columnExists('User', 'isFlaggedForReview')) {
  db.prepare(`ALTER TABLE "User" ADD COLUMN "isFlaggedForReview" BOOLEAN NOT NULL DEFAULT false`).run()
  console.log('  User.isFlaggedForReview added')
}

// ── Product: POD fields ───────────────────────────────────────────────────────
const productCols = {
  podProviderId:     'TEXT',
  baseCost:          'INTEGER',
  productionDays:    'INTEGER',
  shippingMY:        'INTEGER',
  shippingSG:        'INTEGER',
  shippingPH:        'INTEGER',
  shippingIntl:      'INTEGER',
  showProviderPublic:'BOOLEAN NOT NULL DEFAULT false',
  podExternalUrl:    'TEXT',
  sizeVariants:      'TEXT',
  colorVariants:     'TEXT',
}
for (const [col, def] of Object.entries(productCols)) {
  if (!columnExists('Product', col)) {
    db.prepare(`ALTER TABLE "Product" ADD COLUMN "${col}" ${def}`).run()
    console.log(`  Product.${col} added`)
  }
}

// ── Order: escrow + courier fields ────────────────────────────────────────────
const orderCols = {
  escrowStatus:            `TEXT NOT NULL DEFAULT 'HELD'`,
  escrowHeldAt:            'DATETIME',
  courierName:             'TEXT',
  courierCode:             'TEXT',
  trackingAddedAt:         'DATETIME',
  estimatedDelivery:       'DATETIME',
  escrowReleasedAt:        'DATETIME',
  escrowAutoReleaseAt:     'DATETIME',
  fulfillmentDeadline:     'DATETIME',
  fulfillmentWarningsSent: 'INTEGER NOT NULL DEFAULT 0',
  buyerConfirmedAt:        'DATETIME',
}
for (const [col, def] of Object.entries(orderCols)) {
  if (!columnExists('Order', col)) {
    db.prepare(`ALTER TABLE "Order" ADD COLUMN "${col}" ${def}`).run()
    console.log(`  Order.${col} added`)
  }
}

// ── CreatorPodProvider ────────────────────────────────────────────────────────
if (!tableExists('CreatorPodProvider')) {
  db.prepare(`
    CREATE TABLE "CreatorPodProvider" (
      "id"                    TEXT NOT NULL PRIMARY KEY,
      "creatorId"             TEXT NOT NULL,
      "name"                  TEXT NOT NULL,
      "customName"            TEXT,
      "storeUrl"              TEXT,
      "notes"                 TEXT,
      "isDefault"             BOOLEAN NOT NULL DEFAULT false,
      "defaultProductionDays" INTEGER NOT NULL DEFAULT 5,
      "shippingMY"            INTEGER NOT NULL DEFAULT 5,
      "shippingSG"            INTEGER NOT NULL DEFAULT 7,
      "shippingPH"            INTEGER NOT NULL DEFAULT 10,
      "shippingIntl"          INTEGER NOT NULL DEFAULT 14,
      "createdAt"             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id")
    )
  `).run()
  console.log('  CreatorPodProvider table created')
}

// ── Dispute ───────────────────────────────────────────────────────────────────
if (!tableExists('Dispute')) {
  db.prepare(`
    CREATE TABLE "Dispute" (
      "id"                 TEXT NOT NULL PRIMARY KEY,
      "orderId"            TEXT NOT NULL UNIQUE,
      "raisedBy"           TEXT NOT NULL,
      "reason"             TEXT NOT NULL,
      "description"        TEXT NOT NULL,
      "evidence"           TEXT NOT NULL DEFAULT '[]',
      "creatorResponse"    TEXT,
      "creatorEvidence"    TEXT,
      "creatorRespondedAt" DATETIME,
      "status"             TEXT NOT NULL DEFAULT 'OPEN',
      "adminNote"          TEXT,
      "resolvedBy"         TEXT,
      "resolvedAt"         DATETIME,
      "refundAmount"       INTEGER,
      "createdAt"          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("orderId")    REFERENCES "Order"("id"),
      FOREIGN KEY ("raisedBy")   REFERENCES "User"("id"),
      FOREIGN KEY ("resolvedBy") REFERENCES "User"("id")
    )
  `).run()
  console.log('  Dispute table created')
}

// ── EscrowTransaction ─────────────────────────────────────────────────────────
if (!tableExists('EscrowTransaction')) {
  db.prepare(`
    CREATE TABLE "EscrowTransaction" (
      "id"          TEXT NOT NULL PRIMARY KEY,
      "orderId"     TEXT NOT NULL,
      "type"        TEXT NOT NULL,
      "amount"      INTEGER NOT NULL,
      "note"        TEXT,
      "performedBy" TEXT,
      "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("orderId")     REFERENCES "Order"("id"),
      FOREIGN KEY ("performedBy") REFERENCES "User"("id")
    )
  `).run()
  console.log('  EscrowTransaction table created')
}

// ── Notification ──────────────────────────────────────────────────────────────
if (!tableExists('Notification')) {
  db.prepare(`
    CREATE TABLE "Notification" (
      "id"        TEXT NOT NULL PRIMARY KEY,
      "userId"    TEXT NOT NULL,
      "type"      TEXT NOT NULL,
      "title"     TEXT NOT NULL,
      "message"   TEXT NOT NULL,
      "orderId"   TEXT,
      "isRead"    BOOLEAN NOT NULL DEFAULT false,
      "actionUrl" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES "User"("id")
    )
  `).run()
  db.prepare(`CREATE INDEX "Notification_userId_idx" ON "Notification"("userId")`).run()
  db.prepare(`CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId","isRead")`).run()
  console.log('  Notification table created')
}

db.close()
console.log('Migration complete.')
