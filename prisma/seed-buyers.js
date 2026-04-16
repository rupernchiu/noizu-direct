const Database = require('better-sqlite3')
const path = require('path')
const crypto = require('crypto')

const DB_PATH = path.join(__dirname, '..', 'dev.db')
const db = new Database(DB_PATH)
db.pragma('foreign_keys = OFF')

const now = new Date().toISOString()
function cuid() { return 'c' + crypto.randomBytes(11).toString('base64url').slice(0, 24) }

// Get buyer1
const buyer = db.prepare("SELECT id FROM User WHERE email = 'buyer1@test.com'").get()
if (!buyer) { console.error('buyer1@test.com not found'); process.exit(1) }
const buyerId = buyer.id

// Get sakura_arts profile
const sakura = db.prepare("SELECT id FROM CreatorProfile WHERE username = 'sakura_arts'").get()
// Get first 2 other creator profiles for following
const allCreators = db.prepare("SELECT id, username FROM CreatorProfile LIMIT 5").all()
const otherCreators = allCreators.filter(c => c.id !== sakura?.id).slice(0, 2)

// Get some products to wishlist
const products = db.prepare("SELECT id, title FROM Product LIMIT 4").all()

// WishlistItems
const wishlistPrefs = [
  { notifyPriceChange: 1, notifyRestock: 0, notifyNewDrop: 0 },
  { notifyPriceChange: 1, notifyRestock: 1, notifyNewDrop: 0 },
  { notifyPriceChange: 1, notifyRestock: 1, notifyNewDrop: 1 },
  { notifyPriceChange: 0, notifyRestock: 0, notifyNewDrop: 0 },
]
products.forEach((p, i) => {
  const exists = db.prepare("SELECT id FROM WishlistItem WHERE buyerId = ? AND productId = ?").get(buyerId, p.id)
  if (!exists) {
    const prefs = wishlistPrefs[i % wishlistPrefs.length]
    db.prepare(`INSERT INTO WishlistItem (id, buyerId, productId, notifyPriceChange, notifyRestock, notifyNewDrop, addedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(cuid(), buyerId, p.id, prefs.notifyPriceChange, prefs.notifyRestock, prefs.notifyNewDrop, now)
    console.log('  Wishlisted:', p.title)
  }
})

// CreatorFollows — follow sakura + 2 others
const followTargets = [sakura, ...otherCreators].filter(Boolean)
followTargets.forEach((creator, i) => {
  const exists = db.prepare("SELECT id FROM CreatorFollow WHERE buyerId = ? AND creatorId = ?").get(buyerId, creator.id)
  if (!exists) {
    const prefs = i === 0
      ? { notifyNewProduct: 1, notifyCommissionOpen: 1, notifyNewPost: 0 }
      : i === 1
      ? { notifyNewProduct: 1, notifyCommissionOpen: 0, notifyNewPost: 0 }
      : { notifyNewProduct: 0, notifyCommissionOpen: 0, notifyNewPost: 0 }
    db.prepare(`INSERT INTO CreatorFollow (id, buyerId, creatorId, notifyNewProduct, notifyCommissionOpen, notifyNewPost, followedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(cuid(), buyerId, creator.id, prefs.notifyNewProduct, prefs.notifyCommissionOpen, prefs.notifyNewPost, now)
    console.log('  Following:', creator.username)
  }
})

// Add 5 buyer notifications
const existingNotifs = db.prepare("SELECT COUNT(*) as c FROM Notification WHERE userId = ?").get(buyerId)
if (existingNotifs.c === 0) {
  const notifs = [
    { type: 'WISHLIST_PRICE_CHANGE', title: 'Price drop on Kazuha Art Print', message: 'Kazuha Art Print dropped from $45.00 to $35.00 — grab it now!', actionUrl: '/marketplace' },
    { type: 'CREATOR_NEW_PRODUCT', title: 'Sakura Arts added a new product', message: 'Sakura Arts just added: Cosplay Character Sticker Sheet (POD)', actionUrl: '/marketplace' },
    { type: 'CREATOR_COMMISSION_OPEN', title: 'Sakura Arts is now taking commissions!', message: 'Commission slots just opened — check out the pricing', actionUrl: '/creator/sakura_arts#commission' },
    { type: 'ORDER_SHIPPED', title: 'Your order has shipped', message: 'Your Kazuha Art Print has shipped via J&T Express (JT987654321MY)', actionUrl: '/account/orders' },
    { type: 'DOWNLOAD_READY', title: 'Your download is ready', message: 'Your digital purchase is ready to download', actionUrl: '/account/downloads' },
  ]
  notifs.forEach(n => {
    db.prepare(`INSERT INTO Notification (id, userId, type, title, message, isRead, actionUrl, createdAt)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)`).run(cuid(), buyerId, n.type, n.title, n.message, n.actionUrl, now)
  })
  console.log('  5 buyer notifications added')
}

db.pragma('foreign_keys = ON')
db.close()
console.log('\nBuyer seed complete.')
