# NOIZU-DIRECT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build a complete dark-themed creator marketplace for SEA cosplay/doujin/anime creators running on localhost:7000.

**Architecture:** Next.js 14 App Router + Prisma/SQLite + NextAuth.js v5 + Airwallex sandbox payments. Server components for data fetching, client components only for interactivity. All uploads to /public/uploads/. PDFs via @react-pdf/renderer stored in /storage/invoices/.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Prisma ORM, SQLite, NextAuth.js v5, @react-pdf/renderer, Airwallex API, Frankfurter API (FX rates)

**Port:** 7000

---

## Design System (from spec — override AI tool suggestions)

```
Background:      #0d0d12
Surface:         #16161f
Card:            #1e1e2a
Primary accent:  #7c3aed (purple)
Secondary:       #00d4aa (teal)
Text primary:    #f0f0f5
Text muted:      #8888aa
Success:         #22c55e
Warning:         #f59e0b
Error:           #ef4444
Creator Gold:    #f59e0b
Font:            Poppins (Google Fonts)
```

---

## Phase 0 — Project Setup & Infrastructure
**Stop after this phase and wait for user approval before proceeding.**

### Task 0.1: Initialize Next.js 14 Project

**Files:**
- Create: `package.json` (via npx)
- Create: `next.config.js`
- Create: `.env.local`
- Create: `public/uploads/avatars/.gitkeep`
- Create: `public/uploads/banners/.gitkeep`
- Create: `public/uploads/products/.gitkeep`
- Create: `storage/invoices/.gitkeep`

- [ ] Run: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git` in `/c/Users/ruper/noizu-direct`
- [ ] Set port 7000 in `next.config.js`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
```
- [ ] Add to `package.json` scripts: `"dev": "next dev -p 7000"`
- [ ] Create `.env.local`:
```
NEXTAUTH_URL=http://localhost:7000
NEXTAUTH_SECRET=noizu-direct-secret-key-change-in-prod
DATABASE_URL=file:./dev.db
AIRWALLEX_CLIENT_ID=your-sandbox-client-id
AIRWALLEX_API_KEY=your-sandbox-api-key
AIRWALLEX_WEBHOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_APP_URL=http://localhost:7000
NEXT_PUBLIC_DEFAULT_CURRENCY=USD
```
- [ ] Create upload directories: `public/uploads/avatars/`, `public/uploads/banners/`, `public/uploads/products/`, `storage/invoices/purchase/`, `storage/invoices/payout/`, `storage/invoices/statements/`
- [ ] Commit: `git add . && git commit -m "feat: initialize Next.js 14 project"`

### Task 0.2: Install All Dependencies

- [ ] Run:
```bash
npm install prisma @prisma/client
npm install next-auth@beta
npm install @react-pdf/renderer
npm install lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-select @radix-ui/react-toast @radix-ui/react-avatar @radix-ui/react-badge @radix-ui/react-switch @radix-ui/react-label @radix-ui/react-slot
npm install class-variance-authority clsx tailwind-merge
npm install bcryptjs
npm install @types/bcryptjs --save-dev
npm install uuid
npm install @types/uuid --save-dev
npm install date-fns
npm install react-hook-form @hookform/resolvers zod
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install sharp
```
- [ ] Initialize shadcn/ui: `npx shadcn@latest init` — select dark theme, CSS variables
- [ ] Add shadcn components: `npx shadcn@latest add button card input label select tabs badge avatar dialog sheet dropdown-menu toast separator skeleton form textarea switch`
- [ ] Commit: `git commit -m "feat: install dependencies and shadcn/ui"`

### Task 0.3: Prisma Schema

**Files:**
- Create: `prisma/schema.prisma`

