// Direct seed using better-sqlite3, bypassing Prisma
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
// Simple cuid-like ID generator using crypto
const crypto = require('crypto');

const db = new Database('./prisma/dev.db');
db.pragma('foreign_keys = OFF');
db.pragma('journal_mode = WAL');

const now = new Date().toISOString();
function cuid() { return 'c' + crypto.randomBytes(11).toString('hex'); }

// Platform settings
db.prepare(`INSERT OR REPLACE INTO PlatformSettings (id, processingFeePercent, platformFeePercent, withdrawalFeePercent, topCreatorThreshold)
  VALUES ('default', 2.5, 0.0, 4.0, 100)`).run();

// Admin user
const adminPwd = bcrypt.hashSync('admin123', 10);
let admin = db.prepare("SELECT id FROM User WHERE email = 'admin@noizu.direct'").get();
if (!admin) {
  db.prepare(`INSERT INTO User (id, email, password, name, role, createdAt, updatedAt) VALUES (?, 'admin@noizu.direct', ?, 'Admin', 'ADMIN', ?, ?)`)
    .run(cuid(), adminPwd, now, now);
}
console.log('Admin OK');

// Creators
const creatorDefs = [
  {
    email: 'sakura@example.com', name: 'Sakura Tanaka', username: 'sakura_arts', displayName: 'Sakura Arts',
    bio: 'Cosplay artist & doujin creator from KL. Specializing in magical girl and mecha series. Open for commissions!',
    commissionStatus: 'OPEN',
    commissionDescription: 'I create high-quality prints, stickers, and digital art. Message me for custom commissions!',
    socialLinks: JSON.stringify({ twitter: 'https://twitter.com/sakura_arts_my', instagram: 'https://instagram.com/sakura_arts_my', tiktok: 'https://tiktok.com/@sakura_arts_my' }),
    categoryTags: JSON.stringify(['Cosplay', 'Doujin', 'Digital Art', 'Prints']),
    commissionPricing: JSON.stringify([
      { tier: 'Bust', price: 35, description: 'Bust-up portrait, colored' },
      { tier: 'Full Body', price: 75, description: 'Full body, colored' },
      { tier: 'Complex', price: 120, description: 'Full body with detailed background' },
    ]),
    badges: JSON.stringify(['Fan Favorite']),
    isVerified: 1, isTopCreator: 1, totalSales: 247,
  },
  {
    email: 'akira@example.com', name: 'Akira Mochizuki', username: 'akira_mochi', displayName: 'AkiraMochi',
    bio: 'Indie comic artist & illustrator. Lover of slice-of-life and romance manga.',
    commissionStatus: 'LIMITED',
    commissionDescription: 'Currently accepting a small batch. Fast turnaround, mostly character work.',
    socialLinks: JSON.stringify({ twitter: 'https://twitter.com/akira_mochi', pixiv: 'https://pixiv.net/users/akira_mochi' }),
    categoryTags: JSON.stringify(['Manga', 'Illustration', 'Comics']),
    commissionPricing: JSON.stringify([
      { tier: 'Sketch', price: 20, description: 'Black and white sketch' },
      { tier: 'Inked', price: 40, description: 'Inked, no color' },
    ]),
    badges: JSON.stringify([]),
    isVerified: 1, isTopCreator: 0, totalSales: 89,
  },
];

const creatorPwd = bcrypt.hashSync('creator123', 10);
const profiles = {};

for (const c of creatorDefs) {
  let user = db.prepare('SELECT id FROM User WHERE email = ?').get(c.email);
  if (!user) {
    const uid = cuid();
    db.prepare(`INSERT INTO User (id, email, password, name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'CREATOR', ?, ?)`)
      .run(uid, c.email, creatorPwd, c.name, now, now);
    user = { id: uid };
  }
  let profile = db.prepare('SELECT id FROM CreatorProfile WHERE username = ?').get(c.username);
  if (!profile) {
    const pid = cuid();
    db.prepare(`INSERT INTO CreatorProfile
      (id, userId, username, displayName, bio, socialLinks, categoryTags, commissionStatus,
       commissionDescription, commissionPricing, badges, isVerified, isTopCreator, totalSales,
       absorbProcessingFee, announcementActive, featuredProductIds, isSuspended, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, '[]', 0, ?)`)
      .run(pid, user.id, c.username, c.displayName, c.bio, c.socialLinks, c.categoryTags,
           c.commissionStatus, c.commissionDescription, c.commissionPricing, c.badges,
           c.isVerified, c.isTopCreator, c.totalSales, now);
    profile = { id: pid };
  }
  profiles[c.username] = profile.id;
  console.log('Creator:', c.username, '->', profile.id);
}

