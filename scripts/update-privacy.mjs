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

const TITLE = 'Privacy Policy'
const SEO_TITLE = 'Privacy Policy — noizu.direct'
const SEO_DESCRIPTION =
  'How noizu.direct collects, uses, and protects the personal information of buyers, creators, and visitors. Malaysia PDPA and EU GDPR aligned.'

// CMS-editable narrative body of the privacy policy. The visual highlight
// blocks — "What we do / never do", "Information we collect", the retention
// grid, the rights grid, and the contact card — live as hardcoded React
// components in src/app/privacy/page.tsx. Only prose that may need amendments
// through /admin/cms/pages lives here.
//
// Elements allowed: h2, h3, h4, p, ul/ol/li, strong, em, u, blockquote, hr, a.
// Every one of these maps to a TipTap toolbar button, so edits stay WYSIWYG.
const CONTENT = `<blockquote>
<p><strong>In plain language.</strong> We collect only what is needed to run the marketplace, ship your orders, and meet our legal obligations. We do not sell your personal information. Payments are handled by Airwallex, so we never see your full card number. You can export or delete your data at any time from your account settings, or by writing to <a href="mailto:privacy@noizu.direct">privacy@noizu.direct</a>.</p>
</blockquote>

<p><em>This Privacy Policy took effect on <strong>22 April 2026</strong> and supersedes all prior versions.</em></p>

<h2>Introduction</h2>
<p>noizu.direct (&ldquo;<strong>noizu.direct</strong>&rdquo;, &ldquo;<strong>we</strong>&rdquo;, &ldquo;<strong>our</strong>&rdquo;, or &ldquo;<strong>us</strong>&rdquo;) operates a Southeast Asian creator marketplace at <a href="https://noizu.direct">https://noizu.direct</a>. This Policy describes what personal information we collect, why we collect it, and the choices you have over it. It applies to buyers, creators (&ldquo;<strong>Sellers</strong>&rdquo;), and general visitors.</p>
<p>We have written this Policy to meet our obligations under the Malaysia Personal Data Protection Act 2010 (&ldquo;<strong>PDPA</strong>&rdquo;) and, for users located in the European Economic Area or the United Kingdom, the EU and UK General Data Protection Regulation (&ldquo;<strong>GDPR</strong>&rdquo;). By using the Services, you confirm that you have read and understood this Policy. If you do not agree with it, please do not use the Services.</p>

<h2>How We Use Your Information</h2>
<p>We use personal information only for the purposes listed below. Each purpose corresponds to a lawful basis under the PDPA and, where applicable, the GDPR.</p>
<ul>
<li><strong>To provide the Services</strong> &mdash; creating and authenticating your account, processing orders, releasing escrowed funds, delivering digital goods, and routing physical shipments. <em>Basis: performance of a contract.</em></li>
<li><strong>To keep the Services safe</strong> &mdash; detecting and preventing fraud, enforcing the <a href="/terms">Terms of Service</a>, investigating reports of abuse, and protecting the rights of other users. <em>Basis: our legitimate interests in running a trustworthy marketplace.</em></li>
<li><strong>To comply with legal obligations</strong> &mdash; meeting tax, anti-money-laundering, sanctions-screening, and law-enforcement obligations. <em>Basis: legal obligation.</em></li>
<li><strong>To communicate service-critical information</strong> &mdash; order updates, dispute notices, security alerts, and material changes to this Policy or to the Terms. <em>Basis: performance of a contract and legitimate interests.</em></li>
<li><strong>To send marketing communications</strong> &mdash; only where you have opted in. You can opt out at any time from the footer of any marketing email, or from your notification settings. <em>Basis: your consent.</em></li>
<li><strong>To improve the Services</strong> &mdash; aggregated analytics and product research, ordinarily from de-identified data. <em>Basis: legitimate interests.</em></li>
</ul>

<h2>Sharing and Disclosure</h2>
<p>We share personal information only in the limited circumstances set out below. A current list of the sub-processors we rely on is available on request to <a href="mailto:privacy@noizu.direct">privacy@noizu.direct</a>.</p>
<ul>
<li><strong>With the Seller you transact with.</strong> When you buy a physical or print-on-demand item, we share the shipping name, address, and any dispatch-relevant contact details with that Seller for the sole purpose of fulfilling the order.</li>
<li><strong>With payment and logistics partners.</strong> Airwallex handles card and bank data under its own data-protection commitments. Shipping providers receive the address information necessary for delivery.</li>
<li><strong>With vetted service providers.</strong> We use a small number of vendors for hosting, transactional email, analytics, and customer-support tooling. These vendors act only on our instructions and under written contracts that require equivalent protection.</li>
<li><strong>With legal or regulatory authorities.</strong> We disclose information where we are legally required to do so, where it is necessary to protect the safety of users, or to establish or defend legal claims.</li>
<li><strong>In a business transfer.</strong> If we are ever involved in a merger, acquisition, or asset sale, personal information may be transferred subject to equivalent protection and a notice to affected users.</li>
<li><strong>With your consent</strong> &mdash; for any purpose not covered above, where you have explicitly agreed.</li>
</ul>

<h2>Where Your Data Is Processed</h2>
<p>Our primary production infrastructure is hosted with providers operating in the Asia-Pacific region, with disaster-recovery replicas in the European Economic Area. Where personal information is transferred outside the region in which it was collected, we rely on contractual safeguards consistent with the Malaysia PDPA and, for transfers from the EEA or UK, on the European Commission&rsquo;s Standard Contractual Clauses together with any supplementary measures appropriate to the receiving jurisdiction.</p>

<h2>Cookies and Similar Technologies</h2>
<p>We use a small number of cookies and similar technologies, grouped by purpose:</p>
<ul>
<li><strong>Strictly necessary</strong> &mdash; required for the Services to function, including session management, checkout, and fraud prevention. These cannot be disabled.</li>
<li><strong>Preferences</strong> &mdash; remember display choices such as theme, language, and currency.</li>
<li><strong>Analytics</strong> &mdash; help us understand aggregate usage of the Services so we can improve the product. Data is processed in de-identified form wherever possible.</li>
</ul>
<p>Where required by applicable law, we request your consent before setting non-essential cookies. You can manage your cookie preferences at any time from the footer link entitled &ldquo;Cookie settings&rdquo;.</p>

<h2>Children&rsquo;s Privacy</h2>
<p>The Services are not directed at children under the age of 18, and we do not knowingly collect personal information from children. If we become aware that we have inadvertently collected information from a child, we will delete that information without undue delay. A parent or legal guardian who believes that their child has provided information to noizu.direct may write to <a href="mailto:privacy@noizu.direct">privacy@noizu.direct</a>.</p>

<h2>Security</h2>
<p>We apply technical and organisational safeguards commensurate with the sensitivity of the information processed:</p>
<ul>
<li>TLS encryption in transit for all traffic between your browser and our servers.</li>
<li>Encryption at rest for sensitive fields, including KYC documents and password hashes.</li>
<li>Scoped, role-based access controls, with identity-verification data stored in an isolated bucket with a separate access policy.</li>
<li>Routine review of administrative access logs and of sign-in anomalies.</li>
<li>Mandatory two-factor authentication for all staff with production access.</li>
</ul>
<p>No system is ever completely immune to compromise. We strongly encourage you to enable two-factor authentication on your own noizu.direct account and to use a unique, high-entropy password.</p>

<h2>International Transfers</h2>
<p>Where personal information is transferred outside Malaysia, or outside the European Economic Area in the case of EEA-resident users, we rely on legally recognised transfer mechanisms &mdash; including standard contractual clauses and, where relevant, adequacy determinations. A list of the sub-processors engaged in such transfers is available on request.</p>

<h2>Changes to This Policy</h2>
<p>We may amend this Privacy Policy from time to time to reflect changes in the Services, in applicable law, or in our data-handling practices. <strong>Material amendments</strong> &mdash; including any change affecting the categories of information collected, the purposes of processing, or the third parties with whom information is shared &mdash; will be notified to registered users by email at least <strong>14 days</strong> before they take effect. Minor clarifications may be reflected by updating the effective date at the top of this Policy.</p>`

const before = await client.query(
  `SELECT id, title, LENGTH(COALESCE(content,'')) AS len FROM "Page" WHERE slug=$1`,
  ['privacy']
)
console.log('BEFORE:', before.rows[0] ?? '(no row)')

const res = await client.query(
  `INSERT INTO "Page" (id, slug, title, content, "seoTitle", "seoDescription", status, "updatedAt")
   VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, 'PUBLISHED', NOW())
   ON CONFLICT (slug) DO UPDATE
     SET title = EXCLUDED.title,
         content = EXCLUDED.content,
         "seoTitle" = EXCLUDED."seoTitle",
         "seoDescription" = EXCLUDED."seoDescription",
         status = 'PUBLISHED',
         "updatedAt" = NOW()
   RETURNING id, slug, LENGTH(content) AS len, "seoTitle"`,
  ['privacy', TITLE, CONTENT, SEO_TITLE, SEO_DESCRIPTION]
)
console.log('AFTER:', res.rows[0])

await client.end()
