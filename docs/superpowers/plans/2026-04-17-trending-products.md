# Trending Products Algorithm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a full trending products algorithm — view tracking, time-decayed scoring, admin controls, and surfacing on homepage, marketplace, and creator storefronts.

**Architecture:** View events are tracked via a lightweight POST endpoint called by a thin client component on the product page. A cron job periodically scores all active products using orders/wishlist/cart/views counts with time decay and writes scores back to the Product table. Admin can pin, suppress, and trigger recalculation from the admin panel.

**Tech Stack:** Prisma (SQLite), Next.js 16 App Router, Tailwind CSS, `uuid` (already installed), `node:crypto` for session ID generation.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `prisma/schema.prisma` | Modify | Add ProductView, ProductTrendingScore models; add trending fields to Product |
| `src/lib/trendingConfig.ts` | Create | Algorithm weights, decay factor, window days |
| `src/lib/trackProductView.ts` | Create | Dedup check + ProductView insert (server-side) |
| `src/lib/trendingCalculator.ts` | Create | Core score calculation logic (used by cron + admin) |
| `src/app/api/track/view/route.ts` | Create | POST endpoint for client view tracking calls |
| `src/components/ui/ProductViewTracker.tsx` | Create | Client component: reads/sets nd_session cookie, calls tracking API |
| `src/app/product/[id]/page.tsx` | Modify | Add `<ProductViewTracker productId={id} />` to page |
| `src/app/api/cron/trending/route.ts` | Create | POST cron endpoint, x-cron-secret protected |
| `src/app/api/admin/trending/recalculate/route.ts` | Create | POST admin endpoint, requireAdmin() protected, calls trendingCalculator |
| `src/components/sections/TrendingSection.tsx` | Create | Homepage section: top 8 by trendingScore |
| `src/app/page.tsx` | Modify | Add TRENDING case to sections switch |
| `src/app/api/products/route.ts` | Modify | Add TRENDING sort case → orderBy trendingScore DESC |
| `src/app/marketplace/MarketplaceClient.tsx` | Modify | Add "Trending" option to SORT_OPTIONS |
| `src/app/creator/[username]/page.tsx` | Modify | Include trendingScore in products query |
| `src/app/creator/[username]/CreatorPageTabs.tsx` | Modify | Add Popular sort selector in Shop tab (client-side sort) |
| `src/app/admin/products/page.tsx` | Modify | Add trendingScore/manualBoost columns, include fields in query |
| `src/app/admin/products/TrendingActions.tsx` | Create | Client component: Pin/Unpin/Suppress/Unsuppress/Breakdown buttons |
| `src/app/api/admin/products/[id]/route.ts` | Modify | PATCH: allow manualBoost + isTrendingSuppressed |
| `src/app/admin/page.tsx` | Modify | Add trending card: top 10, last calculated, Recalculate Now button |
| `src/app/admin/settings/page.tsx` | Modify | Add read-only TRENDING_CONFIG display section |
| `src/app/admin/storage/AdminStorageClient.tsx` | Modify | Add Trending Recalculation button to Cron Controls |

---

## Task 1: Schema Changes

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add trending fields to Product model**

Open `prisma/schema.prisma`. Find the `model Product` block. Add these fields inside it (before the closing `}`):

```prisma
  trendingScore        Float    @default(0)
  trendingVersion      Int      @default(1)
  trendingUpdatedAt    DateTime?
  manualBoost          Int      @default(0)
  isTrendingSuppressed Boolean  @default(false)
```

- [ ] **Step 2: Add ProductView model**

After the `model Product` block (or at the end of the file, before any closing comment), add:

```prisma
// ── Product View Tracking ──────────────────────────────────────────────────────

model ProductView {
  id         String   @id @default(cuid())
  productId  String
  sessionId  String
  userId     String?
  ipAddress  String?
  createdAt  DateTime @default(now())

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId, createdAt])
  @@index([ipAddress, productId, createdAt])
}
```

- [ ] **Step 3: Add ProductTrendingScore model**

Below the ProductView model, add:

```prisma
// ── Trending Score Shadow Table ────────────────────────────────────────────────

model ProductTrendingScore {
  id           String   @id @default(cuid())
  productId    String   @unique
  version      Int
  score        Float
  breakdown    String
  calculatedAt DateTime @default(now())

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 4: Add relation fields to Product model**

In the `model Product` block, add these relation fields at the end (after existing relations):

```prisma
  views         ProductView[]
  trendingScore ProductTrendingScore?
