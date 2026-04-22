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

const TITLE = 'Help Centre'
const SEO_TITLE = 'Help Centre — noizu.direct'
const SEO_DESCRIPTION =
  'Guides and answers for buyers and creators on noizu.direct. Orders, payments, shipping, commissions, account, and trust & safety.'

// Detailed answers body. The hero, quick-links grid, "most asked" cards,
// and support-channel inboxes live as hardcoded React in src/app/help/page.tsx.
// Only the long-form FAQ prose flows through the CMS so that operations,
// support, and creator-ops can update wording without a deploy.
const CONTENT = `<blockquote>
<p><strong>How this page works.</strong> The headings below match the topic tiles above, so you can jump straight to the section you need. Every answer is written for both buyers and creators where that makes sense &mdash; look for the <em>For buyers</em> and <em>For creators</em> labels. If anything here contradicts our <a href="/terms">Terms of Service</a>, the Terms take precedence.</p>
</blockquote>

<h2>Buying</h2>
<h3>How do I place an order?</h3>
<p>Browse the <a href="/marketplace">marketplace</a>, add items to your cart, and complete checkout. You do not need an account to buy physical goods or commissions, but you will need one to access digital downloads and order history. Digital downloads are unlocked immediately after payment clears.</p>
<h3>What payment methods do you accept?</h3>
<p>Credit and debit cards (Visa, Mastercard, American Express), Malaysian online banking (FPX), Apple Pay, Google Pay, and a growing list of regional wallets. Payments are processed by Airwallex; noizu.direct never stores your full card number.</p>
<h3>Where is my order?</h3>
<p>Sign in and open your <a href="/account/orders">order history</a>. Physical orders display the tracking link the creator has provided; digital orders display a download button that generates a short-lived signed URL. If your tracking has not updated for more than seven days, <a href="mailto:support@noizu.direct">write to support</a> and we will chase it up with the creator.</p>
<h3>Can I change or cancel an order?</h3>
<p>Digital orders cannot be cancelled once the download has been accessed. Physical orders can be cancelled for a full refund up to the moment the creator marks the order as dispatched; after dispatch, cancellations become returns and are subject to the creator&rsquo;s return policy. Commissions can be cancelled by mutual agreement at any stage before final delivery &mdash; see <em>Commissions</em> below for the refund schedule.</p>

<h2>Selling</h2>
<h3>How do I become a creator?</h3>
<p>Apply from <a href="/register/creator">the creator sign-up page</a>. You will be asked for a short description of your work, example links, and a display name. Applications are reviewed within one to three business days by our trust-and-safety team.</p>
<h3>What can I sell?</h3>
<p>noizu.direct supports four product types: digital downloads (art, zines, patterns, reference packs), physical goods (prints, merch, props), print-on-demand merchandise, and commissions. The full content policy lives in the <a href="/terms">Terms of Service</a> &mdash; most transformative fan and doujin work is permitted; counterfeit and unlicensed reproductions are not.</p>
<h3>How do payouts work?</h3>
<p>Once KYC is complete, payouts run weekly to your registered bank account or e-wallet. When you change a payout destination, a forty-eight-hour security cooldown applies before the new destination becomes active &mdash; this is deliberate and protects you against account-takeover fraud.</p>
<h3>Do you charge platform commission?</h3>
<p>During launch, <strong>zero per cent</strong>. The only unavoidable deduction is the 2.5% payment-processing fee that covers card-gateway costs. Our long-term commission plan is published on the <a href="/fees">fees page</a> and will take effect with at least fourteen days&rsquo; notice.</p>

<h2>Payments</h2>
<h3>How are fees calculated?</h3>
<p>Every order includes a 2.5% processing fee applied to the gross amount paid by the buyer. This fee is non-refundable on completed transactions because it is paid to the payment gateway. Platform commission (currently 0%) is calculated on the subtotal before processing fees, and will apply when and if enabled.</p>
<h3>When is my payment released?</h3>
<p><em>For buyers.</em> Your payment sits in escrow until delivery is confirmed, so you have recourse if something goes wrong. <em>For creators.</em> Funds are released on the following schedule &mdash; digital goods: at first download or seven days, whichever comes first; physical goods: forty-eight hours after tracked delivery; commissions: on buyer acceptance or fourteen days after you mark the work delivered, whichever comes first.</p>
<h3>Why was my card declined?</h3>
<p>The most common causes are 3-D Secure authentication failure, a mismatch between the billing country and the card issuer&rsquo;s country, and issuer-side fraud holds. Try a different card, or switch to a local method such as FPX or an e-wallet. If the same card is repeatedly declined, contact your bank &mdash; we cannot see the issuer&rsquo;s decline reason.</p>
<h3>Can I get a refund?</h3>
<p>Yes. If a product is not as described, not delivered, or materially defective, open a dispute from the order page within thirty days of purchase. We will review evidence from both sides and issue a determination, typically within five business days. Most disputes are resolved with a partial or full refund paid directly from the escrowed funds &mdash; no chargeback needed.</p>

<h2>Shipping</h2>
<h3>Where do you ship?</h3>
<p>Shipping destinations are set by each creator. Most creators ship within Southeast Asia by default and offer international shipping on request. The checkout page will show you whether a creator ships to your country before you pay &mdash; if the destination is unsupported, you cannot complete the order.</p>
<h3>How long does delivery take?</h3>
<p>Within Malaysia, most creators dispatch within three to five business days and delivery completes within one to two weeks. Within Southeast Asia, expect one to three weeks. International destinations vary by courier and may take three to six weeks, excluding customs delays.</p>
<h3>What about customs and duties?</h3>
<p>For international shipments, the buyer is responsible for any import duties or VAT charged on arrival. If you refuse a parcel at customs because of unexpected charges, the order cannot be refunded for the shipping portion.</p>
<h3>My parcel arrived damaged or missing items</h3>
<p>Photograph the external packaging before opening, then photograph the contents. Open a dispute from the order page within seventy-two hours of delivery and attach the photographs. Time-bound evidence is what lets us decide these disputes quickly in your favour.</p>

<h2>Commissions</h2>
<h3>How does a commission work end-to-end?</h3>
<p>You brief the creator through a listing, agree on price and timeline, and pay. Payment enters escrow and moves through the stages set by the creator &mdash; typically <em>accepted</em>, <em>sketch</em>, <em>final</em>. You approve each milestone. On final delivery, you either accept the work (escrow releases to the creator) or request up to two revisions as defined in the listing.</p>
<h3>What if I change my mind partway through?</h3>
<p>Cancellation before the creator has begun work refunds the full amount. After work starts, refunds follow the schedule declared in the listing &mdash; typically 75% at sketch stage and 25% once a final has been submitted. The Terms of Service set the maximum refund a creator may withhold even on a late-stage cancellation.</p>
<h3>Can I use a commission commercially?</h3>
<p>Commercial rights must be agreed explicitly at the briefing stage and reflected in the listing price. By default, commissions convey personal-use rights only. Using commissioned work on merchandise or advertising without an agreed commercial licence breaches the creator&rsquo;s copyright and the platform Terms.</p>

<h2>Account</h2>
<h3>How do I enable two-factor authentication?</h3>
<p>From your account settings, open <em>Security</em> and choose an authenticator app (Google Authenticator, Authy, 1Password). We strongly recommend enabling two-factor authentication on every account and making it mandatory for creator accounts.</p>
<h3>I forgot my password</h3>
<p>Use the <a href="/forgot-password">reset link</a> from the sign-in page. A reset email is sent to the registered address; the link is valid for thirty minutes. If you no longer have access to the registered email, write to <a href="mailto:support@noizu.direct">support@noizu.direct</a> from a verified channel &mdash; account recovery is a manual review to prevent takeover.</p>
<h3>How do I close my account?</h3>
<p>Buyers can close accounts at any time from <a href="/dashboard/close-account">the dashboard</a>. Creators must first complete any outstanding orders and resolve any open disputes. After closure, personal data is handled in accordance with the <a href="/privacy">Privacy Policy</a>, including retention periods set by Malaysian tax law.</p>

<h2>Trust and safety</h2>
<h3>I think a listing is counterfeit or infringes copyright</h3>
<p>Report it from the listing page, or write to <a href="mailto:abuse@noizu.direct">abuse@noizu.direct</a> with the listing URL and a short description of the infringement. We respond to all takedown requests within two business days. Repeat infringement leads to account suspension.</p>
<h3>A creator is impersonating someone</h3>
<p>Write to <a href="mailto:abuse@noizu.direct">abuse@noizu.direct</a>. Identity reports are prioritised and typically actioned within one business day. If you are the person being impersonated, we can expedite verification with a government-issued ID.</p>
<h3>I received something I did not order, or a scam invoice</h3>
<p>Screenshot everything and send it to <a href="mailto:abuse@noizu.direct">abuse@noizu.direct</a>. We can confirm whether the message originated from our systems &mdash; legitimate noizu.direct emails always come from an <code>@noizu.direct</code> address and link only to <code>noizu.direct</code> URLs.</p>

<h2>Still need help?</h2>
<p>If your situation is not covered above, the fastest route is email. Pick the inbox that matches your topic from the <em>Still stuck?</em> block further up the page. We aim to respond to the first message within one business day. For time-critical issues &mdash; a dispute deadline approaching, a payout blocked, suspected account takeover &mdash; mark your subject line with <strong>URGENT</strong> and we will triage it the same day.</p>`

const beforeRes = await client.query(
  `SELECT id, title, LENGTH(COALESCE(content,'')) AS len FROM "Page" WHERE slug=$1`,
  ['help']
)
console.log('BEFORE:', beforeRes.rows[0] ?? '(no row)')

const res = await client.query(
  `INSERT INTO "Page" (id, slug, title, content, "seoTitle", "seoDescription", status, "showInFooter", "footerColumn", "footerOrder", "updatedAt")
   VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, 'PUBLISHED', TRUE, 'Support', 20, NOW())
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
  ['help', TITLE, CONTENT, SEO_TITLE, SEO_DESCRIPTION]
)
console.log('AFTER:', res.rows[0])

await client.end()
