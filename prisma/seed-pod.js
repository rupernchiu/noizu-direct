// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3')
const path = require('path')
const crypto = require('crypto')

const DB_PATH = path.join(__dirname, '..', 'dev.db')
const db = new Database(DB_PATH)
db.pragma('foreign_keys = OFF')
db.pragma('journal_mode = WAL')

const now = new Date().toISOString()
function cuid() {
  return 'c' + crypto.randomBytes(11).toString('base64url').slice(0, 24)
}

// ── Get sakura_arts profile ───────────────────────────────────────────────────
const sakuraProfile = db.prepare(`SELECT id FROM CreatorProfile WHERE username = 'sakura_arts'`).get()
if (!sakuraProfile) {
  console.error('ERROR: sakura_arts profile not found. Run seed-direct.js first.')
  process.exit(1)
}
const sakuraId = sakuraProfile.id

const sakuraUser = db.prepare(`SELECT id FROM User WHERE email = 'sakura@example.com'`).get()
if (!sakuraUser) {
  console.error('ERROR: sakura user not found. Run seed-direct.js first.')
  process.exit(1)
}
const sakuraUserId = sakuraUser.id

// Get a buyer for orders
const hana = db.prepare(`SELECT id FROM User WHERE email = 'hana@example.com'`).get()
const hanaBuyerId = hana ? hana.id : null

// ── POD Providers ─────────────────────────────────────────────────────────────
let printifyProvider = db.prepare(`SELECT id FROM CreatorPodProvider WHERE creatorId = ? AND name = 'PRINTIFY'`).get(sakuraId)
if (!printifyProvider) {
  const pid = cuid()
  db.prepare(`INSERT INTO CreatorPodProvider
    (id, creatorId, name, customName, storeUrl, notes, isDefault, defaultProductionDays,
     shippingMY, shippingSG, shippingPH, shippingIntl, createdAt, updatedAt)
    VALUES (?, ?, 'PRINTIFY', NULL, 'https://printify.com/app/store/12345', 'Main POD store for apparel', 1, 7, 7, 10, 14, 21, ?, ?)`)
    .run(pid, sakuraId, now, now)
  printifyProvider = { id: pid }
  console.log('  Printify provider added')
} else {
  console.log('  Printify provider already exists')
}

let localProvider = db.prepare(`SELECT id FROM CreatorPodProvider WHERE creatorId = ? AND name = 'LOCAL_PRINT_SHOP'`).get(sakuraId)
if (!localProvider) {
  const pid = cuid()
  db.prepare(`INSERT INTO CreatorPodProvider
    (id, creatorId, name, customName, storeUrl, notes, isDefault, defaultProductionDays,
     shippingMY, shippingSG, shippingPH, shippingIntl, createdAt, updatedAt)
    VALUES (?, ?, 'LOCAL_PRINT_SHOP', 'Sunny Print KL', NULL, 'Local shop in Bangsar, KL. Great for art prints. Ships MY/SG only.', 0, 3, 3, 7, 10, 0, ?, ?)`)
    .run(pid, sakuraId, now, now)
  localProvider = { id: pid }
  console.log('  Local Print Shop provider added')
} else {
  console.log('  Local Print Shop provider already exists')
}

// ── POD Products ──────────────────────────────────────────────────────────────
let hoodieProd = db.prepare(`SELECT id FROM Product WHERE creatorId = ? AND title = 'Demon Slayer Fan Art Hoodie'`).get(sakuraId)
if (!hoodieProd) {
  const pid = cuid()
  db.prepare(`INSERT INTO Product
    (id, creatorId, title, description, price, category, type, images, isPinned, "order", isActive,
     podProviderId, baseCost, productionDays, shippingMY, shippingSG, shippingPH, shippingIntl,
     showProviderPublic, sizeVariants, colorVariants, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, 'POD', ?, 1, 10, 1, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`)
    .run(pid, sakuraId,
      'Demon Slayer Fan Art Hoodie',
      'Premium fan art hoodie featuring original Demon Slayer-inspired artwork. Printed via Printify on a soft 320gsm unisex hoodie. Ships worldwide!',
      8900, 'Apparel',
      JSON.stringify(['https://picsum.photos/seed/hoodie1/400/400', 'https://picsum.photos/seed/hoodie2/400/400']),
      printifyProvider.id, 3200, 7, 7, 10, 14, 21,
      JSON.stringify(['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']),
      JSON.stringify([
        { name: 'Black', mockupImage: 'https://picsum.photos/seed/hoodie-black/400/400' },
        { name: 'Navy', mockupImage: 'https://picsum.photos/seed/hoodie-navy/400/400' },
        { name: 'Charcoal', mockupImage: 'https://picsum.photos/seed/hoodie-grey/400/400' },
      ]),
      now, now)
  hoodieProd = { id: pid }
  console.log('  Demon Slayer Hoodie product added')
} else {
  console.log('  Demon Slayer Hoodie already exists')
}

