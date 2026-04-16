// Seeds root dev.db (what the Next.js app actually reads)
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const db = new Database('./dev.db');
db.pragma('foreign_keys = OFF');
function cuid() { return 'c' + crypto.randomBytes(11).toString('hex'); }
const now = new Date().toISOString();

// Platform settings
db.prepare("INSERT OR REPLACE INTO PlatformSettings (id,processingFeePercent,platformFeePercent,withdrawalFeePercent,topCreatorThreshold) VALUES ('default',2.5,0,4.0,100)").run();
console.log('Platform settings OK');

// Admin
const adminPwd = bcrypt.hashSync('admin123', 10);
if (!db.prepare("SELECT id FROM User WHERE email='admin@noizu.direct'").get()) {
  db.prepare("INSERT INTO User (id,email,password,name,role,createdAt,updatedAt) VALUES (?,?,?,?,'ADMIN',?,?)").run(cuid(),'admin@noizu.direct',adminPwd,'Admin',now,now);
}
console.log('Admin OK');

const creatorPwd = bcrypt.hashSync('creator123', 10);
const buyerPwd = bcrypt.hashSync('buyer123', 10);

// sakura_arts user + profile
let sakuraUser = db.prepare("SELECT id FROM User WHERE email='sakura@example.com'").get();
if (!sakuraUser) {
  const uid = cuid();
  db.prepare("INSERT INTO User (id,email,password,name,role,createdAt,updatedAt) VALUES (?,?,?,?,'CREATOR',?,?)").run(uid,'sakura@example.com',creatorPwd,'Sakura Tanaka',now,now);
  sakuraUser = { id: uid };
}

let sakura = db.prepare("SELECT id FROM CreatorProfile WHERE username='sakura_arts'").get();
if (!sakura) {
  const pid = cuid();
  db.prepare([
    'INSERT INTO CreatorProfile',
    '(id,userId,username,displayName,bio,socialLinks,categoryTags,commissionStatus,',
    'commissionDescription,commissionPricing,badges,isVerified,isTopCreator,totalSales,',
    'absorbProcessingFee,announcementActive,featuredProductIds,isSuspended,createdAt)',
    'VALUES (?,?,?,?,?,?,?,?,?,?,?,1,1,247,0,0,?,0,?)',
  ].join(' ')).run(
    pid, sakuraUser.id, 'sakura_arts', 'Sakura Arts',
    'Cosplay artist & doujin creator from KL. Specializing in magical girl and mecha series.',
    JSON.stringify({ twitter: 'https://twitter.com/sakura_arts_my', instagram: 'https://instagram.com/sakura_arts_my' }),
    JSON.stringify(['Cosplay', 'Doujin', 'Digital Art', 'Prints']),
    'OPEN',
    'I create high-quality prints, stickers, and digital art. Message me for custom commissions!',
    JSON.stringify([
      { tier: 'Bust', price: 35, description: 'Bust-up portrait, colored' },
      { tier: 'Full Body', price: 75, description: 'Full body, colored' },
    ]),
    JSON.stringify(['Fan Favorite']),
    JSON.stringify([]),
    now
  );
  sakura = { id: pid };
}
const sakuraId = sakura.id;
console.log('sakura_arts profile:', sakuraId);

