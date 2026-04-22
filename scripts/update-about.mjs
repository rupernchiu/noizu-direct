import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const dotenv = require('dotenv')
dotenv.config({ path: path.join(rootDir, '.env') })
dotenv.config({ path: path.join(rootDir, '.env.local'), override: false })

const { Client } = require('pg')
const client = new Client({ connectionString: process.env.DATABASE_URL_DIRECT })
await client.connect()

const TITLE = 'About noizu.direct'
const SEO_TITLE = 'About noizu.direct — a creator marketplace for Southeast Asia'
const SEO_DESCRIPTION =
  'noizu.direct is a creator-first marketplace for Southeast Asia — built by the team behind World Cosplay Summit Malaysia. Escrow payments, regional logistics, and 0% platform fee at launch.'

// Narrative body only. The hero, stats strip, pillars grid, audience grid,
// CTAs, and contact block live as hardcoded React in src/app/about/page.tsx —
// only the editorial prose ("Our story") flows through the CMS.
const CONTENT = `<blockquote>
<p><strong>In one line.</strong> noizu.direct is a creator marketplace for Southeast Asia, built by the team behind World Cosplay Summit Malaysia. We take zero platform fee during launch, hold every payment in escrow until delivery is confirmed, and treat Kuala Lumpur, Manila, Jakarta, Bangkok, and Singapore as one shared creative region.</p>
</blockquote>

<h2>Where we came from</h2>
<p>noizu.direct is a project by <strong>NOIZU</strong>, the same small team that has organised World Cosplay Summit Malaysia and run cosplay and creator events across the region for several years. We spent those years standing in exhibition halls, walking artist alley, and watching the same pattern play out weekend after weekend: enormously talented creators, thousands of excited fans, and an ecosystem of international platforms that were never really designed for either of them.</p>
<p>International marketplaces ask SEA creators to price in foreign currencies, route payouts through costly intermediaries, and compete for visibility on algorithms tuned for markets on the other side of the world. Local payment apps solve part of the problem but leave buyers without meaningful protection. Social-media DMs solve the trust problem only through sheer personal reputation &mdash; and only for the creators who already have one.</p>
<p>We built noizu.direct because the region deserved a platform designed for it from the first commit.</p>

<h2>The gap we saw</h2>
<p>Every creator we spoke to described some version of the same three problems. <strong>First</strong>, platform economics tilted heavily away from them: commissions of fifteen, twenty, sometimes thirty per cent on every order, before payment-gateway fees were deducted on top. <strong>Second</strong>, a total absence of payment protection for buyers, which translated directly into lost sales every time a fan hesitated at checkout. <strong>Third</strong>, a discovery experience that treated the region as a single generic bucket, rather than five distinct creative communities with different tastes, languages, and purchasing patterns.</p>
<p>We decided that the right response was not to build another generic storefront, but to build the specific platform that answered those three problems directly.</p>

<h2>What we believe</h2>
<p>A marketplace is a collection of incentives held together by a user interface. Ours are deliberately different. We charge <strong>zero platform fee</strong> during the launch period so that early creators can test pricing, build their audience, and keep what they earn. Every order, whether a digital download or a physical shipment or a commissioned piece of art, is placed into <strong>escrow</strong> &mdash; released to the creator only after the buyer has confirmed delivery. We publish a clear <a href="/fees">fee schedule</a>, a clear <a href="/terms">terms of service</a>, and a clear <a href="/privacy">privacy policy</a>, and we update them with fourteen days&rsquo; notice when anything material changes.</p>
<p>Behind the product, we believe the SEA creator economy is neither a scaled-down version of the West nor a spillover of Japan. It is its own thing: transformative, multilingual, event-driven, and still largely analogue in the ways that matter. The platform has to meet it where it is &mdash; which means strong support for fan and doujin work, conservative but human content moderation, and a payment stack that works for both the artist who still prefers cash on delivery and the illustrator whose entire business is overseas commissions paid in USD.</p>

<h2>What&rsquo;s different</h2>
<p>There are a handful of design choices that distinguish noizu.direct from the generic alternatives. Each of them exists because the team made a considered trade-off, not because a growth dashboard asked for it.</p>
<ul>
<li><strong>Escrow on every transaction.</strong> Not just on the high-risk ones. Not as a premium feature. The default behaviour, for every order type, for every creator.</li>
<li><strong>Regional shipping primitives.</strong> Multi-currency pricing, SEA-aware logistics partners, and an address form that understands Malaysian states, Philippine regions, Thai provinces, and Indonesian kabupaten &mdash; rather than fighting them.</li>
<li><strong>Weekly releases, public changelog.</strong> We run the platform like a modern product, not a marketplace frozen in 2012. If you want to see what shipped last Thursday, it is on the <a href="/changelog">changelog</a>.</li>
<li><strong>Direct channel to the team.</strong> Every founder-level decision &mdash; pricing changes, content-policy changes, feature prioritisation &mdash; is made by people you can write to. Not a call centre. Not a bot.</li>
</ul>

<h2>Who the platform is for</h2>
<p>noizu.direct is for independent creators in Southeast Asia and the fans who support them. In practice, that usually means one of four groups. <strong>Cosplayers and photographers</strong> selling prints, props, limited-edition merch, and convention drops. <strong>Illustrators and digital artists</strong> selling original work, open and closed commissions, stickers, and zines. <strong>Doujin and independent-comic creators</strong> publishing physical books, digital editions, and bundles. <strong>Event crews and collectives</strong> running coordinated drops around conventions, anniversaries, and campaigns.</p>
<p>It is equally for the fans who have, for years, bought from these creators at conventions, through private Telegram channels, and through DMs &mdash; and who deserve a safer, less awkward, less trust-hostile way to do the same thing online.</p>

<h2>Where we&rsquo;re going</h2>
<p>We are building noizu.direct in public, and we intend to be here for a long time. Over the next twelve months our focus is on three things: deepening creator tools so that running a store on the platform is genuinely easier than the alternatives; expanding into Philippines, Thailand, Indonesia, Vietnam, and Singapore with region-specific payment and shipping stacks; and growing a trust-and-safety programme that protects creators without patronising them.</p>
<p>If you have thoughts on where the platform should go next &mdash; a missing feature, a missing integration, a community we should be talking to &mdash; write to us at <a href="mailto:hello@noizu.direct">hello@noizu.direct</a>. We read every message, and the roadmap has shifted more than once on the back of a single good email.</p>`

const beforeRes = await client.query(
  `SELECT id, title, LENGTH(COALESCE(content,'')) AS len FROM "Page" WHERE slug=$1`,
  ['about']
)
console.log('BEFORE:', beforeRes.rows[0] ?? '(no row)')

const res = await client.query(
  `INSERT INTO "Page" (id, slug, title, content, "seoTitle", "seoDescription", status, "showInFooter", "footerColumn", "footerOrder", "updatedAt")
   VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, 'PUBLISHED', TRUE, 'Support', 10, NOW())
   ON CONFLICT (slug) DO UPDATE
     SET title = EXCLUDED.title,
         content = EXCLUDED.content,
         "seoTitle" = EXCLUDED."seoTitle",
         "seoDescription" = EXCLUDED."seoDescription",
         status = 'PUBLISHED',
         "showInFooter" = TRUE,
         "footerColumn" = COALESCE("Page"."footerColumn", 'Support'),
         "updatedAt" = NOW()
   RETURNING id, slug, LENGTH(content) AS len, "seoTitle"`,
  ['about', TITLE, CONTENT, SEO_TITLE, SEO_DESCRIPTION]
)
console.log('AFTER:', res.rows[0])

await client.end()