let printProd = db.prepare(`SELECT id FROM Product WHERE creatorId = ? AND title = 'Kazuha Original Art Print'`).get(sakuraId)
if (!printProd) {
  const pid = cuid()
  db.prepare(`INSERT INTO Product
    (id, creatorId, title, description, price, category, type, images, isPinned, "order", isActive,
     podProviderId, baseCost, productionDays, shippingMY, shippingSG, shippingPH, shippingIntl,
     showProviderPublic, sizeVariants, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, 'POD', ?, 0, 11, 1, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`)
    .run(pid, sakuraId,
      'Kazuha Original Art Print',
      'A3 art print of my original Kazuha fan art, printed locally on 250gsm matte paper. Sharp detail and vibrant colors. Ships MY/SG only.',
      3500, 'Print',
      JSON.stringify(['https://picsum.photos/seed/kazuha1/400/400']),
      localProvider.id, 800, 3, 3, 7, 10, 0,
      JSON.stringify(['A4', 'A3']),
      now, now)
  printProd = { id: pid }
  console.log('  Kazuha Art Print product added')
} else {
  console.log('  Kazuha Art Print already exists')
}

let stickerProd = db.prepare(`SELECT id FROM Product WHERE creatorId = ? AND title = 'Cosplay Character Sticker Sheet (POD)'`).get(sakuraId)
if (!stickerProd) {
  const pid = cuid()
  db.prepare(`INSERT INTO Product
    (id, creatorId, title, description, price, category, type, images, isPinned, "order", isActive,
     podProviderId, baseCost, productionDays, shippingMY, shippingSG, shippingPH, shippingIntl,
     showProviderPublic, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, 'POD', ?, 0, 12, 1, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`)
    .run(pid, sakuraId,
      'Cosplay Character Sticker Sheet (POD)',
      'Kiss-cut sticker sheet with 9 original character stickers. Weatherproof, dishwasher-safe. Printed on demand via Printify.',
      1600, 'Sticker',
      JSON.stringify(['https://picsum.photos/seed/sticker-pod1/400/400']),
      printifyProvider.id, 450, 7, 7, 10, 14, 21,
      now, now)
  stickerProd = { id: pid }
  console.log('  Cosplay Sticker Sheet product added')
} else {
  console.log('  Cosplay Sticker Sheet already exists')
}