// Buyers
const buyerPwd = bcrypt.hashSync('buyer123', 10);
const buyers = [
  { email: 'hana@example.com', name: 'Hana Lee' },
  { email: 'ryo@example.com', name: 'Ryo Tanaka' },
  { email: 'mia@example.com', name: 'Mia Santos' },
  { email: 'kai@example.com', name: 'Kai Nakamura' },
  { email: 'yuki@example.com', name: 'Yuki Watanabe' },
];
for (const b of buyers) {
  if (!db.prepare('SELECT id FROM User WHERE email = ?').get(b.email)) {
    db.prepare(`INSERT INTO User (id, email, password, name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'BUYER', ?, ?)`)
      .run(cuid(), b.email, buyerPwd, b.name, now, now);
  }
}
console.log('Buyers OK');

// Products — sakura_arts
const sakuraId = profiles['sakura_arts'];
const sakuraProducts = [
  { title: 'Magical Girl Print Set', description: 'A4 print set featuring original magical girl characters. High quality matte finish.', price: 1800, category: 'Print', type: 'PHYSICAL', images: JSON.stringify(['https://picsum.photos/seed/mg1/400/400', 'https://picsum.photos/seed/mg2/400/400']), isPinned: 1, order: 0 },
  { title: 'Mecha Pilot Sticker Pack', description: '10-piece holographic sticker set with original mecha designs.', price: 800, category: 'Sticker', type: 'PHYSICAL', images: JSON.stringify(['https://picsum.photos/seed/mech1/400/400']), isPinned: 0, order: 1 },
  { title: 'Sakura Digital Artbook Vol.1', description: 'PDF artbook with 40+ pages of original digital art. Instant download.', price: 1500, category: 'Artbook', type: 'DIGITAL', images: JSON.stringify(['https://picsum.photos/seed/art1/400/400']), isPinned: 1, order: 2 },
  { title: 'Cosplay Reference Sheet — Seraphina', description: 'Full reference sheet for my Seraphina OC. Great for cosplayers and fan artists.', price: 600, category: 'Digital Art', type: 'DIGITAL', images: JSON.stringify(['https://picsum.photos/seed/ref1/400/400']), isPinned: 0, order: 3 },
];
for (const p of sakuraProducts) {
  if (!db.prepare('SELECT id FROM Product WHERE creatorId = ? AND title = ?').get(sakuraId, p.title)) {
    db.prepare(`INSERT INTO Product (id, creatorId, title, description, price, category, type, images, isPinned, "order", isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`)
      .run(cuid(), sakuraId, p.title, p.description, p.price, p.category, p.type, p.images, p.isPinned, p.order, now, now);
  }
}
console.log('Sakura products OK');

// Products — akira_mochi
const akiraId = profiles['akira_mochi'];
const akiraProducts = [
  { title: 'Summer Rain Doujinshi', description: 'A 32-page slice-of-life romance doujin. B5 size, full color cover.', price: 2200, category: 'Doujinshi', type: 'PHYSICAL', images: JSON.stringify(['https://picsum.photos/seed/rain1/400/400']), isPinned: 1, order: 0 },
  { title: 'Moonlight Sketch Collection', description: 'Digital PDF — 20 loose sketches from 2025, signed edition.', price: 1200, category: 'Artbook', type: 'DIGITAL', images: JSON.stringify(['https://picsum.photos/seed/moon1/400/400']), isPinned: 0, order: 1 },
];
for (const p of akiraProducts) {
  if (!db.prepare('SELECT id FROM Product WHERE creatorId = ? AND title = ?').get(akiraId, p.title)) {
    db.prepare(`INSERT INTO Product (id, creatorId, title, description, price, category, type, images, isPinned, "order", isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`)
      .run(cuid(), akiraId, p.title, p.description, p.price, p.category, p.type, p.images, p.isPinned, p.order, now, now);
  }
}
console.log('Akira products OK');

