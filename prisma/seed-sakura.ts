import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
const p = new PrismaClient({ adapter } as any)

async function main() {
  const creator = await p.creatorProfile.findFirst({
    where: { username: 'sakura_arts' },
    include: { user: true },
  })
  if (!creator) { console.log('Sakura Arts not found'); return }

  const creatorId = creator.id
  const userId = creator.user.id
  console.log('Seeding for:', creator.displayName, '|', userId)

  // ── Creator profile ─────────────────────────────────────────────────────────
  const portfolioItems = [
    { title: 'Hana — Spring Festival',      category: 'Digital Art',    image: 'https://picsum.photos/seed/port_s1/400/600' },
    { title: 'Kazuha Fan Art',              category: 'Fan Art',        image: 'https://picsum.photos/seed/port_s2/400/500' },
    { title: 'Comic Fiesta 2024 Print',     category: 'Cosplay Print',  image: 'https://picsum.photos/seed/port_s3/400/400' },
    { title: 'OC Commission — Rei',         category: 'Commission',     image: 'https://picsum.photos/seed/port_s4/400/600' },
    { title: 'Yokai Academy Cover Art',     category: 'Original',       image: 'https://picsum.photos/seed/port_s5/600/400' },
    { title: 'Sticker Sheet Design',        category: 'Stickers',       image: 'https://picsum.photos/seed/port_s6/600/600' },
    { title: 'WCS Malaysia 2024 Poster',    category: 'Event Art',      image: 'https://picsum.photos/seed/port_s7/400/600' },
    { title: 'Tanjiro Watercolour',         category: 'Fan Art',        image: 'https://picsum.photos/seed/port_s8/400/500' },
    { title: 'OC Commission — Luna',        category: 'Commission',     image: 'https://picsum.photos/seed/port_s9/400/600' },
    { title: 'Animangaki Table Display',    category: 'Event',          image: 'https://picsum.photos/seed/port_s10/600/400' },
    { title: 'Cherry Blossom Series',       category: 'Original',       image: 'https://picsum.photos/seed/port_s11/400/600' },
    { title: 'Chibi Commissions Batch',     category: 'Commission',     image: 'https://picsum.photos/seed/port_s12/600/600' },
  ]

  // Keep User.name in sync with creator brand name so navbar/session shows correctly
  await p.user.update({ where: { id: userId }, data: { name: 'Sakura Arts' } })

  await p.creatorProfile.update({
    where: { id: creatorId },
    data: {
      displayName: 'Sakura Arts',
      bio: 'Digital illustrator from Kuala Lumpur specialising in original characters and fan art. Comic Fiesta veteran since 2018. Currently open for commissions — DM for collab requests! Ships worldwide from Malaysia. 🌸',
      avatar: 'https://picsum.photos/seed/sakura_avatar/200/200',
      bannerImage: 'https://picsum.photos/seed/sakura_banner/1200/400',
      categoryTags: JSON.stringify(['Digital Art', 'Cosplay Print', 'Stickers', 'Illustration']),
      socialLinks: JSON.stringify({
        instagram: 'https://instagram.com/sakura_arts',
        tiktok: 'https://tiktok.com/@sakura_arts',
        twitter: 'https://twitter.com/sakura_arts',
      }),
      commissionStatus: 'OPEN',
      commissionDescription: 'I specialise in original character illustrations and fan art commissions with a soft, detailed style. Whether you want a portrait of your OC, a scene from your favourite anime, or a custom piece for gifting — I have got you covered. I have been taking commissions since 2018 and have worked with clients from Malaysia, Singapore, the Philippines, and beyond. Every piece comes with 3 rounds of revisions and a high-resolution file ready for print or digital use.',
      announcementText: 'Comic Fiesta 2025 table confirmed! Pre-orders open now. Commission slots filling fast — grab yours before CF! 🎉',
      announcementActive: true,
      isVerified: true,
      isTopCreator: true,
      totalSales: 247,
      portfolioItems: JSON.stringify(portfolioItems),
      popupEnabled: true,
      popupTitle: 'Commission Slots Closing This Friday!',
      popupDescription: 'Only 2 slots left for April. DM me now before they are gone — I will not be opening again until June.',
      popupCtaText: 'Message Me Now',
      popupCtaLink: '/creator/sakura_arts',
      popupBadgeText: '🎉 2 slots left this Friday!',
      popupImageUrl: 'https://picsum.photos/seed/sakuracommission/520/280',
    },
  })
  console.log('✅ Creator profile updated (incl. 12 portfolio items)')

  // ── Products ─────────────────────────────────────────────────────────────────
  // Disable FK enforcement, wipe in any order, re-enable
  await p.$executeRawUnsafe(`PRAGMA foreign_keys = OFF`)
  await p.$executeRawUnsafe(`DELETE FROM WishlistItem WHERE productId IN (SELECT id FROM Product WHERE creatorId = '${creatorId}')`)
  await p.$executeRawUnsafe(`DELETE FROM CartItem WHERE productId IN (SELECT id FROM Product WHERE creatorId = '${creatorId}')`)
  await p.$executeRawUnsafe(`DELETE FROM Dispute WHERE orderId IN (SELECT id FROM "Order" WHERE creatorId = '${creatorId}')`)
  await p.$executeRawUnsafe(`DELETE FROM "Transaction" WHERE creatorId = '${creatorId}'`)
  await p.$executeRawUnsafe(`DELETE FROM "Order" WHERE creatorId = '${creatorId}'`)
  await p.$executeRawUnsafe(`DELETE FROM Product WHERE creatorId = '${creatorId}'`)
  await p.$executeRawUnsafe(`PRAGMA foreign_keys = ON`)

  await p.product.createMany({
    data: [
      {
        creatorId,
        title: 'Cherry Blossom OC Artpack — Hana',
        description: 'A complete digital artpack featuring my original character Hana in 12 different poses and expressions. Includes PSD files, PNG exports in 4K, and bonus sketches. Perfect for fans and cosplayers!',
        price: 1500,
        category: 'DIGITAL_ART',
        type: 'DIGITAL',
        images: JSON.stringify(['https://picsum.photos/seed/sakura_prod1a/600/800','https://picsum.photos/seed/sakura_prod1b/600/800','https://picsum.photos/seed/sakura_prod1c/600/800']),
        digitalFile: '/uploads/products/hana-artpack.zip',
        isActive: true, isPinned: true, order: 1,
      },
      {
        creatorId,
        title: 'Anime Chibi Sticker Set — 20 Pack',
        description: 'Set of 20 die-cut chibi stickers featuring popular anime characters reimagined in my signature soft style. Waterproof, UV-resistant vinyl. Ships from KL within 3–5 days.',
        price: 800,
        category: 'STICKERS',
        type: 'DIGITAL',
        images: JSON.stringify(['https://picsum.photos/seed/sakura_prod2a/600/600','https://picsum.photos/seed/sakura_prod2b/600/600']),
        digitalFile: '/uploads/products/chibi-stickers.zip',
        isActive: true, isPinned: true, order: 2,
      },
      {
        creatorId,
        title: 'Custom OC Portrait Commission',
        description: 'Full colour digital portrait of your original character. Includes: bust shot or full body, detailed background, 2 expression variants, high-res PNG + PSD. Turnaround: 2–3 weeks.',
        price: 9500,
        category: 'DIGITAL_ART',
        type: 'DIGITAL',
        images: JSON.stringify(['https://picsum.photos/seed/sakura_prod3a/600/800','https://picsum.photos/seed/sakura_prod3b/600/800','https://picsum.photos/seed/sakura_prod3c/600/800']),
        isActive: true, isPinned: false, order: 3,
      },
      {
        creatorId,
        title: 'Yokai Academy Merch Bundle (Physical)',
        description: 'Physical merch bundle from my Yokai Academy original series. Includes: A4 art print, 5 sticker set, and bookmark. Shipped in protective sleeve from KL.',
        price: 3500,
        category: 'PHYSICAL_MERCH',
        type: 'PHYSICAL',
        images: JSON.stringify(['https://picsum.photos/seed/sakura_prod4a/600/800','https://picsum.photos/seed/sakura_prod4b/600/600']),
        stock: 15,
        isActive: true, isPinned: false, order: 4,
      },
      {
        creatorId,
        title: 'Genshin Impact Kazuha Art Print (A3)',
        description: 'A3 fine art print of my Kazuha illustration. Printed on 300gsm matte paper with archival inks. Ships in rigid tube packaging from KL. Limited to 50 copies.',
        price: 2200,
        category: 'COSPLAY_PRINT',
        type: 'PHYSICAL',
        images: JSON.stringify(['https://picsum.photos/seed/sakura_prod5a/600/800','https://picsum.photos/seed/sakura_prod5b/600/600']),
        stock: 23,
        isActive: true, isPinned: false, order: 5,
      },
      {
        creatorId,
        title: 'Demon Slayer Tanjiro Hoodie (POD)',
        description: 'Premium pullover hoodie featuring my original Tanjiro watercolour design. Print on demand via Printify — available in S to 2XL, multiple colours. Ships within 7–10 days.',
        price: 3800,
        category: 'PHYSICAL_MERCH',
        type: 'POD',
        images: JSON.stringify(['https://picsum.photos/seed/sakura_prod6a/600/800','https://picsum.photos/seed/sakura_prod6b/600/600','https://picsum.photos/seed/sakura_prod6c/600/600']),
        sizeVariants: JSON.stringify(['S','M','L','XL','2XL']),
        colorVariants: JSON.stringify([
          { name: 'Black', mockupImage: 'https://picsum.photos/seed/hoodie_black/600/600' },
          { name: 'Navy',  mockupImage: 'https://picsum.photos/seed/hoodie_navy/600/600' },
        ]),
        isActive: true, isPinned: false, order: 6,
      },
      {
        creatorId,
        title: 'Wallpaper Pack — Seasonal Series Vol.1',
        description: 'Pack of 8 desktop and mobile wallpapers featuring my seasonal illustrations. Spring cherry blossom, summer festival, autumn maple, and winter snowfall themes. 4K resolution.',
        price: 500,
        category: 'DIGITAL_ART',
        type: 'DIGITAL',
        images: JSON.stringify(['https://picsum.photos/seed/sakura_prod7a/600/400','https://picsum.photos/seed/sakura_prod7b/600/400']),
        digitalFile: '/uploads/products/wallpaper-vol1.zip',
        isActive: true, isPinned: false, order: 7,
      },
      {
        creatorId,
        title: 'Cosplay Sticker Sheet — WCS Edition',
        description: 'Special edition sticker sheet created for WCS Malaysia 2024. Features 15 cosplay-themed stickers including costumes, accessories, and motivational phrases. Digital download.',
        price: 600,
        category: 'STICKERS',
        type: 'DIGITAL',
        images: JSON.stringify(['https://picsum.photos/seed/sakura_prod8a/600/600']),
        digitalFile: '/uploads/products/wcs-stickers.zip',
        isActive: true, isPinned: false, order: 8,
      },
    ],
  })
  console.log('✅ Products created: 8')

  // ── Videos ───────────────────────────────────────────────────────────────────
  await p.video.deleteMany({ where: { creatorId } })
  await p.video.createMany({
    data: [
      {
        creatorId, platform: 'YOUTUBE', isActive: true, order: 1,
        title: 'My Comic Fiesta 2024 Highlights',
        description: 'Behind the scenes at CF2024 — table setup, meet and greet, and my favourite cosplays of the day!',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        embedId: 'dQw4w9WgXcQ',
      },
      {
        creatorId, platform: 'YOUTUBE', isActive: true, order: 2,
        title: 'Commission Process Speed Paint — OC Portrait',
        description: 'Full speed paint of a recent OC commission from sketch to final render. Tools: Procreate on iPad Pro.',
        url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
        embedId: '9bZkp7q19f0',
      },
      {
        creatorId, platform: 'YOUTUBE', isActive: true, order: 3,
        title: 'Sticker Making Process — From Design to Print',
        description: 'How I design, prepare, and order my die-cut stickers. Full process from Procreate to finished product.',
        url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
        embedId: 'M7lc1UVf-VE',
      },
    ],
  })
  console.log('✅ Videos created: 3')

  // ── Support tiers ────────────────────────────────────────────────────────────
  await p.supportTier.deleteMany({ where: { creatorId } })
  await p.supportTier.createMany({
    data: [
      {
        creatorId, isActive: true, subscriberCount: 24, order: 1,
        name: 'Sketchbook Supporter',
        description: 'Support my art journey and get exclusive early access to works in progress!',
        priceUsd: 300,
        perks: JSON.stringify(['Early access to WIP sketches','Name in artwork credits','Monthly wallpaper download','Discord supporter role']),
      },
      {
        creatorId, isActive: true, subscriberCount: 12, order: 2,
        name: 'Artbook Backer',
        description: 'Get everything in Sketchbook plus exclusive monthly content and priority commission queue!',
        priceUsd: 800,
        perks: JSON.stringify(['All Sketchbook perks','Monthly exclusive illustration','Priority commission queue','Vote on next artwork theme','Signed digital artbook (yearly)']),
      },
      {
        creatorId, isActive: true, subscriberCount: 5, order: 3,
        name: 'Studio Patron',
        description: 'My most dedicated supporters. Get everything plus monthly sticker pack shipped to you!',
        priceUsd: 2000,
        perks: JSON.stringify(['All Artbook perks','Monthly physical sticker pack (shipped)','1 free chibi commission per quarter','Exclusive Patron-only Discord channel','Input on original character designs']),
      },
    ],
  })
  console.log('✅ Support tiers created: 3')

  // ── Support goal ─────────────────────────────────────────────────────────────
  await p.supportGoal.deleteMany({ where: { creatorId } })
  await p.supportGoal.create({
    data: {
      creatorId,
      title: 'Comic Fiesta 2025 Table Fund',
      description: 'Help me fund my table at Comic Fiesta 2025! Funds will cover table fee (RM400), printing costs for new merchandise (RM600), and travel from KL. Every contribution gets a thank you sticker pack!',
      targetAmountUsd: 50000,
      currentAmountUsd: 32000,
      deadline: new Date('2025-12-01'),
      status: 'ACTIVE',
      coverImage: 'https://picsum.photos/seed/sakura_goal/520/280',
    },
  })
  console.log('✅ Support goal created')

  // ── Support gift ─────────────────────────────────────────────────────────────
  await p.supportGift.deleteMany({ where: { creatorId } })
  await p.supportGift.create({
    data: {
      creatorId,
      isActive: true,
      presetAmounts: JSON.stringify([3, 5, 10, 25, 50]),
      thankYouMessage: 'Every coffee keeps me drawing! Your support means the world and helps me create more art for the community. Terima kasih! 💜',
      totalReceived: 127500,
      giftCount: 48,
    },
  })
  console.log('✅ Support gift created')

  // ── POD providers ────────────────────────────────────────────────────────────
  await p.creatorPodProvider.deleteMany({ where: { creatorId } })
  await p.creatorPodProvider.createMany({
    data: [
      {
        creatorId,
        name: 'PRINTIFY',
        storeUrl: 'https://printify.com/app/store/12345',
        notes: 'Main POD provider for apparel and accessories',
        isDefault: true,
        defaultProductionDays: 4,
        shippingMY: 5, shippingSG: 7, shippingPH: 10, shippingIntl: 14,
      },
      {
        creatorId,
        name: 'LOCAL_PRINT_SHOP',
        customName: 'Ahmad Print, Jalan Ipoh KL',
        notes: 'Best for stickers and bookmarks. Cheaper and faster locally.',
        isDefault: false,
        defaultProductionDays: 2,
        shippingMY: 3, shippingSG: 7, shippingPH: 99, shippingIntl: 99,
      },
    ],
  })
  console.log('✅ POD providers created: 2')

  // ── Notifications ────────────────────────────────────────────────────────────
  await p.notification.deleteMany({ where: { userId } })
  await p.notification.createMany({
    data: [
      { userId, type: 'NEW_ORDER',           isRead: false, actionUrl: '/dashboard/orders',   title: 'New order received!',               message: 'Tanaka Kenji ordered Cherry Blossom OC Artpack — USD 15.00' },
      { userId, type: 'ESCROW_RELEASED',     isRead: false, actionUrl: '/dashboard/earnings', title: 'Payment released — USD 28.08',      message: 'Escrow for Order #12340 has been released to your balance.' },
      { userId, type: 'NEW_MESSAGE',         isRead: false, actionUrl: '/dashboard/messages', title: 'New message from Aika Watanabe',     message: 'Hi! I love your work. Are you taking commissions?' },
      { userId, type: 'FULFILLMENT_REMINDER',isRead: true,  actionUrl: '/dashboard/orders',   title: 'Add tracking for Order #12345',     message: 'You have 4 days left to fulfill this order before auto-cancellation.' },
      { userId, type: 'STORAGE_WARNING_80',  isRead: true,  actionUrl: '/dashboard/storage',  title: 'Storage 80% full',                  message: 'You have used 400MB of your 500MB storage quota.' },
    ],
  })
  console.log('✅ Notifications created: 5')

  console.log('')
  console.log('=== SAKURA ARTS SEED COMPLETE ===')
  console.log('Login:', creator.user.email, '/ password123')
  console.log('Profile: http://localhost:7000/creator/sakura_arts')
  console.log('Dashboard: http://localhost:7000/dashboard')
}

main().catch(console.error).finally(() => p.$disconnect())
