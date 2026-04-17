import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const dbUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!;
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Starting seed...');

  // Cleanup: delete products for seed creators (upserts handle profiles/users idempotently)
  const seedUsernames = ['sakura_arts', 'akira_doujin', 'cosplay_luna', 'propsmith_my'];
  const seedProfiles = await prisma.creatorProfile.findMany({ where: { username: { in: seedUsernames } } });
  if (seedProfiles.length > 0) {
    const profileIds = seedProfiles.map(p => p.id);
    const seedProducts = await prisma.product.findMany({ where: { creatorId: { in: profileIds } }, select: { id: true } });
    if (seedProducts.length > 0) {
      const productIds = seedProducts.map(p => p.id);
      await prisma.cartItem.deleteMany({ where: { productId: { in: productIds } } });
      await prisma.wishlistItem.deleteMany({ where: { productId: { in: productIds } } });
      await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    }
  }
  console.log('🧹 Cleaned up existing seed products');

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

  // Creator 1: Sakura Arts — digital illustrator, KL-based
  const c1 = await prisma.user.upsert({
    where: { email: 'sakura@noizu.direct' },
    update: {},
    create: {
      email: 'sakura@noizu.direct',
      password: creatorPassword,
      name: 'Ng Mei Xuan',
      role: 'CREATOR',
    },
  });
  const sakuraProfile = await prisma.creatorProfile.upsert({
    where: { username: 'sakura_arts' },
    update: {
      userId: c1.id,
      displayName: 'Sakura Arts',
      bio: 'Digital illustrator from Kuala Lumpur specialising in original characters and fan art. Comic Fiesta veteran since 2018. Currently open for commissions — DM for collab requests! Ships worldwide from Malaysia.',
      categoryTags: JSON.stringify(['DIGITAL_ART', 'COSPLAY_PRINT', 'STICKERS']),
      commissionStatus: 'OPEN',
      announcementText: '🎨 Comic Fiesta 2025 table confirmed! Pre-orders open now. Commission slots filling fast — grab yours before CF!',
      announcementActive: true,
      isVerified: true,
      isTopCreator: true,
      totalSales: 247,
      avatar: 'https://picsum.photos/seed/sakura_avatar/200/200',
      bannerImage: 'https://picsum.photos/seed/sakura_banner/1200/300',
      socialLinks: JSON.stringify({
        instagram: 'https://instagram.com/sakura.arts.my',
        tiktok: 'https://tiktok.com/@sakura_arts_my',
        twitter: 'https://twitter.com/sakuraarts_my',
      }),
      badges: JSON.stringify(['Convention Veteran', 'NOIZU Member']),
      commissionSlots: 5,
      commissionDescription: 'I specialise in original character illustrations and fan art commissions with a soft, detailed style. Whether you want a portrait of your OC, a scene from your favourite anime, or a custom piece for gifting — I\'ve got you covered.\n\nI\'ve been taking commissions since 2018 and have worked with clients from Malaysia, Singapore, the Philippines, and beyond. Every piece comes with 3 rounds of revisions and a high-resolution file ready for print or digital use.',
      commissionTerms: 'Turnaround: 2–4 weeks. Full payment upfront. 3 rounds of revisions included. No NSFW. Commercial use requires additional licensing fee. Payment via Airwallex — supports MYR, SGD, USD, PHP.',
      commissionPricing: JSON.stringify([
        { tier: 'Bust (Flat Color)', price: 50, description: 'Bust shot, flat color, simple background' },
        { tier: 'Full Body (Shaded)', price: 120, description: 'Full body, full shading, simple background' },
        { tier: 'Illustration (Full BG)', price: 250, description: 'Full scene with detailed background, up to 2 characters' },
      ]),
      portfolioItems: JSON.stringify([
        { id: 'p1',  title: 'Hana — Character Sheet',      description: 'Full character design sheet for my OC Hana. Front, back and expression sheet.', category: 'Digital Art',    imageUrl: 'https://picsum.photos/seed/sakura_p1/400/600',  isPublic: true },
        { id: 'p2',  title: 'Comic Fiesta 2024 Prints',    description: 'A4 prints available at my CF2024 table. Genshin Impact fan art.',               category: 'Cosplay Print', imageUrl: 'https://picsum.photos/seed/sakura_p2/600/400',  isPublic: true },
        { id: 'p3',  title: 'Sticker Pack WIP',            description: 'Upcoming chibi sticker pack — 20 designs. Available at Animangaki 2025.',       category: 'Stickers',      imageUrl: 'https://picsum.photos/seed/sakura_p3/500/500',  isPublic: true },
        { id: 'p4',  title: 'Commission — Rei Portrait',   description: 'Custom commission for client. Rei Ayanami inspired OC.',                        category: 'Digital Art',    imageUrl: 'https://picsum.photos/seed/sakura_p4/400/560',  isPublic: true },
        { id: 'p5',  title: 'CF2023 Exclusive Print',      description: 'Limited to 50 copies at Comic Fiesta 2023. Now sold out.',                      category: 'Cosplay Print', imageUrl: 'https://picsum.photos/seed/sakura_p5/600/800',  isPublic: true },
        { id: 'p6',  title: 'Animangaki 2024 — Banner',    description: '6×2ft standee banner design for my Animangaki booth.',                          category: 'Illustration',  imageUrl: 'https://picsum.photos/seed/sakura_p6/400/700',  isPublic: true },
        { id: 'p7',  title: 'Chibi Set — 4-Pack',          description: '4-design chibi sticker set. Holographic foil finish.',                          category: 'Stickers',      imageUrl: 'https://picsum.photos/seed/sakura_p7/500/500',  isPublic: true },
        { id: 'p8',  title: 'OC — Mira Moonblade',         description: 'Original character design for my webcomic project.',                            category: 'Digital Art',    imageUrl: 'https://picsum.photos/seed/sakura_p8/400/580',  isPublic: true },
        { id: 'p9',  title: 'Fan Art — Honkai Star Rail',  description: 'Commission piece featuring Kafka and Silver Wolf.',                             category: 'Digital Art',    imageUrl: 'https://picsum.photos/seed/sakura_p9/600/420',  isPublic: true },
        { id: 'p10', title: 'Washi Tape Design',           description: 'Custom washi tape pattern — sakura motif for convention merch.',                category: 'Illustration',  imageUrl: 'https://picsum.photos/seed/sakura_p10/600/400', isPublic: true },
        { id: 'p11', title: 'Commission — Group Portrait', description: 'Group of 3 OCs for a long-term client. Full shaded + BG.',                     category: 'Digital Art',    imageUrl: 'https://picsum.photos/seed/sakura_p11/400/560', isPublic: true },
        { id: 'p12', title: 'Holographic Sticker Sheet',   description: 'A5 sticker sheet, 12 designs, holographic laminate.',                           category: 'Stickers',      imageUrl: 'https://picsum.photos/seed/sakura_p12/500/700', isPublic: true },
        { id: 'p13', title: 'Bookmark Set — Celestial',    description: 'Set of 4 double-sided bookmarks. Available at next convention.',                category: 'Cosplay Print', imageUrl: 'https://picsum.photos/seed/sakura_p13/400/600', isPublic: true },
        { id: 'p14', title: 'Landscape Mural Study',       description: 'Personal study piece — fantasy landscape, painted in Clip Studio.',             category: 'Illustration',  imageUrl: 'https://picsum.photos/seed/sakura_p14/600/360', isPublic: true },
        { id: 'p15', title: 'NOIZU Launch Illustration',   description: 'Commissioned key visual for the NOIZU DIRECT platform launch.',                 category: 'Digital Art',    imageUrl: 'https://picsum.photos/seed/sakura_p15/600/400', isPublic: true },
        { id: 'p16', title: 'Enamel Pin Mockup',           description: 'Design mockup for upcoming Kickstarter enamel pin set.',                        category: 'Illustration',  imageUrl: 'https://picsum.photos/seed/sakura_p16/500/500', isPublic: true },
      ]),
    },
    create: {
      userId: c1.id,
      username: 'sakura_arts',
      displayName: 'Sakura Arts',
      bio: 'Digital illustrator from Kuala Lumpur specialising in original characters and fan art. Comic Fiesta veteran since 2018.',
      categoryTags: JSON.stringify(['DIGITAL_ART', 'COSPLAY_PRINT', 'STICKERS']),
      commissionStatus: 'OPEN',
      announcementText: '🎨 Comic Fiesta 2025 table confirmed! Pre-orders open now.',
      announcementActive: true,
      isVerified: true,
      isTopCreator: true,
      totalSales: 247,
      avatar: 'https://picsum.photos/seed/sakura_avatar/200/200',
      bannerImage: 'https://picsum.photos/seed/sakura_banner/1200/300',
      socialLinks: JSON.stringify({
        instagram: 'https://instagram.com/sakura.arts.my',
        tiktok: 'https://tiktok.com/@sakura_arts_my',
        twitter: 'https://twitter.com/sakuraarts_my',
      }),
      badges: JSON.stringify(['Convention Veteran', 'NOIZU Member']),
      commissionSlots: 5,
      commissionDescription: 'I specialise in original character illustrations and fan art commissions with a soft, detailed style. Whether you want a portrait of your OC, a scene from your favourite anime, or a custom piece for gifting — I\'ve got you covered.\n\nI\'ve been taking commissions since 2018 and have worked with clients from Malaysia, Singapore, the Philippines, and beyond. Every piece comes with 3 rounds of revisions and a high-resolution file ready for print or digital use.',
      commissionTerms: 'Turnaround: 2–4 weeks. Full payment upfront. 3 rounds of revisions included.',
      commissionPricing: JSON.stringify([
        { tier: 'Bust (Flat Color)', price: 50, description: 'Bust shot, flat color, simple background' },
        { tier: 'Full Body (Shaded)', price: 120, description: 'Full body, full shading, simple background' },
        { tier: 'Illustration (Full BG)', price: 250, description: 'Full scene with detailed background, up to 2 characters' },
      ]),
      portfolioItems: JSON.stringify([
        { id: 'p1',  title: 'Hana — Character Sheet',      description: 'Full character design sheet for my OC Hana.', category: 'Digital Art',    imageUrl: 'https://picsum.photos/seed/sakura_p1/400/600',  isPublic: true },
        { id: 'p2',  title: 'Comic Fiesta 2024 Prints',    description: 'A4 prints from CF2024 table.',                category: 'Cosplay Print', imageUrl: 'https://picsum.photos/seed/sakura_p2/600/400',  isPublic: true },
        { id: 'p3',  title: 'Chibi Sticker Pack WIP',      description: 'Upcoming sticker pack for Animangaki 2025.', category: 'Stickers',      imageUrl: 'https://picsum.photos/seed/sakura_p3/500/500',  isPublic: true },
        { id: 'p4',  title: 'Commission — Rei Portrait',   description: 'Rei Ayanami inspired OC commission.',        category: 'Digital Art',    imageUrl: 'https://picsum.photos/seed/sakura_p4/400/560',  isPublic: true },
        { id: 'p5',  title: 'CF2023 Exclusive Print',      description: 'Limited to 50 copies at Comic Fiesta 2023.', category: 'Cosplay Print', imageUrl: 'https://picsum.photos/seed/sakura_p5/600/800',  isPublic: true },
        { id: 'p6',  title: 'Animangaki 2024 — Banner',    description: '6×2ft standee banner for my booth.',         category: 'Illustration',  imageUrl: 'https://picsum.photos/seed/sakura_p6/400/700',  isPublic: true },
        { id: 'p7',  title: 'Chibi Set — 4-Pack',          description: '4-design chibi sticker set, holographic foil.', category: 'Stickers',   imageUrl: 'https://picsum.photos/seed/sakura_p7/500/500',  isPublic: true },
        { id: 'p8',  title: 'OC — Mira Moonblade',         description: 'Original character for my webcomic project.', category: 'Digital Art',  imageUrl: 'https://picsum.photos/seed/sakura_p8/400/580',  isPublic: true },
        { id: 'p9',  title: 'Fan Art — Honkai Star Rail',  description: 'Kafka and Silver Wolf commission piece.',     category: 'Digital Art',    imageUrl: 'https://picsum.photos/seed/sakura_p9/600/420',  isPublic: true },
        { id: 'p10', title: 'Washi Tape Design',           description: 'Sakura motif washi tape for convention merch.', category: 'Illustration', imageUrl: 'https://picsum.photos/seed/sakura_p10/600/400', isPublic: true },
        { id: 'p11', title: 'Commission — Group Portrait', description: 'Group of 3 OCs, full shaded with background.', category: 'Digital Art',  imageUrl: 'https://picsum.photos/seed/sakura_p11/400/560', isPublic: true },
        { id: 'p12', title: 'Holographic Sticker Sheet',   description: 'A5 sticker sheet, 12 designs, holographic.',   category: 'Stickers',     imageUrl: 'https://picsum.photos/seed/sakura_p12/500/700', isPublic: true },
        { id: 'p13', title: 'Bookmark Set — Celestial',    description: 'Set of 4 double-sided bookmarks.',             category: 'Cosplay Print', imageUrl: 'https://picsum.photos/seed/sakura_p13/400/600', isPublic: true },
        { id: 'p14', title: 'Landscape Mural Study',       description: 'Fantasy landscape study, Clip Studio Paint.',  category: 'Illustration',  imageUrl: 'https://picsum.photos/seed/sakura_p14/600/360', isPublic: true },
        { id: 'p15', title: 'NOIZU Launch Illustration',   description: 'Commissioned key visual for NOIZU DIRECT.',    category: 'Digital Art',    imageUrl: 'https://picsum.photos/seed/sakura_p15/600/400', isPublic: true },
        { id: 'p16', title: 'Enamel Pin Mockup',           description: 'Design mockup for upcoming Kickstarter set.',  category: 'Illustration',  imageUrl: 'https://picsum.photos/seed/sakura_p16/500/500', isPublic: true },
      ]),
    },
  });

  // Creator 2: Akira Doujin — indie manga circle, PJ-based
  const c2 = await prisma.user.upsert({
    where: { email: 'akira@noizu.direct' },
    update: {},
    create: {
      email: 'akira@noizu.direct',
      password: creatorPassword,
      name: 'Ahmad Farhan',
      role: 'CREATOR',
    },
  });
  const akiraProfile = await prisma.creatorProfile.upsert({
    where: { username: 'akira_doujin' },
    update: {
      userId: c2.id,
      displayName: 'Akira Doujin Works',
      bio: 'Indie doujin circle based in Petaling Jaya, Malaysia. Original BL and josei manga in physical and digital. Sold at Comic Fiesta, Animangaki, and World Cosplay Summit Malaysia since 2016. Everything is hand-lettered, no AI.',
      categoryTags: JSON.stringify(['DOUJIN', 'DIGITAL_ART']),
      commissionStatus: 'LIMITED',
      announcementText: '📚 Midnight Chronicles Vol.2 pre-orders now open! Ships after Animangaki July. Limited to 100 copies.',
      announcementActive: true,
      isVerified: true,
      isTopCreator: false,
      totalSales: 89,
      avatar: 'https://picsum.photos/seed/akira_avatar/200/200',
      bannerImage: 'https://picsum.photos/seed/akira_banner/1200/300',
      socialLinks: JSON.stringify({
        twitter: 'https://twitter.com/akira_doujin',
        instagram: 'https://instagram.com/akira.doujin',
      }),
      badges: JSON.stringify(['Convention Veteran']),
      commissionSlots: 2,
      commissionTerms: 'Character design commissions only (no story writing commissions). Turnaround: 3–6 weeks. 50% deposit upfront, remainder on delivery. Reference images required.',
      commissionPricing: JSON.stringify([
        { tier: 'Character Design Sheet', price: 150, description: 'Front/back view + 4 expressions, lineart + flat color' },
        { tier: 'Cover Illustration', price: 300, description: 'Full cover art with typography treatment, print-ready 300dpi' },
      ]),
      portfolioItems: JSON.stringify([
        { id: 'p1', title: 'Midnight Chronicles Vol.1 Cover', description: 'Cover art for MC Vol.1. Sold out at CF2024.', category: 'Doujin', imageUrl: 'https://picsum.photos/seed/akira_p1/500/700', isPublic: true },
        { id: 'p2', title: 'Ren Yukimura — Full Character Sheet', description: 'Design sheet for original character Ren.', category: 'Digital Art', imageUrl: 'https://picsum.photos/seed/akira_p2/600/800', isPublic: true },
        { id: 'p3', title: 'WCS Malaysia 2023 — Promo Art', description: 'Official promo illustration for my WCS Malaysia participation.', category: 'Digital Art', imageUrl: 'https://picsum.photos/seed/akira_p3/600/600', isPublic: true },
      ]),
    },
    create: {
      userId: c2.id,
      username: 'akira_doujin',
      displayName: 'Akira Doujin Works',
      bio: 'Indie doujin circle based in Petaling Jaya, Malaysia. Original BL and josei manga.',
      categoryTags: JSON.stringify(['DOUJIN', 'DIGITAL_ART']),
      commissionStatus: 'LIMITED',
      isVerified: true,
      isTopCreator: false,
      totalSales: 89,
      avatar: 'https://picsum.photos/seed/akira_avatar/200/200',
      bannerImage: 'https://picsum.photos/seed/akira_banner/1200/300',
      socialLinks: JSON.stringify({ twitter: 'https://twitter.com/akira_doujin' }),
      badges: JSON.stringify(['Convention Veteran']),
      commissionSlots: 2,
      commissionPricing: JSON.stringify([
        { tier: 'Character Design Sheet', price: 150, description: 'Front/back + expressions' },
      ]),
      portfolioItems: JSON.stringify([
        { id: 'p1', title: 'Midnight Chronicles Vol.1 Cover', description: 'Cover art for MC Vol.1.', category: 'Doujin', imageUrl: 'https://picsum.photos/seed/akira_p1/500/700', isPublic: true },
      ]),
    },
  });

  // Creator 3: Luna Cosplay — professional cosplayer, Singapore
  const c3 = await prisma.user.upsert({
    where: { email: 'luna@noizu.direct' },
    update: {},
    create: {
      email: 'luna@noizu.direct',
      password: creatorPassword,
      name: 'Tan Wei Ling',
      role: 'CREATOR',
    },
  });
  const lunaProfile = await prisma.creatorProfile.upsert({
    where: { username: 'cosplay_luna' },
    update: {
      userId: c3.id,
      displayName: 'Luna Cosplay',
      bio: 'Professional cosplayer based in Singapore. WCS Malaysia 2022 finalist. Known for elaborate armour builds and accurate character recreations. Prints, digital wallpacks, and sticker packs from my photoshoots. Prints ship from Singapore.',
      categoryTags: JSON.stringify(['COSPLAY_PRINT', 'STICKERS', 'DIGITAL_ART']),
      commissionStatus: 'CLOSED',
      announcementText: '📸 New print set from my WCS 2024 build now available! Limited to 50 sets.',
      announcementActive: true,
      isVerified: false,
      isTopCreator: false,
      totalSales: 54,
      avatar: 'https://picsum.photos/seed/luna_avatar/200/200',
      bannerImage: 'https://picsum.photos/seed/luna_banner/1200/300',
      socialLinks: JSON.stringify({
        instagram: 'https://instagram.com/luna.cosplay.sg',
        tiktok: 'https://tiktok.com/@lunacosplaysg',
      }),
      portfolioItems: JSON.stringify([
        { id: 'p1',  title: 'Sailor Moon Armour Build',      description: 'Full armour build for CF2023. EVA foam + Worbla. Won Best Craftsmanship.', category: 'Cosplay',     imageUrl: 'https://picsum.photos/seed/luna_p1/400/600',  isPublic: true },
        { id: 'p2',  title: 'Summer Festival Shoot',         description: 'Outdoor photoshoot at Botanic Gardens SG. 5 wallpaper set.',               category: 'Photography', imageUrl: 'https://picsum.photos/seed/luna_p2/600/420',  isPublic: true },
        { id: 'p3',  title: 'WCS Malaysia 2022 Finalist',   description: 'Zero Two build — hand-sewn uniform + 3D printed horns.',                   category: 'Cosplay',     imageUrl: 'https://picsum.photos/seed/luna_p3/400/560',  isPublic: true },
        { id: 'p4',  title: 'Night City Shoot',             description: 'Cyberpunk 2077 inspired outdoor shoot in Clarke Quay.',                     category: 'Photography', imageUrl: 'https://picsum.photos/seed/luna_p4/600/800',  isPublic: true },
        { id: 'p5',  title: 'Genshin Cosplay — Raiden Shogun', description: 'Full build with hand-crafted electro Vision prop.',                     category: 'Cosplay',     imageUrl: 'https://picsum.photos/seed/luna_p5/400/500',  isPublic: true },
        { id: 'p6',  title: 'CF2024 Print Set',             description: 'A4 and A5 photo prints sold at my CF2024 table.',                          category: 'Photography', imageUrl: 'https://picsum.photos/seed/luna_p6/600/400',  isPublic: true },
        { id: 'p7',  title: 'Demon Slayer — Nezuko',        description: 'Boxed Nezuko costume + bamboo gag prop.',                                  category: 'Cosplay',     imageUrl: 'https://picsum.photos/seed/luna_p7/400/580',  isPublic: true },
        { id: 'p8',  title: 'Wallpaper Pack — Blossom',     description: 'Spring sakura wallpaper shoot, 10 desktop + mobile edits.',                category: 'Photography', imageUrl: 'https://picsum.photos/seed/luna_p8/600/360',  isPublic: true },
        { id: 'p9',  title: 'Honkai: Star Rail — Firefly',  description: 'Newest build. Space-moth wing frame + fibre optics.',                      category: 'Cosplay',     imageUrl: 'https://picsum.photos/seed/luna_p9/400/560',  isPublic: true },
        { id: 'p10', title: 'Behind the Seams — Making-Of', description: 'Process documentation of my Sailor Moon build from foam to finish.',       category: 'Photography', imageUrl: 'https://picsum.photos/seed/luna_p10/600/450', isPublic: true },
        { id: 'p11', title: 'Sticker Pack — Chibi Cosplay', description: 'Die-cut sticker set of 8 chibi versions of my past cosplays.',             category: 'Stickers',    imageUrl: 'https://picsum.photos/seed/luna_p11/500/500', isPublic: true },
        { id: 'p12', title: 'Convention Lanyard Design',    description: 'Custom lanyard design for CF2024 attendees.',                              category: 'Illustration', imageUrl: 'https://picsum.photos/seed/luna_p12/400/600', isPublic: true },
        { id: 'p13', title: 'Outdoor Nature Shoot',         description: 'Fantasy elf cosplay in Penang Botanical Gardens.',                         category: 'Photography', imageUrl: 'https://picsum.photos/seed/luna_p13/600/800', isPublic: true },
        { id: 'p14', title: 'Studio Lighting Test',         description: 'Red-purple studio setup test shots, available as wallpaper download.',     category: 'Photography', imageUrl: 'https://picsum.photos/seed/luna_p14/600/400', isPublic: true },
        { id: 'p15', title: 'Blue Archive — Shiroko',       description: 'School uniform + motorbike prop, indoor studio shoot.',                    category: 'Cosplay',     imageUrl: 'https://picsum.photos/seed/luna_p15/400/560', isPublic: true },
      ]),
    },
    create: {
      userId: c3.id,
      username: 'cosplay_luna',
      displayName: 'Luna Cosplay',
      bio: 'Professional cosplayer based in Singapore. WCS Malaysia 2022 finalist.',
      categoryTags: JSON.stringify(['COSPLAY_PRINT', 'STICKERS', 'DIGITAL_ART']),
      commissionStatus: 'CLOSED',
      isVerified: false,
      isTopCreator: false,
      totalSales: 54,
      avatar: 'https://picsum.photos/seed/luna_avatar/200/200',
      bannerImage: 'https://picsum.photos/seed/luna_banner/1200/300',
      socialLinks: JSON.stringify({ instagram: 'https://instagram.com/luna.cosplay.sg' }),
      portfolioItems: JSON.stringify([
        { id: 'p1',  title: 'Sailor Moon Armour Build',         description: 'Full EVA foam armour build for CF2023.',              category: 'Cosplay',     imageUrl: 'https://picsum.photos/seed/luna_p1/400/600',  isPublic: true },
        { id: 'p2',  title: 'Summer Festival Shoot',            description: 'Botanic Gardens outdoor shoot, 5 wallpaper set.',     category: 'Photography', imageUrl: 'https://picsum.photos/seed/luna_p2/600/420',  isPublic: true },
        { id: 'p3',  title: 'WCS Malaysia 2022 Finalist',       description: 'Zero Two build — hand-sewn uniform + 3D horns.',      category: 'Cosplay',     imageUrl: 'https://picsum.photos/seed/luna_p3/400/560',  isPublic: true },
        { id: 'p4',  title: 'Night City Shoot',                 description: 'Cyberpunk 2077 inspired shoot in Clarke Quay.',       category: 'Photography', imageUrl: 'https://picsum.photos/seed/luna_p4/600/800',  isPublic: true },
        { id: 'p5',  title: 'Genshin — Raiden Shogun',          description: 'Full build with hand-crafted electro Vision prop.',   category: 'Cosplay',     imageUrl: 'https://picsum.photos/seed/luna_p5/400/500',  isPublic: true },
        { id: 'p6',  title: 'CF2024 Print Set',                 description: 'A4 and A5 photo prints sold at my CF2024 table.',     category: 'Photography', imageUrl: 'https://picsum.photos/seed/luna_p6/600/400',  isPublic: true },
        { id: 'p7',  title: 'Demon Slayer — Nezuko',            description: 'Boxed Nezuko costume + bamboo gag prop.',             category: 'Cosplay',     imageUrl: 'https://picsum.photos/seed/luna_p7/400/580',  isPublic: true },
        { id: 'p8',  title: 'Wallpaper Pack — Blossom',         description: 'Spring sakura shoot, 10 desktop + mobile edits.',    category: 'Photography', imageUrl: 'https://picsum.photos/seed/luna_p8/600/360',  isPublic: true },
        { id: 'p9',  title: 'Honkai: Star Rail — Firefly',      description: 'Space-moth wing frame + fibre optics build.',        category: 'Cosplay',     imageUrl: 'https://picsum.photos/seed/luna_p9/400/560',  isPublic: true },
        { id: 'p10', title: 'Behind the Seams — Making-Of',     description: 'Process documentation of my Sailor Moon build.',     category: 'Photography', imageUrl: 'https://picsum.photos/seed/luna_p10/600/450', isPublic: true },
        { id: 'p11', title: 'Sticker Pack — Chibi Cosplay',     description: 'Die-cut stickers of 8 chibi cosplay versions.',      category: 'Stickers',    imageUrl: 'https://picsum.photos/seed/luna_p11/500/500', isPublic: true },
        { id: 'p12', title: 'Convention Lanyard Design',        description: 'Custom lanyard design for CF2024 attendees.',        category: 'Illustration', imageUrl: 'https://picsum.photos/seed/luna_p12/400/600', isPublic: true },
      ]),
    },
  });

  // Creator 4: Prop Smith MY — prop maker, Johor
  const c4 = await prisma.user.upsert({
    where: { email: 'propsmith@noizu.direct' },
    update: {},
    create: {
      email: 'propsmith@noizu.direct',
      password: creatorPassword,
      name: 'Hafiz Rahman',
      role: 'CREATOR',
    },
  });
  const propsmithProfile = await prisma.creatorProfile.upsert({
    where: { username: 'propsmith_my' },
    update: {
      userId: c4.id,
      displayName: 'PropSmith MY',
      bio: 'Prop maker from Johor Bahru. 3D printing + Worbla + resin casting. Swords, shields, armour pieces — anything in a game I can build it. Available for event appearances and cosplay collaboration. Shipped 200+ props across SEA.',
      categoryTags: JSON.stringify(['PHYSICAL_MERCH']),
      commissionStatus: 'OPEN',
      isVerified: true,
      isTopCreator: false,
      totalSales: 112,
      avatar: 'https://picsum.photos/seed/prop_avatar/200/200',
      bannerImage: 'https://picsum.photos/seed/prop_banner/1200/300',
      socialLinks: JSON.stringify({
        instagram: 'https://instagram.com/propsmith.my',
        youtube: 'https://youtube.com/@propsmithmy',
        facebook: 'https://facebook.com/PropSmithMY',
      }),
      badges: JSON.stringify(['Convention Veteran']),
      commissionSlots: 3,
      commissionTerms: 'All props are custom-made to order. Lead time: 4–8 weeks depending on complexity. Shipping via Pos Malaysia or J&T. Video call consultation included for complex builds. 50% non-refundable deposit required.',
      commissionPricing: JSON.stringify([
        { tier: 'Small Prop (under 30cm)', price: 80, description: 'Resin cast or 3D printed, painted and sealed' },
        { tier: 'Medium Prop (30–80cm)', price: 180, description: 'Worbla or EVA foam, thermoformed, painted' },
        { tier: 'Large Prop / Full Weapon', price: 350, description: 'Full-size weapon replica, LED optional, carry case included' },
      ]),
      portfolioItems: JSON.stringify([
        { id: 'p1', title: 'Genshin Impact Claymore Build', description: 'Full-size claymore, EVA foam + Worbla. Shown at CF2024.', category: 'Prop Making', imageUrl: 'https://picsum.photos/seed/prop_p1/600/800', isPublic: true },
        { id: 'p2', title: 'Demon Slayer Sword Set', description: 'Three swords commission for group cosplay. Painted resin.', category: 'Prop Making', imageUrl: 'https://picsum.photos/seed/prop_p2/600/700', isPublic: true },
        { id: 'p3', title: 'Resin Badge Commissions', description: 'Custom resin badges for convention lanyards. Any design.', category: 'Prop Making', imageUrl: 'https://picsum.photos/seed/prop_p3/500/500', isPublic: true },
      ]),
    },
    create: {
      userId: c4.id,
      username: 'propsmith_my',
      displayName: 'PropSmith MY',
      bio: 'Prop maker from Johor Bahru. 3D printing + Worbla + resin casting.',
      categoryTags: JSON.stringify(['PHYSICAL_MERCH']),
      commissionStatus: 'OPEN',
      isVerified: true,
      isTopCreator: false,
      totalSales: 112,
      avatar: 'https://picsum.photos/seed/prop_avatar/200/200',
      bannerImage: 'https://picsum.photos/seed/prop_banner/1200/300',
      socialLinks: JSON.stringify({ instagram: 'https://instagram.com/propsmith.my' }),
      badges: JSON.stringify(['Convention Veteran']),
      commissionSlots: 3,
      commissionPricing: JSON.stringify([
        { tier: 'Small Prop', price: 80, description: 'Resin cast or 3D printed, painted' },
        { tier: 'Full Weapon', price: 350, description: 'Full-size weapon replica' },
      ]),
      portfolioItems: JSON.stringify([
        { id: 'p1', title: 'Genshin Impact Claymore', description: 'Full-size claymore for CF2024.', category: 'Prop Making', imageUrl: 'https://picsum.photos/seed/prop_p1/600/800', isPublic: true },
      ]),
    },
  });

  console.log('✅ Creators created');

  // Buyers
  const buyerPassword = await bcrypt.hash('buyer123', 10);
  const buyer1 = await prisma.user.upsert({
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

  // Delete existing products to avoid duplicates on reseed
  await prisma.product.deleteMany({
    where: {
      creatorId: {
        in: [sakuraProfile.id, akiraProfile.id, lunaProfile.id, propsmithProfile.id],
      },
    },
  });

  // Products with picsum images
  const products = [
    // Sakura Arts products
    {
      creatorId: sakuraProfile.id,
      title: 'Cherry Blossom OC Artpack — Hana',
      description: 'High-res digital artpack featuring original character "Hana", a shrine maiden from an alternate Meiji-era Japan. 15 illustrations in 4K resolution, PSD layered files included. Perfect for printing or use as wallpapers.',
      price: 1500,
      category: 'DIGITAL_ART',
      type: 'DIGITAL',
      isPinned: true,
      order: 0,
      images: JSON.stringify([
        'https://picsum.photos/seed/sakura_prod1a/600/600',
        'https://picsum.photos/seed/sakura_prod1b/600/600',
      ]),
    },
    {
      creatorId: sakuraProfile.id,
      title: 'Custom OC Portrait Commission',
      description: 'Fully coloured custom portrait of your original character or favourite series character. Choose bust or full body. Includes 3 revision rounds, PNG + PSD delivery. Turnaround 2–3 weeks. Genshin, Hoyoverse, VTuber-style welcome.',
      price: 4500,
      category: 'DIGITAL_ART',
      type: 'DIGITAL',
      isPinned: false,
      order: 1,
      images: JSON.stringify([
        'https://picsum.photos/seed/sakura_prod2a/600/600',
      ]),
    },
    {
      creatorId: sakuraProfile.id,
      title: 'Anime Chibi Sticker Set — 20 Pack',
      description: 'Pack of 20 original chibi character stickers, PNG with transparent background. Includes 5 bonus holiday variants. Print at home or order at any sticker print shop. Commercial use OK for small runs under 500 units.',
      price: 800,
      category: 'STICKERS',
      type: 'DIGITAL',
      isPinned: true,
      order: 2,
      images: JSON.stringify([
        'https://picsum.photos/seed/sakura_prod3a/600/600',
        'https://picsum.photos/seed/sakura_prod3b/600/600',
      ]),
    },
    {
      creatorId: sakuraProfile.id,
      title: 'Yokai Academy Merch Bundle (Physical)',
      description: 'Physical merch bundle: 1× acrylic stand keychain (7cm), 5× holographic A6 stickers, 1× A5 postcard with envelope. All items hand-packaged. Ships within Malaysia and Singapore only. Stock limited — order early for CF2025 pickup.',
      price: 2800,
      category: 'PHYSICAL_MERCH',
      type: 'PHYSICAL',
      stock: 30,
      isPinned: false,
      order: 3,
      images: JSON.stringify([
        'https://picsum.photos/seed/sakura_prod4a/600/600',
      ]),
    },
    {
      creatorId: sakuraProfile.id,
      title: 'CF2025 Exclusive Art Print — Midnight Bloom',
      description: 'Limited A4 art print available exclusively at Comic Fiesta 2025. High-quality glossy finish. Original illustration featuring Hana under a night cherry blossom tree. Only 50 copies printed — individually numbered.',
      price: 1200,
      category: 'COSPLAY_PRINT',
      type: 'PHYSICAL',
      stock: 50,
      isPinned: false,
      order: 4,
      images: JSON.stringify(['https://picsum.photos/seed/sakura_prod5a/600/800']),
    },
    {
      creatorId: sakuraProfile.id,
      title: 'Pastel OC Illustration Pack Vol.2',
      description: 'Second volume of the popular pastel illustration series. 10 high-res PNG illustrations, soft kawaii aesthetic, includes seasonal variants for spring and summer. Ideal for desktop wallpapers, phone backgrounds or printing.',
      price: 1000,
      category: 'DIGITAL_ART',
      type: 'DIGITAL',
      isPinned: false,
      order: 5,
      images: JSON.stringify(['https://picsum.photos/seed/sakura_prod6a/600/800']),
    },
    {
      creatorId: sakuraProfile.id,
      title: 'Chibi Couple Commission',
      description: 'Cute chibi-style couple portrait — perfect for anniversaries, cosplay pairs, or VTuber partner art. Flat colour with simple background. PNG + transparent version delivered. 1–2 week turnaround.',
      price: 2500,
      category: 'DIGITAL_ART',
      type: 'DIGITAL',
      isPinned: false,
      order: 6,
      images: JSON.stringify(['https://picsum.photos/seed/sakura_prod7a/600/800']),
    },
    {
      creatorId: sakuraProfile.id,
      title: 'Washi Tape Set — Shrine Maiden Series',
      description: 'Set of 3 decorative washi tapes featuring original shrine maiden character designs. 15mm width, 5m per roll. Matte finish, repositionable. Great for journaling, planners and packaging decoration. Ships flat in protective sleeve.',
      price: 900,
      category: 'PHYSICAL_MERCH',
      type: 'PHYSICAL',
      stock: 80,
      isPinned: false,
      order: 7,
      images: JSON.stringify(['https://picsum.photos/seed/sakura_prod8a/600/800']),
    },
    {
      creatorId: sakuraProfile.id,
      title: 'Animangaki 2025 Sticker Sheet',
      description: 'Full A5 sticker sheet with 16 individual die-cut stickers. Yokai and shrine maiden theme. Waterproof vinyl, dishwasher-safe. Sold at Animangaki 2025 and online while stocks last.',
      price: 600,
      category: 'STICKERS',
      type: 'PHYSICAL',
      stock: 100,
      isPinned: false,
      order: 8,
      images: JSON.stringify(['https://picsum.photos/seed/sakura_prod9a/600/800']),
    },
    {
      creatorId: sakuraProfile.id,
      title: 'Digital Zine — Malay Mythology Reimagined',
      description: 'A 32-page digital zine exploring Malaysian mythological figures redrawn in a modern anime art style. Features Puteri Gunung Ledang, Mahsuri, Sang Kancil and more. PDF format, print-at-home friendly.',
      price: 700,
      category: 'DOUJIN',
      type: 'DIGITAL',
      isPinned: false,
      order: 9,
      images: JSON.stringify(['https://picsum.photos/seed/sakura_prod10a/600/800']),
    },
    {
      creatorId: sakuraProfile.id,
      title: 'Enamel Pin — Hana Chibi',
      description: 'Hard enamel pin of original character Hana in chibi form. 40mm height, gold plating, rubber clutch backing. Limited first production run of 100 units. Comes with backing card and OPP bag.',
      price: 1800,
      category: 'PHYSICAL_MERCH',
      type: 'PHYSICAL',
      stock: 40,
      isPinned: false,
      order: 10,
      images: JSON.stringify(['https://picsum.photos/seed/sakura_prod11a/600/800']),
    },
    {
      creatorId: sakuraProfile.id,
      title: 'Full Illustration Commission — Detailed Scene',
      description: 'Fully rendered scene illustration with background, up to 2 characters. Painterly style with full shading and environment detail. Perfect for book covers, VTuber debut art or personal projects. 4–6 week turnaround, includes 3 sketches for approval.',
      price: 9500,
      category: 'DIGITAL_ART',
      type: 'DIGITAL',
      isPinned: false,
      order: 11,
      images: JSON.stringify(['https://picsum.photos/seed/sakura_prod12a/600/800']),
    },
    // Akira Doujin products
    {
      creatorId: akiraProfile.id,
      title: 'Midnight Chronicles Vol.1 — Physical Doujin',
      description: 'Original BL doujin manga by Akira Doujin Works. A5 size, 48 pages, full-colour matte cover. Set in 1920s colonial Malaya — forbidden romance between a British officer and a Malay merchant\'s son. Signed by the author. Ships from Malaysia via Pos Malaysia.',
      price: 2000,
      category: 'DOUJIN',
      type: 'PHYSICAL',
      stock: 50,
      isPinned: true,
      order: 0,
      images: JSON.stringify([
        'https://picsum.photos/seed/akira_prod1a/600/800',
        'https://picsum.photos/seed/akira_prod1b/600/800',
      ]),
    },
    {
      creatorId: akiraProfile.id,
      title: 'Midnight Chronicles Vol.1 — Digital PDF',
      description: 'Digital PDF version of Midnight Chronicles Vol.1. Full resolution 300dpi, 48 pages. Instant download after purchase. Compatible with all PDF readers and e-ink devices. Reading on tablet recommended for best experience.',
      price: 800,
      category: 'DOUJIN',
      type: 'DIGITAL',
      isPinned: false,
      order: 1,
      images: JSON.stringify([
        'https://picsum.photos/seed/akira_prod2a/600/800',
      ]),
    },
    {
      creatorId: akiraProfile.id,
      title: 'Ren Yukimura Character Design Sheet',
      description: 'Complete character design document for original character Ren Yukimura from Midnight Chronicles. Includes: front view, back view, 6 facial expressions, outfit breakdown, colour palette guide. Suitable for fan artists and cosplayers.',
      price: 600,
      category: 'DIGITAL_ART',
      type: 'DIGITAL',
      isPinned: false,
      order: 2,
      images: JSON.stringify([
        'https://picsum.photos/seed/akira_prod3a/600/600',
      ]),
    },
    // Luna Cosplay products
    {
      creatorId: lunaProfile.id,
      title: 'WCS 2024 Armour Build — Print Set',
      description: 'Professional photoshoot print set from my World Cosplay Summit 2024 qualifying build. 8 high-res A4 glossy prints from the Istana Budaya photoshoot. Numbered edition, limited to 50 sets. Ships from Singapore via SingPost.',
      price: 3500,
      category: 'COSPLAY_PRINT',
      type: 'PHYSICAL',
      stock: 20,
      isPinned: true,
      order: 0,
      images: JSON.stringify([
        'https://picsum.photos/seed/luna_prod1a/600/800',
        'https://picsum.photos/seed/luna_prod1b/600/800',
      ]),
    },
    {
      creatorId: lunaProfile.id,
      title: 'Summer Festival Wallpack — 4K Digital',
      description: 'Five 4K wallpapers from the Botanic Gardens Singapore summer shoot. Yukata cosplay of an original design. Includes both mobile (9:16) and desktop (16:9) crops for each image. Instant digital download, PNG format.',
      price: 500,
      category: 'DIGITAL_ART',
      type: 'DIGITAL',
      isPinned: false,
      order: 1,
      images: JSON.stringify([
        'https://picsum.photos/seed/luna_prod2a/600/600',
      ]),
    },
    {
      creatorId: lunaProfile.id,
      title: 'Chibi Me Sticker Bomb Pack — 30 Designs',
      description: '30 chibi sticker designs based on my most popular cosplays — Sailor Moon, Zero Two, Rem, and original designs. PNG + SVG files included. Personal use and small-print-run commercial use permitted (under 100 units).',
      price: 1200,
      category: 'STICKERS',
      type: 'DIGITAL',
      isPinned: false,
      order: 2,
      images: JSON.stringify([
        'https://picsum.photos/seed/luna_prod3a/600/600',
        'https://picsum.photos/seed/luna_prod3b/600/600',
      ]),
    },
    // PropSmith products
    {
      creatorId: propsmithProfile.id,
      title: 'Custom Prop Commission — Full Weapon',
      description: 'Commission a full-size weapon prop for your next cosplay. Specialising in Genshin Impact, Final Fantasy, and Demon Slayer weapons. EVA foam + Worbla construction, hand-painted. Weight-balanced for wearing at conventions. Includes travel case. Shipped via GDex.',
      price: 35000,
      category: 'PHYSICAL_MERCH',
      type: 'PHYSICAL',
      stock: null,
      isPinned: true,
      order: 0,
      images: JSON.stringify([
        'https://picsum.photos/seed/prop_prod1a/600/600',
        'https://picsum.photos/seed/prop_prod1b/600/600',
      ]),
    },
    {
      creatorId: propsmithProfile.id,
      title: 'Resin Character Badge (Custom)',
      description: 'Custom resin badge featuring your favourite character or OC. 6cm diameter, UV-printed design sealed under crystal-clear resin dome. Includes pin back and optional keyring attachment. Great for convention lanyards. 2-week turnaround.',
      price: 1800,
      category: 'PHYSICAL_MERCH',
      type: 'PHYSICAL',
      stock: 50,
      isPinned: false,
      order: 1,
      images: JSON.stringify([
        'https://picsum.photos/seed/prop_prod2a/600/600',
      ]),
    },
  ];

  for (const p of products) {
    await prisma.product.create({ data: p as any });
  }
  console.log(`✅ Products created (${products.length})`);

  // Homepage CMS sections
  const sectionsExist = await prisma.section.count({ where: { pageSlug: 'home' } });
  if (sectionsExist === 0) {
    const now = new Date();
    await prisma.section.createMany({
      data: [
        {
          pageSlug: 'home',
          type: 'HERO',
          order: 0,
          isActive: true,
          content: JSON.stringify({
            headline: 'Your fave SEA creators. Direct to you.',
            subtext: "Original art, doujin, cosplay prints and handmade merch from Malaysia, Singapore, Indonesia, Philippines and beyond. Zero middlemen.",
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
    update: {
      content: '# About NOIZU-DIRECT\n\nNOIZU-DIRECT is a creator marketplace built for the Southeast Asian pop culture community — cosplayers, illustrators, doujin circles, and merch makers from Malaysia, Singapore, Indonesia, Philippines, and Thailand.\n\n## Our Story\n\nWe started NOIZU-DIRECT after watching talented SEA creators struggle with international payment barriers and high platform fees. Comic Fiesta, Animangaki, and World Cosplay Summit showcase incredible local talent — we wanted that talent accessible year-round, not just at annual conventions.\n\n## Zero Platform Fees\n\nDuring our launch period, NOIZU-DIRECT charges **0% platform fees**. Creators keep every ringgit, dollar, and peso they earn.\n\n## Multi-Currency Payments\n\nWe support MYR, SGD, USD, PHP, IDR, and THB via Airwallex — so fans across the region pay in their local currency without hidden conversion charges.\n\n## Contact\n\nReach us at hello@noizu.direct\nInstagram: @noizu.direct',
    },
    create: {
      slug: 'about',
      title: 'About NOIZU-DIRECT',
      status: 'PUBLISHED',
      content: '# About NOIZU-DIRECT\n\nNOIZU-DIRECT is a creator marketplace for Southeast Asian pop culture creators.\n\n## Our Mission\n\nEliminate barriers between SEA creators and their fans. No middlemen, no complicated payment systems.\n\n## Platform Fees\n\nDuring our launch period, NOIZU-DIRECT charges 0% platform fees.\n\n## Contact\n\nhello@noizu.direct',
      seoTitle: 'About NOIZU-DIRECT | Creator Marketplace for SEA Pop Culture',
      seoDescription: 'Learn about NOIZU-DIRECT, the creator marketplace for Malaysian, Singaporean, and SEA cosplay, doujin, and anime art creators.',
    },
  });

  await prisma.page.upsert({
    where: { slug: 'terms' },
    update: {},
    create: {
      slug: 'terms',
      title: 'Terms of Service',
      status: 'PUBLISHED',
      content: '# Terms of Service\n\nLast updated: April 2025\n\n## 1. Acceptance of Terms\n\nBy accessing NOIZU-DIRECT, you agree to these Terms of Service.\n\n## 2. Creator Eligibility\n\nCreators must be 18 years or older. Creators are responsible for the legality of content they sell in their home jurisdiction.\n\n## 3. Platform Fees\n\nNOIZU-DIRECT currently charges 0% platform fees. Payment processing fees (approx. 2.5%) are charged by our payment processor Airwallex and may be absorbed by the creator or passed to buyers.\n\n## 4. Content Policy\n\nAll content must be your original work or properly licensed. Fan art of commercial IP is permitted for personal-use prints and non-commercial digital files, consistent with standard doujin/fanwork practices in the SEA convention community. Commercial resale of fan work requires proper licensing.\n\n## 5. Refund Policy\n\nDigital products: non-refundable once the download link is accessed. Physical products: returns accepted within 14 days of receipt if defective or significantly not as described. Creator responsible for return shipping.\n\n## 6. Convention References\n\nReferences to Comic Fiesta, Animangaki, World Cosplay Summit, and other events are for descriptive context only. NOIZU-DIRECT is not affiliated with any convention organisation.',
      seoTitle: 'Terms of Service | NOIZU-DIRECT',
      seoDescription: 'NOIZU-DIRECT Terms of Service — platform rules, fee structure, and content policy.',
    },
  });
  console.log('✅ Static pages created');

  // ── CartItem seed data ─────────────────────────────────────────────────────
  // Add sample cart for buyer1@test.com to demonstrate multi-creator checkout
  const buyer1Cart = await prisma.user.findUnique({ where: { email: 'buyer1@test.com' } })
  if (buyer1Cart) {
    // Find products by creator
    const sakuraProfileCart = await prisma.creatorProfile.findUnique({ where: { username: 'sakura_arts' } })
    const otomeProfile = await prisma.creatorProfile.findUnique({ where: { username: 'otome_prints' } })

    if (sakuraProfileCart) {
      const sakuraProducts = await prisma.product.findMany({
        where: { creatorId: sakuraProfileCart.id, isActive: true },
        take: 2,
        orderBy: { createdAt: 'asc' }
      })
      for (const product of sakuraProducts) {
        await prisma.cartItem.upsert({
          where: {
            id: `cart_seed_${buyer1Cart.id}_${product.id}`
          },
          update: {},
          create: {
            id: `cart_seed_${buyer1Cart.id}_${product.id}`,
            buyerId: buyer1Cart.id,
            productId: product.id,
            quantity: 1,
          }
        })
      }
      console.log(`✅ Cart: added ${Math.min(2, sakuraProducts.length)} items from sakura_arts`)
    }

    if (otomeProfile) {
      const otomeProducts = await prisma.product.findMany({
        where: { creatorId: otomeProfile.id, isActive: true },
        take: 1,
        orderBy: { createdAt: 'asc' }
      })
      for (const product of otomeProducts) {
        await prisma.cartItem.upsert({
          where: {
            id: `cart_seed_${buyer1Cart.id}_${product.id}`
          },
          update: {},
          create: {
            id: `cart_seed_${buyer1Cart.id}_${product.id}`,
            buyerId: buyer1Cart.id,
            productId: product.id,
            quantity: 1,
          }
        })
      }
      console.log(`✅ Cart: added ${Math.min(1, otomeProducts.length)} items from otome_prints`)
    }
  }

  // Active announcement
  const announcementCount = await prisma.announcement.count();
  if (announcementCount === 0) {
    await prisma.announcement.create({
      data: {
        text: '🎉 Welcome to NOIZU-DIRECT Beta! 0% platform fees during launch. Comic Fiesta 2025 creator pre-orders now live.',
        link: '/marketplace',
        color: '#7c3aed',
        isActive: true,
      },
    });
  }
  console.log('✅ Announcement created');

  // Storage pricing config
  await prisma.storagePricingConfig.upsert({
    where: { id: 'config' },
    create: { id: 'config' },
    update: {},
  });
  console.log('✅ StoragePricingConfig seeded');

  // Storage policy CMS page
  await prisma.page.upsert({
    where: { slug: 'storage-policy' },
    create: {
      slug: 'storage-policy',
      title: 'Storage Policy',
      status: 'PUBLISHED',
      showInFooter: true,
      footerColumn: 'Support',
      footerOrder: 99,
      content: `# NOIZU-DIRECT STORAGE POLICY

Last updated: April 2026

## 1. Storage Allocations

Every creator account includes 500MB free storage.

- **Free Plan**: 500MB — included with all creator accounts
- **Pro Plan**: 5GB — USD 9.99/month
- **Studio Plan**: 20GB — USD 19.99/month

One-time top-ups: +1GB (USD 2.99), +5GB (USD 9.99), +10GB (USD 17.99)

## 2. What Counts Toward Storage

Counts: product images, portfolio images, profile assets, message attachments, PDF uploads.
Does NOT count: video embeds, digital product files sold to members, external URLs.

## 3. Warnings & Enforcement

You are notified at 80%, 95%, and 100% usage. At 100%, new uploads are blocked.

## 4. Grace Period

A 7-day grace period begins if storage remains over quota. Orphaned files may be auto-deleted after a 48-hour final warning. Active product images, portfolio, avatar, banner, logo, and files attached to orders are never auto-deleted.

## 5. Outstanding Fees

Day 1–7: Grace period. Day 7+: Payout requests blocked. Day 14+: New listings blocked. Day 30+: Account suspended.

## 6. Plan Changes

Upgrading takes effect immediately. Downgrading takes effect at end of billing period.

## 7. Refunds

Storage plan fees and one-time top-ups are non-refundable.

## 8. Contact

hello@noizu.direct`,
    },
    update: {},
  });
  console.log('✅ Storage policy page seeded');

  console.log('\n🎉 Seed complete!');
  console.log('   Admin:   admin@noizu.direct / admin123');
  console.log('   Creator: sakura@noizu.direct / creator123');
  console.log('   Creator: akira@noizu.direct / creator123');
  console.log('   Creator: luna@noizu.direct / creator123');
  console.log('   Creator: propsmith@noizu.direct / creator123');
  console.log('   Buyer:   buyer1@test.com / buyer123');
  console.log('   Buyer:   buyer2@test.com / buyer123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
