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

const TITLE = 'Terms of Service'
const SEO_TITLE = 'Terms of Service — noizu.direct'
const SEO_DESCRIPTION =
  'The agreement between noizu.direct and the buyers, creators, and visitors who use the platform. Covers escrow, fees, disputes, content policy, and liability.'

const CONTENT = `<blockquote>
<p><strong>Summary.</strong> noizu.direct is an online marketplace that connects Southeast Asian creators with buyers. Payments for every order are placed into escrow and released to the creator only after the product or service has been delivered and accepted. These Terms set out the rights and obligations of everyone who uses the platform &mdash; please read them in full before creating an account or completing a purchase.</p>
</blockquote>

<p><em>These Terms took effect on <strong>22 April 2026</strong> and supersede all prior versions.</em></p>

<h2>Introduction</h2>
<p>noizu.direct (&ldquo;<strong>noizu.direct</strong>&rdquo;, &ldquo;<strong>we</strong>&rdquo;, &ldquo;<strong>our</strong>&rdquo;, or &ldquo;<strong>us</strong>&rdquo;) operates an online marketplace that enables independent creators based in Southeast Asia to offer digital downloads, physical merchandise, and commissioned works directly to consumers. By accessing the website at <a href="https://noizu.direct">https://noizu.direct</a> or using any service provided through it (collectively, the &ldquo;<strong>Services</strong>&rdquo;), you agree to be bound by these Terms of Service (the &ldquo;<strong>Terms</strong>&rdquo;). If you do not agree, you must not use the Services.</p>
<p>We act as an intermediary that facilitates transactions between creators (&ldquo;<strong>Sellers</strong>&rdquo;) and purchasers (&ldquo;<strong>Buyers</strong>&rdquo;). We are not the manufacturer, publisher, or licensor of the goods and services listed on the platform. We do, however, operate the payment escrow, dispute-resolution process, and trust-and-safety programme that govern how transactions are conducted on the Services.</p>

<h2>Eligibility and Accounts</h2>
<ul>
<li>You must be at least 18 years of age, or have the consent of a parent or legal guardian, to register for an account.</li>
<li>Each individual may hold only one personal account. Operating multiple creator accounts to manipulate discovery, reviews, or promotions is prohibited.</li>
<li>You are responsible for maintaining the confidentiality of your credentials and for all activity that occurs under your account. Any unauthorised access must be reported to us without undue delay.</li>
<li>You may close your account at any time from <a href="/dashboard/close-account">your dashboard</a>. Personal data will be handled in accordance with our <a href="/privacy">Privacy Policy</a> following the resolution of any outstanding orders.</li>
</ul>

<h2>Purchases and Escrow</h2>
<p>All prices are displayed in Malaysian Ringgit (MYR) by default. Buyers may view prices in alternative currencies using the currency switcher; however, settlement is performed in MYR unless a Seller has expressly offered an alternative settlement currency for a specific listing.</p>
<p>When a Buyer completes checkout, the purchase amount is placed into <strong>escrow</strong>. Funds are held by noizu.direct and are not transferred to the Seller until the transaction has been successfully completed:</p>
<ul>
<li><strong>Digital goods.</strong> Escrow is released upon the Buyer&rsquo;s first successful download, or seven (7) days after purchase, whichever occurs first.</li>
<li><strong>Physical goods.</strong> Escrow is released when a tracked shipment is confirmed as delivered, plus a forty-eight (48) hour confirmation period during which the Buyer may raise a dispute.</li>
<li><strong>Commissioned works.</strong> Escrow is released when the Buyer marks the commission as accepted, or fourteen (14) days after the Seller marks the work as delivered in the absence of a Buyer response.</li>
</ul>

<h2>Fees</h2>
<p>A non-refundable <strong>processing fee of 2.5%</strong> is applied to every order at checkout to cover payment-gateway costs. The platform commission charged to Sellers is separate from the processing fee and is published on our <a href="/fees">Fees page</a>. We reserve the right to revise fees from time to time on reasonable prior notice; any revision will apply only to transactions initiated after the revised fees take effect.</p>

<h2>Refunds, Disputes, and Chargebacks</h2>
<p>If a Buyer believes that a delivered product or service materially differs from its listing, that a physical good has not arrived within the expected timeframe, or that a commission does not meet the agreed brief, the Buyer may open a dispute from the relevant order page within thirty (30) days of the purchase date.</p>
<p>Upon receiving a dispute, we will continue to hold the escrowed funds, request supporting evidence from both parties, and reach a determination in accordance with our published dispute policy. The majority of disputes are resolved within five (5) business days.</p>
<p>Buyers are entitled to pursue chargebacks through their card issuer; however, we strongly encourage use of the platform&rsquo;s dispute process in the first instance, which is typically faster and avoids the administrative consequences that accompany formal chargeback proceedings.</p>

<h2>Creator Terms</h2>
<p>Sellers are subject to additional requirements designed to protect Buyers and preserve the integrity of the marketplace.</p>
<h3>Vetting</h3>
<p>Before creator listings are made publicly visible, all applications are reviewed by our trust-and-safety team. Review typically concludes within one to three (1&ndash;3) business days and is intended to confirm identity, originality of work, and uniqueness of presence on the platform.</p>
<h3>Identity verification (KYC)</h3>
<p>Sellers must complete identity verification before earnings can be withdrawn. Verification documents&mdash;namely a government-issued photo identification and a selfie&mdash;are stored in an isolated, access-restricted storage bucket and are used solely for the purpose of identity verification and regulatory compliance. They are not made available to Buyers or to other Sellers.</p>
<h3>Payouts</h3>
<p>Payouts for completed orders are processed on a weekly cadence to the Seller&rsquo;s registered bank account or supported e-wallet. When a Seller updates a payout destination, a <strong>forty-eight (48) hour security cooldown</strong> applies before the new destination becomes effective. The cooldown is intended to mitigate account-takeover risk; Sellers are notified of the change at the point of request and may revoke it at any time within the cooldown window.</p>
<h3>Chargebacks and reversals</h3>
<p>If a payment that has already been released to a Seller is reversed by the Buyer&rsquo;s card issuer, the disputed amount will be placed on hold against the Seller&rsquo;s subsequent payouts until the chargeback is resolved. If the issuer rules against the Seller, the amount will be deducted; if the ruling is in the Seller&rsquo;s favour, the held amount will be released in full.</p>

<h2>Content Policy</h2>
<p>noizu.direct is purpose-built for the Southeast Asian creator economy, in which transformative fan work forms a substantial and long-established part of cultural output. Our content policy reflects that context.</p>
<p><strong>Permitted content includes:</strong></p>
<ul>
<li>Original works authored by the Seller, including illustrations, photography, written works, character designs, and cosplay productions.</li>
<li>Transformative fan works, including fan art, fan comics, doujinshi, and cosplay interpretations of existing characters, in keeping with the established norms of the community in which the platform operates.</li>
</ul>
<p><strong>Prohibited content includes:</strong></p>
<ul>
<li>Unauthorised reproduction of another individual&rsquo;s artwork, photography, or writing.</li>
<li>AI-generated images produced using models trained on a specific artist&rsquo;s body of work without that artist&rsquo;s express consent.</li>
<li>Counterfeit merchandise, including unauthorised reproductions of officially licensed goods.</li>
<li>Any listing reasonably likely to be mistaken for, or to materially compete with, the original rights-holder&rsquo;s commercial product.</li>
</ul>
<p>Sellers are solely responsible for ensuring that their listings do not infringe the intellectual property or moral rights of any third party. Upon receipt of a valid takedown request, we will remove the disputed listing and notify the Seller. Repeated infringement will result in suspension or termination of the Seller&rsquo;s account.</p>

<h2>Prohibited Conduct</h2>
<p>The following conduct is strictly prohibited on the Services:</p>
<ul>
<li>Any activity that is unlawful under the laws of Malaysia or any other jurisdiction applicable to the relevant user.</li>
<li>Sexual content involving, or appearing to involve, any person under 18 years of age. This prohibition extends to &ldquo;aged-up&rdquo; depictions of canonically minor characters and is enforced without exception.</li>
<li>Hate speech, targeted harassment, threats, and content whose purpose is to inflict harm upon a specific individual or group.</li>
<li>Fraudulent or deceptive listings, including bait-and-switch tactics and listings that do not correspond to the goods actually delivered.</li>
<li>Resale of leaked, stolen, or otherwise unlawfully obtained content.</li>
<li>Any activity in contravention of applicable anti-money-laundering requirements or card-scheme rules, including card testing and payment-system abuse.</li>
</ul>
<p>Violations will result in removal of offending listings, suspension or termination of the associated account, and, where appropriate, referral to law-enforcement authorities.</p>

<h2>Intellectual Property and User Content</h2>
<p>You retain ownership of all content that you upload to the Services, including artwork, photographs, and descriptive text (collectively, &ldquo;<strong>User Content</strong>&rdquo;). By submitting User Content, you grant noizu.direct a non-exclusive, worldwide, royalty-free licence to host, reproduce, display, distribute, and promote the User Content for the limited purpose of operating, improving, and marketing the Services. This licence includes the right to feature your User Content in search results, in communications to users, and in promotional channels operated by noizu.direct.</p>
<p>The licence granted above terminates when the corresponding listing is removed or the associated account is closed, except with respect to copies of digital goods already delivered to Buyers, which remain the Buyer&rsquo;s property in accordance with the terms of their purchase.</p>

<h2>Privacy</h2>
<p>We collect and process personal information only to the extent necessary to operate the Services, maintain the security of user accounts, and comply with applicable laws. Full details of our data-handling practices are set out in our <a href="/privacy">Privacy Policy</a>, which forms part of these Terms by reference.</p>

<h2>Disclaimers and Limitation of Liability</h2>
<p>The Services are provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. Whilst we make commercially reasonable efforts to maintain the integrity of the escrow, dispute-resolution, and fraud-prevention systems, we do not warrant that the Services will be uninterrupted, error-free, or free from loss of data.</p>
<p>To the maximum extent permitted by applicable law, our aggregate liability in respect of any claim arising out of or in connection with a marketplace transaction shall not exceed the total amount paid by the Buyer for that transaction. We shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, goodwill, data, or anticipated savings.</p>
<p>We shall not be liable for any failure or delay in performance caused by events beyond our reasonable control, including but not limited to acts of God, acts or omissions of governmental authorities, network or payment-gateway outages, telecommunications interruptions, and other force-majeure events.</p>

<h2>Governing Law and Dispute Resolution</h2>
<p>These Terms shall be governed by and construed in accordance with the laws of Malaysia, without regard to its conflict-of-laws principles. Any dispute, controversy, or claim arising out of or relating to these Terms that cannot be resolved through the platform&rsquo;s internal dispute-resolution process shall be submitted to the exclusive jurisdiction of the courts of Malaysia.</p>

<h2>Changes to These Terms</h2>
<p>We may amend these Terms from time to time to reflect changes in the law, in the Services, or in our business practices. Material amendments&mdash;including any change affecting how payments are processed, how personal data is used, or what content is permitted&mdash;will be notified to registered users by email at least fourteen (14) days before they take effect. Minor clarifications may be reflected by updating the &ldquo;effective date&rdquo; at the top of these Terms.</p>

<h2>Contact</h2>
<p>Questions concerning these Terms, rights-holder takedown notices, and trust-and-safety reports may be directed to the addresses below.</p>
<ul>
<li><strong>General enquiries:</strong> <a href="mailto:support@noizu.direct">support@noizu.direct</a></li>
<li><strong>Legal and intellectual property:</strong> <a href="mailto:legal@noizu.direct">legal@noizu.direct</a></li>
<li><strong>Trust and safety &middot; abuse reports:</strong> <a href="mailto:abuse@noizu.direct">abuse@noizu.direct</a></li>
</ul>
<p>We aim to respond to all written enquiries within two (2) business days.</p>`

const before = await client.query(
  `SELECT id, title, LENGTH(COALESCE(content,'')) AS len FROM "Page" WHERE slug=$1`,
  ['terms']
)
console.log('BEFORE:', before.rows[0])

const res = await client.query(
  `UPDATE "Page"
     SET title = $2,
         content = $3,
         "seoTitle" = $4,
         "seoDescription" = $5,
         status = 'PUBLISHED'
   WHERE slug = $1
   RETURNING id, slug, LENGTH(content) AS len, "seoTitle"`,
  ['terms', TITLE, CONTENT, SEO_TITLE, SEO_DESCRIPTION]
)
console.log('AFTER:', res.rows[0])

await client.end()
