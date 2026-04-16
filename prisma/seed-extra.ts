import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';

const dbUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter } as any);

function daysAgo(n: number, hoursOffset = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(d.getHours() - hoursOffset);
  return d;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function calcFees(amountUsd: number) {
  const processingFee = Math.round(amountUsd * 0.025);
  return { processingFee, creatorAmount: amountUsd - processingFee };
}

async function main() {
  console.log('🌱 Starting extra seed...');

  const creatorPassword = await bcrypt.hash('creator123', 10);
  const buyerPassword = await bcrypt.hash('buyer123', 10);

  // ─── 21 NEW CREATORS ───────────────────────────────────────────────────────

  const creatorDefs = [
    {
      email: 'neonrisa@noizu.direct', name: 'Risa Tanaka', username: 'neon_risa',
      displayName: 'Neon Risa', location: 'Kuala Lumpur',
      bio: 'Freelance digital illustrator obsessed with neon colour palettes and cyberpunk aesthetics. CF and Animangaki regular since 2020. Commissions open for OCs, fan art, and VTuber model sheets. Ships prints from KL.',
      categories: ['DIGITAL_ART', 'COSPLAY_PRINT'], commissionStatus: 'OPEN',
      isVerified: true, isTopCreator: false, totalSales: 73,
      badges: ['NOIZU Member'], slots: 4,
      pricing: [
        { tier: 'Icon (Flat Color)', price: 30, description: 'Bust, flat color, transparent bg' },
        { tier: 'Full Body (Cel Shaded)', price: 90, description: 'Full body, cel shading, simple bg' },
        { tier: 'VTuber Reference Sheet', price: 200, description: '3 views + expression chart' },
      ],
      portfolio: [
        { id: 'p1', title: 'Cyberpunk OC — Mira', description: 'OC commission. Neon cityscape background.', category: 'Digital Art', imageUrl: 'https://picsum.photos/seed/risa_p1/600/800', isPublic: true },
        { id: 'p2', title: 'Honkai Impact Fan Art', description: 'Elysia fan art, CF2024 print.', category: 'Cosplay Print', imageUrl: 'https://picsum.photos/seed/risa_p2/600/700', isPublic: true },
        { id: 'p3', title: 'VTuber Model Sheet — Kira', description: 'Client commission. Full L2D reference.', category: 'Digital Art', imageUrl: 'https://picsum.photos/seed/risa_p3/600/900', isPublic: true },
      ],
    },
    {
      email: 'coskai@noizu.direct', name: 'Kai Lim', username: 'cosplay_kai',
      displayName: 'Cosplay Kai', location: 'Penang',
      bio: 'Penang-based cosplayer specialising in Genshin Impact and Jujutsu Kaisen characters. WCS Malaysia 2023 qualifier. Print sets, wearable accessories, and tutorial PDF guides. All prints signed.',
      categories: ['COSPLAY_PRINT', 'PHYSICAL_MERCH'], commissionStatus: 'LIMITED',
      isVerified: true, isTopCreator: false, totalSales: 41,
      badges: ['Convention Veteran'], slots: 2,
      pricing: [
        { tier: 'A4 Print (Signed)', price: 25, description: 'Professional photo print from cosplay shoot' },
        { tier: 'Custom Cosplay Consult', price: 80, description: '1hr online session, material list, build guide' },
      ],
      portfolio: [
        { id: 'p1', title: 'Kazuha — Genshin Impact', description: 'Penang Heritage District outdoor shoot.', category: 'Cosplay', imageUrl: 'https://picsum.photos/seed/kai_p1/600/900', isPublic: true },
        { id: 'p2', title: 'Yuji Itadori — JJK', description: 'Studio shoot. Full uniform recreation.', category: 'Cosplay', imageUrl: 'https://picsum.photos/seed/kai_p2/600/800', isPublic: true },
        { id: 'p3', title: 'Group Build — Haikyuu', description: 'Group cosplay with 6 members. CF2023.', category: 'Cosplay', imageUrl: 'https://picsum.photos/seed/kai_p3/800/600', isPublic: true },
      ],
    },
    {
      email: 'hanabi@noizu.direct', name: 'Priya Nair', username: 'studio_hanabi',
      displayName: 'Studio Hanabi', location: 'Shah Alam, Selangor',
      bio: 'Selangor-based indie illustrator and pattern designer. Influenced by batik motifs and traditional SEA textile art merged with anime aesthetics. Artpacks, phone wallpapers, and washi tape designs.',
      categories: ['DIGITAL_ART', 'STICKERS'], commissionStatus: 'OPEN',
      isVerified: false, isTopCreator: false, totalSales: 28,
      badges: [], slots: 6,
      pricing: [
        { tier: 'Phone Wallpaper Set (5 designs)', price: 15, description: 'Custom wallpapers, any character or theme' },
        { tier: 'Character + Pattern Background', price: 70, description: 'Character illustration with unique batik-inspired pattern' },
      ],
      portfolio: [
        { id: 'p1', title: 'Batik × Anime Collab Set', description: 'Traditional batik patterns with chibi characters.', category: 'Digital Art', imageUrl: 'https://picsum.photos/seed/hanabi_p1/600/600', isPublic: true },
        { id: 'p2', title: 'Washi Tape Design — Sakura & Batik', description: '3 designs, printed via Washi Artisan.', category: 'Stickers', imageUrl: 'https://picsum.photos/seed/hanabi_p2/500/500', isPublic: true },
      ],
    },
    {
      email: 'pixelmochi@noizu.direct', name: 'Aika Watanabe', username: 'pixel_mochi',
      displayName: 'PixelMochi', location: 'Kuching, Sarawak',
      bio: 'Pixel artist and animation loop creator from Kuching. Specialises in 32×32 and 64×64 pixel art sprite sheets, desktop pets, and lo-fi GIF animations. Available for game assets and Twitch emote commissions.',
      categories: ['DIGITAL_ART'], commissionStatus: 'OPEN',
      isVerified: false, isTopCreator: false, totalSales: 19,
      badges: [], slots: 8,
      pricing: [
        { tier: 'Twitch Emote (3-pack)', price: 25, description: '3 custom emotes, 28px/56px/112px sizes' },
        { tier: 'Desktop Pet Sprite Sheet', price: 55, description: '8-direction walk cycle + idle, 32×32px' },
        { tier: 'Lo-fi Loop (4-second GIF)', price: 90, description: 'Pixel art animated loop, for stream overlay use' },
      ],
      portfolio: [
        { id: 'p1', title: 'Cat Cafe Lo-fi Loop', description: '4-second lo-fi animation loop. Used by 12 streamers.', category: 'Digital Art', imageUrl: 'https://picsum.photos/seed/mochi_p1/500/500', isPublic: true },
        { id: 'p2', title: 'Slime Variants — Desktop Pet', description: '5 colour variants, idle + 4-dir walk cycle.', category: 'Digital Art', imageUrl: 'https://picsum.photos/seed/mochi_p2/500/500', isPublic: true },
      ],
    },
    {
      email: 'inkstorm@noizu.direct', name: 'Zara Aziz', username: 'inkstorm_art',
      displayName: 'Inkstorm Art', location: 'Shah Alam',
      bio: 'Manga-style illustrator drawing Demon Slayer, Bleach, and original dark fantasy. Traditional ink lineart finished digitally. A5 sketchbooks, zines, and digital artpacks. Ships from Shah Alam.',
      categories: ['DIGITAL_ART', 'DOUJIN'], commissionStatus: 'LIMITED',
      isVerified: true, isTopCreator: false, totalSales: 62,
      badges: ['Convention Veteran', 'NOIZU Member'], slots: 3,
      pricing: [
        { tier: 'Ink Portrait (Traditional)', price: 45, description: 'A5 ink on Fabriano, scanned and delivered digitally + optional physical' },
        { tier: 'Full Scene (Digital Finish)', price: 130, description: 'Traditional ink lines, digital colour, full scene' },
      ],
      portfolio: [
        { id: 'p1', title: 'Tanjiro — Ink Study', description: 'Traditional ink, 0.05 micron pens. Sold at CF2023.', category: 'Digital Art', imageUrl: 'https://picsum.photos/seed/zara_p1/600/800', isPublic: true },
        { id: 'p2', title: 'Bleach: TYBW Series', description: '5-piece doujin print set from Bleach final arc.', category: 'Doujin', imageUrl: 'https://picsum.photos/seed/zara_p2/600/800', isPublic: true },
        { id: 'p3', title: 'Dark Fantasy OC — Azrael', description: 'Original character art. Personal project.', category: 'Digital Art', imageUrl: 'https://picsum.photos/seed/zara_p3/600/900', isPublic: true },
      ],
    },
    {
      email: 'velvet@noizu.direct', name: 'Siti Rahimah', username: 'velvet_cosplay',
      displayName: 'Velvet Cosplay', location: 'Kuala Lumpur',
      bio: 'KL-based cosplayer focusing on soft fantasy and magical girl aesthetics. Known for intricate handmade costume details and studio-quality photoshoots. Print sets, lace accessories, and dress patterns available.',
      categories: ['COSPLAY_PRINT', 'PHYSICAL_MERCH'], commissionStatus: 'CLOSED',
      isVerified: false, isTopCreator: false, totalSales: 35,
      badges: [], slots: null,
      pricing: [],
      portfolio: [
        { id: 'p1', title: 'Sakura Magical Girl Build', description: 'Original magical girl design, handmade costume.', category: 'Cosplay', imageUrl: 'https://picsum.photos/seed/velvet_p1/600/900', isPublic: true },
        { id: 'p2', title: 'Cardcaptor Sakura — Starlight Gown', description: 'Screen-accurate gown recreation. CF2024.', category: 'Cosplay', imageUrl: 'https://picsum.photos/seed/velvet_p2/600/900', isPublic: true },
      ],
    },
    {
      email: 'craftcove@noizu.direct', name: 'Marcus Tan', username: 'craftcove_sea',
      displayName: 'CraftCove SEA', location: 'Singapore',
      bio: 'Singapore-based maker specialising in resin casting and 3D-printed wearables. Acrylic charms, keychains, and badge sets. Collaborates with SEA illustrators for licensed merch. Fast turnaround, ships island-wide and to Malaysia.',
      categories: ['PHYSICAL_MERCH', 'STICKERS'], commissionStatus: 'OPEN',
      isVerified: true, isTopCreator: false, totalSales: 88,
      badges: ['NOIZU Member'], slots: 10,
      pricing: [
        { tier: 'Acrylic Charm (single)', price: 12, description: '5cm double-sided acrylic charm, any design' },
        { tier: 'Keychain Set (5 designs)', price: 50, description: 'Custom 5-piece keychain set, hardware included' },
        { tier: 'Resin Dome Badge', price: 18, description: '6cm resin dome badge, pin back, UV print' },
      ],
      portfolio: [
        { id: 'p1', title: 'Hololive EN Charm Set', description: 'Fan art charm set, sold at STGCC Singapore 2024.', category: 'Physical Merch', imageUrl: 'https://picsum.photos/seed/craft_p1/600/600', isPublic: true },
        { id: 'p2', title: 'Custom MYR/SGD Currency Acrylic', description: 'Novelty transparent acrylic, popular souvenir item.', category: 'Physical Merch', imageUrl: 'https://picsum.photos/seed/craft_p2/600/600', isPublic: true },
      ],
    },
    {
      email: 'otome@noizu.direct', name: 'Yuki Fujimoto', username: 'otome_prints',
      displayName: 'Otome Prints', location: 'Singapore',
      bio: 'Cosplay photographer and print artist based in Singapore. Shot over 300 cosplayers at AFASG, STGCC, and CF Malaysia. Fine art prints, photo zines, and digital wallpack bundles.',
      categories: ['COSPLAY_PRINT', 'DIGITAL_ART'], commissionStatus: 'OPEN',
      isVerified: true, isTopCreator: true, totalSales: 156,
      badges: ['Convention Veteran', 'NOIZU Member'], slots: 5,
      commissionDescription: 'Fine art photography prints and digital wallpack commissions. I shoot on location across Malaysia and Singapore — conventions, cosplay shoots, street photography, and portraits.\n\nCommission slots include a 1-hour shoot session with edited digital files, or custom print orders in A3/A4. Ideal for cosplayers who want professional portfolio shots before or after conventions.',
      pricing: [
        { tier: 'Portrait Session (1hr)', price: 120, description: 'Studio or outdoor. 20 edited images delivered.' },
        { tier: 'A3 Fine Art Print', price: 40, description: 'Gallery-quality print from our archive, signed' },
      ],
      portfolio: [
        { id: 'p1', title: 'AFASG 2024 — Best of Show', description: '20-image showcase from AFASG 2024. Sold as zine.', category: 'Photography', imageUrl: 'https://picsum.photos/seed/otome_p1/600/800', isPublic: true },
        { id: 'p2', title: 'Genshin Group — Gardens by the Bay', description: 'Group of 8 Genshin cosplayers.', category: 'Photography', imageUrl: 'https://picsum.photos/seed/otome_p2/800/600', isPublic: true },
        { id: 'p3', title: 'Solo Portrait — Arknights', description: 'Character W from Arknights, studio shoot.', category: 'Photography', imageUrl: 'https://picsum.photos/seed/otome_p3/600/900', isPublic: true },
      ],
    },
    {
      email: 'fahmi@noizu.direct', name: 'Fahmi Ismail', username: 'doujin_syndicate',
      displayName: 'Doujin Syndicate', location: 'Petaling Jaya',
      bio: 'Multi-genre doujin circle from Petaling Jaya. Releases 2–3 titles per year at CF and Animangaki. Genres: slice-of-life, original fantasy, and one horror anthology per year. Physical and PDF editions.',
      categories: ['DOUJIN'], commissionStatus: 'CLOSED',
      isVerified: true, isTopCreator: false, totalSales: 77,
      badges: ['Convention Veteran'], slots: null,
      pricing: [],
      portfolio: [
        { id: 'p1', title: 'Bayou Blues — Vol.1 Cover', description: 'Original slice-of-life doujin set in Penang.', category: 'Doujin', imageUrl: 'https://picsum.photos/seed/fahmi_p1/500/700', isPublic: true },
        { id: 'p2', title: 'Void Garden — Horror Anthology', description: 'Annual horror anthology. 2023 edition. 96 pages.', category: 'Doujin', imageUrl: 'https://picsum.photos/seed/fahmi_p2/500/700', isPublic: true },
        { id: 'p3', title: 'Tanah Melayu Chronicles — Promo Spread', description: 'Fantasy doujin set in mythological Malay kingdom.', category: 'Doujin', imageUrl: 'https://picsum.photos/seed/fahmi_p3/600/800', isPublic: true },
      ],
    },
    {
      email: 'crystalpixel@noizu.direct', name: 'Lena Ong', username: 'crystalpixel',
      displayName: 'CrystalPixel', location: 'Singapore',
      bio: 'Pastel fantasy illustrator from Singapore. Specialises in dreamy watercolour-style digital art for webtoons, book covers, and character sheets. Open for light novel and indie game projects.',
      categories: ['DIGITAL_ART', 'COSPLAY_PRINT'], commissionStatus: 'OPEN',
      isVerified: false, isTopCreator: false, totalSales: 44,
      badges: [], slots: 5,
      pricing: [
        { tier: 'Watercolour Portrait', price: 60, description: 'Bust or half-body, watercolour digital style' },
        { tier: 'Book Cover / Key Visual', price: 200, description: 'Full scene, print-ready, commercial rights included' },
      ],
      portfolio: [
        { id: 'p1', title: 'Spring Faerie — Character Design', description: 'Original character for indie fantasy novel.', category: 'Digital Art', imageUrl: 'https://picsum.photos/seed/crystal_p1/600/800', isPublic: true },
        { id: 'p2', title: 'Webtoon Cover — Sugar Realm', description: 'Cover art for ongoing webtoon series.', category: 'Digital Art', imageUrl: 'https://picsum.photos/seed/crystal_p2/600/900', isPublic: true },
      ],
    },
    {
      email: 'chibifactory@noizu.direct', name: 'Mei Lin', username: 'chibi_factory',
      displayName: 'Chibi Factory', location: 'Kuala Lumpur',
      bio: 'Chibi specialist and print-on-demand designer from KL. Known for extra-round chibi proportions and expressive faces. Sticker packs, phone cases, and merchandise templates.',
      categories: ['STICKERS', 'DIGITAL_ART'], commissionStatus: 'OPEN',
      isVerified: false, isTopCreator: false, totalSales: 31,
      badges: [], slots: 12,
      pricing: [
        { tier: 'Chibi Character (PNG)', price: 20, description: 'Single chibi, flat color, transparent background' },
        { tier: 'Chibi Sticker Sheet (6 poses)', price: 70, description: '6 chibi expressions/poses of same character' },
      ],
      portfolio: [
        { id: 'p1', title: 'SPY×FAMILY Sticker Set', description: '6-piece chibi sticker set. Fan art.', category: 'Stickers', imageUrl: 'https://picsum.photos/seed/chibi_p1/500/600', isPublic: true },
        { id: 'p2', title: 'Custom OC — Tanuki Spirit', description: 'Client commission. Chibi OC with accessories.', category: 'Digital Art', imageUrl: 'https://picsum.photos/seed/chibi_p2/500/500', isPublic: true },
      ],
    },
    {
      email: 'armorsmith@noizu.direct', name: 'Carlo Santos', username: 'armorsmith_ph',
      displayName: 'ArmorSmith PH', location: 'Manila, Philippines',
      bio: 'Professional prop and armour maker from Manila. Competing internationally since 2019. Builds for AFA Philippines, Cosplay Mania, and World Cosplay Summit Philippines qualifier. EVA foam, Wonderflex, resin.',
      categories: ['PHYSICAL_MERCH'], commissionStatus: 'OPEN',
      isVerified: true, isTopCreator: false, totalSales: 95,
      badges: ['Convention Veteran'], slots: 2,
      pricing: [
        { tier: 'Armour Piece (single, small)', price: 60, description: 'Pauldron, bracer, or greave. EVA foam + thermoplastic.' },
        { tier: 'Half Armour Set', price: 200, description: 'Chest + shoulder + one pair bracers' },
        { tier: 'Full Competition Armour', price: 500, description: 'Complete armour set for competition. WCS-standard finish.' },
      ],
      portfolio: [
        { id: 'p1', title: 'FF XVI Clive Armour', description: 'Full competition build. AFA PH 2024 Best Craftsmanship.', category: 'Prop Making', imageUrl: 'https://picsum.photos/seed/armor_p1/600/900', isPublic: true },
        { id: 'p2', title: 'Monster Hunter Dual Blades', description: 'Dual blade commission. Accurate to game model.', category: 'Prop Making', imageUrl: 'https://picsum.photos/seed/armor_p2/600/700', isPublic: true },
        { id: 'p3', title: 'WCS Philippines 2023', description: 'National qualifier costumes. Top 3 finish.', category: 'Prop Making', imageUrl: 'https://picsum.photos/seed/armor_p3/800/600', isPublic: true },
      ],
    },
    {
      email: 'natsuko@noizu.direct', name: 'Shalini Raj', username: 'natsuko_art',
      displayName: 'Natsuko Art', location: 'Selangor',
      bio: 'Selangor-based illustrator blending Indian classical motifs with modern anime style. Specialises in character art for webtoon and light novel projects. Also makes rangoli-inspired digital prints.',
      categories: ['DIGITAL_ART', 'COSPLAY_PRINT'], commissionStatus: 'OPEN',
      isVerified: false, isTopCreator: false, totalSales: 22,
      badges: [], slots: 5,
      pricing: [
        { tier: 'Cultural Fusion Portrait', price: 55, description: 'Character with traditional Indian motif integration' },
        { tier: 'Webtoon Chapter Cover', price: 100, description: 'Full scene cover art, webtoon-ready dimensions' },
      ],
      portfolio: [
        { id: 'p1', title: 'Durga Warrior OC', description: 'Original character inspired by Durga mythology.', category: 'Digital Art', imageUrl: 'https://picsum.photos/seed/natsuko_p1/600/800', isPublic: true },
        { id: 'p2', title: 'Deepavali 2024 Limited Print', description: 'Diwali celebration illustration, sold as A4 print.', category: 'Cosplay Print', imageUrl: 'https://picsum.photos/seed/natsuko_p2/600/700', isPublic: true },
      ],
    },
    {
      email: 'stickerqueen@noizu.direct', name: 'Hui Ling Chew', username: 'sticker_queen_sg',
      displayName: 'Sticker Queen SG', location: 'Singapore',
      bio: 'Singapore sticker designer with 5k+ sales. Known for die-cut holographic and glitter sticker packs. Ships everywhere. Designs new releases monthly. Wholesale available for 50+ packs.',
      categories: ['STICKERS', 'PHYSICAL_MERCH'], commissionStatus: 'OPEN',
      isVerified: true, isTopCreator: true, totalSales: 312,
      badges: ['Convention Veteran', 'NOIZU Member'], slots: 20,
      pricing: [
        { tier: 'Custom Die-cut Sticker (1 design)', price: 8, description: 'Design supplied by client, printed in holographic or matte' },
        { tier: 'Sticker Pack Design (5 designs)', price: 45, description: 'Full sticker pack, digital files only, PNG + cut lines' },
      ],
      portfolio: [
        { id: 'p1', title: 'Holographic Star Pack', description: 'Best-seller. 8 holographic star-themed stickers.', category: 'Stickers', imageUrl: 'https://picsum.photos/seed/stickerq_p1/600/600', isPublic: true },
        { id: 'p2', title: 'Genshin Hydro Archon Set', description: 'Limited run of 200 packs. Sold out in 2 days.', category: 'Stickers', imageUrl: 'https://picsum.photos/seed/stickerq_p2/600/600', isPublic: true },
        { id: 'p3', title: 'Chibi Hololive 12-Pack', description: 'Fan art sticker set from STGCC SG 2024.', category: 'Stickers', imageUrl: 'https://picsum.photos/seed/stickerq_p3/600/600', isPublic: true },
      ],
    },
    {
      email: 'celestial@noizu.direct', name: 'Diana Rashid', username: 'celestial_draws',
      displayName: 'Celestial Draws', location: 'Kuala Lumpur',
      bio: 'KL-based illustrator focused on dark fantasy and gothic aesthetics. Character commissions, tarot card designs, and book cover illustrations. CF and Comic Market alumni.',
      categories: ['DIGITAL_ART'], commissionStatus: 'OPEN',
      isVerified: true, isTopCreator: false, totalSales: 67,
      badges: ['NOIZU Member'], slots: 4,
      pricing: [
        { tier: 'Gothic Portrait', price: 65, description: 'Bust, detailed gothic/fantasy style, layered PSD' },
        { tier: 'Tarot Card Commission', price: 45, description: 'Single tarot card in your choice of subject' },
        { tier: 'Full Illustration (Editorial)', price: 180, description: 'Full scene for book cover or editorial use' },
      ],
      portfolio: [
        { id: 'p1', title: 'The Moon Tarot — OC Edition', description: 'Custom tarot set, 22 Major Arcana, CF2024.', category: 'Digital Art', imageUrl: 'https://picsum.photos/seed/diana_p1/600/900', isPublic: true },
        { id: 'p2', title: 'Gothic Elara — Character Sheet', description: 'Original dark fantasy character. Client commission.', category: 'Digital Art', imageUrl: 'https://picsum.photos/seed/diana_p2/600/800', isPublic: true },
      ],
    },
    {
      email: 'cosmarco@noizu.direct', name: 'Marco Wirawan', username: 'cosplay_marco',
      displayName: 'Cosplay Marco', location: 'Jakarta, Indonesia',
      bio: 'Jakarta cosplayer known for anime-accurate builds and dramatic poses. AFA Indonesia regular. Sells print sets and cosplay tutorial booklets online. Ships within Indonesia and to Malaysia/Singapore.',
      categories: ['COSPLAY_PRINT', 'DIGITAL_ART'], commissionStatus: 'LIMITED',
      isVerified: false, isTopCreator: false, totalSales: 38,
      badges: [], slots: 3,
      pricing: [
        { tier: 'A4 Signed Print', price: 20, description: 'A4 photo print from shoot, signed' },
        { tier: 'Tutorial Booklet (PDF)', price: 18, description: 'Step-by-step cosplay build guide PDF' },
      ],
      portfolio: [
        { id: 'p1', title: 'Zoro — One Piece Studio Shoot', description: 'Roronoa Zoro, 3-sword style pose. Studio shoot.', category: 'Cosplay', imageUrl: 'https://picsum.photos/seed/marco_p1/600/900', isPublic: true },
        { id: 'p2', title: 'Eren — AoT Gear Build', description: '3D Maneuver Gear full build. AFA INA 2023.', category: 'Cosplay', imageUrl: 'https://picsum.photos/seed/marco_p2/600/800', isPublic: true },
      ],
    },
    {
      email: 'genshin@noizu.direct', name: 'Kevin Loh', username: 'genshin_fan_art',
      displayName: 'Kevin Fan Art', location: 'Kuala Lumpur',
      bio: 'KL-based fan artist who draws exclusively Genshin Impact and HoYoverse content. Known for detailed lore-accurate illustrations and alternate universe AUs. Artpacks, prints, and sticker sets.',
      categories: ['DIGITAL_ART', 'STICKERS'], commissionStatus: 'OPEN',
      isVerified: false, isTopCreator: false, totalSales: 53,
      badges: [], slots: 6,
      pricing: [
        { tier: 'Genshin Character Portrait', price: 40, description: 'Any Genshin character, detailed illustration' },
        { tier: 'AU Scenario Illustration', price: 80, description: 'Two characters in alternate universe scenario' },
      ],
      portfolio: [
        { id: 'p1', title: 'Hu Tao — Ghost Parade AU', description: 'Alternate universe scenario illustration.', category: 'Digital Art', imageUrl: 'https://picsum.photos/seed/kevin_p1/600/800', isPublic: true },
        { id: 'p2', title: 'Fontaine Arc Artpack', description: '10-piece artpack from 4.0 update era.', category: 'Digital Art', imageUrl: 'https://picsum.photos/seed/kevin_p2/600/700', isPublic: true },
        { id: 'p3', title: 'Archons Group Print', description: 'All 7 Archons together. CF2024 exclusive.', category: 'Cosplay Print', imageUrl: 'https://picsum.photos/seed/kevin_p3/700/500', isPublic: true },
      ],
    },
    {
      email: 'tenshi@noizu.direct', name: 'Angela Yap', username: 'tenshi_prints',
      displayName: 'Tenshi Prints', location: 'Penang',
      bio: 'Penang cosplay photographer and print seller. Uses George Town\'s heritage streets as backdrops. Known for moody atmospheric edits. Wallpacks, zines, and A3 gallery prints.',
      categories: ['COSPLAY_PRINT', 'DIGITAL_ART'], commissionStatus: 'OPEN',
      isVerified: false, isTopCreator: false, totalSales: 29,
      badges: [], slots: 4,
      pricing: [
        { tier: 'Location Cosplay Session (Penang)', price: 100, description: '2hr George Town location shoot, 30 edited images' },
        { tier: 'Wallpack (5 images)', price: 20, description: 'Digital wallpaper set, mobile + desktop crops' },
      ],
      portfolio: [
        { id: 'p1', title: 'Klee — George Town Penang', description: 'Colourful shophouses, perfect Klee vibe.', category: 'Photography', imageUrl: 'https://picsum.photos/seed/tenshi_p1/600/900', isPublic: true },
        { id: 'p2', title: 'Moody Raven Series', description: 'Original dark fantasy cosplay, rooftop shoot.', category: 'Photography', imageUrl: 'https://picsum.photos/seed/tenshi_p2/600/800', isPublic: true },
      ],
    },
    {
      email: 'midnightink@noizu.direct', name: 'Haziq Zulkifli', username: 'midnight_ink',
      displayName: 'Midnight Ink', location: 'Melaka',
      bio: 'Traditional ink artist from Melaka. Draws in a style influenced by batik patterns and ukiyo-e woodblock prints. Limited-edition A3 ink prints and digital reproductions. Each physical print is individually hand-stamped.',
      categories: ['DIGITAL_ART', 'COSPLAY_PRINT'], commissionStatus: 'LIMITED',
      isVerified: true, isTopCreator: false, totalSales: 45,
      badges: ['Convention Veteran'], slots: 2,
      pricing: [
        { tier: 'Ink Character Study (A5 original)', price: 80, description: 'Original ink on Fabriano, shipped with protective sleeve' },
        { tier: 'Ukiyo-e Style Print (digital)', price: 30, description: 'Digital recreation of ukiyo-e style, instant download' },
      ],
      portfolio: [
        { id: 'p1', title: 'Demon Slayer Ukiyo-e Series', description: '5-piece ukiyo-e inspired prints. CF2024.', category: 'Digital Art', imageUrl: 'https://picsum.photos/seed/haziq_p1/600/800', isPublic: true },
        { id: 'p2', title: 'Melaka Heritage Print', description: 'Melaka stadthuys reimagined with anime characters.', category: 'Cosplay Print', imageUrl: 'https://picsum.photos/seed/haziq_p2/600/800', isPublic: true },
      ],
    },
    {
      email: 'jiaxin@noizu.direct', name: 'Jia Xin Lim', username: 'chibi_coscraft',
      displayName: 'ChibiCoscraft', location: 'Ipoh, Perak',
      bio: 'Ipoh-based maker specialising in handmade fabric accessories for cosplay — ears, tails, hair accessories. Also makes chibi plush toys in limited runs. Ships from Perak.',
      categories: ['PHYSICAL_MERCH', 'STICKERS'], commissionStatus: 'OPEN',
      isVerified: false, isTopCreator: false, totalSales: 17,
      badges: [], slots: 8,
      pricing: [
        { tier: 'Cat Ear Headband (custom)', price: 22, description: 'Fabric cat/wolf/fox ears, any colour. Ships in 1 week.' },
        { tier: 'Mini Plush (15cm)', price: 38, description: 'Handmade chibi plush, limited run of 10.' },
      ],
      portfolio: [
        { id: 'p1', title: 'Nekomata Ears — Genshin Inspired', description: 'Fabric ears with gradient dye. Popular at CF2024.', category: 'Physical Merch', imageUrl: 'https://picsum.photos/seed/jiaxin_p1/600/600', isPublic: true },
        { id: 'p2', title: 'Chibi Paimon Plush', description: 'Limited run of 10. Sold out in 30 mins at CF.', category: 'Physical Merch', imageUrl: 'https://picsum.photos/seed/jiaxin_p2/500/500', isPublic: true },
      ],
    },
    {
      email: 'warblade@noizu.direct', name: 'Daniyar Serikbay', username: 'warblade_props',
      displayName: 'Warblade Props', location: 'Shah Alam, Selangor',
      bio: 'Selangor prop maker specialising in large-scale weapon replicas. Uses 3D printing, fibreglass, and aluminium armature for competition-grade builds. Available for TV/film production props and convention display.',
      categories: ['PHYSICAL_MERCH'], commissionStatus: 'OPEN',
      isVerified: true, isTopCreator: false, totalSales: 60,
      badges: ['Convention Veteran', 'NOIZU Member'], slots: 2,
      pricing: [
        { tier: 'Foam Weapon (display grade)', price: 90, description: 'EVA foam weapon, painted, wall-mount display ready' },
        { tier: 'Competition Weapon (resin/fibreglass)', price: 280, description: 'Competition-ready, fibreglass shell, internal armature' },
        { tier: 'Full Armour Set + Weapon', price: 600, description: 'Complete character armour set for competition use' },
      ],
      portfolio: [
        { id: 'p1', title: 'Cloud Strife Buster Sword', description: 'Full-size fibreglass Buster Sword. CF2024 display.', category: 'Prop Making', imageUrl: 'https://picsum.photos/seed/warblade_p1/600/800', isPublic: true },
        { id: 'p2', title: 'Paladin Shield Set', description: 'Original design armour for WCS Malaysia qualifier.', category: 'Prop Making', imageUrl: 'https://picsum.photos/seed/warblade_p2/600/700', isPublic: true },
        { id: 'p3', title: 'Iron Throne Replica (mini)', description: 'Mini replica for photography prop hire.', category: 'Prop Making', imageUrl: 'https://picsum.photos/seed/warblade_p3/600/600', isPublic: true },
      ],
    },
  ];

  const profileMap: Record<string, { userId: string; profileId: string }> = {};

  for (const c of creatorDefs) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: { email: c.email, password: creatorPassword, name: c.name, role: 'CREATOR' },
    });
    const profile = await prisma.creatorProfile.upsert({
      where: { userId: user.id },
      update: {
        displayName: c.displayName,
        bio: c.bio,
        categoryTags: JSON.stringify(c.categories),
        commissionStatus: c.commissionStatus,
        isVerified: c.isVerified,
        isTopCreator: c.isTopCreator,
        totalSales: c.totalSales,
        avatar: `https://picsum.photos/seed/${c.username}_av/200/200`,
        bannerImage: `https://picsum.photos/seed/${c.username}_bn/1200/300`,
        socialLinks: JSON.stringify({ instagram: `https://instagram.com/${c.username}`, tiktok: `https://tiktok.com/@${c.username}` }),
        badges: JSON.stringify(c.badges),
        commissionSlots: c.slots,
        commissionDescription: (c as any).commissionDescription ?? null,
        commissionPricing: JSON.stringify(c.pricing),
        portfolioItems: JSON.stringify(c.portfolio),
      },
      create: {
        userId: user.id,
        username: c.username,
        displayName: c.displayName,
        bio: c.bio,
        categoryTags: JSON.stringify(c.categories),
        commissionStatus: c.commissionStatus,
        isVerified: c.isVerified,
        isTopCreator: c.isTopCreator,
        totalSales: c.totalSales,
        avatar: `https://picsum.photos/seed/${c.username}_av/200/200`,
        bannerImage: `https://picsum.photos/seed/${c.username}_bn/1200/300`,
        socialLinks: JSON.stringify({ instagram: `https://instagram.com/${c.username}`, twitter: `https://twitter.com/${c.username}` }),
        badges: JSON.stringify(c.badges),
        commissionSlots: c.slots,
        commissionDescription: (c as any).commissionDescription ?? null,
        commissionPricing: JSON.stringify(c.pricing),
        portfolioItems: JSON.stringify(c.portfolio),
      },
    });
    profileMap[c.username] = { userId: user.id, profileId: profile.id };
  }

  const existingCreatorCount = await prisma.creatorProfile.count();
  console.log(`✅ Creators: ${existingCreatorCount} total`);

  // ─── 13 NEW BUYERS ─────────────────────────────────────────────────────────

  const buyerDefs = [
    { email: 'hiroshi@test.com', name: 'Yamamoto Hiroshi' },
    { email: 'mei_s@test.com', name: 'Mei Sasaki' },
    { email: 'rina@test.com', name: 'Rina Nakamura' },
    { email: 'arjun@test.com', name: 'Arjun Patel' },
    { email: 'fatimah@test.com', name: 'Fatimah Binti Aziz' },
    { email: 'liwei@test.com', name: 'Li Wei' },
    { email: 'sofia_t@test.com', name: 'Sofia Tan' },
    { email: 'ravi@test.com', name: 'Ravi Krishnan' },
    { email: 'xiao@test.com', name: 'Xiao Ming' },
    { email: 'norhaida@test.com', name: 'Norhaida Binti Hassan' },
    { email: 'aditya@test.com', name: 'Aditya Pratama' },
    { email: 'grace@test.com', name: 'Grace Lim' },
    { email: 'omar@test.com', name: 'Omar Abdullah' },
  ];

  const buyerMap: Record<string, string> = {};
  for (const b of buyerDefs) {
    const user = await prisma.user.upsert({
      where: { email: b.email },
      update: {},
      create: { email: b.email, password: buyerPassword, name: b.name, role: 'BUYER' },
    });
    buyerMap[b.email] = user.id;
  }

  // Also get existing buyers
  const existingBuyers = await prisma.user.findMany({ where: { role: 'BUYER' }, select: { id: true, email: true } });
  for (const b of existingBuyers) buyerMap[b.email] = b.id;

  console.log(`✅ Buyers: ${Object.keys(buyerMap).length} total`);

  // ─── PRODUCTS ──────────────────────────────────────────────────────────────

  const existingProductCount = await prisma.product.count();
  if (existingProductCount < 55) {
    const productDefs = [
      // neon_risa
      { username: 'neon_risa', title: 'Cyberpunk OC Artpack — Mira', desc: 'Digital artpack of original cyberpunk character Mira. 12 illustrations, PSD + PNG.', price: 1800, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: true, seed: 'risa_prod1' },
      { username: 'neon_risa', title: 'Neon City Wallpaper Pack (5 images)', desc: '5 neon-themed 4K wallpapers, mobile + desktop crops included.', price: 800, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: false, seed: 'risa_prod2' },
      { username: 'neon_risa', title: 'VTuber Model Reference Sheet', desc: 'Custom VTuber character reference sheet, 3 views + expressions. Commission slot.', price: 20000, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: false, seed: 'risa_prod3' },
      // cosplay_kai
      { username: 'cosplay_kai', title: 'Kazuha Cosplay Print Set (A4)', desc: '5 A4 signed prints from Penang Genshin shoot. Shipped from Penang.', price: 3500, cat: 'COSPLAY_PRINT', type: 'PHYSICAL', stock: 25, pin: true, seed: 'kai_prod1' },
      { username: 'cosplay_kai', title: 'JJK Cosplay Tutorial PDF', desc: 'Step-by-step Jujutsu Kaisen uniform recreation guide. 42 pages, photos included.', price: 1200, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: false, seed: 'kai_prod2' },
      // studio_hanabi
      { username: 'studio_hanabi', title: 'Batik × Anime Wallpaper Pack', desc: '6 phone wallpapers featuring batik-inspired patterns with anime characters.', price: 600, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: false, seed: 'hanabi_prod1' },
      { username: 'studio_hanabi', title: 'Digital Sticker Pack — Tropical Spirits', desc: '15 sticker designs inspired by SEA mythology and nature spirits.', price: 1000, cat: 'STICKERS', type: 'DIGITAL', pin: true, seed: 'hanabi_prod2' },
      // pixel_mochi
      { username: 'pixel_mochi', title: 'Lo-fi Cat Cafe Stream Pack', desc: 'Full Twitch stream overlay pack in lo-fi pixel art style. Alerts, panels, borders.', price: 2500, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: true, seed: 'mochi_prod1' },
      { username: 'pixel_mochi', title: 'Slime Desktop Pet (5 Colors)', desc: 'Animated desktop pet sprite sheet, 5 color variants, idle + walk cycle.', price: 700, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: false, seed: 'mochi_prod2' },
      // inkstorm_art
      { username: 'inkstorm_art', title: 'Tanjiro Ink Print — A4', desc: 'High-quality reproduction of original ink illustration. Signed, numbered 1/50.', price: 2500, cat: 'COSPLAY_PRINT', type: 'PHYSICAL', stock: 50, pin: true, seed: 'zara_prod1' },
      { username: 'inkstorm_art', title: 'Bleach TYBW Digital Artpack', desc: '5 high-res digital prints from Bleach Thousand Year Blood War era. Instant download.', price: 1500, cat: 'DOUJIN', type: 'DIGITAL', pin: false, seed: 'zara_prod2' },
      { username: 'inkstorm_art', title: 'Dark Fantasy Zine — Void Garden', desc: 'A5 digital zine, 32 pages of original dark fantasy ink illustrations.', price: 800, cat: 'DOUJIN', type: 'DIGITAL', pin: false, seed: 'zara_prod3' },
      // velvet_cosplay
      { username: 'velvet_cosplay', title: 'Sakura Magical Girl Print (A3)', desc: 'A3 signed print from studio shoot. Original magical girl design.', price: 3000, cat: 'COSPLAY_PRINT', type: 'PHYSICAL', stock: 15, pin: true, seed: 'velvet_prod1' },
      { username: 'velvet_cosplay', title: 'Lace Hair Bow Set (3 pieces)', desc: 'Handmade fabric hair bows, 3 colours. Suitable for cosplay and daily wear.', price: 1500, cat: 'PHYSICAL_MERCH', type: 'PHYSICAL', stock: 20, pin: false, seed: 'velvet_prod2' },
      // craftcove_sea
      { username: 'craftcove_sea', title: 'Anime Charm Bundle (5 random)', desc: '5 random acrylic charms from current catalogue. Includes exclusive bundle-only design.', price: 2800, cat: 'PHYSICAL_MERCH', type: 'PHYSICAL', stock: 40, pin: true, seed: 'craft_prod1' },
      { username: 'craftcove_sea', title: 'Custom Resin Dome Badge', desc: 'Custom 6cm resin badge. Send your design, get a professional dome badge.', price: 1800, cat: 'PHYSICAL_MERCH', type: 'PHYSICAL', stock: 100, pin: false, seed: 'craft_prod2' },
      { username: 'craftcove_sea', title: 'Holographic Sticker Sheet (A5)', desc: 'A5 holographic sticker sheet with 12 die-cut anime-themed designs.', price: 800, cat: 'STICKERS', type: 'PHYSICAL', stock: 80, pin: false, seed: 'craft_prod3' },
      // otome_prints
      { username: 'otome_prints', title: 'AFASG 2024 Photo Zine', desc: 'A5 photo zine from AFASG 2024. 40 pages, 200 copies print run. Signed by photographer.', price: 2500, cat: 'COSPLAY_PRINT', type: 'PHYSICAL', stock: 80, pin: true, seed: 'otome_prod1' },
      { username: 'otome_prints', title: 'Genshin Group Wallpack (4K)', desc: '8 wallpaper images from Gardens by the Bay Genshin group shoot. Instant download.', price: 1200, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: false, seed: 'otome_prod2' },
      { username: 'otome_prints', title: 'A3 Gallery Print — Arknights W', desc: 'Fine art photo print, A3, 300dpi, gallery paper. Numbered 1/30. Ships from SG.', price: 4000, cat: 'COSPLAY_PRINT', type: 'PHYSICAL', stock: 30, pin: false, seed: 'otome_prod3' },
      // doujin_syndicate
      { username: 'doujin_syndicate', title: 'Bayou Blues Vol.1 — Physical', desc: 'A5 doujin manga, 56 pages, full-colour cover. Slice of life set in Penang. Ships from PJ.', price: 2200, cat: 'DOUJIN', type: 'PHYSICAL', stock: 60, pin: true, seed: 'fahmi_prod1' },
      { username: 'doujin_syndicate', title: 'Void Garden Horror Anthology 2024', desc: 'Annual horror anthology. 96 pages, 8 short stories by 4 authors. A5 physical book.', price: 2800, cat: 'DOUJIN', type: 'PHYSICAL', stock: 45, pin: false, seed: 'fahmi_prod2' },
      { username: 'doujin_syndicate', title: 'Tanah Melayu Chronicles — Digital', desc: 'Fantasy doujin PDF, 64 pages. Mythological Malay kingdom setting. Instant download.', price: 900, cat: 'DOUJIN', type: 'DIGITAL', pin: false, seed: 'fahmi_prod3' },
      // crystalpixel
      { username: 'crystalpixel', title: 'Pastel Fantasy Wallpack — 6 Images', desc: '6 pastel watercolour-style 4K wallpapers. Desktop + mobile crops.', price: 900, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: false, seed: 'crystal_prod1' },
      { username: 'crystalpixel', title: 'Spring Faerie Artpack', desc: '8-piece artpack from original Spring Faerie fantasy series. PSD files included.', price: 2000, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: true, seed: 'crystal_prod2' },
      // chibi_factory
      { username: 'chibi_factory', title: 'SPY×FAMILY Chibi Sticker Pack', desc: '6 chibi stickers: Anya, Loid, Yor, Bond, and 2 bonus designs. PNG transparent.', price: 700, cat: 'STICKERS', type: 'DIGITAL', pin: true, seed: 'chibi_prod1' },
      { username: 'chibi_factory', title: 'Custom Chibi Portrait (Digital)', desc: 'Your OC or favourite character in chibi style. PNG + PSD, 3 revision rounds.', price: 2000, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: false, seed: 'chibi_prod2' },
      // armorsmith_ph
      { username: 'armorsmith_ph', title: 'FF XVI Clive Bracer (Replica)', desc: 'Wearable replica bracer from Final Fantasy XVI. EVA foam + thermoplastic, painted.', price: 6000, cat: 'PHYSICAL_MERCH', type: 'PHYSICAL', stock: 8, pin: true, seed: 'armor_prod1' },
      { username: 'armorsmith_ph', title: 'Cosplay Prop Tutorial PDF', desc: '60-page guide to competition-grade EVA foam prop building. Patterns included.', price: 1500, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: false, seed: 'armor_prod2' },
      // natsuko_art
      { username: 'natsuko_art', title: 'Cultural Fusion Character Pack', desc: '5 digital illustrations blending Indian motifs with anime aesthetics. PNG + PSD.', price: 1500, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: true, seed: 'natsuko_prod1' },
      { username: 'natsuko_art', title: 'Deepavali 2024 Limited Print (A4)', desc: 'Limited edition Deepavali illustration print. 50 copies, signed. Ships from Selangor.', price: 2000, cat: 'COSPLAY_PRINT', type: 'PHYSICAL', stock: 50, pin: false, seed: 'natsuko_prod2' },
      // sticker_queen_sg
      { username: 'sticker_queen_sg', title: 'Holographic Star Pack (8 Stickers)', desc: '8 holographic die-cut stickers. Waterproof, UV resistant. Ships from Singapore.', price: 900, cat: 'STICKERS', type: 'PHYSICAL', stock: 200, pin: true, seed: 'stickerq_prod1' },
      { username: 'sticker_queen_sg', title: 'Genshin Hydro Archon Sticker Set', desc: 'Limited run of 200 packs, 6 stickers per pack. Furina fan art.', price: 1100, cat: 'STICKERS', type: 'PHYSICAL', stock: 50, pin: false, seed: 'stickerq_prod2' },
      { username: 'sticker_queen_sg', title: 'Custom Digital Sticker Pack (5 designs)', desc: 'Send your designs, get a 5-piece digital sticker pack (PNG + cut lines).', price: 4500, cat: 'STICKERS', type: 'DIGITAL', pin: false, seed: 'stickerq_prod3' },
      // celestial_draws
      { username: 'celestial_draws', title: 'Major Arcana Tarot Set — Digital', desc: '22-card Major Arcana tarot set in gothic fantasy style. High-res PNG, print-at-home.', price: 3500, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: true, seed: 'diana_prod1' },
      { username: 'celestial_draws', title: 'Gothic Fantasy Artpack', desc: '10 dark fantasy illustrations. Varied characters and scenes. PSD included.', price: 2000, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: false, seed: 'diana_prod2' },
      // cosplay_marco
      { username: 'cosplay_marco', title: 'Zoro One Piece Signed Print (A4)', desc: 'A4 glossy signed print from Roronoa Zoro studio shoot. Ships from Jakarta.', price: 2000, cat: 'COSPLAY_PRINT', type: 'PHYSICAL', stock: 30, pin: true, seed: 'marco_prod1' },
      { username: 'cosplay_marco', title: '3D Maneuver Gear Build Guide', desc: 'PDF tutorial for Attack on Titan 3D Maneuver Gear. Patterns + photos. 55 pages.', price: 1800, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: false, seed: 'marco_prod2' },
      // genshin_fan_art
      { username: 'genshin_fan_art', title: 'Fontaine Arc Artpack (10 images)', desc: '10 high-res Genshin Impact Fontaine-era fan art illustrations. PNG + PSD.', price: 2000, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: true, seed: 'kevin_prod1' },
      { username: 'genshin_fan_art', title: 'Hu Tao x Zhongli Print (A3, Physical)', desc: 'A3 glossy print of fan-favourite ship illustration. Numbered 1/50. Ships from KL.', price: 3500, cat: 'COSPLAY_PRINT', type: 'PHYSICAL', stock: 50, pin: false, seed: 'kevin_prod2' },
      { username: 'genshin_fan_art', title: 'All Archons Group Sticker Sheet', desc: '7 chibi Archon stickers on one A5 sheet. Die-cut, waterproof.', price: 1000, cat: 'STICKERS', type: 'PHYSICAL', stock: 100, pin: false, seed: 'kevin_prod3' },
      // tenshi_prints
      { username: 'tenshi_prints', title: 'Penang Heritage Cosplay Wallpack', desc: '5 atmospheric wallpapers from Klee cosplay shoot at George Town Penang.', price: 800, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: true, seed: 'tenshi_prod1' },
      { username: 'tenshi_prints', title: 'A4 Moody Raven Print (Signed)', desc: 'A4 dark fantasy cosplay photo print, signed. Ships from Penang.', price: 2200, cat: 'COSPLAY_PRINT', type: 'PHYSICAL', stock: 20, pin: false, seed: 'tenshi_prod2' },
      // midnight_ink
      { username: 'midnight_ink', title: 'Demon Slayer Ukiyo-e Print Set (5 pieces)', desc: '5 A4 ukiyo-e style prints, reproduced from original ink artwork. Numbered run of 30.', price: 4500, cat: 'COSPLAY_PRINT', type: 'PHYSICAL', stock: 30, pin: true, seed: 'haziq_prod1' },
      { username: 'midnight_ink', title: 'Melaka Heritage Digital Print', desc: 'Digital download of Melaka stadthuys illustration with anime characters. 4K PNG.', price: 1200, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: false, seed: 'haziq_prod2' },
      // chibi_coscraft
      { username: 'chibi_coscraft', title: 'Cat Ear Headband (Custom Color)', desc: 'Handmade fabric cat ear headband. Choose from 8 colour options. Ships from Ipoh.', price: 2200, cat: 'PHYSICAL_MERCH', type: 'PHYSICAL', stock: 30, pin: true, seed: 'jiaxin_prod1' },
      { username: 'chibi_coscraft', title: 'Chibi Paimon Plush (15cm)', desc: 'Handmade Genshin Paimon plush. Limited run of 10. Final batch for this year.', price: 3800, cat: 'PHYSICAL_MERCH', type: 'PHYSICAL', stock: 10, pin: false, seed: 'jiaxin_prod2' },
      // warblade_props
      { username: 'warblade_props', title: 'Buster Sword Replica (Display Grade)', desc: 'Full-size EVA foam Buster Sword. Painted, sealed. Wall-mount included. Ships in custom box.', price: 22000, cat: 'PHYSICAL_MERCH', type: 'PHYSICAL', stock: 3, pin: true, seed: 'warblade_prod1' },
      { username: 'warblade_props', title: 'Competition Prop Build Guide PDF', desc: '80-page guide to fibreglass prop construction for competition. Sourcing guide included.', price: 2500, cat: 'DIGITAL_ART', type: 'DIGITAL', pin: false, seed: 'warblade_prod2' },
      { username: 'warblade_props', title: 'Custom Weapon Commission (small prop)', desc: 'Commission a custom foam weapon under 80cm. Any game/anime reference accepted.', price: 9000, cat: 'PHYSICAL_MERCH', type: 'PHYSICAL', stock: null, pin: false, seed: 'warblade_prod3' },
    ];

    for (const p of productDefs) {
      const profile = profileMap[p.username];
      if (!profile) continue;
      await prisma.product.create({
        data: {
          creatorId: profile.profileId,
          title: p.title,
          description: p.desc,
          price: p.price,
          category: p.cat,
          type: p.type as any,
          images: JSON.stringify([`https://picsum.photos/seed/${p.seed}a/600/600`, `https://picsum.photos/seed/${p.seed}b/600/600`]),
          stock: (p as any).stock ?? null,
          isActive: true,
          isPinned: p.pin,
          order: 0,
        },
      });
    }
  }

  const totalProducts = await prisma.product.count();
  console.log(`✅ Products: ${totalProducts} total`);

  // ─── ORDERS + TRANSACTIONS ─────────────────────────────────────────────────

  const existingOrderCount = await prisma.order.count();
  if (existingOrderCount < 60) {
    // Load all products and profiles for cross-referencing
    const allProducts = await prisma.product.findMany({
      select: { id: true, price: true, creatorId: true, type: true },
    });
    const allProfiles = await prisma.creatorProfile.findMany({
      select: { id: true, userId: true },
    });
    const profileToUser = new Map(allProfiles.map((p) => [p.id, p.userId]));

    const allBuyers = await prisma.user.findMany({ where: { role: 'BUYER' }, select: { id: true } });
    const buyerIds = allBuyers.map((b) => b.id);

    const statuses = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
    const currencies = [
      { code: 'MYR', rate: 4.7 },
      { code: 'SGD', rate: 1.35 },
      { code: 'PHP', rate: 58.0 },
      { code: 'USD', rate: 1.0 },
    ];

    const ordersToCreate = 80;
    let invoiceCounter = 1;

    for (let i = 0; i < ordersToCreate; i++) {
      const product = pick(allProducts);
      const creatorUserId = profileToUser.get(product.creatorId);
      if (!creatorUserId) continue;

      const buyerId = pick(buyerIds);
      const status = i < 20 ? 'COMPLETED' : i < 35 ? 'PAID' : i < 50 ? 'SHIPPED' : pick(statuses);
      const daysBack = Math.floor(Math.random() * 170) + 2;
      const cur = pick(currencies);
      const displayAmount = Math.round((product.price / 100) * cur.rate * 100);
      const trackingNumber = (status === 'SHIPPED' || status === 'COMPLETED') && product.type === 'PHYSICAL'
        ? `MY${String(100000 + i).padStart(8, '0')}` : null;

      const order = await prisma.order.create({
        data: {
          buyerId,
          creatorId: creatorUserId,
          productId: product.id,
          status,
          amountUsd: product.price,
          displayCurrency: cur.code,
          displayAmount,
          exchangeRate: cur.rate,
          trackingNumber,
          createdAt: daysAgo(daysBack),
          updatedAt: daysAgo(daysBack - 1),
        },
      });

      // Transaction for paid/processing/shipped/completed
      if (['PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED'].includes(status)) {
        const { processingFee, creatorAmount } = calcFees(product.price);
        await prisma.transaction.create({
          data: {
            orderId: order.id,
            buyerId,
            creatorId: creatorUserId,
            grossAmountUsd: product.price,
            processingFee,
            creatorAmount,
            currency: cur.code,
            status: status === 'COMPLETED' ? 'COMPLETED' : status === 'PAID' ? 'COMPLETED' : 'PENDING',
            createdAt: daysAgo(daysBack),
          },
        });

        // Invoice for completed orders
        if (status === 'COMPLETED' || status === 'PAID') {
          const refNum = `INV-2026-${String(invoiceCounter).padStart(5, '0')}`;
          invoiceCounter++;
          await prisma.invoice.create({
            data: {
              type: 'PURCHASE',
              referenceNumber: refNum,
              issuedToId: buyerId,
              issuedToType: 'BUYER',
              amountUsd: product.price,
              orderId: order.id,
              items: JSON.stringify([{ description: 'Product purchase', amount: product.price }]),
              createdAt: daysAgo(daysBack),
            },
          });
        }
      }
    }

    console.log(`✅ Orders + transactions created`);
  }

  const totalOrders = await prisma.order.count();
  const totalTx = await prisma.transaction.count();
  console.log(`   Orders: ${totalOrders}, Transactions: ${totalTx}`);

  // ─── PAYOUTS ───────────────────────────────────────────────────────────────

  const existingPayoutCount = await prisma.payout.count();
  if (existingPayoutCount < 15) {
    const allCreatorUsers = await prisma.user.findMany({ where: { role: 'CREATOR' }, select: { id: true } });
    const payoutStatuses = ['PENDING', 'PENDING', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'PROCESSING'];
    const payoutAmounts = [5000, 8000, 12000, 15000, 20000, 25000, 30000, 45000, 50000];

    for (let i = 0; i < 20; i++) {
      const creatorUser = pick(allCreatorUsers);
      const status = pick(payoutStatuses);
      const daysBack = Math.floor(Math.random() * 120) + 5;
      const amount = pick(payoutAmounts);
      await prisma.payout.create({
        data: {
          creatorId: creatorUser.id,
          amountUsd: amount,
          status,
          requestedAt: daysAgo(daysBack),
          completedAt: status === 'COMPLETED' ? daysAgo(daysBack - 3) : null,
        },
      });
    }
  }

  const totalPayouts = await prisma.payout.count();
  console.log(`✅ Payouts: ${totalPayouts} total`);

  // ─── CONVERSATIONS + MESSAGES ──────────────────────────────────────────────

  const existingMsgCount = await prisma.message.count();
  if (existingMsgCount < 30) {
    const allBuyersForMsg = await prisma.user.findMany({ where: { role: 'BUYER' }, select: { id: true } });
    const allCreatorsForMsg = await prisma.user.findMany({ where: { role: 'CREATOR' }, select: { id: true } });

    const messageThreads = [
      { buyerIdx: 0, creatorIdx: 0, msgs: [
        { from: 'buyer', content: 'Hi! Are your commission slots still open? I\'d love to get an OC portrait done.', daysBack: 15 },
        { from: 'creator', content: 'Hi! Yes, I have 2 slots left for this month. Could you share a reference image?', daysBack: 14 },
        { from: 'buyer', content: 'Amazing! Sending over the reference now. It\'s an original character, fantasy elf design.', daysBack: 14 },
        { from: 'creator', content: 'Looks great! I can start next week. Please go ahead and purchase the commission slot on my page.', daysBack: 13 },
      ]},
      { buyerIdx: 1, creatorIdx: 1, msgs: [
        { from: 'buyer', content: 'Just ordered your doujin PDF — downloaded perfectly! Love the Penang setting.', daysBack: 20 },
        { from: 'creator', content: 'Thank you so much! Vol.2 is coming to Animangaki in July if you want a physical copy!', daysBack: 19 },
      ]},
      { buyerIdx: 2, creatorIdx: 2, msgs: [
        { from: 'buyer', content: 'I ordered the print set but haven\'t received a shipping notification yet?', daysBack: 10 },
        { from: 'creator', content: 'Hi! Your order ships tomorrow via SingPost. Tracking number will be updated by end of day.', daysBack: 9 },
        { from: 'buyer', content: 'Got it, thank you! Really excited for the prints.', daysBack: 9 },
      ]},
      { buyerIdx: 3, creatorIdx: 3, msgs: [
        { from: 'buyer', content: 'Can you make a custom Buster Sword with LED effects? For an event in KL.', daysBack: 25 },
        { from: 'creator', content: 'Absolutely! LED Buster Sword is doable. What colour LEDs and what\'s your timeline?', daysBack: 24 },
        { from: 'buyer', content: 'Blue/purple edge lighting, for an event in 3 months.', daysBack: 24 },
        { from: 'creator', content: '3 months is tight but doable. Price would be around RM400-450 with LEDs. Interested?', daysBack: 23 },
        { from: 'buyer', content: 'That works for me! How do I proceed?', daysBack: 23 },
      ]},
      { buyerIdx: 4, creatorIdx: 4, msgs: [
        { from: 'buyer', content: 'Love your tarot card designs! Can I commission the full 78-card Major + Minor Arcana?', daysBack: 30 },
        { from: 'creator', content: 'Full 78-card deck would be a large project! Timeline would be 4–5 months. Price would be around $600-700.', daysBack: 29 },
        { from: 'buyer', content: 'That\'s very reasonable! Can we do a payment plan?', daysBack: 29 },
      ]},
      { buyerIdx: 5, creatorIdx: 0, msgs: [
        { from: 'buyer', content: 'Quick question — do your digital stickers work in WhatsApp and Telegram?', daysBack: 7 },
        { from: 'creator', content: 'They\'re PNG files so you\'d need to import them. For Telegram, yes via custom sticker pack!', daysBack: 7 },
        { from: 'buyer', content: 'Perfect, I\'ll get the sticker pack then!', daysBack: 6 },
      ]},
      { buyerIdx: 6, creatorIdx: 5, msgs: [
        { from: 'buyer', content: 'Hi, is the holographic sticker set available for wholesale (100 packs)?', daysBack: 12 },
        { from: 'creator', content: 'Yes! Wholesale pricing starts at 50 packs. DM me with your quantity and I\'ll quote you.', daysBack: 11 },
        { from: 'buyer', content: 'I need 100 packs by end of month for a convention booth.', daysBack: 11 },
        { from: 'creator', content: 'That\'s very doable! I\'ll email you a wholesale quote within 24 hours.', daysBack: 10 },
      ]},
      { buyerIdx: 7, creatorIdx: 6, msgs: [
        { from: 'buyer', content: 'Received my FF XVI bracer yesterday — the quality is incredible!', daysBack: 5 },
        { from: 'creator', content: 'So glad it arrived safely! Let me know if anything needs touch-up!', daysBack: 4 },
      ]},
      { buyerIdx: 8, creatorIdx: 7, msgs: [
        { from: 'buyer', content: 'Do you do group cosplay photo sessions? We have 8 people all doing Genshin.', daysBack: 18 },
        { from: 'creator', content: 'Yes! Group rate for 8+ people is SGD 200 for 2 hours at Gardens by the Bay.', daysBack: 17 },
        { from: 'buyer', content: 'That\'s amazing. Are you free in November?', daysBack: 17 },
      ]},
      { buyerIdx: 9, creatorIdx: 8, msgs: [
        { from: 'buyer', content: 'Just got my Demon Slayer print set — the ukiyo-e style is absolutely beautiful!', daysBack: 3 },
        { from: 'creator', content: 'Thank you so much! I\'m doing a JJK ukiyo-e series next — follow me for the drop!', daysBack: 2 },
      ]},
      { buyerIdx: 10, creatorIdx: 2, msgs: [
        { from: 'buyer', content: 'Is the chibi Paimon plush still available? Couldn\'t find it on your page.', daysBack: 8 },
        { from: 'creator', content: 'Sorry! That batch sold out. Next run will be in December — join my mailing list!', daysBack: 7 },
      ]},
      { buyerIdx: 11, creatorIdx: 1, msgs: [
        { from: 'buyer', content: 'Can I get Bayou Blues Vol.1 signed with a dedication?', daysBack: 22 },
        { from: 'creator', content: 'Of course! Just put the name you want in the order notes.', daysBack: 21 },
        { from: 'buyer', content: 'To: Aditya, "From one storyteller to another" please!', daysBack: 21 },
      ]},
      { buyerIdx: 12, creatorIdx: 9, msgs: [
        { from: 'buyer', content: 'Interested in a full armour commission for World Cosplay Summit Philippines qualifier.', daysBack: 35 },
        { from: 'creator', content: 'WCS PH qualifier? That\'s exciting! What character are you planning?', daysBack: 34 },
        { from: 'buyer', content: 'Raiden Shogun from Genshin. Full armour including the electro effect elements.', daysBack: 34 },
        { from: 'creator', content: 'Raiden is one of my favourites to build. I have a slot opening in Q3. Want to schedule a consultation call?', daysBack: 33 },
        { from: 'buyer', content: 'Yes please! I\'m available weekends. When works for you?', daysBack: 33 },
      ]},
      { buyerIdx: 0, creatorIdx: 10, msgs: [
        { from: 'buyer', content: 'Your neon artpack is stunning. How do you get those glitch effects?', daysBack: 16 },
        { from: 'creator', content: 'Thanks! It\'s a combination of scanline overlays and chromatic aberration in Photoshop.', daysBack: 15 },
        { from: 'buyer', content: 'Would you ever do a tutorial on that technique?', daysBack: 15 },
        { from: 'creator', content: 'Actually planning a tutorial pack! Watch for the drop next month.', daysBack: 14 },
      ]},
      { buyerIdx: 1, creatorIdx: 11, msgs: [
        { from: 'buyer', content: 'I purchased your sticker pack but the download link isn\'t working?', daysBack: 2 },
        { from: 'creator', content: 'Sorry about that! I\'ve re-sent the download link to your email. Should work now!', daysBack: 1 },
        { from: 'buyer', content: 'Got it, working perfectly now. Thank you!', daysBack: 1 },
      ]},
    ];

    for (const thread of messageThreads) {
      const buyer = allBuyersForMsg[thread.buyerIdx % allBuyersForMsg.length];
      const creator = allCreatorsForMsg[thread.creatorIdx % allCreatorsForMsg.length];
      if (!buyer || !creator) continue;

      const convo = await prisma.conversation.upsert({
        where: { buyerId_creatorId: { buyerId: buyer.id, creatorId: creator.id } },
        update: { lastMessageAt: daysAgo(thread.msgs[thread.msgs.length - 1].daysBack) },
        create: { buyerId: buyer.id, creatorId: creator.id, lastMessageAt: daysAgo(thread.msgs[0].daysBack) },
      });

      for (const msg of thread.msgs) {
        const senderId = msg.from === 'buyer' ? buyer.id : creator.id;
        const receiverId = msg.from === 'buyer' ? creator.id : buyer.id;
        await prisma.message.create({
          data: {
            senderId,
            receiverId,
            content: msg.content,
            isRead: msg.daysBack > 3,
            createdAt: daysAgo(msg.daysBack),
          },
        });
      }
    }
  }

  const totalMessages = await prisma.message.count();
  const totalConvos = await prisma.conversation.count();
  console.log(`✅ Messages: ${totalMessages}, Conversations: ${totalConvos}`);

  // ─── MEDIA LIBRARY ─────────────────────────────────────────────────────────

  const existingMediaCount = await prisma.media.count();
  if (existingMediaCount < 15) {
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const someCreators = await prisma.user.findMany({ where: { role: 'CREATOR' }, take: 5 });
    if (adminUser) {
      const mediaEntries = [
        { filename: 'hero-banner.jpg', url: 'https://picsum.photos/seed/media_hero/1200/400', uploadedBy: adminUser.id, daysBack: 60 },
        { filename: 'marketplace-featured.jpg', url: 'https://picsum.photos/seed/media_feat/800/400', uploadedBy: adminUser.id, daysBack: 55 },
        { filename: 'cf2024-banner.jpg', url: 'https://picsum.photos/seed/media_cf/1200/300', uploadedBy: adminUser.id, daysBack: 50 },
        { filename: 'sakura-avatar.png', url: 'https://picsum.photos/seed/sakura_avatar/200/200', uploadedBy: someCreators[0]?.id ?? adminUser.id, daysBack: 45 },
        { filename: 'akira-banner.jpg', url: 'https://picsum.photos/seed/akira_banner/1200/300', uploadedBy: someCreators[1]?.id ?? adminUser.id, daysBack: 40 },
        { filename: 'luna-print-set.jpg', url: 'https://picsum.photos/seed/luna_prod1a/600/800', uploadedBy: someCreators[2]?.id ?? adminUser.id, daysBack: 38 },
        { filename: 'prop-commission-1.jpg', url: 'https://picsum.photos/seed/prop_prod1a/600/600', uploadedBy: someCreators[3]?.id ?? adminUser.id, daysBack: 35 },
        { filename: 'neon-risa-sample.jpg', url: 'https://picsum.photos/seed/risa_prod1a/600/600', uploadedBy: someCreators[4]?.id ?? adminUser.id, daysBack: 30 },
        { filename: 'homepage-about.jpg', url: 'https://picsum.photos/seed/media_about/800/500', uploadedBy: adminUser.id, daysBack: 25 },
        { filename: 'creator-spotlight.jpg', url: 'https://picsum.photos/seed/media_spot/800/600', uploadedBy: adminUser.id, daysBack: 20 },
        { filename: 'animangaki-promo.jpg', url: 'https://picsum.photos/seed/media_anim/1200/400', uploadedBy: adminUser.id, daysBack: 18 },
        { filename: 'sticker-collection.png', url: 'https://picsum.photos/seed/stickerq_prod1a/600/600', uploadedBy: someCreators[0]?.id ?? adminUser.id, daysBack: 15 },
        { filename: 'genshin-fanart.jpg', url: 'https://picsum.photos/seed/kevin_prod1a/600/600', uploadedBy: someCreators[1]?.id ?? adminUser.id, daysBack: 12 },
        { filename: 'doujin-cover-scan.jpg', url: 'https://picsum.photos/seed/fahmi_prod1a/600/800', uploadedBy: someCreators[2]?.id ?? adminUser.id, daysBack: 10 },
        { filename: 'warblade-sword.jpg', url: 'https://picsum.photos/seed/warblade_prod1a/600/800', uploadedBy: someCreators[3]?.id ?? adminUser.id, daysBack: 8 },
        { filename: 'chibi-pack-preview.png', url: 'https://picsum.photos/seed/chibi_prod1a/500/600', uploadedBy: someCreators[4]?.id ?? adminUser.id, daysBack: 6 },
        { filename: 'platform-logo.svg', url: '/uploads/library/logo.svg', uploadedBy: adminUser.id, daysBack: 90 },
        { filename: 'email-header.png', url: 'https://picsum.photos/seed/media_email/600/200', uploadedBy: adminUser.id, daysBack: 85 },
        { filename: 'crystal-pastel.jpg', url: 'https://picsum.photos/seed/crystal_prod1a/600/600', uploadedBy: someCreators[0]?.id ?? adminUser.id, daysBack: 4 },
        { filename: 'tenshi-penang.jpg', url: 'https://picsum.photos/seed/tenshi_prod1a/600/900', uploadedBy: someCreators[1]?.id ?? adminUser.id, daysBack: 2 },
      ];

      for (const m of mediaEntries) {
        await prisma.media.upsert({
          where: { id: `media_${m.filename.replace(/[^a-z0-9]/gi, '_')}` },
          update: {},
          create: {
            id: `media_${m.filename.replace(/[^a-z0-9]/gi, '_')}`,
            filename: m.filename,
            url: m.url,
            uploadedBy: m.uploadedBy,
            createdAt: daysAgo(m.daysBack),
          },
        });
      }
    }
  }

  const totalMedia = await prisma.media.count();
  console.log(`✅ Media: ${totalMedia} total`);

  // ─── FINAL COUNTS ──────────────────────────────────────────────────────────

  const [creators, products, buyers, orders, transactions, payouts, messages] = await Promise.all([
    prisma.creatorProfile.count(),
    prisma.product.count(),
    prisma.user.count({ where: { role: 'BUYER' } }),
    prisma.order.count(),
    prisma.transaction.count(),
    prisma.payout.count(),
    prisma.message.count(),
  ]);

  console.log('\n🎉 Extra seed complete!');
  console.log(`   Creators:     ${creators}`);
  console.log(`   Products:     ${products}`);
  console.log(`   Buyers:       ${buyers}`);
  console.log(`   Orders:       ${orders}`);
  console.log(`   Transactions: ${transactions}`);
  console.log(`   Payouts:      ${payouts}`);
  console.log(`   Messages:     ${messages}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