// ── POD Orders (only if we have a buyer) ─────────────────────────────────────
if (hanaBuyerId) {
  // Order 1: HELD (just paid, no tracking yet)
  let heldOrder = db.prepare(`SELECT id FROM "Order" WHERE buyerId = ? AND productId = ? AND escrowStatus = 'HELD'`).get(hanaBuyerId, hoodieProd.id)
  if (!heldOrder) {
    const oid = cuid()
    const orderedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
    const deadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days from now
    db.prepare(`INSERT INTO "Order"
      (id, buyerId, creatorId, productId, status, amountUsd, displayCurrency, displayAmount, exchangeRate,
       escrowStatus, escrowHeldAt, fulfillmentDeadline, fulfillmentWarningsSent,
       shippingAddress, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 'PROCESSING', ?, 'MYR', ?, 4.47, 'HELD', ?, ?, 0, ?, ?, ?)`)
      .run(oid, hanaBuyerId, sakuraUserId, hoodieProd.id,
        8900, 39800, orderedAt, deadline,
        JSON.stringify({ name: 'Hana Lee', line1: '12 Jalan Bukit Bintang', city: 'Kuala Lumpur', state: 'WP', postcode: '55100', country: 'MY', phone: '+60123456789' }),
        orderedAt, orderedAt)
    heldOrder = { id: oid }
    console.log('  HELD order added:', oid)

    // EscrowTransaction for the hold
    db.prepare(`INSERT INTO EscrowTransaction (id, orderId, type, amount, note, performedBy, createdAt) VALUES (?, ?, 'HOLD', ?, ?, NULL, ?)`)
      .run(cuid(), oid, 8900, 'Payment received, escrow held', orderedAt)
  } else {
    console.log('  HELD order already exists')
  }

  // Order 2: TRACKING_ADDED (shipped, waiting for buyer confirmation)
  let shippedOrder = db.prepare(`SELECT id FROM "Order" WHERE buyerId = ? AND productId = ? AND escrowStatus = 'TRACKING_ADDED'`).get(hanaBuyerId, printProd.id)
  if (!shippedOrder) {
    const oid = cuid()
    const orderedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
    const shippedAt = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() // 4 days ago
    const autoRelease = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days from now
    const estDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
    db.prepare(`INSERT INTO "Order"
      (id, buyerId, creatorId, productId, status, amountUsd, displayCurrency, displayAmount, exchangeRate,
       escrowStatus, escrowHeldAt, trackingNumber, courierName, courierCode, trackingAddedAt, estimatedDelivery,
       escrowAutoReleaseAt, fulfillmentDeadline, fulfillmentWarningsSent,
       shippingAddress, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 'SHIPPED', ?, 'MYR', ?, 4.47, 'TRACKING_ADDED', ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`)
      .run(oid, hanaBuyerId, sakuraUserId, printProd.id,
        3500, 15645, orderedAt,
        'JT987654321MY', 'J&T Express', 'JNT', shippedAt, estDelivery,
        autoRelease,
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        JSON.stringify({ name: 'Hana Lee', line1: '12 Jalan Bukit Bintang', city: 'Kuala Lumpur', state: 'WP', postcode: '55100', country: 'MY', phone: '+60123456789' }),
        orderedAt, shippedAt)
    shippedOrder = { id: oid }
    console.log('  TRACKING_ADDED order added:', oid)

    db.prepare(`INSERT INTO EscrowTransaction (id, orderId, type, amount, note, performedBy, createdAt) VALUES (?, ?, 'HOLD', ?, ?, NULL, ?)`)
      .run(cuid(), oid, 3500, 'Payment received, escrow held', orderedAt)
  } else {
    console.log('  TRACKING_ADDED order already exists')
  }
}

