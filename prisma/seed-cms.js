// prisma/seed-cms.js — seed static pages + blog posts using direct SQLite
const Database = require('better-sqlite3')
const crypto = require('crypto')

const db = new Database('./dev.db')

function cuid() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function now() {
  return new Date().toISOString()
}

const PAGES = [
  {
    slug: 'about',
    title: 'About NOIZU DIRECT',
    status: 'PUBLISHED',
    showInFooter: 1,
    footerColumn: 'Support',
    footerOrder: 3,
    content: `<h2>Our Mission</h2><p>NOIZU DIRECT was built to give Southeast Asian creators a direct line to their fans — no middlemen, no barriers, just creators doing what they love and fans supporting them directly.</p><h2>Supporting SEA Creators</h2><p>Southeast Asia is home to some of the world's most talented artists, illustrators, cosplayers, and makers. NOIZU DIRECT is built for them — offering low fees, multi-currency support, and a community that celebrates SEA creative culture.</p><h2>What We Offer</h2><ul><li>Digital and physical product listings for artists and makers</li><li>Commission management for custom work</li><li>Direct messaging between creators and buyers</li><li>Multi-currency payouts powered by Airwallex</li></ul>`,
    seoTitle: 'About NOIZU DIRECT — SEA Creator Marketplace',
    seoDescription: 'Learn about NOIZU DIRECT, the marketplace built for Southeast Asian cosplay, doujin, and anime creators.',
  },
  {
    slug: 'terms',
    title: 'Terms of Service',
    status: 'PUBLISHED',
    showInFooter: 1,
    footerColumn: 'Support',
    footerOrder: 1,
    content: `<h2>1. Acceptance of Terms</h2><p>By accessing or using NOIZU DIRECT, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p><h2>2. Use of the Platform</h2><p>NOIZU DIRECT provides a marketplace for creators to sell digital and physical products directly to buyers. You agree to use this platform only for lawful purposes.</p><h2>3. Purchases and Payments</h2><p>All transactions are processed in USD. A processing fee of 2.5% applies to each transaction.</p><h2>4. Creator Responsibilities</h2><p>Creators are responsible for the accuracy of their listings, fulfillment of orders, and compliance with applicable copyright laws.</p><h2>5. Limitation of Liability</h2><p>NOIZU DIRECT is provided on an "as is" basis. We make no warranties regarding the platform's availability or fitness for a particular purpose.</p><h2>6. Contact</h2><p>For questions about these Terms, contact us at <a href="mailto:support@noizu-direct.com">support@noizu-direct.com</a>.</p>`,
    seoTitle: 'Terms of Service — NOIZU DIRECT',
    seoDescription: 'Read the Terms of Service for NOIZU DIRECT marketplace.',
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    status: 'PUBLISHED',
    showInFooter: 1,
    footerColumn: 'Support',
    footerOrder: 2,
    content: `<h2>Information We Collect</h2><p>We collect information you provide when creating an account, making purchases, or contacting us — including name, email address, and payment information.</p><h2>How We Use Your Information</h2><p>We use your information to process transactions, send order updates, provide customer support, and improve our services.</p><h2>Data Security</h2><p>We implement industry-standard security measures to protect your personal information. Payment data is processed by our payment partner Airwallex and is never stored on our servers.</p><h2>Cookies</h2><p>We use cookies to maintain your session and improve your browsing experience. You can disable cookies in your browser settings.</p><h2>Contact</h2><p>For privacy-related questions, contact <a href="mailto:privacy@noizu-direct.com">privacy@noizu-direct.com</a>.</p>`,
    seoTitle: 'Privacy Policy — NOIZU DIRECT',
    seoDescription: 'Read the Privacy Policy for NOIZU DIRECT marketplace.',
  },
  {
    slug: 'how-it-works',
    title: 'How It Works',
    status: 'PUBLISHED',
    showInFooter: 1,
    footerColumn: 'Marketplace',
    footerOrder: 3,
    content: `<h2>For Buyers</h2><ol><li><strong>Browse</strong> — Explore products from SEA creators across all categories.</li><li><strong>Buy</strong> — Add to cart and check out securely via Airwallex.</li><li><strong>Receive</strong> — Digital products are delivered instantly. Physical items ship directly from the creator.</li><li><strong>Connect</strong> — Message creators directly to discuss commissions or custom orders.</li></ol><h2>For Creators</h2><ol><li><strong>Sign Up</strong> — Register as a creator and set up your storefront.</li><li><strong>List Products</strong> — Upload your digital or physical products with descriptions and pricing.</li><li><strong>Sell</strong> — Buyers purchase directly from your storefront.</li><li><strong>Get Paid</strong> — Funds are transferred to your Airwallex account after order completion.</li></ol><h2>Fees</h2><p>NOIZU DIRECT charges a platform fee of 8% on each transaction. Payment processing fees of 2.5% also apply. That's it — no monthly fees, no listing fees.</p>`,
    seoTitle: 'How NOIZU DIRECT Works — Buying & Selling Guide',
    seoDescription: 'Learn how to buy from and sell on NOIZU DIRECT, the SEA creator marketplace.',
  },
  {
    slug: 'creator-handbook',
    title: 'Creator Handbook',
    status: 'PUBLISHED',
    showInFooter: 1,
    footerColumn: 'Creators',
    footerOrder: 2,
    content: `<h2>Getting Started</h2><p>Welcome to NOIZU DIRECT! This handbook will help you set up a successful storefront and start selling to your fans.</p><h2>Setting Up Your Profile</h2><p>Complete your creator profile with a high-quality avatar, banner image, and bio. Creators with complete profiles see 3× more traffic.</p><h2>Listing Your Products</h2><p>NOIZU DIRECT supports both digital and physical products. For digital products, upload your files securely — buyers receive a download link after purchase. For physical products, set accurate shipping estimates and costs.</p><h2>Pricing Strategy</h2><p>Research similar products on the platform. Remember that NOIZU DIRECT charges an 8% platform fee plus 2.5% payment processing. Price your products to cover these fees while remaining competitive.</p><h2>Marketing Your Store</h2><p>Share your storefront link on social media. Use the badge system — Top Creator badges increase buyer trust. Respond to messages promptly to build your reputation.</p><h2>Payouts</h2><p>Request payouts once your balance reaches the minimum threshold. Funds are transferred to your connected Airwallex account within 2-5 business days.</p>`,
    seoTitle: 'Creator Handbook — NOIZU DIRECT',
    seoDescription: 'Everything you need to know about selling on NOIZU DIRECT.',
  },
  {
    slug: 'fees-payouts',
    title: 'Fees & Payouts',
    status: 'PUBLISHED',
    showInFooter: 1,
    footerColumn: 'Creators',
    footerOrder: 3,
    content: `<h2>Platform Fees</h2><p>NOIZU DIRECT charges the following fees on each transaction:</p><ul><li><strong>Platform fee:</strong> 8% of the sale price</li><li><strong>Payment processing:</strong> 2.5% of the sale price</li><li><strong>Total:</strong> 10.5% deducted from each sale</li></ul><p>There are no monthly subscription fees, listing fees, or hidden charges.</p><h2>Payout Schedule</h2><p>Your earnings are held for 7 days after order completion to allow for dispute resolution. After that, funds are available for withdrawal.</p><h2>Minimum Payout</h2><p>The minimum payout amount is $10 USD. You can request a payout at any time once your balance meets this threshold.</p><h2>Supported Currencies</h2><p>Payouts are made in USD, MYR, SGD, PHP, THB, or IDR depending on your Airwallex account configuration.</p><h2>Taxes</h2><p>Creators are responsible for declaring and paying applicable taxes in their jurisdiction. NOIZU DIRECT provides transaction records to assist with tax reporting.</p>`,
    seoTitle: 'Fees & Payouts — NOIZU DIRECT Creator Guide',
    seoDescription: 'Understand platform fees and payout schedule on NOIZU DIRECT.',
  },
  {
    slug: 'help',
    title: 'Help Centre',
    status: 'PUBLISHED',
    showInFooter: 1,
    footerColumn: 'Support',
    footerOrder: 4,
    content: `<h2>Frequently Asked Questions</h2><h3>How do I track my order?</h3><p>Log in to your account and visit Orders to see real-time order status and tracking information.</p><h3>Can I get a refund?</h3><p>Digital products are non-refundable once downloaded. For physical products, contact the creator directly within 7 days of delivery.</p><h3>How do I contact a creator?</h3><p>Visit the creator's storefront and click Message Creator. You must be logged in to send messages.</p><h3>My download link is not working</h3><p>Download links expire after 72 hours and are limited to 3 downloads. Contact support if you need a new link.</p><h3>How do I become a creator?</h3><p>Register for a buyer account first, then apply for creator status from your dashboard. Applications are reviewed within 48 hours.</p><h2>Contact Support</h2><p>Still need help? Email us at <a href="mailto:support@noizu-direct.com">support@noizu-direct.com</a> and we will respond within 24 hours.</p>`,
    seoTitle: 'Help Centre — NOIZU DIRECT Support',
    seoDescription: 'Get answers to common questions about NOIZU DIRECT.',
  },
  {
    slug: 'contact',
    title: 'Contact Us',
    status: 'PUBLISHED',
    showInFooter: 1,
    footerColumn: 'Support',
    footerOrder: 5,
    content: `<h2>Get in Touch</h2><p>We would love to hear from you. Here is how to reach the NOIZU DIRECT team:</p><h2>General Enquiries</h2><p>Email: <a href="mailto:hello@noizu-direct.com">hello@noizu-direct.com</a></p><h2>Creator Support</h2><p>Email: <a href="mailto:creators@noizu-direct.com">creators@noizu-direct.com</a></p><h2>Technical Support</h2><p>Email: <a href="mailto:support@noizu-direct.com">support@noizu-direct.com</a></p><h2>Partnership and Press</h2><p>Email: <a href="mailto:partnerships@noizu-direct.com">partnerships@noizu-direct.com</a></p>`,
    seoTitle: 'Contact NOIZU DIRECT',
    seoDescription: 'Contact the NOIZU DIRECT team for support, partnerships, or general enquiries.',
  },
]

