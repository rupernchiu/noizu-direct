import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const require = createRequire(import.meta.url)
const pg = require('pg')
const { Client } = pg

// Load .env.local manually
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '../.env.local')
try {
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) {
      const key = m[1].trim()
      let val = m[2].trim().replace(/^["']|["']$/g, '')
      process.env[key] = val
    }
  }
} catch {}

const client = new Client({ connectionString: process.env.DATABASE_URL })

const effectiveDate = '2026-04-01T00:00:00.000Z'
const publishedAt = '2026-03-01T00:00:00.000Z'

const templates = [
  {
    id: 'tmpl_creator_tos_v1',
    type: 'CREATOR_TOS',
    version: '1.0',
    title: 'Creator Terms of Service',
    summary: 'These terms govern your rights and responsibilities as a seller on NOIZU-DIRECT, covering listing standards, order fulfilment, fees, payouts, and dispute resolution. You retain ownership of your creative work but grant NOIZU-DIRECT a licence to display and promote it. Violations may result in account suspension and payout holds.',
    content: `CREATOR TERMS OF SERVICE
Version 1.0 — Effective 1 April 2026

These Creator Terms of Service ("Creator Terms") govern your participation as a creator on the NOIZU-DIRECT platform ("Platform"), operated by Thinkbig Sdn Bhd ("Company"). By completing creator onboarding, you agree to be bound by these Creator Terms.

1. ELIGIBILITY

To become a Creator you must: (a) be at least 18 years of age; (b) provide valid government-issued identification; (c) provide valid bank account or payment account details for payout purposes; and (d) not have been previously suspended or permanently banned from the Platform. The Company reserves the right to approve or reject any creator application in its sole discretion without providing reasons.

2. LISTINGS AND CONTENT STANDARDS

You are solely responsible for the accuracy, legality, and quality of your Listings and all associated content. All Listings must comply with Malaysian law and the Platform's Prohibited Items Policy. You must not list: (a) counterfeit or unlicensed reproductions of third-party intellectual property; (b) illegal goods or services; (c) content that is defamatory, obscene, or incites hatred; or (d) items that infringe any third party's intellectual property rights.

3. FEES AND COMMISSIONS

The Company charges a platform commission on each Transaction. The current commission rate is published on the Creator Dashboard and may be updated from time to time. Payment processing fees are charged in addition to the platform commission.

4. ORDERS AND FULFILMENT

For digital products, you must ensure delivery within 24 hours of order confirmation unless a longer period is stated in your Listing. For physical products, you must dispatch the item within 5 business days unless otherwise stated. Failure to fulfil orders may result in automatic cancellation, buyer refund, and account suspension.

5. PAYOUTS

Net Proceeds are subject to a 7-day Escrow Period following confirmed delivery. Payouts are processed on a rolling basis when your available balance meets the minimum payout threshold published on the Creator Dashboard. You are solely responsible for all taxes applicable to your income from the Platform.

6. INTELLECTUAL PROPERTY LICENCE

You retain all intellectual property rights in your original content. By uploading content to the Platform, you grant the Company a worldwide, royalty-free, non-exclusive, sublicensable licence to host, display, reproduce, and distribute your content solely for the purposes of operating and promoting the Platform.

7. TERMINATION

The Company may suspend or terminate your creator account immediately if you materially breach these Creator Terms, engage in fraudulent activity, or the Company is required to do so by law. These Creator Terms are governed by the laws of Malaysia.`,
  },
  {
    id: 'tmpl_ip_declaration_v1',
    type: 'IP_DECLARATION',
    version: '1.0',
    title: 'Intellectual Property Declaration',
    summary: 'You declare that all content you list on NOIZU-DIRECT is either your original work or properly licensed for commercial sale, and that it does not infringe anyone else\'s intellectual property rights. You remain responsible for fan art legality. Repeated infringement will result in permanent account termination.',
    content: `INTELLECTUAL PROPERTY DECLARATION
Version 1.0 — Effective 1 April 2026

This Intellectual Property Declaration forms part of your agreement with Thinkbig Sdn Bhd and must be accepted as part of creator onboarding on NOIZU-DIRECT.

1. ORIGINAL WORKS

You declare that all original works you upload to the Platform are your own original creations. You represent that you are the sole author and owner of all intellectual property rights in your Original Works, unless disclosed otherwise. You warrant that your Original Works do not constitute unlawful copying or reproduction of third-party copyrighted material.

2. LICENCES AND THIRD-PARTY RIGHTS

Where a Listing incorporates third-party licensed content (including stock images, fonts, brushes, or textures), you represent that your licence permits commercial use and distribution of derivative works via the Platform. You must retain copies of applicable licence agreements and make them available to the Company upon request.

3. FAN ART AND DERIVATIVE WORKS

By listing fan art, you represent that either: (a) your use falls within a recognised copyright exception under the Malaysian Copyright Act 1987; or (b) you have obtained a licence or express permission from the relevant rights holder. Listings designed to deceive consumers into believing they are purchasing officially licensed merchandise are prohibited.

4. NO INFRINGEMENT REPRESENTATION

You represent and warrant that, to the best of your knowledge, your Listings do not infringe any copyright, trademark, design right, patent, right of publicity, or any other intellectual property right of any third party. You will not knowingly submit content that reproduces or substantially imitates another artist's original work without their consent.

5. DMCA AND TAKEDOWN COMPLIANCE

The Company complies with intellectual property takedown procedures as required by applicable law. Repeated infringement of third-party intellectual property rights will result in permanent account termination.

6. INFRINGEMENT INDEMNIFICATION

You agree to indemnify and hold harmless the Company from any claims, losses, damages, costs, and expenses arising from any actual or alleged infringement of a third party's intellectual property rights caused by your content or Listings. If you become aware that any of your Listings may infringe a third party's rights, you must notify us immediately at ip@noizu.direct and remove the relevant Listing.`,
  },
  {
    id: 'tmpl_payment_terms_v1',
    type: 'PAYMENT_TERMS',
    version: '1.0',
    title: 'Payment and Payout Terms',
    summary: 'These terms set out how you get paid as a NOIZU-DIRECT creator, including the platform commission structure, a 7-day escrow period after each sale, and the payout process to your registered bank account. Chargebacks and refunds are deducted from your balance. You are solely responsible for all taxes on your Platform income.',
    content: `PAYMENT AND PAYOUT TERMS
Version 1.0 — Effective 1 April 2026

These Payment and Payout Terms govern all financial transactions between you as a Creator and Thinkbig Sdn Bhd in connection with NOIZU-DIRECT.

1. PLATFORM COMMISSION

The Company charges a platform commission on each completed Transaction. The current Commission rate is set out in the fee schedule on the Creator Dashboard. The Company reserves the right to modify the Commission rate upon 30 days' written notice to you.

2. PAYMENT PROCESSING FEES

Payment processing fees charged by third-party payment service providers are deducted from each Transaction. These fees vary by payment method and are displayed on the Creator Dashboard fee schedule. If a refund is issued, the payment processing fee is generally non-refundable and will be borne by the Creator.

3. ESCROW AND HOLDING PERIOD

Funds from completed Transactions are held in escrow for 7 calendar days following confirmed delivery or confirmed digital download. The Escrow Period may be extended where: (a) an active dispute has been raised; (b) the Transaction has been flagged for fraud review; or (c) a chargeback has been initiated.

4. PAYOUTS

Funds become available for payout once the Escrow Period has elapsed and no dispute is active. You may request a payout when your available balance equals or exceeds the minimum payout threshold (currently MYR 50). Payouts are sent to the bank account or payment account registered in your Creator Dashboard. Standard bank transfer payouts are processed within 3-5 business days.

5. CHARGEBACKS AND REFUNDS

If a Buyer's payment is reversed through a chargeback, the Company will notify you and may deduct the reversed amount from your account balance or future payouts. Refunds issued in accordance with the Platform's Refund Policy will be deducted from your available balance or future payouts.

6. TAXES

You are solely responsible for determining, collecting, reporting, and remitting all taxes applicable to your income from the Platform, including Malaysian income tax and Sales and Service Tax (SST). The Company may be required by law to withhold a portion of your payouts for tax purposes.

7. PAYOUT HOLDS

The Company may place a hold on your payouts where: (a) account verification is incomplete; (b) suspected fraudulent activity is under investigation; (c) a legal hold applies; (d) your account has a negative balance; or (e) you are in breach of the Creator Terms of Service.`,
  },
  {
    id: 'tmpl_privacy_policy_v1',
    type: 'PRIVACY_POLICY',
    version: '1.0',
    title: 'Privacy Policy',
    summary: 'Thinkbig Sdn Bhd collects identity, financial, and usage data from creators to operate NOIZU-DIRECT, process payouts, verify identity, and comply with Malaysian law including the PDPA. Your data is shared only with service providers and as required by law, and is never sold to third parties.',
    content: `PRIVACY POLICY
Version 1.0 — Effective 1 April 2026

This Privacy Policy describes how Thinkbig Sdn Bhd ("Company") collects, uses, discloses, and protects personal data of Creators in connection with NOIZU-DIRECT, issued in compliance with the Personal Data Protection Act 2010 of Malaysia ("PDPA").

1. DATA CONTROLLER

The Company is the data controller responsible for personal data collected through the creator onboarding process. For privacy-related queries, contact: privacy@noizu.direct.

2. PERSONAL DATA WE COLLECT

(a) Identity and Contact Data: full legal name, date of birth, nationality, email address, phone number.
(b) Identity Verification Data: government-issued identification documents and selfie photographs.
(c) Financial Data: bank account name, bank account number, bank name, PayPal email address, payout records.
(d) Profile Data: creator display name, username, biography, portfolio images.
(e) Technical Data: IP address, browser type, device information, usage data.
(f) Transaction Data: records of all sales, orders, refunds, disputes, and payouts.
(g) Agreement Data: records of your acceptance of Platform agreements, including date, time, and IP address.

3. HOW WE USE YOUR DATA

We use your data to: (a) create and manage your creator account; (b) verify your identity for KYC compliance and fraud prevention; (c) process payouts and maintain financial records; (d) comply with Malaysian tax and anti-money laundering laws; (e) detect and prevent fraud; (f) respond to support requests and resolve disputes.

4. DISCLOSURE

We may disclose your data to: payment service providers; identity verification providers; cloud hosting providers; legal advisers; and regulatory authorities as required by law. We do not sell your personal data to third parties for marketing purposes.

5. RETENTION

Identity verification documents are retained for a minimum of 7 years following account closure for anti-money laundering compliance. Financial records are retained for a minimum of 7 years as required by Malaysian tax law.

6. YOUR RIGHTS

Under the PDPA, you have rights of access, correction, and withdrawal of consent. Contact privacy@noizu.direct to exercise your rights. You may also lodge a complaint with the Personal Data Protection Commissioner of Malaysia.

7. SECURITY

We implement appropriate technical and organisational security measures including data encryption in transit (TLS), access controls, and regular security assessments to protect your personal data.`,
  },
  {
    id: 'tmpl_community_guidelines_v1',
    type: 'COMMUNITY_GUIDELINES',
    version: '1.0',
    title: 'Community Guidelines',
    summary: 'These guidelines establish the standards of conduct expected from all NOIZU-DIRECT creators, including honest listings, respectful communication, and intellectual property respect. Violations — from plagiarism to buyer harassment — can result in warnings, suspension, or permanent termination.',
    content: `COMMUNITY GUIDELINES
Version 1.0 — Effective 1 April 2026

These Community Guidelines apply to all Creators on NOIZU-DIRECT. NOIZU-DIRECT is a marketplace built for and by the Malaysian creator community, celebrating original art, cosplay, fan culture, and independent creative work.

1. CONTENT STANDARDS

All content must be accurate, honest, and comply with all applicable Malaysian laws. The following content is strictly prohibited and will result in immediate removal and account termination: graphic violence; sexual content involving minors; content promoting self-harm; content inciting hatred or discrimination based on race, religion, gender, or nationality. Explicit adult content is not permitted on NOIZU-DIRECT. All product images must accurately represent the actual product being sold.

2. INTELLECTUAL PROPERTY

You must respect the intellectual property rights of other creators and rights holders. Do not copy, reproduce, or sell another artist's work without their explicit permission. Selling designs substantially copied from another creator's work constitutes plagiarism and is prohibited. Fan art must be created in the spirit of appreciation — do not create Listings designed to mislead consumers into believing they are purchasing officially licensed merchandise.

3. HONEST DEALING WITH BUYERS

You must fulfil all orders in accordance with your Listing description and stated delivery timelines. Do not engage in bait-and-switch tactics or misrepresent the nature or quality of digital files. Do not solicit Buyers to complete transactions outside the Platform to avoid fees — this is a serious breach and will result in account suspension.

4. RESPECTFUL COMMUNICATION

All Platform communications must be conducted with professionalism and respect. Harassment, threats, bullying, or abusive language directed at Buyers, other Creators, or Platform staff is strictly prohibited. Do not use the Platform's messaging system to send unsolicited commercial messages.

5. PLATFORM INTEGRITY

Do not manipulate the review or rating system, including by offering incentives for positive reviews or submitting fake reviews. Do not create multiple creator accounts to circumvent a suspension or inflate search rankings. Do not use automated scripts or bots to manipulate Platform data.

6. ENFORCEMENT

Violations may result in: content removal; a formal warning; temporary account suspension; permanent account termination; or referral to law enforcement. Serious violations (child safety, fraud) result in immediate termination without warning. You may appeal enforcement actions within 14 days via the Platform's Help Centre.`,
  },
]

async function run() {
  await client.connect()
  let count = 0
  for (const t of templates) {
    await client.query(
      `INSERT INTO "AgreementTemplate" (id, type, version, title, content, summary, "effectiveDate", "isActive", "createdBy", "publishedAt", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,'system',$8,NOW())
       ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content, summary=EXCLUDED.summary, "isActive"=true, "publishedAt"=EXCLUDED."publishedAt"`,
      [t.id, t.type, t.version, t.title, t.content, t.summary, effectiveDate, publishedAt]
    )
    console.log('✅', t.type)
    count++
  }
  console.log(`\nDone — ${count} templates seeded`)
  await client.end()
}

run().catch(e => { console.error(e.message); client.end() })
