/**
 * Restores missing UI seed data to Supabase:
 * - Secondary nav items (All Categories, Creators, Blog, WCS Malaysia, Start Selling)
 * - Sitewide popup ad (WCS Malaysia 2026)
 * - sakura_arts creator popup settings
 * - Videos for sakura_arts
 * - Support tiers, goal, and gift config for sakura_arts
 * - POD providers for sakura_arts
 *
 * Run: node prisma/seeds/restore-ui-data.mjs
 */

import 'dotenv/config';
import pg from 'pg';
import crypto from 'crypto';

function createId() {
  return 'c' + crypto.randomBytes(11).toString('base64url').slice(0, 24);
}

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('ERROR: DATABASE_URL_DIRECT or DATABASE_URL must be set');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });
const now = new Date().toISOString();

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

// ── 1. Secondary nav items ───────────────────────────────────────────────────

const navItems = [
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
];

async function seedNav() {
  console.log('\n── Nav items ───────────────────────────────────────────────────────────────');
  for (const item of navItems) {
    const existing = await query(
      'SELECT id FROM "NavItem" WHERE label = $1 AND "navType" = $2',
      [item.label, item.navType]
    );
    if (existing.rows.length > 0) {
      await query(
        `UPDATE "NavItem" SET url=$1, position=$2, "order"=$3, "dropdownType"=$4, "dropdownContent"=$5,
         "openInNewTab"=$6, "isActive"=$7, "updatedAt"=$8 WHERE id=$9`,
        [item.url, item.position, item.order, item.dropdownType,
         JSON.stringify(item.dropdownContent), item.openInNewTab, item.isActive,
         now, existing.rows[0].id]
      );
      console.log(`  Updated: ${item.label}`);
    } else {
      await query(
        `INSERT INTO "NavItem" (id, label, url, "navType", position, "order", "dropdownType", "dropdownContent", "openInNewTab", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [createId(), item.label, item.url, item.navType, item.position, item.order,
         item.dropdownType, JSON.stringify(item.dropdownContent),
         item.openInNewTab, item.isActive, now, now]
      );
      console.log(`  Created: ${item.label}`);
    }
  }
  console.log('✅ Nav items done');
}

// ── 2. Sitewide popup ad ─────────────────────────────────────────────────────

async function seedPopup() {
  console.log('\n── Sitewide popup ──────────────────────────────────────────────────────────');
  const existing = await query(`SELECT id FROM "PopupAd" WHERE id = 'popup_wcs2026'`);
  if (existing.rows.length > 0) {
    await query(
      `UPDATE "PopupAd" SET "imageUrl"=$1, "ctaText"=$2, "isActive"=$3, "updatedAt"=$4 WHERE id='popup_wcs2026'`,
      ['https://picsum.photos/seed/wcsmalaysia/520/280', 'Register Now →', true, now]
    );
    console.log('  Updated: popup_wcs2026');
  } else {
    await query(
      `INSERT INTO "PopupAd" (id, title, description, "imageUrl", "ctaText", "ctaLink", "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        'popup_wcs2026',
        'WCS Malaysia 2026 is Coming!',
        'World Cosplay Summit Malaysia returns this August. Early bird creator tables now open. Limited slots available.',
        'https://picsum.photos/seed/wcsmalaysia/520/280',
        'Register Now →',
        '/about',
        true,
        now, now,
      ]
    );
    console.log('  Created: popup_wcs2026');
  }
  console.log('✅ Popup done');
}

// ── 3. sakura_arts creator popup settings ────────────────────────────────────

async function seedCreatorPopup(sakuraId) {
  console.log('\n── Creator popup (sakura_arts) ─────────────────────────────────────────────');
  await query(
    `UPDATE "CreatorProfile" SET
      "popupEnabled"=true,
      "popupTitle"='Commission Slots Closing This Friday!',
      "popupDescription"='Only 2 slots left for April. DM me now before they''re gone — I won''t be opening again until June.',
      "popupImageUrl"='https://picsum.photos/seed/sakuracommission/520/280',
      "popupCtaText"='Message Me Now →',
      "popupCtaLink"='/creator/sakura_arts#commission',
      "popupBadgeText"='🎉 2 slots left this Friday!'
    WHERE username='sakura_arts'`
  );
  console.log('  Updated: sakura_arts popup settings');
  console.log('✅ Creator popup done');
}

// ── 4. Videos for sakura_arts ────────────────────────────────────────────────

const videos = [
  {
    title: 'My Comic Fiesta 2024 Highlights',
    platform: 'YOUTUBE',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    embedId: 'dQw4w9WgXcQ',
    description: 'Behind the scenes at CF2024 — table setup, meet and greet, and my favourite cosplays of the day!',
    order: 0,
  },
  {
    title: 'Commission Process Speed Paint — OC Portrait',
    platform: 'YOUTUBE',
    url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
    embedId: '9bZkp7q19f0',
    description: 'Full speed paint of a recent OC commission from sketch to final render. Tools: Procreate on iPad Pro.',
    order: 1,
  },
  {
    title: 'Sticker Making Process — From Design to Print',
    platform: 'YOUTUBE',
    url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    embedId: 'M7lc1UVf-VE',
    description: 'How I design, prepare, and order my die-cut stickers. Full process from Procreate to finished product.',
    order: 2,
  },
];

async function seedVideos(sakuraId) {
  console.log('\n── Videos (sakura_arts) ────────────────────────────────────────────────────');
  for (const v of videos) {
    const existing = await query(
      'SELECT id FROM "Video" WHERE "creatorId" = $1 AND title = $2',
      [sakuraId, v.title]
    );
    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO "Video" (id, "creatorId", title, platform, url, "embedId", description, "order", "isActive", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)`,
        [createId(), sakuraId, v.title, v.platform, v.url, v.embedId, v.description, v.order, now]
      );
      console.log(`  Created: ${v.title}`);
    } else {
      console.log(`  Exists:  ${v.title}`);
    }
  }
  console.log('✅ Videos done');
}

// ── 5. Support tiers, goal, gift ─────────────────────────────────────────────

const supportTiers = [
  {
    name: 'Sketchbook Supporter',
    priceUsd: 300,
    description: 'Support my art journey and get exclusive early access to works in progress!',
    perks: ['Early access to WIP sketches', 'Name in artwork credits', 'Monthly wallpaper download', 'Discord supporter role'],
    order: 0,
    subscriberCount: 24,
  },
  {
    name: 'Artbook Backer',
    priceUsd: 800,
    description: 'Get everything in Sketchbook plus exclusive monthly content and priority commission queue!',
    perks: ['All Sketchbook perks', 'Monthly exclusive illustration', 'Priority commission queue', 'Vote on next artwork theme', 'Signed digital artbook (yearly)'],
    order: 1,
    subscriberCount: 12,
  },
  {
    name: 'Studio Patron',
    priceUsd: 2000,
    description: 'My most dedicated supporters. Get everything plus monthly sticker pack shipped to you!',
    perks: ['All Artbook perks', 'Monthly physical sticker pack (shipped)', '1 free chibi commission per quarter', 'Exclusive Patron-only Discord channel', 'Input on original character designs'],
    order: 2,
    subscriberCount: 5,
  },
];

async function seedSupport(sakuraId) {
  console.log('\n── Support tiers (sakura_arts) ─────────────────────────────────────────────');
  for (const t of supportTiers) {
    const existing = await query(
      'SELECT id FROM "SupportTier" WHERE "creatorId" = $1 AND name = $2',
      [sakuraId, t.name]
    );
    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO "SupportTier" (id, "creatorId", name, "priceUsd", description, perks, "isActive", "subscriberCount", "order", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9)`,
        [createId(), sakuraId, t.name, t.priceUsd, t.description,
         JSON.stringify(t.perks), t.subscriberCount, t.order, now]
      );
      console.log(`  Created tier: ${t.name}`);
    } else {
      console.log(`  Exists tier: ${t.name}`);
    }
  }

  console.log('\n── Support goal (sakura_arts) ──────────────────────────────────────────────');
  const goalExists = await query('SELECT id FROM "SupportGoal" WHERE "creatorId" = $1', [sakuraId]);
  if (goalExists.rows.length === 0) {
    await query(
      `INSERT INTO "SupportGoal" (id, "creatorId", title, description, "targetAmountUsd", "currentAmountUsd", deadline, status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8, $9)`,
      [
        createId(), sakuraId,
        'Comic Fiesta 2025 Table Fund',
        'Help me fund my table at Comic Fiesta 2025! Funds will cover table fee (RM400), printing costs for new merchandise (RM600), and travel from KL. Every contribution gets a thank you sticker pack!',
        50000, 32000, new Date('2025-12-01').toISOString(), now, now,
      ]
    );
    console.log('  Created: support goal');
  } else {
    console.log('  Exists:  support goal');
  }

  console.log('\n── Support gift config (sakura_arts) ───────────────────────────────────────');
  const giftExists = await query('SELECT id FROM "SupportGift" WHERE "creatorId" = $1', [sakuraId]);
  if (giftExists.rows.length === 0) {
    await query(
      `INSERT INTO "SupportGift" (id, "creatorId", "isActive", "presetAmounts", "thankYouMessage", "totalReceived", "giftCount", "monthlyGiftCount", "monthlyGifterCount")
       VALUES ($1, $2, true, $3, $4, $5, $6, $7, $8)`,
      [
        createId(), sakuraId,
        JSON.stringify([3, 5, 10, 25, 50]),
        'Your support means everything to me — every gift helps me keep making art. Arigatou!',
        15200, 48, 8, 5,
      ]
    );
    console.log('  Created: support gift config');
  } else {
    console.log('  Exists:  support gift config');
  }

  console.log('✅ Support data done');
}

