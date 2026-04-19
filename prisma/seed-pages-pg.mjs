import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const require = createRequire(import.meta.url)
const pg = require('pg')
const { Client } = pg

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '../.env.local')
try {
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
} catch {}

const client = new Client({ connectionString: process.env.DATABASE_URL })
function cuid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9) }

const PAGES = [
  {
    slug: 'terms',
    title: 'Terms of Service',
    status: 'PUBLISHED',
    showInFooter: true,
    footerColumn: 'Support',
    footerOrder: 1,
    seoTitle: 'Terms of Service — NOIZU DIRECT',
    seoDescription: 'Read the Terms of Service for NOIZU DIRECT marketplace.',
    content: `<h2>1. Acceptance of Terms</h2><p>By accessing or using NOIZU DIRECT, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p><h2>2. Use of the Platform</h2><p>NOIZU DIRECT provides a marketplace for creators to sell digital and physical products directly to buyers. You agree to use this platform only for lawful purposes.</p><h2>3. Purchases and Payments</h2><p>All transactions are processed in USD. A processing fee of 2.5% applies to each transaction.</p><h2>4. Creator Responsibilities</h2><p>Creators are responsible for the accuracy of their listings, fulfilment of orders, and compliance with applicable copyright laws.</p><h2>5. Limitation of Liability</h2><p>NOIZU DIRECT is provided on an "as is" basis. We make no warranties regarding the platform availability or fitness for a particular purpose.</p><h2>6. Contact</h2><p>For questions about these Terms, contact us at support@noizu.direct.</p>`,
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    status: 'PUBLISHED',
    showInFooter: true,
    footerColumn: 'Support',
    footerOrder: 2,
    seoTitle: 'Privacy Policy — NOIZU DIRECT',
    seoDescription: 'Read the Privacy Policy for NOIZU DIRECT marketplace.',
    content: `<h2>Information We Collect</h2><p>We collect information you provide when creating an account, making purchases, or contacting us — including name, email address, and payment information.</p><h2>How We Use Your Information</h2><p>We use your information to process transactions, send order updates, provide customer support, and improve our services.</p><h2>Data Security</h2><p>We implement industry-standard security measures to protect your personal information. Payment data is processed by our payment partner Airwallex and is never stored on our servers.</p><h2>Cookies</h2><p>We use cookies to maintain your session and improve your browsing experience. You can disable cookies in your browser settings.</p><h2>Contact</h2><p>For privacy-related questions, contact privacy@noizu.direct.</p>`,
  },
  {
    slug: 'about',
    title: 'About NOIZU DIRECT',
    status: 'PUBLISHED',
    showInFooter: true,
    footerColumn: 'Support',
    footerOrder: 3,
    seoTitle: 'About NOIZU DIRECT — SEA Creator Marketplace',
    seoDescription: 'Learn about NOIZU DIRECT, the marketplace built for Southeast Asian cosplay, doujin, and anime creators.',
    content: `<h2>Our Mission</h2><p>NOIZU DIRECT was built to give Southeast Asian creators a direct line to their fans — no middlemen, no barriers, just creators doing what they love and fans supporting them directly.</p><h2>Supporting SEA Creators</h2><p>Southeast Asia is home to some of the world's most talented artists, illustrators, cosplayers, and makers. NOIZU DIRECT is built for them — offering low fees, multi-currency support, and a community that celebrates SEA creative culture.</p><h2>What We Offer</h2><ul><li>Digital and physical product listings for artists and makers</li><li>Commission management for custom work</li><li>Direct messaging between creators and buyers</li><li>Multi-currency payouts powered by Airwallex</li></ul>`,
  },
  {
    slug: 'help',
    title: 'Help Centre',
    status: 'PUBLISHED',
    showInFooter: true,
    footerColumn: 'Support',
    footerOrder: 4,
    seoTitle: 'Help Centre — NOIZU DIRECT Support',
    seoDescription: 'Get answers to common questions about NOIZU DIRECT.',
    content: `<h2>Frequently Asked Questions</h2><h3>How do I track my order?</h3><p>Log in to your account and visit Orders to see real-time order status and tracking information.</p><h3>Can I get a refund?</h3><p>Digital products are non-refundable once downloaded. For physical products, contact the creator directly within 7 days of delivery.</p><h3>How do I contact a creator?</h3><p>Visit the creator storefront and click Message Creator. You must be logged in to send messages.</p><h3>My download link is not working</h3><p>Download links expire after 72 hours and are limited to 3 downloads. Contact support if you need a new link.</p><h3>How do I become a creator?</h3><p>Register for a buyer account first, then apply for creator status from your dashboard. Applications are reviewed within 48 hours.</p><h2>Contact Support</h2><p>Still need help? Email us at support@noizu.direct and we will respond within 24 hours.</p>`,
  },
  {
    slug: 'contact',
    title: 'Contact Us',
    status: 'PUBLISHED',
    showInFooter: true,
    footerColumn: 'Support',
    footerOrder: 5,
    seoTitle: 'Contact NOIZU DIRECT',
    seoDescription: 'Contact the NOIZU DIRECT team for support, partnerships, or general enquiries.',
    content: `<h2>Get in Touch</h2><p>We would love to hear from you. Here is how to reach the NOIZU DIRECT team:</p><h2>General Enquiries</h2><p>Email: hello@noizu.direct</p><h2>Creator Support</h2><p>Email: creators@noizu.direct</p><h2>Technical Support</h2><p>Email: support@noizu.direct</p><h2>Partnership and Press</h2><p>Email: partnerships@noizu.direct</p>`,
  },
  {
    slug: 'how-it-works',
    title: 'How It Works',
    status: 'PUBLISHED',
    showInFooter: true,
    footerColumn: 'Marketplace',
    footerOrder: 3,
    seoTitle: 'How NOIZU DIRECT Works — Buying and Selling Guide',
    seoDescription: 'Learn how to buy from and sell on NOIZU DIRECT, the SEA creator marketplace.',
    content: `<h2>For Buyers</h2><ol><li><strong>Browse</strong> — Explore products from SEA creators across all categories.</li><li><strong>Buy</strong> — Add to cart and check out securely via Airwallex.</li><li><strong>Receive</strong> — Digital products are delivered instantly. Physical items ship directly from the creator.</li><li><strong>Connect</strong> — Message creators directly to discuss commissions or custom orders.</li></ol><h2>For Creators</h2><ol><li><strong>Sign Up</strong> — Register as a creator and set up your storefront.</li><li><strong>List Products</strong> — Upload your digital or physical products with descriptions and pricing.</li><li><strong>Sell</strong> — Buyers purchase directly from your storefront.</li><li><strong>Get Paid</strong> — Funds are transferred to your account after order completion.</li></ol>`,
  },
  {
    slug: 'creator-handbook',
    title: 'Creator Handbook',
    status: 'PUBLISHED',
    showInFooter: true,
    footerColumn: 'Creators',
    footerOrder: 2,
    seoTitle: 'Creator Handbook — NOIZU DIRECT',
    seoDescription: 'Everything you need to know about selling on NOIZU DIRECT.',
    content: `<h2>Getting Started</h2><p>Welcome to NOIZU DIRECT! This handbook will help you set up a successful storefront and start selling to your fans.</p><h2>Setting Up Your Profile</h2><p>Complete your creator profile with a high-quality avatar, banner image, and bio. Creators with complete profiles see significantly more traffic.</p><h2>Listing Your Products</h2><p>NOIZU DIRECT supports digital, physical, POD, and commission products. For digital products, upload your files securely — buyers receive a download link after purchase. For physical products, set accurate shipping estimates and costs.</p><h2>Pricing Strategy</h2><p>Research similar products on the platform. Remember that NOIZU DIRECT charges a platform fee plus payment processing. Price your products to cover these fees while remaining competitive.</p><h2>Payouts</h2><p>Request payouts once your balance reaches the minimum threshold of MYR 50. Funds are transferred to your connected bank account within 3–5 business days.</p>`,
  },
  {
    slug: 'fees-payouts',
    title: 'Fees & Payouts',
    status: 'PUBLISHED',
    showInFooter: true,
    footerColumn: 'Creators',
    footerOrder: 3,
    seoTitle: 'Fees & Payouts — NOIZU DIRECT Creator Guide',
    seoDescription: 'Understand platform fees and payout schedule on NOIZU DIRECT.',
    content: `<h2>Platform Fees</h2><p>NOIZU DIRECT charges a payment processing fee of 2.5% on each transaction. There are no monthly subscription fees, listing fees, or hidden charges.</p><h2>Escrow & Payout Schedule</h2><p>Your earnings are held in escrow after order completion to allow for dispute resolution. Escrow periods vary by product type: digital prints clear within 48 hours, physical products within 14 days of delivery confirmation, and POD or commission orders within 30 days. New creators (before KYC verification and 10 completed orders) have an additional 7-day hold applied.</p><h2>Minimum Payout</h2><p>The minimum payout amount is MYR 50. You can request a payout at any time once your balance meets this threshold.</p><h2>Supported Currencies</h2><p>Payouts are made in MYR, SGD, PHP, THB, IDR, or USD depending on your registered bank account.</p><h2>Taxes</h2><p>Creators are responsible for declaring and paying applicable taxes in their jurisdiction. NOIZU DIRECT provides transaction records to assist with tax reporting.</p>`,
  },
]

async function run() {
  await client.connect()
  const now = new Date().toISOString()
  for (const p of PAGES) {
    const existing = await client.query('SELECT id FROM "Page" WHERE slug = $1', [p.slug])
    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE "Page" SET title=$1, content=$2, status=$3, "showInFooter"=$4, "footerColumn"=$5, "footerOrder"=$6, "seoTitle"=$7, "seoDescription"=$8, "updatedAt"=$9 WHERE slug=$10`,
        [p.title, p.content, p.status, p.showInFooter, p.footerColumn, p.footerOrder, p.seoTitle, p.seoDescription, now, p.slug]
      )
      console.log('Updated:', p.slug)
    } else {
      await client.query(
        `INSERT INTO "Page" (id, slug, title, content, status, "showInFooter", "footerColumn", "footerOrder", "seoTitle", "seoDescription", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [cuid(), p.slug, p.title, p.content, p.status, p.showInFooter, p.footerColumn, p.footerOrder, p.seoTitle, p.seoDescription, now, now]
      )
      console.log('Created:', p.slug)
    }
  }
  await client.end()
  console.log(`\nDone — ${PAGES.length} pages seeded`)
}

run().catch(e => { console.error(e.message); client.end() })