// Videos
const videos = [
  { title: 'My Cosplay Process — Magical Girl Costume Build', platform: 'YOUTUBE', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', embedId: 'dQw4w9WgXcQ', description: 'Full timelapse of my latest costume build from scratch to final reveal!', order: 0 },
  { title: 'Sticker Pack Unboxing & Review', platform: 'YOUTUBE', url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', embedId: 'jNQXAC9IVRw', description: 'Reviewing the print quality of my new holographic sticker batch.', order: 1 },
  { title: 'Comic Fiesta 2025 Table Vlog', platform: 'YOUTUBE', url: 'https://www.youtube.com/watch?v=9bZkp7q19f0', embedId: '9bZkp7q19f0', description: 'My experience tabling at CF2025 — setup, sales, and meeting fans!', order: 2 },
];
for (const v of videos) {
  if (!db.prepare('SELECT id FROM Video WHERE creatorId=? AND title=?').get(sakuraId, v.title)) {
    db.prepare('INSERT INTO Video (id,creatorId,title,platform,url,embedId,description,"order",isActive,createdAt) VALUES (?,?,?,?,?,?,?,?,1,?)').run(cuid(), sakuraId, v.title, v.platform, v.url, v.embedId, v.description, v.order, now);
  }
}
console.log('Videos:', db.prepare('SELECT COUNT(*) as n FROM Video WHERE creatorId=?').get(sakuraId).n);

// Support tiers
const tiers = [
  { name: 'Sakura Bud', priceUsd: 300, description: 'Entry level support!', perks: JSON.stringify(['Early access to WIP sketches', 'Monthly thank-you postcard (digital)', 'Name in credits']), order: 0, subs: 12 },
  { name: 'Sakura Bloom', priceUsd: 800, description: 'Exclusive behind-the-scenes content every month.', perks: JSON.stringify(['Everything in Bud', 'HD process videos', 'Monthly desktop wallpaper', 'Discord supporter role']), order: 1, subs: 7 },
  { name: 'Sakura Legend', priceUsd: 2000, description: 'For my most dedicated supporters.', perks: JSON.stringify(['Everything in Bloom', '1 custom sketch per quarter', 'Physical postcard each month']), order: 2, subs: 2 },
];
for (const t of tiers) {
  if (!db.prepare('SELECT id FROM SupportTier WHERE creatorId=? AND name=?').get(sakuraId, t.name)) {
    db.prepare('INSERT INTO SupportTier (id,creatorId,name,priceUsd,description,perks,isActive,subscriberCount,"order",createdAt) VALUES (?,?,?,?,?,?,1,?,?,?)').run(cuid(), sakuraId, t.name, t.priceUsd, t.description, t.perks, t.subs, t.order, now);
  }
}
console.log('Tiers:', db.prepare('SELECT COUNT(*) as n FROM SupportTier WHERE creatorId=?').get(sakuraId).n);

// Support goal
if (!db.prepare('SELECT id FROM SupportGoal WHERE creatorId=?').get(sakuraId)) {
  db.prepare('INSERT INTO SupportGoal (id,creatorId,title,description,targetAmountUsd,currentAmountUsd,deadline,status,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
    cuid(), sakuraId,
    'Comic Fiesta 2026 Table Fund',
    'Help me secure a table at Comic Fiesta 2026! Funds will cover table fees, printing, and travel from Penang.',
    50000, 18500, '2026-10-01T00:00:00.000Z', 'ACTIVE', now, now
  );
}
console.log('Goal seeded');

// Support gift
if (!db.prepare('SELECT id FROM SupportGift WHERE creatorId=?').get(sakuraId)) {
  db.prepare('INSERT INTO SupportGift (id,creatorId,isActive,presetAmounts,thankYouMessage,totalReceived,giftCount) VALUES (?,?,1,?,?,?,?)').run(
    cuid(), sakuraId,
    JSON.stringify([3, 5, 10, 25, 50]),
    'Your support means everything to me — every gift helps me keep making art!',
    15200, 48
  );
}
console.log('Gift seeded');

// Products
const products = [
  { title: 'Magical Girl Print Set', desc: 'A4 print set featuring original magical girl characters. High quality matte finish.', price: 1800, cat: 'Print', type: 'PHYSICAL', imgs: JSON.stringify(['https://picsum.photos/seed/mg1/400/400', 'https://picsum.photos/seed/mg2/400/400']), pin: 1, ord: 0 },
  { title: 'Mecha Pilot Sticker Pack', desc: '10-piece holographic sticker set with original mecha designs.', price: 800, cat: 'Sticker', type: 'PHYSICAL', imgs: JSON.stringify(['https://picsum.photos/seed/mech1/400/400']), pin: 0, ord: 1 },
  { title: 'Sakura Digital Artbook Vol.1', desc: 'PDF artbook with 40+ pages of original digital art. Instant download.', price: 1500, cat: 'Artbook', type: 'DIGITAL', imgs: JSON.stringify(['https://picsum.photos/seed/art1/400/400']), pin: 1, ord: 2 },
];
for (const p of products) {
  if (!db.prepare('SELECT id FROM Product WHERE creatorId=? AND title=?').get(sakuraId, p.title)) {
    db.prepare('INSERT INTO Product (id,creatorId,title,description,price,category,type,images,isPinned,"order",isActive,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?)').run(cuid(), sakuraId, p.title, p.desc, p.price, p.cat, p.type, p.imgs, p.pin, p.ord, now, now);
  }
}
console.log('Products:', db.prepare('SELECT COUNT(*) as n FROM Product WHERE creatorId=?').get(sakuraId).n);

// Buyers
for (const b of [{ e: 'hana@example.com', n: 'Hana Lee' }, { e: 'ryo@example.com', n: 'Ryo Tanaka' }, { e: 'mia@example.com', n: 'Mia Santos' }]) {
  if (!db.prepare('SELECT id FROM User WHERE email=?').get(b.e)) {
    db.prepare("INSERT INTO User (id,email,password,name,role,createdAt,updatedAt) VALUES (?,?,?,?,'BUYER',?,?)").run(cuid(), b.e, buyerPwd, b.n, now, now);
  }
}
console.log('Buyers OK');

// akira_mochi
let akiraUser = db.prepare("SELECT id FROM User WHERE email='akira@example.com'").get();
if (!akiraUser) {
  const uid = cuid();
  db.prepare("INSERT INTO User (id,email,password,name,role,createdAt,updatedAt) VALUES (?,?,?,?,'CREATOR',?,?)").run(uid, 'akira@example.com', creatorPwd, 'Akira Mochizuki', now, now);
  akiraUser = { id: uid };
}
let akira = db.prepare("SELECT id FROM CreatorProfile WHERE username='akira_mochi'").get();
if (!akira) {
  const pid = cuid();
  db.prepare([
    'INSERT INTO CreatorProfile',
    '(id,userId,username,displayName,bio,socialLinks,categoryTags,commissionStatus,',
    'commissionDescription,commissionPricing,badges,isVerified,isTopCreator,totalSales,',
    'absorbProcessingFee,announcementActive,featuredProductIds,isSuspended,createdAt)',
    'VALUES (?,?,?,?,?,?,?,?,?,?,?,1,0,89,0,0,?,0,?)',
  ].join(' ')).run(
    pid, akiraUser.id, 'akira_mochi', 'AkiraMochi',
    'Indie comic artist & illustrator. Lover of slice-of-life and romance manga.',
    JSON.stringify({ twitter: 'https://twitter.com/akira_mochi' }),
    JSON.stringify(['Manga', 'Illustration', 'Comics']),
    'LIMITED',
    'Currently accepting a small batch of commissions. Fast turnaround, mostly character work.',
    JSON.stringify([{ tier: 'Sketch', price: 20, description: 'Black and white sketch' }]),
    JSON.stringify([]),
    JSON.stringify([]),
    now
  );
  akira = { id: pid };
}
const akiraId = akira.id;
const akiraProducts = [
  { title: 'Summer Rain Doujinshi', desc: 'A 32-page slice-of-life romance doujin. B5 size, full color cover.', price: 2200, cat: 'Doujinshi', type: 'PHYSICAL', imgs: JSON.stringify(['https://picsum.photos/seed/rain1/400/400']), pin: 1, ord: 0 },
  { title: 'Moonlight Sketch Collection', desc: 'Digital PDF — 20 loose sketches from 2025.', price: 1200, cat: 'Artbook', type: 'DIGITAL', imgs: JSON.stringify(['https://picsum.photos/seed/moon1/400/400']), pin: 0, ord: 1 },
];
for (const p of akiraProducts) {
  if (!db.prepare('SELECT id FROM Product WHERE creatorId=? AND title=?').get(akiraId, p.title)) {
    db.prepare('INSERT INTO Product (id,creatorId,title,description,price,category,type,images,isPinned,"order",isActive,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?)').run(cuid(), akiraId, p.title, p.desc, p.price, p.cat, p.type, p.imgs, p.pin, p.ord, now, now);
  }
}
console.log('akira_mochi:', akiraId);

// Admin sitewide popup
const popupExists = db.prepare("SELECT id FROM PopupAd WHERE id='popup_wcs2026'").get();
if (!popupExists) {
  db.prepare(`INSERT INTO PopupAd (id,title,description,imageUrl,ctaText,ctaLink,isActive,createdAt,updatedAt)
    VALUES (?,?,?,?,?,?,1,?,?)`).run(
    'popup_wcs2026',
    'WCS Malaysia 2026 is Coming!',
    'World Cosplay Summit Malaysia returns this August. Early bird creator tables now open. Limited slots available.',
    'https://picsum.photos/seed/wcsmalaysia/520/280',
    'Register Now →',
    '/about',
    now, now
  );
} else {
  db.prepare(`UPDATE PopupAd SET
    imageUrl='https://picsum.photos/seed/wcsmalaysia/520/280',
    ctaText='Register Now →'
    WHERE id='popup_wcs2026'`).run();
}
console.log('Admin popup seeded');

// sakura_arts popup settings
db.prepare(`UPDATE CreatorProfile SET
  popupEnabled=1,
  popupTitle='Commission Slots Closing This Friday!',
  popupDescription='Only 2 slots left for April. DM me now before they''re gone — I won''t be opening again until June.',
  popupImageUrl='https://picsum.photos/seed/sakuracommission/520/280',
  popupCtaText='Message Me Now →',
  popupCtaLink='/creator/sakura_arts#commission',
  popupBadgeText='🎉 2 slots left this Friday!'
  WHERE username='sakura_arts'`).run();
console.log('sakura_arts popup seeded');

db.pragma('foreign_keys = ON');
db.close();
console.log('\n✅ root dev.db seeded!');