// ── Notifications for sakura_arts ─────────────────────────────────────────────
const existingNotifs = db.prepare(`SELECT COUNT(*) as c FROM Notification WHERE userId = ?`).get(sakuraUserId)
if (existingNotifs.c === 0) {
  const notifData = [
    {
      type: 'NEW_ORDER',
      title: 'New order received!',
      message: 'Hana Lee ordered Demon Slayer Fan Art Hoodie (L, Black) for MYR 89.00',
      isRead: 0,
      actionUrl: '/dashboard/orders',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      type: 'NEW_ORDER',
      title: 'New order received!',
      message: 'Hana Lee ordered Kazuha Original Art Print (A3) for MYR 35.00',
      isRead: 1,
      actionUrl: '/dashboard/orders',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      type: 'FULFILLMENT_REMINDER',
      title: 'Fulfillment reminder',
      message: 'You have 5 days left to add tracking for order #DSlayer Hoodie. Add tracking to protect your escrow.',
      isRead: 0,
      actionUrl: '/dashboard/orders',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      type: 'ESCROW_RELEASED',
      title: 'Payment released!',
      message: 'MYR 32.00 has been released to your earnings for your Magical Girl Print Set order.',
      isRead: 1,
      actionUrl: '/dashboard/earnings',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      type: 'NEW_MESSAGE',
      title: 'New message from Ryo Tanaka',
      message: 'Hey! I was wondering if you could do a custom size for the art print?',
      isRead: 0,
      actionUrl: '/dashboard/messages',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
  ]
  for (const n of notifData) {
    db.prepare(`INSERT INTO Notification (id, userId, type, title, message, isRead, actionUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(cuid(), sakuraUserId, n.type, n.title, n.message, n.isRead, n.actionUrl, n.createdAt)
  }
  console.log('  5 notifications added for sakura_arts')
} else {
  console.log('  Notifications already exist, skipping')
}

// ── Policy Pages ──────────────────────────────────────────────────────────────
const policyPages = [
  {
    slug: 'pod-policy',
    title: 'Print-on-Demand Policy',
    status: 'PUBLISHED',
    showInFooter: 1,
    footerColumn: 'Support',
    footerOrder: 10,
    seoTitle: 'POD Policy — NOIZU-DIRECT',
    seoDescription: 'Learn how print-on-demand products work on NOIZU-DIRECT, including production times, shipping, and quality guarantees.',
    content: `<h2>Print-on-Demand Policy</h2>
<p>Print-on-demand (POD) products on NOIZU-DIRECT are created individually for each order. Here's what you need to know.</p>
<h3>Production Time</h3>
<p>POD items typically take 5–10 business days to produce before shipping, depending on the creator's chosen provider. Each product listing shows the estimated production time.</p>
<h3>Shipping</h3>
<p>Shipping times vary by destination and provider. Estimated delivery windows are shown at checkout. Creators are required to add tracking within 7 days of receiving your order.</p>
<h3>Quality Guarantee</h3>
<p>If your POD item arrives damaged, with significant print quality issues, or is the wrong item, you can raise a dispute within 14 days of delivery.</p>
<h3>Returns & Refunds</h3>
<p>Because each item is made to order, we cannot accept returns for change-of-mind purchases. However, our dispute resolution process covers defective or incorrect items.</p>
<h3>Buyer Protection</h3>
<p>Your payment is held in escrow until either you confirm receipt or 21 days after tracking is added. This protects you if an item is lost or never arrives.</p>`,
  },
  {
    slug: 'buyer-protection',
    title: 'Buyer Protection',
    status: 'PUBLISHED',
    showInFooter: 1,
    footerColumn: 'Support',
    footerOrder: 11,
    seoTitle: 'Buyer Protection — NOIZU-DIRECT',
    seoDescription: 'NOIZU-DIRECT holds your payment in escrow until your order is delivered. Understand how our buyer protection works.',
    content: `<h2>Buyer Protection</h2>
<p>Every purchase on NOIZU-DIRECT is protected by our escrow system. Your money is never released to the creator until you're satisfied.</p>
<h3>How Escrow Works</h3>
<ol>
  <li><strong>Payment held:</strong> When you pay, your funds are held securely in escrow.</li>
  <li><strong>Creator fulfills:</strong> The creator has 7 days to add a tracking number.</li>
  <li><strong>In transit:</strong> Once tracking is added, the 21-day protection window begins.</li>
  <li><strong>You confirm:</strong> When your order arrives, confirm receipt to release payment to the creator.</li>
  <li><strong>Auto-release:</strong> If you don't confirm after 21 days, funds are automatically released.</li>
</ol>
<h3>Raising a Dispute</h3>
<p>If your order never arrives, arrives damaged, or is not as described, you can raise a dispute from your order page. Our team reviews all disputes within 3 business days.</p>
<h3>Refund Policy</h3>
<p>Refunds are issued for:</p>
<ul>
  <li>Items that never arrived</li>
  <li>Significantly damaged items</li>
  <li>Wrong items sent</li>
  <li>Creator fails to fulfill within 7 days</li>
</ul>
<h3>Contact Us</h3>
<p>If you have any questions about a purchase, contact us at <a href="mailto:hello@noizu.direct">hello@noizu.direct</a>.</p>`,
  },
]

for (const page of policyPages) {
  const exists = db.prepare(`SELECT id FROM Page WHERE slug = ?`).get(page.slug)
  if (!exists) {
    db.prepare(`INSERT INTO Page (id, slug, title, content, status, showInFooter, footerColumn, footerOrder, seoTitle, seoDescription, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(cuid(), page.slug, page.title, page.content, page.status, page.showInFooter, page.footerColumn, page.footerOrder, page.seoTitle, page.seoDescription, now, now)
    console.log(`  Page '${page.slug}' added`)
  } else {
    console.log(`  Page '${page.slug}' already exists`)
  }
}

db.pragma('foreign_keys = ON')
db.close()
console.log('\nPOD seed complete.')