- [ ] Run: `npx prisma init --datasource-provider sqlite`
- [ ] Write `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  role      String   @default("BUYER") // GUEST|BUYER|CREATOR|ADMIN
  avatar    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  creatorProfile  CreatorProfile?
  buyerOrders     Order[]         @relation("BuyerOrders")
  creatorOrders   Order[]         @relation("CreatorOrders")
  sentMessages    Message[]       @relation("SentMessages")
  receivedMessages Message[]      @relation("ReceivedMessages")
  buyerConvos     Conversation[]  @relation("BuyerConvos")
  creatorConvos   Conversation[]  @relation("CreatorConvos")
  payouts         Payout[]
  invoices        Invoice[]
  media           Media[]
}

model CreatorProfile {
  id               String   @id @default(cuid())
  userId           String   @unique
  username         String   @unique
  displayName      String
  bio              String?
  bannerImage      String?
  avatar           String?
  socialLinks      String   @default("{}") // JSON
  categoryTags     String   @default("[]") // JSON
  commissionStatus String   @default("OPEN") // OPEN|CLOSED|LIMITED
  announcementText String?
  announcementActive Boolean @default(false)
  featuredProductIds String  @default("[]") // JSON
  isVerified       Boolean  @default(false)
  isTopCreator     Boolean  @default(false)
  totalSales       Int      @default(0)
  absorbProcessingFee Boolean @default(false)
  createdAt        DateTime @default(now())

  user     User      @relation(fields: [userId], references: [id])
  products Product[]
}

model Product {
  id          String   @id @default(cuid())
  creatorId   String
  title       String
  description String
  price       Int      // USD cents
  category    String   // DIGITAL_ART|DOUJIN|COSPLAY_PRINT|PHYSICAL_MERCH|STICKERS|OTHER
  type        String   // DIGITAL|PHYSICAL
  images      String   @default("[]") // JSON array of paths
  digitalFile String?
  stock       Int?
  isActive    Boolean  @default(true)
  isPinned    Boolean  @default(false)
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  creator CreatorProfile @relation(fields: [creatorId], references: [id])
  orders  Order[]
}

model Order {
  id                 String    @id @default(cuid())
  buyerId            String
  creatorId          String
  productId          String
  status             String    @default("PENDING") // PENDING|PAID|PROCESSING|SHIPPED|COMPLETED|CANCELLED|REFUNDED
  amountUsd          Int       // cents
  displayCurrency    String    @default("USD")
  displayAmount      Int       @default(0)
  exchangeRate       Float     @default(1.0)
  exchangeRateAt     DateTime?
  airwallexIntentId  String?
  trackingNumber     String?
  shippingAddress    String?   // JSON
  downloadToken      String?
  downloadExpiry     DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  buyer        User          @relation("BuyerOrders", fields: [buyerId], references: [id])
  creator      User          @relation("CreatorOrders", fields: [creatorId], references: [id])
  product      Product       @relation(fields: [productId], references: [id])
  transactions Transaction[]
  messages     Message[]
  invoices     Invoice[]
}

model Transaction {
  id                 String   @id @default(cuid())
  orderId            String
  buyerId            String
  creatorId          String
  grossAmountUsd     Int
  processingFee      Int
  platformFee        Int      @default(0)
  withdrawalFee      Int      @default(0)
  creatorAmount      Int
  currency           String   @default("USD")
  airwallexReference String?
  status             String   @default("PENDING")
  createdAt          DateTime @default(now())

  order Order @relation(fields: [orderId], references: [id])
}

model Payout {
  id               String    @id @default(cuid())
  creatorId        String
  amountUsd        Int
  status           String    @default("PENDING") // PENDING|PROCESSING|COMPLETED|FAILED
  airwallexPayoutId String?
  requestedAt      DateTime  @default(now())
  completedAt      DateTime?

  creator User @relation(fields: [creatorId], references: [id])
}

model Invoice {
  id              String   @id @default(cuid())
  type            String   // PURCHASE|PAYOUT|MONTHLY_STATEMENT|ANNUAL_SUMMARY
  referenceNumber String   @unique
  issuedToId      String
  issuedToType    String   // BUYER|CREATOR
  amountUsd       Int
  items           String   @default("[]") // JSON
  pdfPath         String?
  orderId         String?
  createdAt       DateTime @default(now())

  issuedTo User    @relation(fields: [issuedToId], references: [id])
  order    Order?  @relation(fields: [orderId], references: [id])
}

model Message {
  id         String   @id @default(cuid())
  senderId   String
  receiverId String
  orderId    String?
  content    String
  imageUrl   String?
  isRead     Boolean  @default(false)
  createdAt  DateTime @default(now())

  sender   User   @relation("SentMessages", fields: [senderId], references: [id])
  receiver User   @relation("ReceivedMessages", fields: [receiverId], references: [id])
  order    Order? @relation(fields: [orderId], references: [id])
}

model Conversation {
  id            String   @id @default(cuid())
  buyerId       String
  creatorId     String
  lastMessageAt DateTime @default(now())
  createdAt     DateTime @default(now())

  buyer   User @relation("BuyerConvos", fields: [buyerId], references: [id])
  creator User @relation("CreatorConvos", fields: [creatorId], references: [id])

  @@unique([buyerId, creatorId])
}

model Page {
  id             String   @id @default(cuid())
  slug           String   @unique
  title          String
  content        String?
  status         String   @default("DRAFT") // DRAFT|PUBLISHED
  seoTitle       String?
  seoDescription String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model Section {
  id        String   @id @default(cuid())
  pageSlug  String
  type      String   // HERO|FEATURED_CREATORS|CATEGORIES|TRENDING|NEW_DROPS|ANNOUNCEMENT|CUSTOM
  order     Int      @default(0)
  isActive  Boolean  @default(true)
  content   String   @default("{}") // JSON
  updatedAt DateTime @updatedAt
}

model Media {
  id         String   @id @default(cuid())
  filename   String
  url        String
  uploadedBy String
  createdAt  DateTime @default(now())

  uploader User @relation(fields: [uploadedBy], references: [id])
}

model Announcement {
  id        String   @id @default(cuid())
  text      String
  link      String?
  color     String   @default("#7c3aed")
  isActive  Boolean  @default(false)
  createdAt DateTime @default(now())
}

model BuyerTag {
  id        String   @id @default(cuid())
  creatorId String
  buyerId   String
  tags      String   @default("[]") // JSON: ["VIP","Frequent Buyer","Commission Client"]
  notes     String?
  updatedAt DateTime @updatedAt

  @@unique([creatorId, buyerId])
}

model PlatformSettings {
  id              String  @id @default(cuid())
  processingFeePercent Float @default(2.5)
  platformFeePercent   Float @default(0.0)
  withdrawalFeePercent Float @default(4.0)
  topCreatorThreshold  Int   @default(100)
}
```

