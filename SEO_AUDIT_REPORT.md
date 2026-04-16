# NOIZU-DIRECT — SEO / AEO Audit Report

**Date:** 2026-04-16  
**Auditor:** Claude Code (Sonnet 4.6)  
**Scope:** Full application under `src/` + `public/`

---

## Executive Summary

Prior to this audit the application had **no SEO infrastructure at all** — no meta tags beyond the Next.js default, no structured data, no sitemap, no robots.txt, no canonical URLs, and no AEO signals. All core pages were identical from a search-engine perspective.

After implementation all critical gaps have been closed. The platform now has a complete SEO/AEO foundation suitable for Google, Bing, and AI answer engines (Perplexity, Claude, ChatGPT).

---

## Pre-Implementation Audit Findings

### Critical (P0)
| # | Issue | Impact |
|---|-------|--------|
| 1 | No `<title>` or `<meta description>` on any page | Cannot rank; snippets uncontrolled |
| 2 | No `robots.txt` | Crawler behavior undefined; AI training bots unconstrained |
| 3 | No sitemap | Discovery of product/creator/blog URLs dependent on links only |
| 4 | No Open Graph or Twitter Card tags | All social shares show blank preview |
| 5 | No canonical URLs | Duplicate content risk across category/filter parameters |
| 6 | No structured data (JSON-LD) | Zero rich result eligibility |

### High (P1)
| # | Issue | Impact |
|---|-------|--------|
| 7 | Auth/checkout pages indexable | Thin private pages consume crawl budget |
| 8 | Product images: `alt=""` on all images | Image search completely excluded |
| 9 | Creator images: `alt=""` | Same as above |
| 10 | No OG image generation | Dynamic pages (products, creators, posts) have no share image |
| 11 | No category-level SEO copy | Category landing pages are content-free |
| 12 | No entity definition for the platform | AI answer engines cannot identify NOIZU-DIRECT as an entity |

### Medium (P2)
| # | Issue | Impact |
|---|-------|--------|
| 13 | No AEO Q&A content on Help page | Perplexity/ChatGPT cannot surface platform FAQs |
| 14 | No `llms.txt` | AI crawlers have no structured description of the platform |
| 15 | No fees page | "How much does X cost?" queries unaddressed |
| 16 | Blog pages missing `article` OG type | Blog content treated as generic page by social/search |

---

## Implementation Status

### Foundation Files

| File | Status | Notes |
|------|--------|-------|
| `src/lib/seo-config.ts` | ✅ Created | `SEO_CONFIG` with siteUrl, siteName, defaults |
| `src/lib/seo-helpers.ts` | ✅ Created | `generateTitle`, `generateDescription`, `generateCanonical`, `generateOgImageUrl`, `generateBreadcrumbSchema` |
| `src/lib/categories.ts` | ✅ Created | `CATEGORY_META` with h1, description, keywords, ogImage per category |
| `src/components/seo/JsonLd.tsx` | ✅ Created | Safe `<script type="application/ld+json">` renderer |

---

### Meta Tags (Agent 1)