```

> Note: The scalar field `trendingScore Float` conflicts with the relation name. Rename the relation field to `trendingScoreRecord`:
> 
> ```prisma
>   trendingScoreRecord ProductTrendingScore?
> ```

- [ ] **Step 5: Run db push and generate**

```bash
cd C:\Users\ruper\noizu-direct
npx prisma db push
npx prisma generate
```

Expected: "The database is already in sync" or "Your database is now in sync" for db push, then "Generated Prisma Client" for generate. If there are errors, check the schema syntax.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/generated/
git commit -m "feat: add ProductView, ProductTrendingScore models + trending fields to Product"
```

---

## Task 2: Algorithm Config

**Files:**
- Create: `src/lib/trendingConfig.ts`

- [ ] **Step 1: Create the config file**

```typescript
export const TRENDING_CONFIG = {
  version: 1,
  weights: {
    orders:   0.40,
    wishlist: 0.30,
    cart:     0.20,
    views:    0.10,
  },
  decayFactor: 0.9,
  windowDays: 7,
} as const
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/trendingConfig.ts
git commit -m "feat: add trending algorithm config"
```

---

## Task 3: View Tracker (server-side)

**Files:**
- Create: `src/lib/trackProductView.ts`

- [ ] **Step 1: Create the function**

```typescript
import { prisma } from '@/lib/prisma'

interface TrackArgs {
  productId: string
  sessionId: string
  userId?: string | null
  ipAddress?: string | null
}

export async function trackProductView({ productId, sessionId, userId, ipAddress }: TrackArgs): Promise<void> {
  try {
    if (ipAddress) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const existing = await prisma.productView.findFirst({
        where: {
          ipAddress,
          productId,
          createdAt: { gte: oneHourAgo },
        },
        select: { id: true },
      })
      if (existing) return
    }

    await prisma.productView.create({
      data: { productId, sessionId, userId: userId ?? null, ipAddress: ipAddress ?? null },
    })
  } catch {
    // fire and forget — never throw, never block page load
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/trackProductView.ts
git commit -m "feat: add server-side product view tracker with 1-hour dedup"
```

---

## Task 4: View Tracking API Endpoint + Client Component

**Files:**
- Create: `src/app/api/track/view/route.ts`
- Create: `src/components/ui/ProductViewTracker.tsx`

- [ ] **Step 1: Create the API endpoint**

```typescript
// src/app/api/track/view/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { trackProductView } from '@/lib/trackProductView'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { productId?: string; sessionId?: string; userId?: string }

    if (!body.productId || !body.sessionId) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const forwarded = req.headers.get('x-forwarded-for')
    const realIp    = req.headers.get('x-real-ip')
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : (realIp ?? null)

    await trackProductView({
      productId: body.productId,
      sessionId: body.sessionId,
      userId:    body.userId ?? null,
      ipAddress,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create the client component**

```tsx
// src/components/ui/ProductViewTracker.tsx
'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface Props {
  productId: string
}

function getOrCreateSessionId(): string {
  const cookieName = 'nd_session'
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + cookieName + '=([^;]*)'))
  if (match) return match[1]

  // Generate a simple random session ID using crypto
  const id = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const oneYear = 365 * 24 * 60 * 60
  document.cookie = `${cookieName}=${id}; path=/; max-age=${oneYear}; SameSite=Lax`
  return id
}