const POSTS_DATA = [
  {
    slug: 'welcome-to-noizu-direct',
    title: 'Welcome to NOIZU DIRECT — Your Home for SEA Creator Commerce',
    excerpt: 'NOIZU DIRECT launches today as the dedicated marketplace for Southeast Asian cosplay, doujin, and anime creators.',
    coverImage: 'https://picsum.photos/seed/welcome/1200/630',
    status: 'PUBLISHED',
    publishedAt: '2026-01-15T08:00:00.000Z',
    tags: JSON.stringify(['announcement', 'launch', 'platform']),
    content: `<p>We are incredibly excited to announce the launch of <strong>NOIZU DIRECT</strong> — a dedicated marketplace built for and by the Southeast Asian creator community.</p><h2>Why We Built This</h2><p>Southeast Asia has an incredible creative community — cosplayers, doujin artists, illustrators, and makers who pour their hearts into their craft. But existing platforms were not built with SEA creators in mind: high international fees, currency conversion headaches, and no understanding of the local creative culture.</p><p>NOIZU DIRECT changes that. We built a platform that feels like home — with multi-currency support, low fees, and a community that actually understands the difference between a dakimakura and a doujinshi.</p><h2>What We Offer</h2><ul><li><strong>Zero listing fees</strong> — List as many products as you want for free</li><li><strong>Low platform fees</strong> — Just 8% + 2.5% payment processing</li><li><strong>Multi-currency payouts</strong> — Get paid in MYR, SGD, PHP, THB, IDR, or USD</li><li><strong>Direct messaging</strong> — Talk to your fans and commissioners directly</li></ul>`,
    seoTitle: 'Welcome to NOIZU DIRECT — SEA Creator Marketplace Launch',
    seoDescription: 'NOIZU DIRECT launches as the dedicated marketplace for Southeast Asian cosplay, doujin, and anime creators.',
  },
  {
    slug: 'creator-spotlight-sakura-arts',
    title: 'Creator Spotlight: Sakura Arts — From Fan to Full-Time Creator',
    excerpt: 'We sit down with Sakura Arts to talk about her journey from hobbyist to professional digital artist.',
    coverImage: 'https://picsum.photos/seed/sakura/1200/630',
    status: 'PUBLISHED',
    publishedAt: '2026-01-28T08:00:00.000Z',
    tags: JSON.stringify(['creator-spotlight', 'interview', 'digital-art']),
    content: `<p>This month's creator spotlight features <strong>Sakura Arts</strong>, a digital illustrator from Kuala Lumpur who has been creating anime-inspired artwork for over five years.</p><h2>Tell us about yourself</h2><p>"I started drawing fan art when I was 14 — mostly Naruto and Bleach characters. I never imagined I would be doing this full-time."</p><h2>What made you join NOIZU DIRECT?</h2><p>"I was selling on a few other platforms but the fees were killing me. NOIZU DIRECT's fees are much more reasonable, and getting paid in Ringgit directly is a game changer."</p><h2>Advice for new creators?</h2><p>"Consistency matters more than perfection. Post regularly, engage with your community, and do not be afraid to respond to messages. Your fans want to connect with you as a person."</p>`,
    seoTitle: 'Creator Spotlight: Sakura Arts — NOIZU DIRECT Blog',
    seoDescription: 'Interview with Sakura Arts, digital illustrator and top creator on NOIZU DIRECT.',
  },
  {
    slug: 'guide-selling-digital-products',
    title: 'Complete Guide to Selling Digital Products on NOIZU DIRECT',
    excerpt: 'Everything you need to know about listing, pricing, and delivering digital products.',
    coverImage: 'https://picsum.photos/seed/digital-guide/1200/630',
    status: 'PUBLISHED',
    publishedAt: '2026-02-05T08:00:00.000Z',
    tags: JSON.stringify(['guide', 'digital-products', 'creators']),
    content: `<p>Digital products are the most popular category on NOIZU DIRECT. They are easy to list, instantly deliverable, and require no shipping logistics.</p><h2>What Counts as a Digital Product?</h2><ul><li>Illustration packs (JPG, PNG, PSD)</li><li>Wallpaper collections</li><li>Sticker sheets (PDF, PNG)</li><li>Cosplay patterns (PDF)</li><li>eBooks and guides (PDF)</li></ul><h2>Pricing Tips</h2><p>Research comparable products. A single high-quality wallpaper typically sells for $2-5 USD. Bundles of 5-10 items at a slight discount perform well.</p><h2>Delivery</h2><p>When a buyer completes their purchase, they receive an automatic email with a secure download link. Links expire after 72 hours and are limited to 3 downloads per purchase.</p>`,
    seoTitle: 'Guide to Selling Digital Products — NOIZU DIRECT',
    seoDescription: 'Complete guide to listing, pricing, and delivering digital products on NOIZU DIRECT.',
  },
  {
    slug: 'wcs-malaysia-2026-recap',
    title: 'WCS Malaysia 2026 — NOIZU DIRECT Booth Recap',
    excerpt: 'We had an incredible time at the World Cosplay Summit Malaysia qualifier. Here is a recap.',
    coverImage: 'https://picsum.photos/seed/wcsmalaysia/1200/630',
    status: 'PUBLISHED',
    publishedAt: '2026-02-20T08:00:00.000Z',
    tags: JSON.stringify(['events', 'cosplay', 'malaysia', 'wcs']),
    content: `<p>Last weekend we attended <strong>WCS Malaysia 2026</strong>, the World Cosplay Summit Malaysian qualifier. Thank you to everyone who stopped by our booth!</p><h2>Highlights</h2><p>Over 2,000 attendees visited over the two-day event. Our creator wall featured profiles from over 30 NOIZU DIRECT creators, and we processed nearly 150 on-the-spot account registrations.</p><h2>Creator Meet and Greet</h2><p>We hosted a creator meet and greet on Saturday afternoon with five of our top creators. The queue stretched around the hall!</p><h2>What is Next</h2><p>We will be attending AnimeFest KL in April and ComiCon Singapore in June. Follow us on social media to stay updated.</p>`,
    seoTitle: 'WCS Malaysia 2026 Recap — NOIZU DIRECT Blog',
    seoDescription: 'Recap of the NOIZU DIRECT booth at WCS Malaysia 2026 cosplay qualifier.',
  },
  {
    slug: 'top-creator-badge-explained',
    title: 'What is the NOIZU DIRECT Top Creator Badge?',
    excerpt: 'Our Top Creator badge is awarded to the platform\'s highest-performing creators. Here\'s exactly how to earn one.',
    coverImage: 'https://picsum.photos/seed/topbadge/1200/630',
    status: 'PUBLISHED',
    publishedAt: '2026-03-01T08:00:00.000Z',
    tags: JSON.stringify(['platform', 'creators', 'badges']),
    content: `<p>The <strong>Top Creator badge</strong> is our way of recognising exceptional creators on NOIZU DIRECT. Buyers see the badge on creator profiles and it significantly increases trust and conversion rates.</p><h2>How to Earn It</h2><ul><li><strong>Sales volume</strong> — minimum 20 completed orders</li><li><strong>Revenue</strong> — at least $200 USD in completed transactions</li><li><strong>Response rate</strong> — replies to 80%+ of messages within 24 hours</li><li><strong>Account standing</strong> — no active violations or suspensions</li></ul><h2>What You Get</h2><ul><li>Priority placement in search results</li><li>Featured spots on the homepage</li><li>Access to our Top Creator Discord channel</li><li>Early access to new platform features</li></ul>`,
    seoTitle: 'How to Earn the NOIZU DIRECT Top Creator Badge',
    seoDescription: 'Learn what the Top Creator badge means and how to earn it on NOIZU DIRECT.',
  },
  {
    slug: 'new-features-q1-2026',
    title: 'New Features: What\'s New on NOIZU DIRECT in Q1 2026',
    excerpt: 'Commission system, bundle pricing, and improved messaging — here\'s everything we shipped this quarter.',
    coverImage: 'https://picsum.photos/seed/q1features/1200/630',
    status: 'PUBLISHED',
    publishedAt: '2026-03-31T08:00:00.000Z',
    tags: JSON.stringify(['product-updates', 'features', 'platform']),
    content: `<p>Q1 2026 was a big quarter for NOIZU DIRECT. Here is a roundup of everything we shipped:</p><h2>Commission System</h2><p>Creators can now list commission slots with custom pricing tiers, turnaround times, and reference image uploads.</p><h2>Bundle Pricing</h2><p>Products can now be grouped into bundles with automatic discount calculation.</p><h2>Improved Messaging</h2><p>The messaging system got a major overhaul: image sharing, read receipts, and message search.</p><h2>What is Coming in Q2</h2><p>We are working on a review and ratings system, a wishlist feature for buyers, and Stripe as an additional payment option.</p>`,
    seoTitle: 'NOIZU DIRECT Q1 2026 Feature Update',
    seoDescription: 'See what new features launched on NOIZU DIRECT in Q1 2026.',
  },
]