| Page | `<title>` | `<description>` | OG | Twitter | Canonical |
|------|-----------|-----------------|----|---------|----|
| Root layout (`/`) | ✅ template | ✅ | ✅ | ✅ | ✅ via metadataBase |
| Marketplace (`/marketplace`) | ✅ per-category | ✅ per-category | ✅ | ✅ | ✅ |
| Creator (`/creator/[username]`) | ✅ bio-derived | ✅ | ✅ | ✅ | ✅ |
| Product (`/product/[id]`) | ✅ price+type | ✅ | ✅ images[] | ✅ | ✅ |
| Blog post (`/blog/[slug]`) | ✅ | ✅ excerpt | ✅ article type | ✅ | ✅ |
| CMS pages (`/[slug]`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Login/Register | ✅ noindex | ✅ | — | — | — |
| Checkout / Order success | ✅ noindex | ✅ | — | — | — |

**Dynamic OG Images:** `src/app/api/og/route.tsx` (edge runtime) generates 1200×630 images for `default`, `product`, `creator`, and `blog` types.

---

### Structured Data / JSON-LD (Agent 2)

| Page | Schemas |
|------|---------|
| Home (`/`) | `WebSite` (with `SearchAction`), `Organization` |
| Creator (`/creator/[username]`) | `Person`, `BreadcrumbList` |
| Product (`/product/[id]`) | `Product` (with `Offer`, `AggregateRating` placeholder), `BreadcrumbList` |
| Blog post (`/blog/[slug]`) | `Article`, `BreadcrumbList` |
| CMS pages (`/[slug]`) | `FAQPage` (help/faq), `HowTo` (guides), `BreadcrumbList` |
| Fees page (`/fees`) | `FAQPage` |

---

### Sitemaps & Crawl Directives (Agent 3)

| File | Status |
|------|--------|
| `public/robots.txt` | ✅ Search engines allowed; AI answer engines allowed; training bots blocked; private routes disallowed |
| `public/llms.txt` | ✅ Platform description, key pages, pricing facts for AI answer engines |
| `src/app/sitemap.xml/route.ts` | ✅ Sitemap index linking all child sitemaps |
| `src/app/sitemap-pages.xml/route.ts` | ✅ Static CMS pages |
| `src/app/sitemap-products.xml/route.ts` | ✅ All active products with `lastmod`, `image:image` |
| `src/app/sitemap-creators.xml/route.ts` | ✅ All creator profiles |
| `src/app/sitemap-blog.xml/route.ts` | ✅ Published blog posts |
| `src/app/sitemap-categories.xml/route.ts` | ✅ Category landing pages |
| `src/app/sitemap-video.xml/route.ts` | ✅ Video content with `video:video` namespace |

**Robots.txt highlights:**
- Explicit allow for `Googlebot-Image` on `/uploads/`
- Named allow for `PerplexityBot`, `Claude-Web`, `anthropic-ai`, `ChatGPT-User`, `YouBot`
- Named block for `GPTBot`, `CCBot`, `Amazonbot`, `Bytespider`, `meta-externalagent`, `Diffbot`
- Sitemap declaration: `https://noizu.direct/sitemap.xml`

---

### Category Page SEO (Agent 4)

All 6 product categories now have dedicated metadata:

| Category | Slug | H1 | Description | Keywords |
|----------|------|----|-------------|---------|
| Digital Art | `/marketplace?category=DIGITAL_ART` | "Digital Art from SEA Creators" | 155 chars | 10 terms |
| Doujin | `/marketplace?category=DOUJIN` | "Doujin from SEA Independent Creators" | 147 chars | 10 terms |
| Cosplay Prints | `/marketplace?category=COSPLAY_PRINT` | "Cosplay Prints from SEA Cosplayers" | 152 chars | 9 terms |
| Physical Merch | `/marketplace?category=PHYSICAL_MERCH` | "Physical Merch from Independent SEA Creators" | 149 chars | 8 terms |
| Stickers | `/marketplace?category=STICKERS` | "Anime & Cosplay Stickers from SEA Artists" | 147 chars | 8 terms |
| Other | `/marketplace?category=OTHER` | "Unique Creator Goods on NOIZU-DIRECT" | 130 chars | 5 terms |

The marketplace page is split into a server wrapper (`page.tsx`) that reads the category param and generates metadata, plus `MarketplaceClient.tsx` for the interactive UI. This resolves the `'use client'` / `generateMetadata` incompatibility.

---

### Image Alt Text (Agent 5)

| File | Fix |
|------|-----|
| `src/app/creator/[username]/page.tsx` | Alt = creator username |
| `src/app/creators/page.tsx` | Alt = creator display name |
| `src/app/marketplace/MarketplaceClient.tsx` (ProductCard) | Alt = product title |
| `src/app/account/orders/[id]/OrderDetailClient.tsx` | Alt = product title |
| `src/app/account/following/page.tsx` | Alt = creator name |
| `src/app/admin/cms/posts/[id]/page.tsx` | Alt = post title |
| `src/app/admin/popups/*.tsx` | `alt=""` + `role="presentation"` (decorative) |
| `src/app/admin/videos/*.tsx` | Alt = video title |

---

### AEO Content (Agent 6)

| Item | Status |
|------|--------|
| `src/app/fees/page.tsx` | ✅ Created — fee table, prose with specific numbers, Schema.org FAQPage |
| Help page (DB) | ✅ Updated — 11 Q&A blocks covering fees, disputes, downloads, shipping, creator signup |
| About page (DB) | ✅ Updated — platform entity definition with founding context, location, and mission |
| `src/components/layout/Footer.tsx` | ✅ Added "Fees & Pricing" link |

---

## Remaining Gaps

### Must Fix Before Production
| # | Issue | File | Effort |
|---|-------|------|--------|
| 1 | OG images are placeholder 1×1 JPEGs | `public/images/og-default.jpg` + `public/images/categories/*.jpg` | Design work |
| 2 | Product sitemap: `image:loc` references `/uploads/` — confirm real image URLs match | `sitemap-products.xml/route.ts` | 1h |
| 3 | `SearchAction` in WebSite schema references `/search?q={query}` — verify route exists | `src/app/page.tsx` | 30m |

### Nice to Have
| # | Issue | Notes |
|---|-------|-------|
| 4 | Creator profiles missing `sameAs` links (social) | Add if creator social URLs stored in DB |
| 5 | Product `aggregateRating` is a placeholder | Remove or wire up real rating once reviews exist |
| 6 | Blog sitemap `image:image` not implemented | Add featured image when blog has cover image field |
| 7 | `hreflang` for MY/SG/PH variants | Low priority until multi-locale routing exists |
| 8 | Core Web Vitals | Not audited — use Lighthouse after dev server performance tuning |

---

## Verification Checklist

- [x] `<title>` tag unique per page type
- [x] `<meta name="description">` 50–160 chars on all public pages
- [x] `<link rel="canonical">` via Next.js `metadataBase`
- [x] OG tags on all public pages
- [x] Twitter Card tags on all public pages
- [x] `robots: noindex` on auth, checkout, account pages
- [x] `robots.txt` present and valid
- [x] `sitemap.xml` index present with all child sitemaps registered
- [x] JSON-LD on homepage, creator, product, blog, CMS pages
- [x] Alt text on all meaningful images
- [x] Dynamic OG image endpoint (`/api/og`) working on edge runtime
- [x] `llms.txt` present for AI answer engines
- [x] AEO Q&A on Help and Fees pages
- [ ] OG images: real 1200×630 assets (placeholder only)
- [ ] Google Search Console: submit sitemap after go-live
- [ ] Bing Webmaster Tools: submit sitemap after go-live
