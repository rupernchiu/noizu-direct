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

console.log('Applying wishlist / following / message-attachments migration...')

// ── Message: attachments field ────────────────────────────────────────────────
if (!columnExists('Message', 'attachments')) {
  db.prepare(`ALTER TABLE "Message" ADD COLUMN "attachments" TEXT NOT NULL DEFAULT '[]'`).run()
  console.log('  Message.attachments added')
}

// ── WishlistItem ──────────────────────────────────────────────────────────────
if (!tableExists('WishlistItem')) {
  db.prepare(`
    CREATE TABLE "WishlistItem" (
      "id"                TEXT NOT NULL PRIMARY KEY,
      "buyerId"           TEXT NOT NULL,
      "productId"         TEXT NOT NULL,
      "notifyPriceChange" BOOLEAN NOT NULL DEFAULT true,
      "notifyRestock"     BOOLEAN NOT NULL DEFAULT true,
      "notifyNewDrop"     BOOLEAN NOT NULL DEFAULT false,
      "addedAt"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("buyerId")   REFERENCES "User"("id"),
      FOREIGN KEY ("productId") REFERENCES "Product"("id"),
      UNIQUE ("buyerId", "productId")
    )
  `).run()
  db.prepare(`CREATE INDEX "WishlistItem_buyerId_idx" ON "WishlistItem"("buyerId")`).run()
  console.log('  WishlistItem table created')
}

// ── CreatorFollow ─────────────────────────────────────────────────────────────
if (!tableExists('CreatorFollow')) {
  db.prepare(`
    CREATE TABLE "CreatorFollow" (
      "id"                   TEXT NOT NULL PRIMARY KEY,
      "buyerId"              TEXT NOT NULL,
      "creatorId"            TEXT NOT NULL,
      "notifyNewProduct"     BOOLEAN NOT NULL DEFAULT true,
      "notifyCommissionOpen" BOOLEAN NOT NULL DEFAULT true,
      "notifyNewPost"        BOOLEAN NOT NULL DEFAULT false,
      "followedAt"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("buyerId")   REFERENCES "User"("id"),
      FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id"),
      UNIQUE ("buyerId", "creatorId")
    )
  `).run()
  db.prepare(`CREATE INDEX "CreatorFollow_buyerId_idx" ON "CreatorFollow"("buyerId")`).run()
  console.log('  CreatorFollow table created')
}

db.close()
console.log('Migration complete.')