- [ ] Run: `npx prisma migrate dev --name init`
- [ ] Verify: `npx prisma studio` opens without errors (then close)
- [ ] Commit: `git commit -m "feat: add Prisma schema and run initial migration"`

### Task 0.4: Database Seeding

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add prisma.seed)

- [ ] Create `prisma/seed.ts` with:
  - 1 admin: `admin@noizu.direct` / `admin123`, role=ADMIN
  - 3 creators with full profiles: `sakura_arts`, `akira_doujin`, `cosplay_luna`
  - 2 buyers: `buyer1@test.com`, `buyer2@test.com` / `buyer123`
  - 10 products across categories (mix of DIGITAL and PHYSICAL)
  - Homepage sections: HERO, FEATURED_CREATORS, CATEGORIES, TRENDING, NEW_DROPS
  - 1 active Announcement
  - PlatformSettings row

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Platform settings
  await prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', processingFeePercent: 2.5, platformFeePercent: 0, withdrawalFeePercent: 4.0, topCreatorThreshold: 100 },
  });

  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@noizu.direct' },
    update: {},
    create: { email: 'admin@noizu.direct', password: adminPassword, name: 'Admin', role: 'ADMIN' },
  });

  const creatorPassword = await bcrypt.hash('creator123', 10);
  const buyerPassword = await bcrypt.hash('buyer123', 10);

  // Creators
  const c1 = await prisma.user.upsert({
    where: { email: 'sakura@noizu.direct' },
    update: {},
    create: { email: 'sakura@noizu.direct', password: creatorPassword, name: 'Sakura Arts', role: 'CREATOR' },
  });
  await prisma.creatorProfile.upsert({
    where: { userId: c1.id },
    update: {},
    create: {
      userId: c1.id,
      username: 'sakura_arts',
      displayName: 'Sakura Arts ✦',
      bio: 'Digital illustrator specializing in original characters and fan art. Ships worldwide!',
      categoryTags: JSON.stringify(['Digital Art', 'Fan Art', 'OC']),
      commissionStatus: 'OPEN',
      announcementText: 'Commissions open! DM me for custom work.',
      announcementActive: true,
      isVerified: true,
      isTopCreator: true,
      totalSales: 247,
    },
  });

  const c2 = await prisma.user.upsert({
    where: { email: 'akira@noizu.direct' },
    update: {},
    create: { email: 'akira@noizu.direct', password: creatorPassword, name: 'Akira Doujin', role: 'CREATOR' },
  });
  await prisma.creatorProfile.upsert({
    where: { userId: c2.id },
    update: {},
    create: {
      userId: c2.id,
      username: 'akira_doujin',
      displayName: 'Akira Doujin Works',
      bio: 'Indie doujin circle from Malaysia. Physical books and digital PDFs available.',
      categoryTags: JSON.stringify(['Doujin', 'Manga', 'Physical']),
      commissionStatus: 'LIMITED',
      isVerified: true,
      totalSales: 89,
    },
  });

  const c3 = await prisma.user.upsert({
    where: { email: 'luna@noizu.direct' },
    update: {},
    create: { email: 'luna@noizu.direct', password: creatorPassword, name: 'Cosplay Luna', role: 'CREATOR' },
  });
  await prisma.creatorProfile.upsert({
    where: { userId: c3.id },
    update: {},
    create: {
      userId: c3.id,
      username: 'cosplay_luna',
      displayName: 'Luna 🌙 Cosplay',
      bio: 'Professional cosplayer from Singapore. High-res print sets and sticker packs.',
      categoryTags: JSON.stringify(['Cosplay', 'Prints', 'Stickers']),
      commissionStatus: 'CLOSED',
      isVerified: false,
      totalSales: 54,
    },
  });

  // Buyers
  await prisma.user.upsert({
    where: { email: 'buyer1@test.com' },
    update: {},
    create: { email: 'buyer1@test.com', password: buyerPassword, name: 'Tanaka Kenji', role: 'BUYER' },
  });
  await prisma.user.upsert({
    where: { email: 'buyer2@test.com' },
    update: {},
    create: { email: 'buyer2@test.com', password: buyerPassword, name: 'Priya Sharma', role: 'BUYER' },
  });

  // Products (get profiles first)
  const sakuraProfile = await prisma.creatorProfile.findUnique({ where: { userId: c1.id } });
  const akiraProfile = await prisma.creatorProfile.findUnique({ where: { userId: c2.id } });
  const lunaProfile = await prisma.creatorProfile.findUnique({ where: { userId: c3.id } });

  const products = [
    { creatorId: sakuraProfile!.id, title: 'Cherry Blossom OC — Digital Artpack', description: 'High-res digital artpack featuring original character "Hana". 15 illustrations, PSD files included.', price: 1500, category: 'DIGITAL_ART', type: 'DIGITAL', isPinned: true },
    { creatorId: sakuraProfile!.id, title: 'Custom Portrait Commission', description: 'Fully colored custom portrait of your OC or favorite character. Includes 3 revision rounds.', price: 4500, category: 'DIGITAL_ART', type: 'DIGITAL' },
    { creatorId: sakuraProfile!.id, title: 'Anime Sticker Set Vol.1', description: 'Pack of 20 original character stickers. Digital PNG files, transparent background.', price: 800, category: 'STICKERS', type: 'DIGITAL', isPinned: true },
    { creatorId: akiraProfile!.id, title: 'Midnight Chronicles Vol.1 — Physical Doujin', description: 'Original BL doujin manga, A5 size, 48 pages, full color cover. Ships from Malaysia.', price: 2000, category: 'DOUJIN', type: 'PHYSICAL', stock: 50, isPinned: true },
    { creatorId: akiraProfile!.id, title: 'Midnight Chronicles Vol.1 — Digital PDF', description: 'Digital PDF version of Midnight Chronicles Vol.1. Instant download.', price: 800, category: 'DOUJIN', type: 'DIGITAL' },
    { creatorId: akiraProfile!.id, title: 'Character Design Sheet — Ren Yukimura', description: 'Full character design sheet for original character. Includes front, back, expressions.', price: 600, category: 'DIGITAL_ART', type: 'DIGITAL' },
    { creatorId: lunaProfile!.id, title: 'Sailor Luna Cosplay Print Set', description: 'Professional print set from Sailor Moon inspired cosplay shoot. 8 high-res A4 prints.', price: 3500, category: 'COSPLAY_PRINT', type: 'PHYSICAL', stock: 20, isPinned: true },
    { creatorId: lunaProfile!.id, title: 'Luna Summer Festival Digital Wallpacks', description: '5 wallpapers in 4K resolution. Mobile and desktop versions included.', price: 500, category: 'DIGITAL_ART', type: 'DIGITAL' },
    { creatorId: lunaProfile!.id, title: 'Chibi Sticker Bomb Pack', description: '30 chibi character sticker designs. PNG + SVG files.', price: 1200, category: 'STICKERS', type: 'DIGITAL' },
    { creatorId: sakuraProfile!.id, title: 'Yokai Academy Merch Bundle', description: 'Physical merch bundle: 1 acrylic keychain + 5 stickers + A5 postcard. Ships SEA only.', price: 2800, category: 'PHYSICAL_MERCH', type: 'PHYSICAL', stock: 30 },
  ];

  for (const p of products) {
    await prisma.product.create({ data: { ...p, images: JSON.stringify([]) } });
  }

  // Homepage sections
  const sectionData = [
    { pageSlug: 'home', type: 'HERO', order: 0, isActive: true, content: JSON.stringify({ headline: 'Your fave creators. Direct to you.', subtext: 'Discover original art, doujin, cosplay prints and merch from Southeast Asia\'s best creators.', ctaPrimary: { text: 'Explore Marketplace', link: '/marketplace' }, ctaSecondary: { text: 'Become a Creator', link: '/register/creator' } }) },
    { pageSlug: 'home', type: 'FEATURED_CREATORS', order: 1, isActive: true, content: JSON.stringify({ title: 'Featured Creators', maxDisplay: 6 }) },
    { pageSlug: 'home', type: 'CATEGORIES', order: 2, isActive: true, content: JSON.stringify({ title: 'Browse by Category', items: [{ name: 'Digital Art', icon: 'Palette', link: '/marketplace?category=DIGITAL_ART' }, { name: 'Doujin', icon: 'BookOpen', link: '/marketplace?category=DOUJIN' }, { name: 'Cosplay Prints', icon: 'Camera', link: '/marketplace?category=COSPLAY_PRINT' }, { name: 'Physical Merch', icon: 'Package', link: '/marketplace?category=PHYSICAL_MERCH' }, { name: 'Stickers', icon: 'Sticker', link: '/marketplace?category=STICKERS' }] }) },
    { pageSlug: 'home', type: 'NEW_DROPS', order: 3, isActive: true, content: JSON.stringify({ title: 'New Drops', maxDisplay: 8, autoMode: true }) },
  ];
  for (const s of sectionData) {
    await prisma.section.create({ data: { ...s, updatedAt: new Date() } });
  }

  // Announcement
  await prisma.announcement.create({ data: { text: '🎉 Welcome to NOIZU-DIRECT Beta! Creator fees are 0% during launch.', link: '/about', color: '#7c3aed', isActive: true } });

  console.log('✅ Seed complete');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