// Videos — sakura_arts
const videoData = [
  { title: 'My Cosplay Process — Magical Girl Costume Build', platform: 'YOUTUBE', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', embedId: 'dQw4w9WgXcQ', description: 'Full timelapse of my latest costume build from scratch to final reveal!', order: 0 },
  { title: 'Sticker Pack Unboxing & Review', platform: 'YOUTUBE', url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', embedId: 'jNQXAC9IVRw', description: 'Reviewing the print quality of my new holographic sticker batch.', order: 1 },
  { title: 'Comic Fiesta 2025 Table Vlog', platform: 'YOUTUBE', url: 'https://www.youtube.com/watch?v=9bZkp7q19f0', embedId: '9bZkp7q19f0', description: 'My experience tabling at CF2025 — setup, sales, and meeting fans!', order: 2 },
];
for (const v of videoData) {
  if (!db.prepare('SELECT id FROM Video WHERE creatorId = ? AND title = ?').get(sakuraId, v.title)) {
    db.prepare(`INSERT INTO Video (id, creatorId, title, platform, url, embedId, description, "order", isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`)
      .run(cuid(), sakuraId, v.title, v.platform, v.url, v.embedId, v.description, v.order, now);
  }
}
console.log('Videos OK');

// Support tiers — sakura_arts
const tierData = [
  { name: 'Sakura Bud', priceUsd: 300, description: 'Entry level support — help me keep creating!', perks: JSON.stringify(['Early access to WIP sketches', 'Monthly thank-you postcard (digital)', 'Name in credits']), order: 0, subscriberCount: 12 },
  { name: 'Sakura Bloom', priceUsd: 800, description: 'Exclusive behind-the-scenes content every month.', perks: JSON.stringify(['Everything in Bud', 'HD process videos', 'Monthly desktop wallpaper', 'Discord supporter role']), order: 1, subscriberCount: 7 },
  { name: 'Sakura Legend', priceUsd: 2000, description: 'For my most dedicated supporters — you make the magic happen.', perks: JSON.stringify(['Everything in Bloom', '1 custom sketch per quarter', 'Name in artbook credits', 'Physical postcard each month']), order: 2, subscriberCount: 2 },
];
for (const t of tierData) {
  if (!db.prepare('SELECT id FROM SupportTier WHERE creatorId = ? AND name = ?').get(sakuraId, t.name)) {
    db.prepare(`INSERT INTO SupportTier (id, creatorId, name, priceUsd, description, perks, isActive, subscriberCount, "order", createdAt) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`)
      .run(cuid(), sakuraId, t.name, t.priceUsd, t.description, t.perks, t.subscriberCount, t.order, now);
  }
}
console.log('Support tiers OK');

// Support goal — sakura_arts
if (!db.prepare('SELECT id FROM SupportGoal WHERE creatorId = ?').get(sakuraId)) {
  db.prepare(`INSERT INTO SupportGoal (id, creatorId, title, description, targetAmountUsd, currentAmountUsd, deadline, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`)
    .run(cuid(), sakuraId,
      'Comic Fiesta 2026 Table Fund',
      'Help me secure a table at Comic Fiesta 2026! Funds will cover table fees, printing, and travel from Penang.',
      50000, 18500, '2026-10-01T00:00:00.000Z', now, now);
}
console.log('Support goal OK');

// Support gift config — sakura_arts
if (!db.prepare('SELECT id FROM SupportGift WHERE creatorId = ?').get(sakuraId)) {
  db.prepare(`INSERT INTO SupportGift (id, creatorId, isActive, presetAmounts, thankYouMessage, totalReceived, giftCount) VALUES (?, ?, 1, ?, ?, ?, ?)`)
    .run(cuid(), sakuraId,
      JSON.stringify([3, 5, 10, 25, 50]),
      'Your support means everything to me — every gift helps me keep making art. Arigatou!',
      15200, 48);
}
console.log('Support gift OK');

db.pragma('foreign_keys = ON');
db.close();
console.log('\n✅ Seed complete!');