function upsertPage(page) {
  const existing = db.prepare('SELECT id FROM Page WHERE slug = ?').get(page.slug)
  const ts = now()
  if (existing) {
    db.prepare(`UPDATE Page SET title=?, content=?, status=?, showInFooter=?, footerColumn=?, footerOrder=?, seoTitle=?, seoDescription=?, updatedAt=? WHERE slug=?`)
      .run(page.title, page.content, page.status, page.showInFooter, page.footerColumn, page.footerOrder, page.seoTitle, page.seoDescription, ts, page.slug)
    console.log('Updated page:', page.slug)
  } else {
    db.prepare(`INSERT INTO Page (id, slug, title, content, status, showInFooter, footerColumn, footerOrder, seoTitle, seoDescription, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(cuid(), page.slug, page.title, page.content, page.status, page.showInFooter, page.footerColumn, page.footerOrder, page.seoTitle, page.seoDescription, ts, ts)
    console.log('Created page:', page.slug)
  }
}

function upsertPost(post, authorId) {
  const existing = db.prepare('SELECT id FROM Post WHERE slug = ?').get(post.slug)
  const ts = now()
  if (existing) {
    db.prepare(`UPDATE Post SET title=?, excerpt=?, content=?, coverImage=?, status=?, publishedAt=?, tags=?, seoTitle=?, seoDescription=?, updatedAt=? WHERE slug=?`)
      .run(post.title, post.excerpt, post.content, post.coverImage, post.status, post.publishedAt, post.tags, post.seoTitle, post.seoDescription, ts, post.slug)
    console.log('Updated post:', post.slug)
  } else {
    db.prepare(`INSERT INTO Post (id, slug, title, excerpt, content, coverImage, authorId, status, publishedAt, tags, seoTitle, seoDescription, viewCount, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`)
      .run(cuid(), post.slug, post.title, post.excerpt, post.content, post.coverImage, authorId, post.status, post.publishedAt, post.tags, post.seoTitle, post.seoDescription, ts, ts)
    console.log('Created post:', post.slug)
  }
}

try {
  const admin = db.prepare("SELECT id FROM User WHERE role = 'ADMIN' LIMIT 1").get()
  if (!admin) {
    console.error('No ADMIN user found. Run the main seed first.')
    process.exit(1)
  }

  for (const page of PAGES) upsertPage(page)
  for (const post of POSTS_DATA) upsertPost(post, admin.id)

  console.log('\nCMS seed complete.')
} finally {
  db.close()
}