// ── 6. POD providers for sakura_arts ─────────────────────────────────────────

async function seedPod(sakuraId) {
  console.log('\n── POD providers (sakura_arts) ─────────────────────────────────────────────');
  const printifyExists = await query(
    'SELECT id FROM "CreatorPodProvider" WHERE "creatorId" = $1 AND name = $2',
    [sakuraId, 'PRINTIFY']
  );
  if (printifyExists.rows.length === 0) {
    await query(
      `INSERT INTO "CreatorPodProvider" (id, "creatorId", name, "storeUrl", notes, "isDefault", "defaultProductionDays", "shippingMY", "shippingSG", "shippingPH", "shippingIntl", "createdAt", "updatedAt")
       VALUES ($1, $2, 'PRINTIFY', $3, $4, true, 7, 7, 10, 14, 21, $5, $6)`,
      [createId(), sakuraId, 'https://printify.com/app/store/12345', 'Main POD store for apparel', now, now]
    );
    console.log('  Created: Printify provider');
  } else {
    console.log('  Exists:  Printify provider');
  }

  const localExists = await query(
    'SELECT id FROM "CreatorPodProvider" WHERE "creatorId" = $1 AND name = $2',
    [sakuraId, 'LOCAL_PRINT_SHOP']
  );
  if (localExists.rows.length === 0) {
    await query(
      `INSERT INTO "CreatorPodProvider" (id, "creatorId", name, "customName", notes, "isDefault", "defaultProductionDays", "shippingMY", "shippingSG", "shippingPH", "shippingIntl", "createdAt", "updatedAt")
       VALUES ($1, $2, 'LOCAL_PRINT_SHOP', 'Sunny Print KL', $3, false, 3, 3, 7, 10, 0, $4, $5)`,
      [createId(), sakuraId, 'Local shop in Bangsar, KL. Great for art prints. Ships MY/SG only.', now, now]
    );
    console.log('  Created: Local Print Shop provider');
  } else {
    console.log('  Exists:  Local Print Shop provider');
  }

  console.log('✅ POD providers done');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 restore-ui-data: starting...');

  // Resolve sakura_arts profile ID
  const sakuraResult = await query(
    'SELECT id FROM "CreatorProfile" WHERE username = $1',
    ['sakura_arts']
  );
  if (sakuraResult.rows.length === 0) {
    console.error('ERROR: sakura_arts profile not found. Run main seed first.');
    process.exit(1);
  }
  const sakuraId = sakuraResult.rows[0].id;
  console.log(`sakura_arts profile id: ${sakuraId}`);

  await seedNav();
  await seedPopup();
  await seedCreatorPopup(sakuraId);
  await seedVideos(sakuraId);
  await seedSupport(sakuraId);
  await seedPod(sakuraId);

  console.log('\n🎉 restore-ui-data complete!');
  console.log('   - Secondary nav: 5 items (All Categories, Creators, Blog, WCS Malaysia, Start Selling)');
  console.log('   - Sitewide popup: WCS Malaysia 2026');
  console.log('   - sakura_arts creator popup enabled');
  console.log('   - Videos: 3 YouTube videos for sakura_arts');
  console.log('   - Support: 3 tiers + 1 goal + gift config for sakura_arts');
  console.log('   - POD: Printify + Local Print Shop providers for sakura_arts');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
