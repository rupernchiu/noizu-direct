import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';

const dbUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Starting seed...');

  // Platform settings
  await prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      processingFeePercent: 2.5,
      platformFeePercent: 0,
      withdrawalFeePercent: 4.0,
      topCreatorThreshold: 100,
    },
  });

  // Admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@noizu.direct' },
    update: {},
    create: {
      email: 'admin@noizu.direct',
      password: adminPassword,
      name: 'Admin',
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin created:', admin.email);

  // Creators
  const creatorPassword = await bcrypt.hash('creator123', 10);

  const c1 = await prisma.user.upsert({
    where: { email: 'sakura@noizu.direct' },
    update: {},
    create: {
      email: 'sakura@noizu.direct',
      password: creatorPassword,
      name: 'Sakura Arts',
      role: 'CREATOR',
    },
  });
  const sakuraProfile = await prisma.creatorProfile.upsert({
    where: { userId: c1.id },
    update: {},
    create: {
      userId: c1.id,
      username: 'sakura_arts',
      displayName: 'Sakura Arts',
      bio: 'Digital illustrator specializing in original characters and fan art. Open for commissions! Ships worldwide.',
      categoryTags: JSON.stringify(['Digital Art', 'Fan Art', 'OC']),
      commissionStatus: 'OPEN',
      announcementText: 'Commissions open! Slots filling fast — DM me for custom work.',
      announcementActive: true,
      isVerified: true,
      isTopCreator: true,
      totalSales: 247,
    },
  });

  const c2 = await prisma.user.upsert({
    where: { email: 'akira@noizu.direct' },
    update: {},
    create: {
      email: 'akira@noizu.direct',
      password: creatorPassword,
      name: 'Akira Doujin',
      role: 'CREATOR',
    },
  });
  const akiraProfile = await prisma.creatorProfile.upsert({
    where: { userId: c2.id },
    update: {},
    create: {
      userId: c2.id,
      username: 'akira_doujin',
      displayName: 'Akira Doujin Works',
      bio: 'Indie doujin circle from Malaysia. Original manga, physical books and digital PDFs. Convention veteran since 2016.',
      categoryTags: JSON.stringify(['Doujin', 'Manga', 'Physical']),
      commissionStatus: 'LIMITED',
      isVerified: true,
      isTopCreator: false,
      totalSales: 89,
    },
  });

  const c3 = await prisma.user.upsert({
    where: { email: 'luna@noizu.direct' },
    update: {},
    create: {
      email: 'luna@noizu.direct',
      password: creatorPassword,
      name: 'Cosplay Luna',
      role: 'CREATOR',
    },
  });
  const lunaProfile = await prisma.creatorProfile.upsert({
    where: { userId: c3.id },
    update: {},
    create: {
      userId: c3.id,
      username: 'cosplay_luna',
      displayName: 'Luna Cosplay',
      bio: 'Professional cosplayer based in Singapore. High-res print sets, wallpapers, and sticker packs from my shoots.',
      categoryTags: JSON.stringify(['Cosplay', 'Prints', 'Stickers']),
      commissionStatus: 'CLOSED',
      isVerified: false,
      isTopCreator: false,
      totalSales: 54,
    },
  });

  console.log('✅ Creators created');

  // Buyers
  const buyerPassword = await bcrypt.hash('buyer123', 10);
  await prisma.user.upsert({
    where: { email: 'buyer1@test.com' },
    update: {},
    create: {
      email: 'buyer1@test.com',
      password: buyerPassword,
      name: 'Tanaka Kenji',
      role: 'BUYER',
    },
  });
  await prisma.user.upsert({
    where: { email: 'buyer2@test.com' },
    update: {},
    create: {
      email: 'buyer2@test.com',
      password: buyerPassword,
      name: 'Priya Sharma',
      role: 'BUYER',
    },
  });
  console.log('✅ Buyers created');

  // Products
  const now = new Date();
  const products = [
    {
      creatorId: sakuraProfile.id,
      title: 'Cherry Blossom OC Artpack',
      description:
        'High-res digital artpack featuring original character "Hana". 15 illustrations in 4K resolution. PSD layered files included.',
      price: 1500,
      category: 'DIGITAL_ART',
      type: 'DIGITAL',
      isPinned: true,
      order: 0,
    },
    {
      creatorId: sakuraProfile.id,
      title: 'Custom Portrait Commission',
      description:
        'Fully colored custom portrait of your OC or favourite character. Full body or bust options. 3 revision rounds included.',
      price: 4500,
      category: 'DIGITAL_ART',
      type: 'DIGITAL',
      isPinned: false,
      order: 1,
    },
    {
      creatorId: sakuraProfile.id,
      title: 'Anime Sticker Set Vol.1 — 20 Pack',
      description:
        'Pack of 20 original character sticker designs. Digital PNG files with transparent background. Commercial use OK.',
      price: 800,
      category: 'STICKERS',
      type: 'DIGITAL',
      isPinned: true,
      order: 2,
    },
    {
      creatorId: sakuraProfile.id,
      title: 'Yokai Academy Merch Bundle',
      description:
        'Physical merch bundle: 1 acrylic stand keychain + 5 holographic stickers + A5 postcard. Ships within SEA only.',
      price: 2800,
      category: 'PHYSICAL_MERCH',
      type: 'PHYSICAL',
      stock: 30,
      isPinned: false,
      order: 3,
    },
    {
      creatorId: akiraProfile.id,
      title: 'Midnight Chronicles Vol.1 — Physical Doujin',
      description:
        'Original BL doujin manga. A5 size, 48 pages, full colour cover with matte finish. Signed by author. Ships from Malaysia.',
      price: 2000,
      category: 'DOUJIN',
      type: 'PHYSICAL',
      stock: 50,
      isPinned: true,
      order: 0,
    },
    {
      creatorId: akiraProfile.id,
      title: 'Midnight Chronicles Vol.1 — Digital PDF',
      description:
        'Digital PDF version of Midnight Chronicles Vol.1. Full resolution, 48 pages. Instant download after purchase.',
      price: 800,
      category: 'DOUJIN',
      type: 'DIGITAL',
      isPinned: false,
      order: 1,
    },
    {
      creatorId: akiraProfile.id,
      title: 'Ren Yukimura Character Design Sheet',
      description:
        'Full character design sheet for original character Ren Yukimura. Includes front view, back view, and 6 expressions.',
      price: 600,
      category: 'DIGITAL_ART',
      type: 'DIGITAL',
      isPinned: false,
      order: 2,
    },
    {
      creatorId: lunaProfile.id,
      title: 'Sailor Luna Cosplay Print Set',
      description:
        'Professional photoshoot print set from Sailor Moon inspired cosplay. 8 high-res A4 prints. Glossy finish. Ships internationally.',
      price: 3500,
      category: 'COSPLAY_PRINT',
      type: 'PHYSICAL',
      stock: 20,
      isPinned: true,
      order: 0,
    },
    {
      creatorId: lunaProfile.id,
      title: 'Summer Festival Wallpack — 4K',
      description:
        '5 wallpapers in 4K resolution from the Summer Festival photoshoot. Mobile (9:16) and desktop (16:9) versions included.',
      price: 500,
      category: 'DIGITAL_ART',
      type: 'DIGITAL',
      isPinned: false,
      order: 1,
    },
    {
      creatorId: lunaProfile.id,
      title: 'Chibi Sticker Bomb Pack — 30 Designs',
      description:
        '30 chibi character sticker designs based on my cosplay looks. PNG + SVG files. Personal and small-business use permitted.',
      price: 1200,
      category: 'STICKERS',
      type: 'DIGITAL',
      isPinned: false,
      order: 2,
    },
  ];

  for (const p of products) {
    await prisma.product.create({
      data: { ...p, images: JSON.stringify([]) },
    });
  }
  console.log('✅ Products created (10)');

  // Homepage CMS sections
  const sectionsExist = await prisma.section.count({ where: { pageSlug: 'home' } });
  if (sectionsExist === 0) {
    await prisma.section.createMany({
      data: [
        {
          pageSlug: 'home',
          type: 'HERO',
          order: 0,
          isActive: true,
          content: JSON.stringify({
            headline: 'Your fave creators. Direct to you.',
            subtext:
              "Discover original art, doujin, cosplay prints and merch from Southeast Asia's best creators.",
            ctaPrimary: { text: 'Explore Marketplace', link: '/marketplace' },
            ctaSecondary: { text: 'Become a Creator', link: '/register/creator' },
          }),
          updatedAt: now,
        },
        {
          pageSlug: 'home',
          type: 'FEATURED_CREATORS',
          order: 1,
          isActive: true,
          content: JSON.stringify({ title: 'Featured Creators', maxDisplay: 6 }),
          updatedAt: now,
        },
        {
          pageSlug: 'home',
          type: 'CATEGORIES',
          order: 2,
          isActive: true,
          content: JSON.stringify({
            title: 'Browse by Category',
            items: [
              { name: 'Digital Art', icon: 'Palette', link: '/marketplace?category=DIGITAL_ART' },
              { name: 'Doujin', icon: 'BookOpen', link: '/marketplace?category=DOUJIN' },
              { name: 'Cosplay Prints', icon: 'Camera', link: '/marketplace?category=COSPLAY_PRINT' },
              { name: 'Physical Merch', icon: 'Package', link: '/marketplace?category=PHYSICAL_MERCH' },
              { name: 'Stickers', icon: 'Sparkles', link: '/marketplace?category=STICKERS' },
            ],
          }),
          updatedAt: now,
        },
        {
          pageSlug: 'home',
          type: 'NEW_DROPS',
          order: 3,
          isActive: true,
          content: JSON.stringify({ title: 'New Drops', maxDisplay: 8, autoMode: true }),
          updatedAt: now,
        },
      ],
    });
  }
  console.log('✅ CMS sections created');

  // Static pages
  await prisma.page.upsert({
    where: { slug: 'about' },
    update: {},
    create: {
      slug: 'about',
      title: 'About NOIZU-DIRECT',
      status: 'PUBLISHED',
      content:
        '# About NOIZU-DIRECT\n\nNOIZU-DIRECT is a creator marketplace built for the Southeast Asian pop culture community. We connect fans directly with cosplayers, illustrators, doujin circles, and merch makers.\n\n## Our Mission\n\nEliminate the barriers between SEA creators and their fans. No middlemen, no complicated payment systems — just direct creator-to-fan commerce.\n\n## Platform Fees\n\nDuring our launch period, NOIZU-DIRECT charges **0% platform fees**. Creators keep what they earn.\n\n## Contact\n\nReach us at hello@noizu.direct',
      seoTitle: 'About NOIZU-DIRECT | Creator Marketplace for SEA Pop Culture',
      seoDescription:
        'Learn about NOIZU-DIRECT, the creator marketplace for Southeast Asian cosplay, doujin, and anime art creators.',
    },
  });

  await prisma.page.upsert({
    where: { slug: 'terms' },
    update: {},
    create: {
      slug: 'terms',
      title: 'Terms of Service',
      status: 'PUBLISHED',
      content:
        '# Terms of Service\n\nLast updated: January 2025\n\n## 1. Acceptance of Terms\n\nBy accessing NOIZU-DIRECT, you agree to these Terms of Service.\n\n## 2. User Accounts\n\nYou are responsible for maintaining the security of your account. NOIZU-DIRECT will not be liable for any loss or damage from your failure to comply with this obligation.\n\n## 3. Creator Content\n\nCreators are solely responsible for all content they upload and sell on NOIZU-DIRECT. All content must be original or properly licensed.\n\n## 4. Payments\n\nAll transactions are processed through Airwallex. By making a purchase, you agree to Airwallex\'s Terms of Service.\n\n## 5. Refund Policy\n\nDigital products are non-refundable once downloaded. Physical products may be returned within 14 days of receipt if defective.\n\n## 6. Prohibited Content\n\nContent that is illegal, infringing, or harmful is strictly prohibited and will result in account termination.',
      seoTitle: 'Terms of Service | NOIZU-DIRECT',
      seoDescription: 'NOIZU-DIRECT Terms of Service — read our platform rules and policies.',
    },
  });
  console.log('✅ Static pages created');

  // Active announcement
  const announcementCount = await prisma.announcement.count();
  if (announcementCount === 0) {
    await prisma.announcement.create({
      data: {
        text: '🎉 Welcome to NOIZU-DIRECT Beta! Creator platform fees are 0% during our launch period.',
        link: '/about',
        color: '#7c3aed',
        isActive: true,
      },
    });
  }
  console.log('✅ Announcement created');

  console.log('\n🎉 Seed complete!');
  console.log('   Admin:   admin@noizu.direct / admin123');
  console.log('   Creator: sakura@noizu.direct / creator123');
  console.log('   Creator: akira@noizu.direct / creator123');
  console.log('   Creator: luna@noizu.direct / creator123');
  console.log('   Buyer:   buyer1@test.com / buyer123');
  console.log('   Buyer:   buyer2@test.com / buyer123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