- [ ] Add to `package.json`: `"prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }`
- [ ] Install ts-node: `npm install ts-node --save-dev`
- [ ] Run: `npx prisma db seed`
- [ ] Verify seed: `npx prisma studio` — confirm all tables have data
- [ ] Commit: `git commit -m "feat: add database seed with sample data"`

### Task 0.5: Global Design System CSS + Tailwind Config

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`
- Create: `src/lib/utils.ts`
- Create: `src/lib/prisma.ts`
- Create: `src/lib/auth.ts`
- Create: `src/lib/fx.ts`

- [ ] Update `tailwind.config.ts` to extend with brand colors:
```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0d0d12',
        surface: '#16161f',
        card: '#1e1e2a',
        'primary-accent': '#7c3aed',
        'secondary-accent': '#00d4aa',
        'text-primary': '#f0f0f5',
        'text-muted': '#8888aa',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        'creator-gold': '#f59e0b',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
```

- [ ] Update `src/app/globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #0d0d12;
  --surface: #16161f;
  --card: #1e1e2a;
  --primary: #7c3aed;
  --secondary: #00d4aa;
  --text-primary: #f0f0f5;
  --text-muted: #8888aa;
}

* { box-sizing: border-box; }
body {
  background-color: #0d0d12;
  color: #f0f0f5;
  font-family: 'Poppins', sans-serif;
}
```

- [ ] Create `src/lib/prisma.ts` (singleton):
```ts
import { PrismaClient } from '@prisma/client';
declare global { var prisma: PrismaClient | undefined; }
export const prisma = global.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
```

- [ ] Create `src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function formatPrice(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}
export function generateInvoiceNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(sequence).padStart(5, '0')}`;
}
```

