import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import crypto from 'crypto'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const dotenv = require('dotenv')
dotenv.config({ path: path.join(rootDir, '.env') })
dotenv.config({ path: path.join(rootDir, '.env.local'), override: false })

const { Client } = require('pg')
const client = new Client({ connectionString: process.env.DATABASE_URL_DIRECT })
await client.connect()

function cuid() {
  return 'c' + crypto.randomBytes(12).toString('base64url').slice(0, 24)
}

const admin = (await client.query(
  `SELECT id FROM "User" WHERE role='ADMIN' ORDER BY "createdAt" ASC LIMIT 1`,
)).rows[0]

if (!admin) {
  console.error('No admin user found — seed aborted.')
  await client.end()
  process.exit(1)
}

// Placeholder covers pulled from picsum with deterministic seeds so they stay stable.
const POSTS = [
  {
    slug: 'sea-creator-economy-2026',
    title: 'The SEA Creator Economy in 2026: What Indie Artists Should Know',
    excerpt: 'From cosplay to doujin to vtuber merch — a snapshot of the trends shaping Southeast Asian indie commerce this year.',
    tags: ['Industry', 'Creator Economy', 'SEA'],
    cover: 'https://picsum.photos/seed/blog-sea-economy/1600/900',
    body: `
<h2>A region, not a monolith</h2>
<p>The Southeast Asian creator landscape is routinely treated as one market in global reporting, but the reality on the ground is far more textured. Buyers in Kuala Lumpur, Manila, Bangkok, Jakarta, and Singapore each have their own payment habits, discovery platforms, and shipping expectations.</p>
<p>This placeholder article outlines the broad trends we expect to shape the region in 2026: the shift away from all-or-nothing platforms, growing demand for transparent escrow, and the rise of POD partnerships for creators who can't hold inventory.</p>
<h2>Pillars of trust</h2>
<p>Payment safety, reasonable fees, and direct communication between fans and creators remain the three pillars buyers ask about most. Expect platforms that ignore any one of these to lose ground.</p>
`,
  },
  {
    slug: 'escrow-how-it-protects-buyers-and-creators',
    title: 'Escrow 101: How It Protects Both Buyers and Creators',
    excerpt: 'A plain-language walkthrough of how escrow works on noizu.direct — and why holding funds briefly makes sales safer for everyone.',
    tags: ['How It Works', 'Escrow', 'Trust'],
    cover: 'https://picsum.photos/seed/blog-escrow/1600/900',
    body: `
<h2>Why escrow exists</h2>
<p>When a buyer pays for a commission or a physical package, the money doesn't vanish into a black box. It sits in escrow — a neutral holding account — while the creator ships or delivers the work.</p>
<p>Only once tracking is confirmed (or a buyer has had a chance to review a digital delivery) does the money release. If something goes wrong, both sides have a clear path to resolution.</p>
<h2>What it feels like as a creator</h2>
<p>You'll see the order appear with a status of <em>HELD</em>. Once you ship, add tracking. The escrow state moves to <em>TRACKING_ADDED</em>, and after the dispute window closes with no issue, your balance clears for payout.</p>
`,
  },
  {
    slug: 'commissions-without-burnout',
    title: 'Commissions Without Burnout: Pricing, Scope, and Saying No',
    excerpt: 'Practical guidance for illustrators and cosplayers opening commissions — how to set tiers, scope revisions, and protect your calendar.',
    tags: ['Guides', 'Commissions', 'Pricing'],
    cover: 'https://picsum.photos/seed/blog-commissions/1600/900',
    body: `
<h2>Tier your work, not yourself</h2>
<p>A common pitfall is pricing every commission the same despite wildly different complexity. Set three or four clear tiers — headshot, half-body, full-body, detailed scene — and a defined number of revisions per tier.</p>
<h2>The scope doc</h2>
<p>For anything beyond a headshot, send a short scope doc confirming subject, palette, reference images, deadline, and revisions. This single habit prevents most commission disputes.</p>
<h2>Hiatus is healthy</h2>
<p>Use the hiatus toggle when you need a break. Regulars respect it — the creators who vanish without notice are the ones who lose followers.</p>
`,
  },
  {
    slug: 'print-on-demand-explained-for-creators',
    title: 'Print-On-Demand Explained: Reach Without Inventory',
    excerpt: 'POD lets you ship physical merch without boxes piling up in your bedroom. Here is how it works on noizu.direct and what to watch out for.',
    tags: ['POD', 'Guides', 'Operations'],
    cover: 'https://picsum.photos/seed/blog-pod/1600/900',
    body: `
<h2>The pitch</h2>
<p>Print-on-demand lets you sell posters, shirts, stickers, and pillows without buying stock upfront. When an order lands, the printer produces and ships it for you.</p>
<h2>Providers matter</h2>
<p>Pick your provider based on the markets you want to reach. Local Malaysian or Singaporean printers shine for speed across SEA; larger global services give you access to the US and Europe but with slower, pricier shipping for regional buyers.</p>
<h2>Margins and expectations</h2>
<p>POD margins are thinner than stocked inventory. Don't compete on price; compete on artwork your audience already follows you for.</p>
`,
  },
  {
    slug: 'digital-downloads-packaging-like-a-pro',
    title: 'Packaging Digital Downloads Like a Pro',
    excerpt: 'Multi-file bundles, readable licenses, and the small delivery touches that make digital customers come back.',
    tags: ['Guides', 'Digital', 'Customer Experience'],
    cover: 'https://picsum.photos/seed/blog-digital/1600/900',
    body: `
<h2>Zip is fine — structure matters more</h2>
<p>Most digital bundles are still delivered as a single archive. What separates a pro drop from an amateur one is the inside: clearly named folders, a README with licensing terms, and preview thumbnails so a buyer can tell what they bought at a glance.</p>
<h2>License clarity</h2>
<p>Always include a plain-English license file. "Personal use", "commercial use", "print but not resell" — spell it out. Ambiguity is what drives DM support tickets.</p>
`,
  },
  {
    slug: 'cosplay-shops-shipping-across-sea',
    title: 'Cosplay Shops Shipping Across SEA: A Logistics Checklist',
    excerpt: 'Weights, wigs, and customs — the realities of shipping cosplay orders across the Malaysia, Singapore, and Philippines corridor.',
    tags: ['Logistics', 'Cosplay', 'SEA'],
    cover: 'https://picsum.photos/seed/blog-cosplay-shipping/1600/900',
    body: `
<h2>The weight trap</h2>
<p>Wigs are feather-light but large; armor props are heavy and awkwardly shaped. Most under-estimations happen on volumetric weight, not actual weight.</p>
<h2>Cross-border paperwork</h2>
<p>Malaysia to the Philippines will increasingly flag costume items for customs review. Declare honestly, keep receipts, and set buyer expectations about potential duty.</p>
<h2>Returns policy you can actually honor</h2>
<p>If you can't realistically accept a return on a made-to-measure piece, say so on the listing. Buyers respect clarity — they punish surprises.</p>
`,
  },
  {
    slug: 'growing-your-store-first-100-followers',
    title: 'Growing Your Store: From Zero to Your First 100 Followers',
    excerpt: 'The unglamorous playbook for a brand new creator storefront — consistency, a thin niche, and showing up for your first twenty regulars.',
    tags: ['Guides', 'Growth', 'Creator'],
    cover: 'https://picsum.photos/seed/blog-growth/1600/900',
    body: `
<h2>Thin niche beats broad reach</h2>
<p>The creators who grow fastest on noizu.direct aren't the ones trying to please everyone. They pick a narrow lane — genshin keychains, tokusatsu enamel pins, original doujin only — and stay in it long enough to be remembered.</p>
<h2>The first twenty regulars</h2>
<p>Reply to every DM. Thank every purchase. Ship a little early. Your first twenty regulars fund the next hundred followers because they tell their friends.</p>
<h2>Don't optimize too early</h2>
<p>Skip the A/B tests until you have an actual audience to test on. Before then, consistency is the only feature that matters.</p>
`,
  },
]

const now = new Date()
let inserted = 0
let skipped = 0

for (let i = 0; i < POSTS.length; i++) {
  const p = POSTS[i]
  const exists = (await client.query('SELECT 1 FROM "Post" WHERE slug=$1', [p.slug])).rowCount
  if (exists) {
    console.log(`skip ${p.slug} (already exists)`)
    skipped++
    continue
  }
  // Stagger publishedAt so ordering looks natural (first post in array is newest)
  const publishedAt = new Date(now.getTime() - i * 86400000 * 2)
  const id = cuid()
  await client.query(
    `INSERT INTO "Post"(id, slug, title, excerpt, content, "coverImage", "authorId", status, "publishedAt", tags, "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,'PUBLISHED',$8,$9,$10,$10)`,
    [
      id,
      p.slug,
      p.title,
      p.excerpt,
      p.body.trim(),
      p.cover,
      admin.id,
      publishedAt,
      JSON.stringify(p.tags),
      publishedAt,
    ],
  )
  console.log(`insert ${p.slug}`)
  inserted++
}

console.log(`\ndone. inserted=${inserted} skipped=${skipped}`)
await client.end()
