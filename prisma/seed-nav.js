// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3')
const path = require('path')
const crypto = require('crypto')

const DB_PATH = path.join(__dirname, '..', 'dev.db')
const db = new Database(DB_PATH)

function cuid() {
  return 'c' + crypto.randomBytes(11).toString('base64url').slice(0, 24)
}

function upsert(item) {
  const existing = db.prepare('SELECT id FROM NavItem WHERE label = ? AND navType = ?').get(item.label, item.navType)
  if (existing) {
    db.prepare(`
      UPDATE NavItem SET
        url = ?, position = ?, "order" = ?, dropdownType = ?,
        dropdownContent = ?, openInNewTab = ?, isActive = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(item.url, item.position, item.order, item.dropdownType,
      JSON.stringify(item.dropdownContent), item.openInNewTab ? 1 : 0,
      item.isActive ? 1 : 0, existing.id)
    console.log(`  Updated: ${item.label}`)
  } else {
    db.prepare(`
      INSERT INTO NavItem (id, label, url, navType, position, "order", dropdownType, dropdownContent, openInNewTab, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(cuid(), item.label, item.url, item.navType, item.position,
      item.order, item.dropdownType, JSON.stringify(item.dropdownContent),
      item.openInNewTab ? 1 : 0, item.isActive ? 1 : 0)
    console.log(`  Created: ${item.label}`)
  }
}

const navItems = [
  // ── All Categories — MEGA_MENU ───────────────────────────────────────────────
  {
    label: 'All Categories',
    url: '/marketplace',
    navType: 'SECONDARY',
    position: 'LEFT',
    order: 0,
    dropdownType: 'MEGA_MENU',
    dropdownContent: {
      columns: [
        {
          heading: '🎨 Digital',
          items: [
            { label: 'Digital Art', url: '/marketplace?category=digital-art' },
            { label: 'Doujin', url: '/marketplace?category=doujin' },
            { label: 'Illustrations', url: '/marketplace?category=illustrations' },
            { label: 'Sticker Sheets', url: '/marketplace?category=sticker-sheets' },
            { label: 'Wallpapers', url: '/marketplace?category=wallpapers' },
            { label: 'Art Prints', url: '/marketplace?category=art-prints' },
          ],
        },
        {
          heading: '📦 Physical',
          items: [
            { label: 'Cosplay Prints', url: '/marketplace?category=cosplay-prints' },
            { label: 'Physical Merch', url: '/marketplace?category=merch' },
            { label: 'Props & Accessories', url: '/marketplace?category=props' },
            { label: 'Photobooks', url: '/marketplace?category=photobooks' },
            { label: 'Keychains', url: '/marketplace?category=keychains' },
            { label: 'Apparel', url: '/marketplace?category=apparel' },
          ],
        },
        {
          heading: '👥 Creators',
          items: [
            { label: 'Browse All', url: '/creators' },
            { label: 'Top Creators', url: '/creators?filter=top' },
            { label: 'Verified Creators', url: '/creators?filter=verified' },
            { label: 'New This Week', url: '/creators?filter=new' },
            { label: 'Convention Veterans', url: '/creators?filter=convention' },
            { label: 'NOIZU Members', url: '/creators?filter=noizu' },
          ],
        },
      ],
      featured: {
        headline: 'New Drops This Week',
        subtext: 'Fresh art direct from SEA creators',
        ctaText: 'Shop Now',
        ctaUrl: '/marketplace?sort=newest',
      },
      bottomBarText: 'View all categories →',
      bottomBarUrl: '/marketplace',
    },
    openInNewTab: false,
    isActive: true,
  },

  // ── Creators — SIMPLE_LIST ───────────────────────────────────────────────────
  {
    label: 'Creators',
    url: '/creators',
    navType: 'SECONDARY',
    position: 'LEFT',
    order: 1,
    dropdownType: 'SIMPLE_LIST',
    dropdownContent: {
      groups: [
        {
          heading: 'DISCOVER',
          items: [
            { label: 'Browse All Creators', url: '/creators' },
            { label: 'Top Creators', url: '/creators?filter=top' },
            { label: 'Verified Creators', url: '/creators?filter=verified' },
            { label: 'New This Week', url: '/creators?filter=new' },
          ],
        },
        {
          heading: 'JOIN US',
          items: [
            { label: 'Become a Creator', url: '/start-selling' },
            { label: 'Creator Handbook', url: '/handbook' },
            { label: 'Fees & Payouts', url: '/fees' },
          ],
        },
      ],
    },
    openInNewTab: false,
    isActive: true,
  },

  // ── Blog — SIMPLE_LIST ───────────────────────────────────────────────────────
  {
    label: 'Blog',
    url: '/blog',
    navType: 'SECONDARY',
    position: 'LEFT',
    order: 2,
    dropdownType: 'SIMPLE_LIST',
    dropdownContent: {
      groups: [
        {
          heading: 'LATEST',
          items: [
            { label: 'Latest Posts', url: '/blog' },
            { label: 'Creator Stories', url: '/blog?tag=stories' },
            { label: 'Guides & Tips', url: '/blog?tag=guides' },
          ],
        },
        {
          heading: 'POPULAR',
          items: [
            { label: 'How to Set Up Your Store', url: '/blog/how-to-set-up-your-store' },
            { label: 'Pricing Your Commissions', url: '/blog/pricing-your-commissions' },
            { label: 'Digital vs Physical', url: '/blog/digital-vs-physical' },
          ],
        },
      ],
    },
    openInNewTab: false,
    isActive: true,
  },

  // ── WCS Malaysia — FEATURE_CARD ──────────────────────────────────────────────
  {
    label: 'WCS Malaysia',
    url: '/creator/wcs-malaysia',
    navType: 'SECONDARY',
    position: 'LEFT',
    order: 3,
    dropdownType: 'FEATURE_CARD',
    dropdownContent: {
      image: 'https://picsum.photos/seed/wcsmalaysia2026/380/140',
      heading: 'WCS Malaysia 2026',
      description: 'Your path to the world cosplay stage',
      stats: [
        { value: '500+', label: 'Creators' },
        { value: '10K+', label: 'Products' },
        { value: '50K+', label: 'Fans' },
      ],
      ctaText: 'Learn More',
      ctaUrl: '/about',
      items: [
        { label: 'Registration Open', url: '/registration' },
        { label: 'Creator Tables Available', url: '/creator-tables' },
        { label: 'View Event Schedule', url: '/schedule' },
        { label: 'Past Champions Gallery', url: '/champions' },
      ],
    },
    openInNewTab: false,
    isActive: true,
  },

  // ── Start Selling — pill button (no dropdown) ────────────────────────────────
  {
    label: 'Start Selling',
    url: '/start-selling',
    navType: 'SECONDARY',
    position: 'RIGHT',
    order: 0,
    dropdownType: 'NONE',
    dropdownContent: {},
    openInNewTab: false,
    isActive: true,
  },
]

console.log('Seeding nav items...')
for (const item of navItems) {
  upsert(item)
}
console.log('Done.')
db.close()