export function ProductViewTracker({ productId }: Props) {
  const { data: session } = useSession()

  useEffect(() => {
    const sessionId = getOrCreateSessionId()
    const userId = (session?.user as any)?.id as string | undefined

    void fetch('/api/track/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, sessionId, userId: userId ?? null }),
    }).catch(() => { /* fire and forget */ })
  // Run once on mount — intentionally exclude session from deps to avoid double-fire
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  return null
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/track/view/route.ts src/components/ui/ProductViewTracker.tsx
git commit -m "feat: add view tracking API endpoint and ProductViewTracker client component"
```

---

## Task 5: Wire View Tracking into Product Page

**Files:**
- Modify: `src/app/product/[id]/page.tsx`

- [ ] **Step 1: Import ProductViewTracker**

At the top of `src/app/product/[id]/page.tsx`, add to the imports:

```typescript
import { ProductViewTracker } from '@/components/ui/ProductViewTracker'
```

- [ ] **Step 2: Add tracker component to JSX**

In `ProductPage`, inside the `return (...)`, immediately after the opening `<div className="min-h-screen bg-background py-8 pb-24 md:pb-8">` tag (and before `<JsonLd ...>`), add:

```tsx
<ProductViewTracker productId={product.id} />
```

The return block should now start:
```tsx
return (
  <div className="min-h-screen bg-background py-8 pb-24 md:pb-8">
    <ProductViewTracker productId={product.id} />
    <JsonLd data={[productSchema, productBreadcrumbSchema]} />
    ...
```

- [ ] **Step 3: Commit**

```bash
git add src/app/product/[id]/page.tsx
git commit -m "feat: wire product view tracking into product detail page"
```

---

## Task 6: Core Trending Calculator

**Files:**
- Create: `src/lib/trendingCalculator.ts`

- [ ] **Step 1: Create the calculator**

```typescript
// src/lib/trendingCalculator.ts
import { prisma } from '@/lib/prisma'
import { TRENDING_CONFIG } from '@/lib/trendingConfig'

export interface TrendingResult {
  processed: number
  updated: number
  version: number
  calculatedAt: string
}

export async function runTrendingCalculation(): Promise<TrendingResult> {
  const { version, weights, decayFactor, windowDays } = TRENDING_CONFIG
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
  const now = new Date()

  const products = await prisma.product.findMany({
    where: { isActive: true, isTrendingSuppressed: false },
    select: { id: true, manualBoost: true },
  })

  let updated = 0

  for (const product of products) {
    const [orders_7d, wishlist_7d, cart_7d, views_7d] = await Promise.all([
      prisma.order.count({ where: { productId: product.id, createdAt: { gte: windowStart } } }),
      prisma.wishlistItem.count({ where: { productId: product.id, createdAt: { gte: windowStart } } }),
      prisma.cartItem.count({ where: { productId: product.id, createdAt: { gte: windowStart } } }),
      prisma.productView.count({ where: { productId: product.id, createdAt: { gte: windowStart } } }),
    ])

    const raw =
      orders_7d   * weights.orders +
      wishlist_7d * weights.wishlist +
      cart_7d     * weights.cart +
      views_7d    * weights.views

    // Find most recent activity for decay
    const [latestOrder, latestWishlist, latestCart, latestView] = await Promise.all([
      prisma.order.findFirst({ where: { productId: product.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      prisma.wishlistItem.findFirst({ where: { productId: product.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      prisma.cartItem.findFirst({ where: { productId: product.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      prisma.productView.findFirst({ where: { productId: product.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    ])

    const timestamps = [latestOrder, latestWishlist, latestCart, latestView]
      .map(r => r?.createdAt)
      .filter((d): d is Date => d != null)

    const mostRecent = timestamps.length > 0
      ? new Date(Math.max(...timestamps.map(d => d.getTime())))
      : null

    const daysSinceActivity = mostRecent
      ? (now.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24)
      : windowDays

    const decayedScore = raw * Math.pow(decayFactor, daysSinceActivity)
    const finalScore = decayedScore + product.manualBoost

    const breakdown = JSON.stringify({
      orders_7d,
      wishlist_7d,
      cart_7d,
      views_7d,
      raw,
      decay_applied: decayedScore,
      manualBoost: product.manualBoost,
      final: finalScore,
      version,
    })

    await Promise.all([
      prisma.productTrendingScore.upsert({
        where: { productId: product.id },
        update: { version, score: finalScore, breakdown, calculatedAt: now },
        create: { productId: product.id, version, score: finalScore, breakdown, calculatedAt: now },
      }),
      prisma.product.update({
        where: { id: product.id },
        data: {
          trendingScore: finalScore,
          trendingVersion: version,
          trendingUpdatedAt: now,
        },
      }),
    ])

    updated++
  }

  return {
    processed: products.length,
    updated,
    version,
    calculatedAt: now.toISOString(),
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/trendingCalculator.ts
git commit -m "feat: implement core trending score calculator with decay"
```

---

## Task 7: Trending Cron Endpoint + Admin Recalculate Endpoint

**Files:**
- Create: `src/app/api/cron/trending/route.ts`
- Create: `src/app/api/admin/trending/recalculate/route.ts`

- [ ] **Step 1: Create the cron endpoint**

```typescript
// src/app/api/cron/trending/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { runTrendingCalculation } from '@/lib/trendingCalculator'

export async function POST(req: NextRequest) {
  const cronSecret    = process.env.CRON_SECRET
  const headerSecret  = req.headers.get('x-cron-secret')

  if (!cronSecret || headerSecret !== cronSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const result = await runTrendingCalculation()
  return NextResponse.json(result)
}
```

- [ ] **Step 2: Create the admin recalculate endpoint**

```typescript
// src/app/api/admin/trending/recalculate/route.ts
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { runTrendingCalculation } from '@/lib/trendingCalculator'

export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const result = await runTrendingCalculation()
  return NextResponse.json(result)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/trending/route.ts src/app/api/admin/trending/recalculate/route.ts
git commit -m "feat: add trending cron endpoint and admin recalculate endpoint"
```

---

## Task 8: Homepage Trending Section

**Files:**
- Create: `src/components/sections/TrendingSection.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create TrendingSection component**

```tsx
// src/components/sections/TrendingSection.tsx
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ProductCard } from '@/components/ui/ProductCard'

interface TrendingContent {
  title: string
  maxDisplay: number
}

export default async function TrendingSection({ content }: { content: TrendingContent }) {
  const take = content.maxDisplay ?? 8

  let products = await prisma.product.findMany({
    where: { isActive: true, isTrendingSuppressed: false, creator: { storeStatus: 'ACTIVE' } },
    orderBy: { trendingScore: 'desc' },
    take,
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      category: true,
      type: true,
      images: true,
      trendingScore: true,
      creator: {
        select: {
          username: true,
          displayName: true,
          avatar: true,
          isVerified: true,
          isTopCreator: true,
        },
      },
    },
  })

  // Fall back to newest if all scores are 0
  if (products.every(p => p.trendingScore === 0)) {
    products = await prisma.product.findMany({
      where: { isActive: true, creator: { storeStatus: 'ACTIVE' } },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        category: true,
        type: true,
        images: true,
        trendingScore: true,
        creator: {
          select: {
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true,
            isTopCreator: true,
          },
        },
      },
    })
  }

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-foreground">{content.title}</h2>
          <Link href="/marketplace?sort=TRENDING" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>

        {products.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">No trending products yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add TRENDING case to homepage sections switch**

In `src/app/page.tsx`, add the import at the top with the other section imports:

```typescript
import TrendingSection from '@/components/sections/TrendingSection'
```

In the `sections.map()` switch statement, add before the `default:` case:

```typescript
case 'TRENDING':
  return <TrendingSection key={section.id} content={content} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/TrendingSection.tsx src/app/page.tsx
git commit -m "feat: add TrendingSection component for homepage CMS"
```

---

## Task 9: Marketplace Trending Sort

**Files:**
- Modify: `src/app/api/products/route.ts`
- Modify: `src/app/marketplace/MarketplaceClient.tsx`

- [ ] **Step 1: Add TRENDING sort to the products API**

In `src/app/api/products/route.ts`, in the `switch (sort)` block, add before the `case 'NEWEST':` case:

```typescript
case 'TRENDING':
  orderBy = [{ trendingScore: 'desc' }, { createdAt: 'desc' }]
  break
```

Also add `trendingScore: true` to the `select` block in `prisma.product.findMany`:

```typescript
select: {
  id: true,
  title: true,
  description: true,
  price: true,
  category: true,
  type: true,
  images: true,
  stock: true,
  isPinned: true,
  trendingScore: true,   // ← add this
  createdAt: true,
  creator: { ... },
},
```

- [ ] **Step 2: Add Trending to MarketplaceClient SORT_OPTIONS**

In `src/app/marketplace/MarketplaceClient.tsx`, update the `SORT_OPTIONS` constant:

```typescript
const SORT_OPTIONS = [
  { value: 'NEWEST',   label: 'Newest' },
  { value: 'TRENDING', label: 'Trending' },
  { value: 'PRICE_ASC',  label: 'Price: Low to High' },
  { value: 'PRICE_DESC', label: 'Price: High to Low' },
  { value: 'POPULAR',    label: 'Most Popular' },
] as const
```

Update the `SortOption` type to include `'TRENDING'`:

```typescript
type SortOption = (typeof SORT_OPTIONS)[number]['value']
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/products/route.ts src/app/marketplace/MarketplaceClient.tsx
git commit -m "feat: add Trending sort option to marketplace"
```

---

## Task 10: Creator Storefront Popular Sort

**Files:**
- Modify: `src/app/creator/[username]/page.tsx`
- Modify: `src/app/creator/[username]/CreatorPageTabs.tsx`

- [ ] **Step 1: Add trendingScore to creator products query**

In `src/app/creator/[username]/page.tsx`, find the `creator.products` query (part of the `prisma.creatorProfile.findUnique` call). The products are loaded via relation — change from an implicit include to an explicit select by replacing:

```typescript
products: {
  where: { isActive: true },
  orderBy: [{ isPinned: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
},
```

with:

```typescript
products: {
  where: { isActive: true },
  orderBy: [{ isPinned: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
  select: {
    id: true,
    title: true,
    description: true,
    price: true,
    category: true,
    type: true,
    images: true,
    isPinned: true,
    isNew: true,
    trendingScore: true,
    order: true,
    createdAt: true,
  },
},
```

- [ ] **Step 2: Add trendingScore to ProductWithCreator interface in CreatorPageTabs.tsx**

In `src/app/creator/[username]/CreatorPageTabs.tsx`, update the `ProductWithCreator` interface to add `trendingScore`:

```typescript
interface ProductWithCreator {
  id: string
  title: string
  description: string
  price: number
  category: string
  type: string
  images: string
  isPinned: boolean
  isNew?: boolean
  trendingScore: number    // ← add this
  creator: {
    username: string
    displayName: string
    avatar: string | null
    isVerified: boolean
    isTopCreator: boolean
  }
}
```

- [ ] **Step 3: Add sort state and selector to Shop tab in CreatorPageTabs.tsx**

Find the Shop tab rendering section in `CreatorPageTabs.tsx` (the `'SHOP'` tab content). Add a sort state at the top of the `CreatorPageTabs` function component:

```typescript
const [shopSort, setShopSort] = useState<'DEFAULT' | 'POPULAR'>('DEFAULT')
```

Then in the Shop tab content, add this sort selector above the product grid (after the tab content opening, before the products map):

```tsx
{/* Shop sort */}
<div className="flex items-center justify-end mb-4">
  <select
    suppressHydrationWarning
    value={shopSort}
    onChange={e => setShopSort(e.target.value as 'DEFAULT' | 'POPULAR')}
    className="text-sm bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
  >
    <option value="DEFAULT">Default</option>
    <option value="POPULAR">Popular</option>
  </select>
</div>
```

And replace `products.map(...)` with sorted products:

```typescript
const sortedProducts = shopSort === 'POPULAR'
  ? [...products].sort((a, b) => b.trendingScore - a.trendingScore)
  : products
```

Then use `sortedProducts.map(...)` instead of `products.map(...)`.

> **Note:** The `products` prop also needs a `creator` shape attached. The products are loaded as a relation on `creator` in `page.tsx`, so they lack the nested `creator` field. The ProductCard likely needs creator data — check how the Shop tab builds ProductCard props. If `ProductCard` requires the `creator` field, build it from the parent `creator` object: use a mapping like `sortedProducts.map(p => ({ ...p, creator: { username: creatorUsername, displayName, ... } }))`. Look at how existing product mapping works in the Shop tab before implementing.

- [ ] **Step 4: Commit**

```bash
git add src/app/creator/[username]/page.tsx src/app/creator/[username]/CreatorPageTabs.tsx
git commit -m "feat: add Popular sort to creator storefront shop tab"
```

---

## Task 11: Admin Products — Trending Columns + Actions

**Files:**
- Modify: `src/app/admin/products/page.tsx`
- Create: `src/app/admin/products/TrendingActions.tsx`
- Modify: `src/app/api/admin/products/[id]/route.ts`

- [ ] **Step 1: Update admin products PATCH to allow trending fields**

In `src/app/api/admin/products/[id]/route.ts`, in the `PATCH` handler, update the `allowed` object construction:

```typescript
const allowed: Record<string, unknown> = {}
if (typeof body.isActive === 'boolean')          allowed.isActive = body.isActive
if (typeof body.manualBoost === 'number')         allowed.manualBoost = body.manualBoost
if (typeof body.isTrendingSuppressed === 'boolean') allowed.isTrendingSuppressed = body.isTrendingSuppressed
```

- [ ] **Step 2: Create TrendingActions client component**

```tsx
// src/app/admin/products/TrendingActions.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  productId: string
  manualBoost: number
  isTrendingSuppressed: boolean
  breakdown: string | null
}

export function TrendingActions({ productId, manualBoost, isTrendingSuppressed, breakdown }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)

  async function patch(data: Record<string, unknown>) {
    setLoading(true)
    try {
      await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  let parsed: Record<string, unknown> | null = null
  try { parsed = breakdown ? JSON.parse(breakdown) : null } catch { /* ignore */ }

  const LABELS: Record<string, string> = {
    orders_7d:     'Orders (7d)',
    wishlist_7d:   'Wishlist adds (7d)',
    cart_7d:       'Cart adds (7d)',
    views_7d:      'Views (7d)',
    raw:           'Raw score',
    decay_applied: 'Decay applied',
    manualBoost:   'Manual boost',
    final:         'Final score',
    version:       'Algorithm version',
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {!isTrendingSuppressed ? (
        <button
          onClick={() => void patch({ isTrendingSuppressed: true })}
          disabled={loading}
          className="px-2 py-0.5 rounded text-xs font-medium bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors disabled:opacity-50"
        >
          Suppress
        </button>
      ) : (
        <button
          onClick={() => void patch({ isTrendingSuppressed: false })}
          disabled={loading}
          className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
        >
          Unsuppress
        </button>
      )}

      {manualBoost === 0 ? (
        <button
          onClick={() => void patch({ manualBoost: 999 })}
          disabled={loading}
          className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          Pin
        </button>
      ) : (
        <button
          onClick={() => void patch({ manualBoost: 0 })}
          disabled={loading}
          className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
        >
          Unpin
        </button>
      )}

      {parsed && (
        <>
          <button
            onClick={() => setShowBreakdown(v => !v)}
            className="px-2 py-0.5 rounded text-xs font-medium bg-border text-muted-foreground hover:text-foreground transition-colors"
          >
            {showBreakdown ? 'Hide' : 'Score'}
          </button>

          {showBreakdown && (
            <div className="w-full mt-2 rounded-lg bg-background border border-border p-3 text-xs space-y-1">
              {Object.entries(LABELS).map(([key, label]) =>
                parsed![key] !== undefined ? (
                  <div key={key} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground font-mono">
                      {typeof parsed![key] === 'number'
                        ? (parsed![key] as number).toFixed(4)
                        : String(parsed![key])}
                    </span>
                  </div>
                ) : null
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update admin products page query and table**

In `src/app/admin/products/page.tsx`:

**Update the query** to include trending fields and join ProductTrendingScore:

```typescript
prisma.product.findMany({
  where,
  include: {
    creator: { select: { id: true, displayName: true } },
    trendingScoreRecord: { select: { breakdown: true } },  // ← add
  },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * PER_PAGE,
  take: PER_PAGE,
}),
```

**Add `trendingScore` and `manualBoost` to the select** (they're on Product, so they come automatically once in `include`).

**Add import** for `TrendingActions` at the top:

```typescript
import { TrendingActions } from './TrendingActions'
```

**Update the table header** — add two columns after "Status":

```tsx
<th className="text-left px-4 py-3 text-muted-foreground font-medium">Score</th>
<th className="text-left px-4 py-3 text-muted-foreground font-medium">Boost</th>
```

And update the `colSpan` on the empty state `<td>` from `8` to `10`.

**Update the table rows** — add two cells after the Status cell:

```tsx
<td className="px-4 py-3 text-muted-foreground text-xs font-mono">
  {product.trendingScore.toFixed(2)}
  {product.isTrendingSuppressed && <span className="ml-1 text-orange-400">(sup)</span>}
</td>
<td className="px-4 py-3 text-muted-foreground text-xs font-mono">
  {product.manualBoost > 0 ? (
    <span className="text-primary font-semibold">{product.manualBoost}</span>
  ) : '—'}
</td>
```

**Replace the Actions cell** content with both existing `ProductAdminActions` and the new `TrendingActions`:

```tsx
<td className="px-4 py-3">
  <div className="space-y-1">
    <ProductAdminActions productId={product.id} isActive={product.isActive} />
    <TrendingActions
      productId={product.id}
      manualBoost={product.manualBoost}
      isTrendingSuppressed={product.isTrendingSuppressed}
      breakdown={product.trendingScoreRecord?.breakdown ?? null}
    />
  </div>
</td>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/products/page.tsx src/app/admin/products/TrendingActions.tsx src/app/api/admin/products/[id]/route.ts
git commit -m "feat: add trending score columns and pin/suppress actions to admin products table"
```

---

## Task 12: Admin Overview — Trending Card

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Add trending query to admin overview**

In `src/app/admin/page.tsx`, update the `Promise.all` to also fetch trending data:

```typescript
const [userCount, creatorCount, revenueAgg, pendingPayouts, recentOrders, topTrending] = await Promise.all([
  prisma.user.count(),
  prisma.creatorProfile.count(),
  prisma.transaction.aggregate({ where: { status: 'COMPLETED' }, _sum: { grossAmountUsd: true } }),
  prisma.payout.count({ where: { status: 'PENDING' } }),
  prisma.order.findMany({
    include: {
      buyer: { select: { name: true, email: true } },
      product: { select: { title: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  }),
  prisma.product.findMany({
    where: { isActive: true },
    orderBy: { trendingScore: 'desc' },
    take: 10,
    select: {
      id: true,
      title: true,
      trendingScore: true,
      trendingUpdatedAt: true,
      manualBoost: true,
      isTrendingSuppressed: true,
      trendingScoreRecord: { select: { breakdown: true, calculatedAt: true } },
      creator: { select: { displayName: true } },
    },
  }),
])
```

- [ ] **Step 2: Add import and trending card JSX**

Add this import at the top:

```typescript
import { TRENDING_CONFIG } from '@/lib/trendingConfig'
```

Add this client component inline at the bottom of the file (or as a separate file `src/app/admin/TrendingCard.tsx`):

Add a `'use client'` admin recalculate button component. The easiest way is to wrap just the button in a client island. Create `src/app/admin/RecalculateButton.tsx`:

```tsx
// src/app/admin/RecalculateButton.tsx
'use client'

import { useState } from 'react'

export function RecalculateButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function recalculate() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/trending/recalculate', { method: 'POST' })
      const data = await res.json() as { processed: number; updated: number; version: number; calculatedAt: string }
      setResult(`${data.updated} products updated, v${data.version}, at ${new Date(data.calculatedAt).toLocaleTimeString()}`)
    } catch {
      setResult('Error — check console')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={() => void recalculate()}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        {loading ? 'Calculating…' : '▶ Recalculate Now'}
      </button>
      {result && <span className="text-xs text-muted-foreground">{result}</span>}
    </div>
  )
}
```

Then in `src/app/admin/page.tsx`, add import:

```typescript
import { RecalculateButton } from './RecalculateButton'
```

Add the trending card section after the Recent Orders section:

```tsx
{/* Trending Products Card */}
<div className="bg-card rounded-xl border border-border overflow-hidden">
  <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-3">
    <div>
      <h3 className="text-sm font-semibold text-foreground">Trending Products</h3>
      <p className="text-xs text-muted-foreground mt-0.5">
        Algorithm v{TRENDING_CONFIG.version} · {TRENDING_CONFIG.windowDays}d window ·{' '}
        {topTrending[0]?.trendingScoreRecord?.calculatedAt
          ? `Last calculated ${new Date(topTrending[0].trendingScoreRecord.calculatedAt).toLocaleString()}`
          : 'Not yet calculated'}
      </p>
    </div>
    <RecalculateButton />
  </div>
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border">
          <th className="text-left px-4 py-2 text-muted-foreground font-medium">#</th>
          <th className="text-left px-4 py-2 text-muted-foreground font-medium">Product</th>
          <th className="text-left px-4 py-2 text-muted-foreground font-medium">Creator</th>
          <th className="text-right px-4 py-2 text-muted-foreground font-medium">Score</th>
          <th className="text-right px-4 py-2 text-muted-foreground font-medium">Boost</th>
        </tr>
      </thead>
      <tbody>
        {topTrending.map((p, i) => (
          <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface">
            <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{i + 1}</td>
            <td className="px-4 py-2 text-foreground max-w-xs truncate">
              {p.title}
              {p.isTrendingSuppressed && <span className="ml-1 text-xs text-orange-400">(suppressed)</span>}
            </td>
            <td className="px-4 py-2 text-muted-foreground">{p.creator.displayName}</td>
            <td className="px-4 py-2 text-right font-mono text-xs text-foreground">{p.trendingScore.toFixed(2)}</td>
            <td className="px-4 py-2 text-right font-mono text-xs">
              {p.manualBoost > 0 ? <span className="text-primary">{p.manualBoost}</span> : '—'}
            </td>
          </tr>
        ))}
        {topTrending.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
              No products yet. Run Recalculate to populate scores.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx src/app/admin/RecalculateButton.tsx
git commit -m "feat: add trending products card to admin overview"
```

---

## Task 13: Admin Settings — Trending Config Display

**Files:**
- Modify: `src/app/admin/settings/page.tsx`

- [ ] **Step 1: Add TRENDING_CONFIG display to settings page**

In `src/app/admin/settings/page.tsx`, add the import:

```typescript
import { TRENDING_CONFIG } from '@/lib/trendingConfig'
```

In the return JSX, after the `<SettingsForm ...>` component, add:

```tsx
{/* Trending Algorithm Config */}
<div className="bg-card rounded-xl border border-border p-6 space-y-4">
  <div>
    <h3 className="text-sm font-semibold text-foreground">Trending Algorithm Config</h3>
    <p className="text-xs text-muted-foreground mt-1">
      Read-only. To change, edit <code className="bg-background px-1 py-0.5 rounded text-xs">src/lib/trendingConfig.ts</code> and bump the version number.
    </p>
  </div>
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
    {[
      { label: 'Algorithm Version', value: `v${TRENDING_CONFIG.version}` },
      { label: 'Window (days)',     value: String(TRENDING_CONFIG.windowDays) },
      { label: 'Decay Factor',     value: String(TRENDING_CONFIG.decayFactor) },
    ].map(({ label, value }) => (
      <div key={label} className="bg-background rounded-lg border border-border p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-base font-semibold text-foreground mt-0.5 font-mono">{value}</p>
      </div>
    ))}
  </div>
  <div>
    <p className="text-xs font-medium text-muted-foreground mb-2">Signal Weights</p>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Object.entries(TRENDING_CONFIG.weights).map(([signal, weight]) => (
        <div key={signal} className="bg-background rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground capitalize">{signal}</p>
          <p className="text-base font-semibold text-foreground mt-0.5 font-mono">
            {(weight * 100).toFixed(0)}%
          </p>
        </div>
      ))}
    </div>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/settings/page.tsx
git commit -m "feat: add trending config display to admin settings"
```

---

## Task 14: Admin Storage — Trending Cron Button

**Files:**
- Modify: `src/app/admin/storage/AdminStorageClient.tsx`

- [ ] **Step 1: Add trending recalculation state and handler**

In `AdminStorageClient`, add these to the existing state declarations:

```typescript
const [trendingRunning, setTrendingRunning] = useState(false)
const [trendingResult, setTrendingResult]   = useState<string | null>(null)
```

Add a handler function alongside the existing `runCron`:

```typescript
async function runTrendingRecalc() {
  setTrendingRunning(true)
  setTrendingResult(null)
  try {
    const res  = await fetch('/api/admin/trending/recalculate', { method: 'POST' })
    const data = await res.json() as { processed: number; updated: number; version: number; calculatedAt: string }
    setTrendingResult(`${data.updated} products updated, v${data.version}, at ${new Date(data.calculatedAt).toLocaleTimeString()}`)
  } catch {
    setTrendingResult('Error — check console')
  } finally {
    setTrendingRunning(false)
  }
}
```

- [ ] **Step 2: Add button to Cron Controls section**

In the Cron Controls `<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">`, add an additional button after the existing ones:

```tsx
<button
  onClick={() => void runTrendingRecalc()}
  disabled={trendingRunning || cronRunning !== null}
  className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-card disabled:opacity-50 transition-colors"
>
  <Play className={`size-4 ${trendingRunning ? 'animate-pulse text-primary' : 'text-muted-foreground'}`} />
  {trendingRunning ? 'Calculating…' : '▶ Trending Recalculation'}
</button>
```

After the existing `{cronResults && ...}` block, add:

```tsx
{trendingResult && (
  <div className="rounded-xl bg-border/30 p-4">
    <p className="text-xs text-muted-foreground">✅ {trendingResult}</p>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/storage/AdminStorageClient.tsx
git commit -m "feat: add trending recalculation button to admin cron controls"
```

---

## Task 15: TypeScript Verification

- [ ] **Step 1: Run type check**

```bash
cd C:\Users\ruper\noizu-direct
npx tsc --noEmit 2>&1 | grep -v "src/app/admin/staff/audit/page.tsx"
```

Expected: No new errors (one pre-existing error in audit/page.tsx line 161 is acceptable).

Common issues to fix:
- If `trendingScore` field name conflicts with the `ProductTrendingScore` relation, ensure the relation field is named `trendingScoreRecord` in schema and all usages
- If `isNew` field doesn't exist on Product, remove it from the creator page select
- If `order` field doesn't exist, remove it from the creator page select — check actual schema fields

- [ ] **Step 2: Commit fix if needed**

```bash
git add -A
git commit -m "fix: resolve TypeScript errors from trending implementation"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Task 1: Schema — ProductView, ProductTrendingScore, Product fields
- [x] Task 2: TRENDING_CONFIG
- [x] Task 3+4: trackProductView + API endpoint
- [x] Task 5: Wire to product page
- [x] Task 6+7: Cron + admin recalculate endpoints
- [x] Task 8: Homepage TRENDING section type
- [x] Task 9: Marketplace TRENDING sort
- [x] Task 10: Creator storefront Popular sort
- [x] Task 11: Admin products — Score/Boost columns, Pin/Unpin/Suppress/Unsuppress, breakdown
- [x] Task 12: Admin overview trending card + Recalculate Now
- [x] Task 13: Admin settings trending config display
- [x] Task 14: Admin storage cron controls button

**Notes:**
- The `order` and `isNew` fields referenced in Task 10's select may not exist on the Product model — verify against actual schema and adjust the select to only include real fields
- The schema `trendingScore` scalar field naming vs the `trendingScore` relation field: schema uses `trendingScoreRecord` for the relation to avoid conflict
- The `ProductCard` component receives a product shape — TrendingSection passes `trendingScore` in the shape but ProductCard may not use it; that's fine, extra fields are ignored
- Admin products query joins `trendingScoreRecord` — this works because it's a `?` (optional) one-to-one relation; products without a score record return `null` for `trendingScoreRecord`