- [ ] Create `src/lib/fx.ts`:
```ts
export async function getFxRates(): Promise<Record<string, number>> {
  const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=MYR,SGD,PHP,IDR,THB', { next: { revalidate: 3600 } });
  const data = await res.json();
  return { USD: 1, ...data.rates };
}
export function convertFromUSD(amountCents: number, rate: number): number {
  return Math.round((amountCents / 100) * rate * 100);
}
```

- [ ] Create `src/lib/auth.ts` (NextAuth v5 config):
```ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: { type: 'email' }, password: { type: 'password' } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email as string } });
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = (user as any).role; }
      return token;
    },
    session({ session, token }) {
      if (session.user) { (session.user as any).id = token.id; (session.user as any).role = token.role; }
      return session;
    },
  },
});
```

- [ ] Create `src/app/api/auth/[...nextauth]/route.ts`:
```ts
export { handlers as GET, handlers as POST } from '@/lib/auth';
```

- [ ] Verify TypeScript: `npx tsc --noEmit`
- [ ] Commit: `git commit -m "feat: global design system, Prisma client, auth config, FX lib"`

---

## Phase 1 — Layout Components
**Stop after this phase and wait for user approval.**

### Task 1.1: Root Layout + Providers

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/providers/SessionProvider.tsx`
- Create: `src/components/ui/AnnouncementBar.tsx`

- [ ] Create `src/components/providers/SessionProvider.tsx`:
```tsx
'use client';
import { SessionProvider as NextSessionProvider } from 'next-auth/react';
export default function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextSessionProvider>{children}</NextSessionProvider>;
}
```

- [ ] Update `src/app/layout.tsx` — Poppins font, dark background, SessionProvider wrapper, AnnouncementBar
- [ ] Create `src/components/ui/AnnouncementBar.tsx` — fetches active announcement from DB and renders colored top bar
- [ ] Commit

### Task 1.2: Navbar

**Files:**
- Create: `src/components/layout/Navbar.tsx`

- [ ] Full responsive navbar with:
  - NOIZU-DIRECT logo (purple gradient text)
  - Desktop links: Marketplace, Creators
  - Auth state: Login/Register buttons OR user dropdown (Orders, Dashboard/Creator Dashboard, Admin, Logout)
  - Mobile: hamburger sheet menu
  - Unread message badge for logged-in users
- [ ] Style: `bg-surface border-b border-card` sticky top-0 z-50
- [ ] Commit

### Task 1.3: Footer

**Files:**
- Create: `src/components/layout/Footer.tsx`

- [ ] Footer with: NOIZU-DIRECT branding, links (About, Terms, Marketplace), social placeholder
- [ ] Dark card background
- [ ] Commit

### Task 1.4: Shared UI Components

**Files:**
- Create: `src/components/ui/ProductCard.tsx`
- Create: `src/components/ui/CreatorCard.tsx`
- Create: `src/components/ui/LoadingSpinner.tsx`
- Create: `src/components/ui/EmptyState.tsx`
- Create: `src/components/ui/PriceBadge.tsx`

- [ ] `ProductCard`: image, title, creator name + avatar, price in USD (and local currency via prop), category badge, type badge (DIGITAL/PHYSICAL), link to /product/[id]
- [ ] `CreatorCard`: banner thumbnail, avatar, displayName, category tags, isVerified badge, isTopCreator badge, totalSales
- [ ] `LoadingSpinner`, `EmptyState`, `PriceBadge` utilities
- [ ] Commit

---

## Phase 2 — Auth Pages
**Stop after this phase and wait for user approval.**

### Task 2.1: Login Page
**Files:** `src/app/(auth)/login/page.tsx`

- [ ] Email + password form using react-hook-form + zod
- [ ] Call NextAuth signIn('credentials', ...)
- [ ] Redirect to dashboard/account based on role after login
- [ ] Link to register page
- [ ] Dark theme card centered layout

### Task 2.2: Register Page
**Files:** `src/app/(auth)/register/page.tsx`, `src/app/api/auth/register/route.ts`

- [ ] Name + email + password + confirm password
- [ ] POST to /api/auth/register → hash password, create User (role=BUYER), auto-login
- [ ] Redirect to /account

### Task 2.3: Creator Registration
**Files:** `src/app/(auth)/register/creator/page.tsx`, `src/app/api/auth/register/creator/route.ts`

- [ ] Step 1: Basic info (same as register)
- [ ] Step 2: Creator profile (username, displayName, bio, category tags)
- [ ] Creates User (role=CREATOR) + CreatorProfile
- [ ] Redirect to /dashboard

---

## Phase 3 — Public Pages
**Stop after this phase and wait for user approval.**

### Task 3.1: Homepage (CMS-driven)
**Files:** `src/app/page.tsx`, `src/components/sections/HeroSection.tsx`, `src/components/sections/FeaturedCreatorsSection.tsx`, `src/components/sections/CategoriesSection.tsx`, `src/components/sections/NewDropsSection.tsx`

- [ ] Fetch active Sections from DB ordered by `order`
- [ ] Render each section type with its content JSON
- [ ] HERO: full-width dark gradient hero with headline, subtext, two CTAs
- [ ] FEATURED_CREATORS: horizontal scroll grid of CreatorCards
- [ ] CATEGORIES: icon grid with colored cards
- [ ] NEW_DROPS/TRENDING: product grid

### Task 3.2: Marketplace Page
**Files:** `src/app/marketplace/page.tsx`, `src/app/api/products/route.ts`

- [ ] Filter sidebar: category (multi-select), type (DIGITAL/PHYSICAL), price range
- [ ] Product grid (responsive: 2 cols mobile, 3 tablet, 4 desktop)
- [ ] URL-based filter state (?category=DIGITAL_ART&type=DIGITAL)
- [ ] Pagination (20 per page)
- [ ] Sort: newest, price asc/desc, popular

### Task 3.3: Creator Storefront
**Files:** `src/app/creator/[username]/page.tsx`

- [ ] Full-width banner + avatar + displayName + category tags + commissionStatus badge
- [ ] Stats row: total sales, product count
- [ ] AnnouncementBar (if announcementActive)
- [ ] Message Creator button (requires login → /account/messages?to=[creatorId])
- [ ] Follow button (localStorage)
- [ ] Tabs: Shop | About | Commission
- [ ] Pinned products (up to 3)
- [ ] Product grid with filter sidebar

### Task 3.4: Product Page
**Files:** `src/app/product/[id]/page.tsx`, `src/app/api/orders/create/route.ts`

- [ ] Image carousel (if multiple images)
- [ ] Title, price (with FX conversion dropdown), description
- [ ] Creator info card with link to storefront
- [ ] Category/type badges, stock indicator for PHYSICAL
- [ ] Buy Now button → creates Order (PENDING) → redirects to /checkout/[orderId]
- [ ] Processing fee display (2.5% default, unless creator absorbs it)

### Task 3.5: Static Pages
**Files:** `src/app/about/page.tsx`, `src/app/terms/page.tsx`

- [ ] Fetch Page by slug from DB, render content
- [ ] Seed /about and /terms page records with placeholder content

---

## Phase 4 — Checkout & Payments
**Stop after this phase and wait for user approval.**

### Task 4.1: Checkout Page
**Files:** `src/app/checkout/[orderId]/page.tsx`, `src/app/api/checkout/intent/route.ts`

- [ ] Order summary (product, creator, amounts)
- [ ] Currency selector (USD/MYR/SGD/PHP/IDR/THB) — live FX conversion
- [ ] Processing fee line item
- [ ] For PHYSICAL: shipping address form
- [ ] "Pay with Airwallex" button → POST /api/checkout/intent → creates PaymentIntent → redirect to Airwallex hosted checkout

### Task 4.2: Airwallex Integration
**Files:** `src/lib/airwallex.ts`, `src/app/api/webhooks/airwallex/route.ts`

- [ ] `src/lib/airwallex.ts`: authenticate (client_id + api_key → bearer token), createPaymentIntent(orderId, amount, currency), getPaymentIntent(intentId)
- [ ] Webhook handler: verify signature, handle `payment_intent.succeeded` → update Order to PAID, create Transaction record, for DIGITAL generate UUID downloadToken + 48h expiry, for PHYSICAL notify creator

### Task 4.3: Success + Download Pages
**Files:** `src/app/order/success/page.tsx`, `src/app/download/[token]/page.tsx`, `src/app/api/download/[token]/route.ts`

- [ ] Success page: confetti animation, order details, links to download (if digital) or track order
- [ ] Download page: verify token exists + not expired → serve file or show expired state
- [ ] API route: stream file from /public/uploads/products/[file]

---

## Phase 5 — Buyer Dashboard
**Stop after this phase and wait for user approval.**

### Task 5.1: Account Profile
**Files:** `src/app/account/page.tsx`, `src/app/api/account/profile/route.ts`

- [ ] Edit name, avatar upload, email (read-only)
- [ ] Avatar: upload to /public/uploads/avatars/

### Task 5.2: Orders Page
**Files:** `src/app/account/orders/page.tsx`

- [ ] List orders with status badges, product thumbnail, amount
- [ ] Link to download (if DIGITAL + PAID) or tracking info

### Task 5.3: Downloads Page
**Files:** `src/app/account/downloads/page.tsx`

- [ ] List DIGITAL orders that are PAID
- [ ] Download button with expiry countdown

### Task 5.4: Buyer Messages
**Files:** `src/app/account/messages/page.tsx`, `src/app/api/messages/route.ts`, `src/app/api/messages/[conversationId]/route.ts`

- [ ] Conversation list (left panel) + message thread (right panel)
- [ ] Send text messages and image uploads
- [ ] Poll every 5s for new messages
- [ ] Mark messages as read when conversation opens

---

## Phase 6 — Creator Dashboard
**Stop after this phase and wait for user approval.**

### Task 6.1: Dashboard Overview
**Files:** `src/app/dashboard/page.tsx`, `src/app/api/dashboard/stats/route.ts`

- [ ] Stats cards: total revenue, pending orders, active listings, unread messages
- [ ] Recent orders table
- [ ] Quick links to all dashboard sections

### Task 6.2: Product Listings CRUD
**Files:** `src/app/dashboard/listings/page.tsx`, `src/app/dashboard/listings/new/page.tsx`, `src/app/dashboard/listings/[id]/edit/page.tsx`, `src/app/api/products/[id]/route.ts`, `src/app/api/upload/route.ts`

- [ ] Listings table with toggle active/inactive, pin, delete
- [ ] New/Edit form: title, description, price, category, type, images (multi-upload), digital file upload (if DIGITAL), stock (if PHYSICAL)
- [ ] Image upload: POST /api/upload → saves to /public/uploads/products/, returns URL
- [ ] File upload for digital products: same API, different subdir

### Task 6.3: Creator Orders
**Files:** `src/app/dashboard/orders/page.tsx`, `src/app/api/dashboard/orders/route.ts`

- [ ] Orders list filterable by status
- [ ] Update status (PROCESSING → SHIPPED) with tracking number input for PHYSICAL
- [ ] Mark COMPLETED

### Task 6.4: Creator Messages
**Files:** `src/app/dashboard/messages/page.tsx`

- [ ] Same chat UI as buyer but from creator perspective
- [ ] Commission status toggle (OPEN/BUSY/CLOSED)

### Task 6.5: Fan Management
**Files:** `src/app/dashboard/fans/page.tsx`, `src/app/api/dashboard/fans/route.ts`

- [ ] All buyers who purchased, with total spent
- [ ] Tag system (VIP, Frequent Buyer, Commission Client) — stored in BuyerTag
- [ ] Private notes per buyer
- [ ] Send announcement modal (stores as Announcement + marks which buyers to notify — simplified: just create a new announcement)

### Task 6.6: Earnings & Payouts
**Files:** `src/app/dashboard/earnings/page.tsx`, `src/app/dashboard/earnings/payout/page.tsx`, `src/app/dashboard/earnings/statements/page.tsx`, `src/app/api/dashboard/earnings/route.ts`, `src/app/api/dashboard/payout/route.ts`

- [ ] Earnings: available balance (sum of creatorAmount from completed transactions minus pending payouts), transaction history table
- [ ] Payout request: enter amount, confirm 4% withdrawal fee, submit → creates Payout(PENDING), triggers Airwallex payout API
- [ ] Statements: list of monthly statement PDFs, download links

### Task 6.7: Creator Profile Edit
**Files:** `src/app/dashboard/profile/page.tsx`, `src/app/api/dashboard/profile/route.ts`

- [ ] Edit: displayName, bio, avatar upload, banner upload, socialLinks, categoryTags, commissionStatus, announcementText, announcementActive, absorbProcessingFee toggle

---

## Phase 7 — Admin Panel
**Stop after this phase and wait for user approval.**

### Task 7.1: Admin Layout + Overview
**Files:** `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`

- [ ] Sidebar navigation with all admin sections
- [ ] Overview: platform stats (total users, creators, revenue, pending payouts)
- [ ] Role guard: redirect if not ADMIN

### Task 7.2: Creator & Product Management
**Files:** `src/app/admin/creators/page.tsx`, `src/app/admin/products/page.tsx`, API routes

- [ ] Creators: list, verify/unverify, assign badges (topCreator, Convention Veteran, NOIZU Member), suspend
- [ ] Products: list all, toggle active/inactive, delete

### Task 7.3: Orders & Transactions
**Files:** `src/app/admin/orders/page.tsx`, `src/app/admin/transactions/page.tsx`

- [ ] Orders: full platform order list, status filters, search
- [ ] Transactions: ledger view with fee breakdown

### Task 7.4: Payout Management
**Files:** `src/app/admin/payouts/page.tsx`, `src/app/api/admin/payouts/[id]/route.ts`

- [ ] Pending payouts list
- [ ] Approve payout → trigger Airwallex → mark PROCESSING/COMPLETED

### Task 7.5: CMS Manager
**Files:** `src/app/admin/cms/sections/page.tsx`, `src/app/admin/cms/pages/page.tsx`, `src/app/api/admin/cms/sections/route.ts`

- [ ] Sections: list with drag-to-reorder (dnd-kit), toggle active, edit content JSON in a structured form per section type
- [ ] Pages: create/edit/publish/draft Page records

### Task 7.6: Media, Announcements, Settings
**Files:** `src/app/admin/media/page.tsx`, `src/app/admin/announcements/page.tsx`, `src/app/admin/settings/page.tsx`

- [ ] Media library: grid of uploaded files, delete
- [ ] Announcements: create/toggle active/delete announcement bars
- [ ] Settings: edit PlatformSettings (processing fee %, withdrawal fee %, topCreator threshold)

---

## Phase 8 — PDF Invoice Generation
**Stop after this phase and wait for user approval.**

### Task 8.1: PDF Templates
**Files:** `src/lib/pdf/PurchaseReceipt.tsx`, `src/lib/pdf/PayoutInvoice.tsx`, `src/lib/pdf/MonthlyStatement.tsx`, API routes

- [ ] Install: `npm install @react-pdf/renderer`
- [ ] Purchase receipt: INV-YYYY-NNNNN, product details, amounts, FX rate, PAID status badge
- [ ] Payout invoice: creator name, amount, 4% fee deduction, net
- [ ] Monthly statement: orders table, totals, payout history
- [ ] API routes to generate and serve PDFs: `POST /api/invoices/generate`
- [ ] Auto-generate purchase receipt on Order PAID webhook
- [ ] Store PDF path in Invoice record

---

## Phase 9 — Final Polish
**Stop after this phase and wait for user approval.**

- [ ] Loading skeletons for all data-fetching pages
- [ ] Empty states for all list views
- [ ] 404 page (dark theme)
- [ ] Error boundaries
- [ ] Mobile responsive pass (test all pages at 375px)
- [ ] Verify all nav links work
- [ ] Test full checkout flow end-to-end
- [ ] `npm run build` — fix any TypeScript/build errors
- [ ] Final commit

---

## Acceptance Criteria (per phase)

| Phase | Pass Criteria |
|-------|--------------|
| 0 | `npm run dev -p 7000` starts, DB has seed data, `npx prisma studio` shows all tables |
| 1 | Navbar, footer, cards render; dark theme is correct; Poppins font loads |
| 2 | Can login, register, creator register; JWT session works; role-based redirect |
| 3 | Homepage CMS sections render; marketplace filters work; creator page shows products |
| 4 | Checkout creates Airwallex intent; webhook updates order; download token works |
| 5 | Buyer can view orders, download digital files, send messages |
| 6 | Creator can CRUD products, manage orders, request payout, see earnings |
| 7 | Admin can manage all entities, edit CMS, approve payouts |
| 8 | PDFs generate without error, correct data, stored to /storage/invoices/ |
| 9 | Build passes, mobile-responsive, no broken links |

---

## Notes
- **Ask user before starting each phase**
- Airwallex sandbox credentials must be set in .env.local before Phase 4
- Port 7000 configured in package.json dev script
- Dark theme only — no light mode toggle
- `src/` directory structure (Next.js --src-dir flag)
