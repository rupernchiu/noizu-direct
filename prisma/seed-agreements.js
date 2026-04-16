import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
const p = new PrismaClient({ adapter })

// ─── Agreement content ────────────────────────────────────────────────────────

const CREATOR_TOS_CONTENT = `CREATOR TERMS OF SERVICE
Version 1.0 — Effective 1 April 2026

These Creator Terms of Service ("Creator Terms") govern your participation as a creator on the NOIZU-DIRECT platform ("Platform"), operated by Thinkbig Sdn Bhd (Company No. 1234567-X), a company incorporated in Malaysia ("Company", "we", "us", "our"). By completing creator onboarding and activating your creator account, you agree to be bound by these Creator Terms in addition to the NOIZU-DIRECT general Terms of Service. If you do not agree, do not proceed with creator onboarding.

1. DEFINITIONS

1.1 "Creator" means any individual or entity approved by the Company to list and sell products or services through the Platform.
1.2 "Listing" means any product, digital file, commission slot, merchandise item, or service offered for sale by a Creator on the Platform.
1.3 "Buyer" means any registered user who purchases a Listing.
1.4 "Transaction" means any completed purchase of a Listing by a Buyer.
1.5 "Gross Sale Price" means the total amount paid by the Buyer including applicable taxes and shipping but excluding any separately collected platform fees.
1.6 "Net Proceeds" means the Gross Sale Price minus the Platform Commission, payment processing fees, applicable taxes, and any chargebacks or refunds.
1.7 "Escrow Period" means the period during which funds are held by the Platform following a Transaction before release to the Creator.
1.8 "Creator Dashboard" means the administrative interface through which Creators manage Listings, orders, analytics, and payouts.

2. ELIGIBILITY

2.1 To become a Creator you must: (a) be at least 18 years of age; (b) be a Malaysian citizen, permanent resident, or a foreign national with a valid work permit authorising commercial activity in Malaysia; (c) provide valid government-issued identification as required during the application process; (d) provide valid bank account or payment account details for payout purposes; and (e) not have been previously suspended or permanently banned from the Platform.
2.2 The Company reserves the right to approve or reject any creator application in its sole discretion without providing reasons.
2.3 If you are applying as a business entity, you warrant that you are duly authorised to bind that entity to these Creator Terms.

3. CREATOR ACCOUNT AND PROFILE

3.1 You are responsible for maintaining the accuracy and completeness of your creator profile, including your display name, bio, contact information, and payout details.
3.2 You may not impersonate another person or entity, use a name that is misleading, or create a profile that infringes any third party's intellectual property rights.
3.3 You are responsible for all activity that occurs under your creator account. You must keep your login credentials secure and notify us immediately at support@noizu.direct if you suspect unauthorised access.
3.4 You may not transfer your creator account to any third party without the Company's prior written consent.

4. LISTINGS AND CONTENT STANDARDS

4.1 You are solely responsible for the accuracy, legality, and quality of your Listings and all associated content, including images, descriptions, pricing, and delivery timelines.
4.2 All Listings must comply with Malaysian law and the Platform's Prohibited Items Policy (available on the Platform).
4.3 You must not list: (a) counterfeit or unlicensed reproductions of third-party intellectual property; (b) illegal goods or services; (c) content that is defamatory, obscene, or that incites hatred or violence; (d) items that infringe any third party's intellectual property, privacy, or publicity rights; or (e) any item whose sale is restricted or prohibited under Malaysian law.
4.4 Fan art and derivative works may only be listed where permitted under applicable fair use, fair dealing, or equivalent exceptions, or where the rights holder has granted a licence. You are solely responsible for determining whether your fan art Listings are permissible.
4.5 The Company may remove any Listing at any time without prior notice if it determines, in its sole discretion, that the Listing violates these Creator Terms, Platform policies, or applicable law.

5. FEES AND COMMISSIONS

5.1 The Company charges a platform commission on each Transaction. The current commission rate is published on the Creator Dashboard fee schedule and may be updated from time to time in accordance with Section 16.
5.2 Payment processing fees are charged in addition to the platform commission and vary by payment method. Current processing fees are displayed during the payout setup process.
5.3 You acknowledge that the Company does not guarantee any minimum level of sales or income.
5.4 The Company may introduce new fee categories or modify existing fees upon 30 days' written notice to you, except where changes are required by law or by a payment service provider, in which case shorter notice may be given.

6. ORDERS AND FULFILMENT

6.1 When a Buyer completes a purchase, you receive an order notification via the Creator Dashboard and by email.
6.2 For digital products, you must ensure that the digital file is available for download or delivery within 24 hours of order confirmation, unless a longer delivery period is clearly stated in your Listing.
6.3 For physical products, you must dispatch the item and upload a valid tracking number within the fulfilment window specified in your Listing. The default fulfilment window is 5 business days unless otherwise stated.
6.4 For print-on-demand (POD) products, you are responsible for ensuring your POD provider receives and processes the order correctly.
6.5 Failure to fulfil an order within the specified timeframe may result in automatic order cancellation, a refund to the Buyer, a financial charge to your account, and suspension of your creator account.

7. RETURNS, REFUNDS, AND DISPUTES

7.1 All sales of digital products are final unless the digital file is corrupt, incomplete, or materially different from the Listing description.
7.2 For physical products, the Company's standard return policy applies. Buyers may request a return within 14 days of delivery for eligible items.
7.3 If a Buyer raises a dispute, you will be notified and given an opportunity to respond within 5 business days. The Company's dispute resolution team will review the evidence submitted by both parties and issue a final decision.
7.4 The Company's dispute resolution decision is final and binding. If the dispute is resolved in the Buyer's favour, the refund amount will be deducted from your account balance or future payouts.
7.5 Excessive disputes or returns may result in account review, increased escrow periods, or account suspension.

8. PAYOUTS

8.1 Net Proceeds are subject to an Escrow Period of 7 days following confirmed delivery or download of a digital product, unless extended by an active dispute.
8.2 Payouts are processed on a rolling basis. You may request a payout when your available balance meets the minimum payout threshold published on the Creator Dashboard.
8.3 Payouts are made via the payment method you have registered in your Creator Dashboard. You are responsible for ensuring your payout details are accurate. The Company is not liable for funds sent to an incorrect account provided by you.
8.4 The Company may withhold payouts during the investigation of suspected fraud, policy violations, or chargebacks.
8.5 You are solely responsible for all taxes applicable to your income from the Platform, including Malaysian income tax and any applicable goods and services tax. The Company will issue payout records to assist with your tax obligations but does not provide tax advice.

9. INTELLECTUAL PROPERTY LICENCE

9.1 You retain all intellectual property rights in your original content and Listings.
9.2 By uploading content to the Platform, you grant the Company a worldwide, royalty-free, non-exclusive, sublicensable licence to host, display, reproduce, and distribute your content solely for the purposes of operating and promoting the Platform, including but not limited to displaying your Listings in search results, promotional materials, and social media posts by the Company.
9.3 This licence continues for so long as your content remains on the Platform and for a reasonable wind-down period after removal.
9.4 You represent and warrant that you own or have the necessary rights to all content you upload and that such content does not infringe any third party's rights.

10. PROHIBITED CONDUCT

10.1 You must not: (a) engage in price manipulation or artificial inflation of sales statistics; (b) use automated tools to generate false impressions, clicks, or purchases; (c) solicit Buyers to transact outside the Platform to avoid fees; (d) harass, threaten, or defame other users; (e) attempt to access another user's account without authorisation; (f) introduce malware, viruses, or harmful code through uploaded files; or (g) engage in any conduct that the Company reasonably considers to be harmful to the Platform or its users.
10.2 Violation of this section may result in immediate account suspension without prior notice.

11. CREATOR REPRESENTATIONS AND WARRANTIES

11.1 You represent and warrant that: (a) you have the legal capacity to enter into these Creator Terms; (b) all information provided during onboarding is accurate and complete; (c) you own or are licensed to use all intellectual property contained in your Listings; (d) your Listings comply with all applicable laws; and (e) you will fulfil all orders placed through the Platform in accordance with your Listing descriptions.

12. INDEMNIFICATION

12.1 You agree to indemnify, defend, and hold harmless the Company, its directors, officers, employees, agents, and partners from and against any and all claims, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or related to: (a) your Listings or content; (b) your breach of these Creator Terms; (c) your infringement of any third party's intellectual property or other rights; or (d) your fulfilment activities including shipping and handling of physical goods.

13. LIMITATION OF LIABILITY

13.1 To the maximum extent permitted by Malaysian law, the Company's total liability to you in connection with these Creator Terms or the Platform shall not exceed the total Net Proceeds paid to you in the 3 months immediately preceding the event giving rise to the claim.
13.2 The Company shall not be liable for: (a) loss of profits or revenue; (b) loss of data; (c) indirect, consequential, or incidental damages; or (d) any damages arising from your reliance on the Platform for your primary income.
13.3 Nothing in these Creator Terms limits the Company's liability for fraud, death, or personal injury caused by the Company's negligence.

14. TERM AND TERMINATION

14.1 These Creator Terms commence on the date your creator application is approved and continue indefinitely until terminated.
14.2 You may terminate your creator account at any time by contacting support@noizu.direct. Termination does not affect outstanding orders, disputes, or payout obligations.
14.3 The Company may suspend or terminate your creator account immediately if: (a) you materially breach these Creator Terms and fail to remedy the breach within 7 days of written notice; (b) you engage in fraudulent activity; (c) your account is subject to a serious dispute pattern; or (d) the Company is required to do so by law.
14.4 Upon termination, all pending orders must be fulfilled or refunded. Outstanding balances will be paid out following the resolution of any pending disputes, subject to the Company's right of set-off.

15. SUSPENSION AND REMEDIAL MEASURES

15.1 In addition to termination, the Company may impose the following remedial measures: (a) temporary account suspension; (b) listing removal; (c) increased escrow periods; (d) payout holds; or (e) account-level restrictions.
15.2 The Company will use reasonable efforts to notify you of any remedial measure and its reason, except where immediate action is required to protect the Platform or its users.

16. MODIFICATIONS TO THESE TERMS

16.1 The Company may modify these Creator Terms from time to time. You will be notified of material changes at least 30 days before they take effect, except where changes are required by law or are beneficial to you, in which case they may take effect immediately.
16.2 Your continued use of the Platform after the effective date of any modification constitutes your acceptance of the modified Creator Terms. If you do not accept the modified terms, you must cease using the Platform and terminate your creator account.

17. GOVERNING LAW AND DISPUTE RESOLUTION

17.1 These Creator Terms are governed by and construed in accordance with the laws of Malaysia.
17.2 Any dispute arising out of or in connection with these Creator Terms shall first be submitted to the Company's internal dispute resolution process.
17.3 If a dispute cannot be resolved internally within 30 days, the parties agree to submit the dispute to mediation administered by the Asian International Arbitration Centre (AIAC) before commencing any legal proceedings.
17.4 The courts of Malaysia shall have exclusive jurisdiction over any legal proceedings arising out of or in connection with these Creator Terms.
17.5 These Creator Terms constitute the entire agreement between you and the Company with respect to your participation as a creator on the Platform and supersede all prior agreements and understandings.`

const CREATOR_TOS_SUMMARY = `These terms govern your rights and responsibilities as a seller on NOIZU-DIRECT, covering everything from listing standards and order fulfilment to fees, payouts, and dispute resolution. You retain ownership of your creative work but grant NOIZU-DIRECT a licence to display and promote it. Violations — including selling infringing content or failing to fulfil orders — may result in account suspension and payout holds.`

// ─────────────────────────────────────────────────────────────────────────────

const IP_DECLARATION_CONTENT = `INTELLECTUAL PROPERTY DECLARATION
Version 1.0 — Effective 1 April 2026

This Intellectual Property Declaration ("IP Declaration") forms part of your agreement with Thinkbig Sdn Bhd ("Company") and must be accepted as part of creator onboarding on the NOIZU-DIRECT platform ("Platform"). By accepting this IP Declaration, you make the representations and warranties set out below and agree to the obligations described herein.

1. OWNERSHIP AND ORIGINAL WORKS

1.1 You declare that all original works you upload to the Platform, including digital artwork, illustrations, graphics, character designs, photography, written content, and other creative works ("Original Works"), are your own original creations.
1.2 You represent that you are the sole author and owner of all intellectual property rights in your Original Works, unless you have disclosed otherwise in accordance with Section 2.
1.3 You warrant that your Original Works have not been created using substantial portions of third-party copyrighted material without authorisation, and that they do not constitute unlawful copying or reproduction.

2. COLLABORATIVE AND COMMISSIONED WORKS

2.1 If any Listing incorporates work created collaboratively with another party or commissioned from a third party, you represent that you have obtained all necessary assignments, licences, and consents required to list and sell that work on the Platform.
2.2 You must maintain records of any collaboration agreements, work-for-hire agreements, or licences that underpin your right to list collaborative works. The Company may request copies of such records at any time.
2.3 Where a Listing includes work by a co-creator, you are responsible for ensuring the co-creator has consented to the commercialisation of that work through the Platform and has received any agreed compensation.

3. LICENCES AND THIRD-PARTY RIGHTS

3.1 Where a Listing incorporates third-party licensed content (including stock images, fonts, brushes, textures, or sample packs), you represent that your licence permits commercial use and the distribution of derivative works via the Platform.
3.2 You must retain copies of applicable licence agreements and make them available to the Company upon request.
3.3 Any third-party content incorporated into your Listings that is subject to attribution requirements must be attributed appropriately in the Listing description.

4. FAN ART AND DERIVATIVE WORKS

4.1 You acknowledge that fan art and other derivative works based on third-party intellectual property may require authorisation from the rights holder depending on the nature of the work and applicable copyright law.
4.2 By listing fan art, you represent that either: (a) your use falls within a recognised copyright exception (such as fair dealing under the Malaysian Copyright Act 1987 or equivalent); or (b) you have obtained a licence or express permission from the relevant rights holder.
4.3 The Company does not warrant that any particular fan art Listing is legally permissible. You are solely responsible for determining the legal status of your fan art Listings and for any claims arising from them.
4.4 Listings that are clearly intended to deceive consumers into believing they are official licensed merchandise are prohibited.

5. NO INFRINGEMENT REPRESENTATION

5.1 You represent and warrant that, to the best of your knowledge, your Listings do not infringe any copyright, trademark, design right, patent, right of publicity, or any other intellectual property or proprietary right of any third party.
5.2 You will not knowingly submit content that reproduces, copies, or substantially imitates another artist's original work without their consent.

6. DMCA AND COPYRIGHT TAKEDOWN COMPLIANCE

6.1 The Company complies with intellectual property takedown procedures as required by applicable law. If a valid takedown notice is received in respect of your content, the Company may remove it without prior notice to you.
6.2 If you believe a takedown notice has been filed incorrectly against your content, you may submit a counter-notice through the process described on the Platform's IP Policy page.
6.3 Repeated infringement of third-party intellectual property rights will result in permanent account termination.

7. PLATFORM LICENCE GRANT

7.1 You grant to the Company a non-exclusive, royalty-free, worldwide, sublicensable licence to use, reproduce, adapt, publish, translate, and distribute your Listings and associated content for the purpose of operating the Platform, including marketing and promotional activities.
7.2 This licence does not transfer ownership of your intellectual property. You retain all ownership rights in your Original Works subject to any licence granted under this Section.
7.3 You may revoke this licence by removing the relevant content from the Platform, subject to any outstanding orders, disputes, or contractual obligations.

8. BUYER LICENCE TERMS

8.1 When a Buyer purchases your Listing, the Buyer receives a licence to use the purchased content as described in your Listing. You are responsible for clearly specifying the scope of this licence in your Listing description.
8.2 If your Listing does not specify a licence, the default licence granted to Buyers is a personal, non-commercial, non-transferable, non-sublicensable right to use the content for personal purposes only.
8.3 You must not offer Buyers rights that you yourself do not hold in the relevant content.

9. MORAL RIGHTS

9.1 To the extent permitted by Malaysian law, you waive any moral rights in your content uploaded to the Platform that would prevent the Company from displaying, adapting, or promoting your content as permitted under these terms.
9.2 This waiver does not affect your right to be credited as the author of your work where reasonably practicable.

10. INFRINGEMENT INDEMNIFICATION

10.1 You agree to indemnify and hold harmless the Company, its officers, directors, employees, and agents from any claims, losses, damages, costs, and expenses (including legal fees) arising from any actual or alleged infringement of a third party's intellectual property rights caused by your content or Listings.
10.2 The Company will notify you promptly of any such claim and will cooperate with your defence, provided that you take primary responsibility for defending the claim at your own cost.

11. REPORTING AND COOPERATION

11.1 If you become aware that any of your Listings may infringe a third party's intellectual property rights, you must notify the Company immediately at ip@noizu.direct and remove the relevant Listing from the Platform.
11.2 You agree to cooperate fully with the Company in responding to any intellectual property complaint or legal proceeding related to your content, including providing documentation and evidence as reasonably requested.`

const IP_DECLARATION_SUMMARY = `You declare that all content you list on NOIZU-DIRECT is either your original work or properly licensed for commercial sale, and that it does not infringe anyone else's intellectual property rights. You remain responsible for fan art legality and must inform us immediately if a potential infringement comes to your attention. Repeated infringement will result in permanent account termination.`

// ─────────────────────────────────────────────────────────────────────────────

const PAYMENT_TERMS_CONTENT = `PAYMENT AND PAYOUT TERMS
Version 1.0 — Effective 1 April 2026

These Payment and Payout Terms ("Payment Terms") govern all financial transactions between you as a Creator and Thinkbig Sdn Bhd ("Company") in connection with the NOIZU-DIRECT platform ("Platform"). These Payment Terms form part of the Creator Terms of Service and must be accepted as part of creator onboarding.

1. PLATFORM COMMISSION

1.1 The Company charges a platform commission ("Commission") on each completed Transaction. The current Commission rate is set out in the fee schedule accessible via the Creator Dashboard.
1.2 Commission is calculated as a percentage of the Gross Sale Price (total amount paid by the Buyer, including any shipping charges collected through the Platform, but excluding separately invoiced taxes).
1.3 The Company reserves the right to modify the Commission rate upon 30 days' written notice to you. Your continued listing of products after the effective date of any rate change constitutes acceptance of the new rate.
1.4 Promotional Commission rates may be offered to Creators from time to time. Such promotional rates are subject to separate terms and may be withdrawn at any time.

2. PAYMENT PROCESSING FEES

2.1 In addition to the Commission, payment processing fees charged by our third-party payment service providers are deducted from each Transaction. These fees vary by payment method and are displayed on the Creator Dashboard fee schedule.
2.2 The Company does not profit from payment processing fees. All processing fees are passed through at cost.
2.3 If a refund is issued to a Buyer, the payment processing fee for the original Transaction is generally non-refundable and will be borne by the Creator.

3. TAXES AND WITHHOLDING

3.1 Prices displayed on the Platform may be inclusive or exclusive of taxes depending on the Buyer's jurisdiction and Platform settings. The applicable tax treatment for each Transaction is determined at checkout.
3.2 You are solely responsible for determining, collecting, reporting, and remitting all taxes applicable to your income from the Platform, including Malaysian income tax, Sales and Service Tax (SST), and any other applicable taxes.
3.3 The Company may be required by law to withhold a portion of your payouts for tax purposes and to report your earnings to the relevant tax authorities. Where required, the Company will provide you with the necessary documentation.
3.4 You agree to provide accurate tax identification information as requested by the Company and to update this information promptly if it changes.

4. ESCROW AND HOLDING PERIOD

4.1 Funds from completed Transactions are held in escrow by the Company for a period of 7 calendar days following confirmed delivery or confirmed digital download ("Escrow Period").
4.2 The Escrow Period may be extended in the following circumstances: (a) an active dispute has been raised by the Buyer; (b) the Company has flagged the Transaction for fraud review; (c) a chargeback has been initiated; or (d) as otherwise required by applicable law or the Company's payment service providers.
4.3 During the Escrow Period, funds are not available for payout but are visible as "Pending" on your Creator Dashboard.
4.4 The Company may modify the standard Escrow Period upon 30 days' written notice, except where required by law or payment service provider requirements.

5. PAYOUTS

5.1 Funds become available for payout once the Escrow Period has elapsed and no dispute is active.
5.2 Payouts are processed on a rolling basis. You may request a payout at any time when your available balance equals or exceeds the minimum payout threshold, which is currently MYR 50 (or currency equivalent). The minimum threshold may be updated from time to time.
5.3 Payouts are sent to the bank account or payment account registered in your Creator Dashboard. It is your responsibility to ensure these details are accurate and current. The Company is not liable for funds sent to an incorrect or closed account provided by you.
5.4 Payout processing times vary by payment method and bank. Standard bank transfer payouts are processed within 3–5 business days. The Company does not guarantee payout timelines and is not liable for delays caused by banks or payment service providers.
5.5 Payouts in Malaysian Ringgit (MYR) are standard. If you require a different currency, conversion will occur at the prevailing exchange rate at the time of payout, and additional conversion fees may apply.

6. CHARGEBACKS AND PAYMENT REVERSALS

6.1 If a Buyer's payment is reversed through a chargeback or payment dispute with their bank or card issuer, the Company will notify you and may deduct the reversed amount from your account balance or future payouts.
6.2 You may submit evidence to contest a chargeback through the Creator Dashboard within 7 days of notification. The Company will forward your evidence to the relevant payment service provider but cannot guarantee a favourable outcome.
6.3 Excessive chargebacks may result in account review, increased escrow periods, payout holds, or account termination.

7. REFUNDS AND REVERSALS

7.1 Refunds issued in accordance with the Platform's Refund Policy will be deducted from your available balance or future payouts.
7.2 If your available balance is insufficient to cover a refund, the shortfall will be recorded as a negative balance and recovered from your future payouts.
7.3 The Company may issue refunds to Buyers at its discretion where required by applicable consumer protection law or Platform policy.

8. PAYOUT HOLDS

8.1 The Company may place a hold on your payouts in the following circumstances: (a) account verification is incomplete or documentation has not been submitted; (b) suspected fraudulent activity is under investigation; (c) a legal hold or court order applies; (d) your account has a negative balance; or (e) you are in breach of the Creator Terms of Service.
8.2 The Company will notify you of any payout hold, its reason, and any steps you can take to have the hold lifted, except where disclosure would compromise an investigation.

9. CURRENCY AND EXCHANGE RATES

9.1 All prices on the Platform are displayed and transacted in Malaysian Ringgit (MYR) by default, unless otherwise configured.
9.2 Where a Buyer pays in a foreign currency, conversion to MYR occurs at the exchange rate applied by the Company's payment service provider at the time of Transaction. The Company is not responsible for exchange rate fluctuations.

10. INVOICING AND RECORDS

10.1 The Company will provide you with a payout statement for each payout processed. Payout statements are accessible via the Creator Dashboard and are generated automatically.
10.2 You are responsible for maintaining your own financial records for tax and accounting purposes. The Company's records are provided for informational purposes only and do not constitute a formal tax invoice unless otherwise indicated.
10.3 You may request payout history reports from the Creator Dashboard for any 12-month period within the past 3 years.

11. FRAUD PREVENTION

11.1 The Company employs fraud detection systems that may flag Transactions, accounts, or payout requests for manual review.
11.2 You agree to cooperate with fraud investigations, including providing identity verification, order documentation, and communication records as requested.
11.3 Attempting to circumvent fraud detection systems, misrepresenting sales, or engaging in any form of payment fraud will result in immediate account termination, withholding of all funds pending investigation, and referral to the relevant authorities.

12. MODIFICATIONS

12.1 The Company may update these Payment Terms from time to time. Material changes will be notified via email and via the Creator Dashboard at least 30 days before they take effect, except where required by applicable law or payment service providers.
12.2 Continued use of the Platform after the effective date of any modification constitutes acceptance of the updated Payment Terms.`

const PAYMENT_TERMS_SUMMARY = `These terms set out how you get paid as a NOIZU-DIRECT creator, including the platform commission structure, a 7-day escrow period after each sale, and the payout process to your registered bank account. Chargebacks and refunds are deducted from your balance, and payouts can be held if your account is under review or in breach of policy. You are solely responsible for all taxes on your Platform income.`

// ─────────────────────────────────────────────────────────────────────────────

const PRIVACY_POLICY_CONTENT = `PRIVACY POLICY
Version 1.0 — Effective 1 April 2026

This Privacy Policy ("Policy") describes how Thinkbig Sdn Bhd (Company No. 1234567-X), having its registered address at Level 7, Menara UOA Bangsar, No. 5, Jalan Bangsar Utama 1, 59000 Kuala Lumpur, Malaysia ("Company", "we", "us", "our") collects, uses, discloses, and protects personal data of Creators in connection with the NOIZU-DIRECT platform ("Platform").

This Policy is issued in compliance with the Personal Data Protection Act 2010 of Malaysia ("PDPA") and supplements the Platform's general Privacy Policy applicable to all users. By proceeding with creator onboarding, you acknowledge that you have read and understood this Policy.

1. DATA CONTROLLER

1.1 The Company is the data controller responsible for the personal data collected through the creator onboarding process and creator account management.
1.2 For any privacy-related queries or to exercise your rights under the PDPA, please contact our Data Protection Officer at: privacy@noizu.direct or by post to: Data Protection Officer, Thinkbig Sdn Bhd, Level 7, Menara UOA Bangsar, No. 5, Jalan Bangsar Utama 1, 59000 Kuala Lumpur, Malaysia.

2. PERSONAL DATA WE COLLECT

2.1 Identity and Contact Data: Full legal name, date of birth, nationality, email address, phone number, and mailing address.
2.2 Identity Verification Data: Government-issued identification document type and number, copies of identity documents (IC front and back, or passport), and selfie photographs for identity verification purposes.
2.3 Financial Data: Bank account name, bank account number, bank name, PayPal email address, payout transaction records, and tax identification numbers.
2.4 Profile Data: Creator display name, username, biography, profile photograph, portfolio images, social media links, and other content you add to your creator profile.
2.5 Technical Data: IP address, browser type, device information, operating system, referral URLs, and Platform usage data collected through cookies and analytics tools.
2.6 Transaction Data: Records of all sales, orders, refunds, disputes, and payouts associated with your creator account.
2.7 Communications Data: Correspondence between you and the Company, including support tickets, emails, and in-Platform messages.
2.8 Agreement Data: Records of your acceptance of Platform agreements, including the date, time, IP address, and user agent at the time of acceptance.

3. HOW WE COLLECT PERSONAL DATA

3.1 Directly from you during creator registration and onboarding.
3.2 Through your use of the Platform, including Listings you create and orders you fulfil.
3.3 From automated technologies such as cookies, web beacons, and analytics software.
3.4 From third-party identity verification services used to verify your identity documents.
3.5 From payment service providers in connection with payout processing.
3.6 From public sources, including publicly available business registries, where applicable.

4. PURPOSES OF PROCESSING AND LEGAL BASIS

4.1 Creator Account Management: We process your identity, contact, and profile data to create and manage your creator account, verify your eligibility, and provide you with access to creator tools. Legal basis: contract performance.
4.2 Identity Verification: We process your identity verification documents to comply with our Know Your Customer (KYC) obligations and to prevent fraud and money laundering. Legal basis: legal obligation and legitimate interests.
4.3 Payment Processing and Payouts: We process your financial data to facilitate payouts, calculate commissions, and maintain accurate financial records. Legal basis: contract performance and legal obligation.
4.4 Tax Compliance: We may process your personal data to comply with Malaysian tax laws, including reporting obligations to the Inland Revenue Board of Malaysia (LHDN). Legal basis: legal obligation.
4.5 Platform Security and Fraud Prevention: We process technical and transaction data to detect and prevent fraud, abuse, and security incidents. Legal basis: legitimate interests.
4.6 Customer Support: We process your communications data to respond to your support requests and resolve disputes. Legal basis: contract performance.
4.7 Platform Improvement and Analytics: We use anonymised or aggregated data to analyse Platform usage and improve our services. Legal basis: legitimate interests.
4.8 Marketing and Promotion: With your consent, we may feature your creator profile or content in Platform marketing materials. You may withdraw consent at any time by contacting us.

5. DISCLOSURE OF PERSONAL DATA

5.1 We may disclose your personal data to the following categories of recipients:
  (a) Payment service providers (e.g., Stripe, PayPal) for payout processing;
  (b) Identity verification service providers for KYC compliance;
  (c) Cloud hosting and infrastructure providers who process data on our behalf;
  (d) Analytics and marketing technology providers;
  (e) Legal and professional advisers when required;
  (f) Regulatory authorities, law enforcement agencies, and courts when required by law or to protect our legal rights;
  (g) Buyers, to the limited extent necessary to facilitate Transaction fulfilment (e.g., shipping address for physical orders).
5.2 We do not sell your personal data to third parties for their own marketing purposes.
5.3 Where we engage third-party data processors, we ensure they are bound by appropriate contractual obligations to protect your data.

6. INTERNATIONAL DATA TRANSFERS

6.1 Some of our service providers operate outside Malaysia. Where your personal data is transferred outside Malaysia, we take steps to ensure adequate protection is in place, including through contractual safeguards consistent with the PDPA and applicable guidelines from the Personal Data Protection Commissioner.

7. RETENTION OF PERSONAL DATA

7.1 We retain your personal data for as long as necessary to fulfil the purposes described in this Policy, including to satisfy legal, accounting, and reporting requirements.
7.2 Identity verification documents are retained for a minimum of 7 years following account closure, as required for anti-money laundering compliance.
7.3 Financial records are retained for a minimum of 7 years following the relevant Transaction, as required by Malaysian tax law.
7.4 Profile and content data may be retained for up to 3 years following account closure to handle outstanding disputes or legal claims.
7.5 Technical logs are retained for up to 12 months.

8. YOUR RIGHTS UNDER THE PDPA

8.1 Access: You have the right to request access to the personal data we hold about you.
8.2 Correction: You have the right to request correction of inaccurate or incomplete personal data.
8.3 Withdrawal of Consent: Where processing is based on your consent, you may withdraw consent at any time. Withdrawal does not affect processing that occurred before withdrawal.
8.4 Restriction of Processing: In certain circumstances, you may request that we restrict the processing of your personal data.
8.5 Objection: You may object to processing based on legitimate interests in certain circumstances.
8.6 Complaint: You have the right to lodge a complaint with the Personal Data Protection Commissioner of Malaysia if you believe your rights under the PDPA have been violated.
8.7 To exercise your rights, contact privacy@noizu.direct. We will respond within 21 days.

9. COOKIES AND TRACKING TECHNOLOGIES

9.1 The Platform uses cookies and similar technologies to operate essential Platform functions, remember your preferences, analyse usage patterns, and support security features.
9.2 You can control cookies through your browser settings, but disabling certain cookies may affect your ability to use the Platform fully.
9.3 A detailed Cookie Policy is available on the Platform.

10. SECURITY

10.1 We implement appropriate technical and organisational security measures to protect your personal data against unauthorised access, disclosure, alteration, or destruction.
10.2 Security measures include data encryption in transit (TLS), access controls, regular security assessments, and staff training on data protection.
10.3 Despite these measures, no method of data transmission or storage is completely secure. We cannot guarantee the absolute security of your personal data.
10.4 In the event of a personal data breach that is likely to result in high risk to your rights, we will notify you without undue delay as required under applicable law.

11. CHILDREN'S DATA

11.1 The Platform and creator onboarding are not directed at persons under 18 years of age. We do not knowingly collect personal data from minors. If we become aware that we have collected personal data from a minor without parental consent, we will take steps to delete it promptly.

12. THIRD-PARTY LINKS

12.1 The Platform may contain links to third-party websites and services. This Policy does not apply to those third-party services. We encourage you to review the privacy policies of any third-party services you access through the Platform.

13. CHANGES TO THIS POLICY

13.1 We may update this Privacy Policy from time to time. Material changes will be communicated to you via email and via a notice on the Platform at least 30 days before they take effect.
13.2 Continued use of the Platform after the effective date of any change constitutes acknowledgment of the updated Policy.
13.3 The date of the most recent revision is shown at the top of this Policy.`

const PRIVACY_POLICY_SUMMARY = `Thinkbig Sdn Bhd (data controller) collects identity, financial, and usage data from creators to operate NOIZU-DIRECT, process payouts, verify identity, and comply with Malaysian law — including the PDPA and anti-money laundering regulations. Your data is shared only with service providers and as required by law, and is never sold to third parties. You have rights of access, correction, and complaint to the Personal Data Protection Commissioner.`

// ─────────────────────────────────────────────────────────────────────────────

const COMMUNITY_GUIDELINES_CONTENT = `COMMUNITY GUIDELINES
Version 1.0 — Effective 1 April 2026

These Community Guidelines ("Guidelines") apply to all Creators on the NOIZU-DIRECT platform ("Platform"), operated by Thinkbig Sdn Bhd ("Company"). By accepting these Guidelines, you agree to uphold the standards described below in all your activities on the Platform. These Guidelines supplement the Creator Terms of Service.

1. PURPOSE AND VALUES

1.1 NOIZU-DIRECT is a marketplace built for and by the Malaysian creator community. Our Platform celebrates original art, cosplay, fan culture, and independent creative work.
1.2 We are committed to maintaining a community that is safe, respectful, inclusive, and commercially fair for all participants — creators and buyers alike.
1.3 These Guidelines exist not to restrict creativity, but to ensure that the Platform remains a positive environment where all community members can participate with confidence.

2. CONTENT STANDARDS

2.1 All content on the Platform — including Listings, profile descriptions, portfolio images, and public-facing communications — must be accurate, honest, and not misleading.
2.2 Content must comply with all applicable Malaysian laws, including but not limited to the Communications and Multimedia Act 1998, the Copyright Act 1987, and the Penal Code.
2.3 Content depicting graphic violence, sexual content involving minors, content that promotes self-harm, or content that incites hatred or discrimination on the basis of race, religion, gender, sexual orientation, disability, or nationality is strictly prohibited and will result in immediate removal and account termination.
2.4 Mildly suggestive content (e.g., anime-style content with fan service elements) must be appropriately tagged and is subject to Platform moderation. Explicit adult content is not permitted on NOIZU-DIRECT at this time.
2.5 All product images must represent the actual product being sold. Mockups and promotional images must not misrepresent the product's appearance, quality, or dimensions.

3. RESPECT FOR INTELLECTUAL PROPERTY

3.1 You must respect the intellectual property rights of other creators and rights holders. Do not copy, reproduce, or sell another artist's work without their explicit permission.
3.2 Selling designs that are substantially copied from another creator's original work — whether on or off the Platform — constitutes plagiarism and is prohibited. Plagiarism complaints will be investigated and may result in Listing removal and account suspension.
3.3 We encourage the celebration of fan culture, but fan art must be created in the spirit of appreciation rather than deception. Do not create Listings designed to mislead consumers into believing they are purchasing officially licensed merchandise.

4. HONEST DEALING WITH BUYERS

4.1 You must fulfil all orders in accordance with your Listing description, including within the delivery timelines you have stated.
4.2 If you are unable to fulfil an order due to unforeseen circumstances, you must contact the Buyer promptly and offer either a revised timeline (if the Buyer agrees) or a full refund.
4.3 Do not engage in bait-and-switch tactics — listing one item and delivering another, or misrepresenting the nature or quality of digital files.
4.4 Commission queues must be managed honestly. If you are unable to take new commissions, set your commission status to "Closed" rather than accepting orders you cannot fulfil.
4.5 Do not solicit Buyers to complete transactions outside the Platform to avoid fees. This is a serious breach of policy and will result in account suspension.

5. RESPECTFUL COMMUNICATION

5.1 All communication on the Platform, including messages to Buyers, responses to reviews, and any public-facing content, must be conducted with professionalism and respect.
5.2 Harassment, threats, bullying, or abusive language directed at Buyers, other Creators, or Platform staff is strictly prohibited.
5.3 Do not use the Platform's messaging system to send unsolicited commercial messages (spam) or to promote external services unrelated to the fulfilment of an order.
5.4 Negative feedback from Buyers should be addressed constructively and professionally. Publicly denigrating Buyers in response to reviews may result in action against your account.

6. PLATFORM INTEGRITY

6.1 Do not manipulate the Platform's review or rating system, including by offering incentives for positive reviews, submitting fake reviews, or arranging for associate accounts to inflate your ratings.
6.2 Do not create multiple creator accounts to circumvent a suspension, accumulate benefits, or manipulate search rankings.
6.3 Do not use automated scripts, bots, or other tools to scrape, inflate, or manipulate Platform data.
6.4 Do not attempt to reverse-engineer, exploit, or disrupt the Platform's technical infrastructure.

7. HEALTH AND SAFETY IN PHYSICAL PRODUCTS

7.1 If you sell physical goods, you are responsible for ensuring they are safe for their intended use and comply with applicable Malaysian product safety standards.
7.2 Items that contain hazardous materials, including flammable adhesives, toxic inks, or non-food-grade materials represented as safe for contact, are prohibited unless clearly labelled and compliant with applicable regulations.
7.3 All physical products must be packaged and shipped in a manner that minimises the risk of damage in transit.

8. PROHIBITED ITEMS

8.1 The following items are prohibited on NOIZU-DIRECT: (a) counterfeit goods or unauthorised replicas of trademarked products; (b) items that infringe any third party's intellectual property rights; (c) illegal weapons, drugs, or controlled substances; (d) stolen goods; (e) content that sexualises minors; (f) any item whose sale is prohibited under Malaysian law.
8.2 The Company maintains a full Prohibited Items Policy accessible on the Platform, which may be updated from time to time.

9. CREATOR RESPONSIBILITIES

9.1 As a Creator, you are a representative of the NOIZU-DIRECT community. Your conduct — both on and off the Platform — reflects on the community as a whole.
9.2 You are encouraged to support fellow Creators, engage positively with the fan and cosplay community, and contribute to a culture of creative generosity and mutual respect.
9.3 If you observe a violation of these Guidelines by another user, please report it through the Platform's reporting tools or by emailing trust@noizu.direct.
9.4 You are responsible for the conduct of any staff or assistants who access the Platform on your behalf.

10. ENFORCEMENT

10.1 The Company enforces these Guidelines through a combination of automated tools, user reports, and manual moderation.
10.2 Violations may result in: (a) content removal; (b) a formal warning; (c) temporary account suspension; (d) permanent account termination; or (e) referral to law enforcement where applicable.
10.3 The severity of enforcement action will generally reflect the seriousness of the violation, the Creator's history of compliance, and the impact on affected parties. However, serious violations (e.g., child safety, fraud) will result in immediate termination without warning.
10.4 If you believe an enforcement action against your account was taken in error, you may appeal through the process described on the Platform's Help Centre within 14 days of notification.

11. UPDATES TO THESE GUIDELINES

11.1 These Guidelines may be updated from time to time to reflect changes in the Platform, community standards, or applicable law.
11.2 Material changes will be communicated to Creators via email and via a notice on the Platform at least 14 days before they take effect.
11.3 Continued use of the Platform after the effective date of any change constitutes acceptance of the updated Guidelines.`

const COMMUNITY_GUIDELINES_SUMMARY = `These guidelines establish the standards of conduct expected from all NOIZU-DIRECT creators, including honest listings, respectful communication, intellectual property respect, and prohibited content. Violations — from plagiarism to buyer harassment — can result in warnings, suspension, or permanent termination. Creators are also encouraged to report guideline violations by other users to help keep the community safe.`

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== SEEDING AGREEMENTS ===\n')

  const effectiveDate = new Date('2026-04-01T00:00:00.000Z')
  const publishedAt = new Date('2026-03-01T00:00:00.000Z')
  const SYSTEM = 'system'

  // 1. Upsert all 5 templates
  const templates = await Promise.all([
    p.agreementTemplate.upsert({
      where: { id: 'tmpl_creator_tos_v1' },
      create: {
        id: 'tmpl_creator_tos_v1',
        type: 'CREATOR_TOS',
        version: '1.0',
        title: 'Creator Terms of Service',
        content: CREATOR_TOS_CONTENT,
        summary: CREATOR_TOS_SUMMARY,
        effectiveDate,
        isActive: true,
        createdBy: SYSTEM,
        publishedAt,
      },
      update: {
        content: CREATOR_TOS_CONTENT,
        summary: CREATOR_TOS_SUMMARY,
        isActive: true,
        publishedAt,
      },
    }),

    p.agreementTemplate.upsert({
      where: { id: 'tmpl_ip_declaration_v1' },
      create: {
        id: 'tmpl_ip_declaration_v1',
        type: 'IP_DECLARATION',
        version: '1.0',
        title: 'Intellectual Property Declaration',
        content: IP_DECLARATION_CONTENT,
        summary: IP_DECLARATION_SUMMARY,
        effectiveDate,
        isActive: true,
        createdBy: SYSTEM,
        publishedAt,
      },
      update: {
        content: IP_DECLARATION_CONTENT,
        summary: IP_DECLARATION_SUMMARY,
        isActive: true,
        publishedAt,
      },
    }),

    p.agreementTemplate.upsert({
      where: { id: 'tmpl_payment_terms_v1' },
      create: {
        id: 'tmpl_payment_terms_v1',
        type: 'PAYMENT_TERMS',
        version: '1.0',
        title: 'Payment and Payout Terms',
        content: PAYMENT_TERMS_CONTENT,
        summary: PAYMENT_TERMS_SUMMARY,
        effectiveDate,
        isActive: true,
        createdBy: SYSTEM,
        publishedAt,
      },
      update: {
        content: PAYMENT_TERMS_CONTENT,
        summary: PAYMENT_TERMS_SUMMARY,
        isActive: true,
        publishedAt,
      },
    }),

    p.agreementTemplate.upsert({
      where: { id: 'tmpl_privacy_policy_v1' },
      create: {
        id: 'tmpl_privacy_policy_v1',
        type: 'PRIVACY_POLICY',
        version: '1.0',
        title: 'Privacy Policy',
        content: PRIVACY_POLICY_CONTENT,
        summary: PRIVACY_POLICY_SUMMARY,
        effectiveDate,
        isActive: true,
        createdBy: SYSTEM,
        publishedAt,
      },
      update: {
        content: PRIVACY_POLICY_CONTENT,
        summary: PRIVACY_POLICY_SUMMARY,
        isActive: true,
        publishedAt,
      },
    }),

    p.agreementTemplate.upsert({
      where: { id: 'tmpl_community_guidelines_v1' },
      create: {
        id: 'tmpl_community_guidelines_v1',
        type: 'COMMUNITY_GUIDELINES',
        version: '1.0',
        title: 'Community Guidelines',
        content: COMMUNITY_GUIDELINES_CONTENT,
        summary: COMMUNITY_GUIDELINES_SUMMARY,
        effectiveDate,
        isActive: true,
        createdBy: SYSTEM,
        publishedAt,
      },
      update: {
        content: COMMUNITY_GUIDELINES_CONTENT,
        summary: COMMUNITY_GUIDELINES_SUMMARY,
        isActive: true,
        publishedAt,
      },
    }),
  ])

  console.log(`✅ Agreement templates upserted: ${templates.length}`)
  templates.forEach(t => console.log(`   ${t.type} v${t.version} — ${t.id}`))

  // 2. (Removed) — do not seed fake SUBMITTED applications for buyer accounts.
  //    Doing so redirects real users to /start-selling/status before they fill in the form.

  // 3. APPROVED application for sakura_arts
  const sakuraProfile = await p.creatorProfile.findFirst({
    where: { username: 'sakura_arts' },
    include: { user: true },
  })

  if (!sakuraProfile) {
    console.log('\n⚠️  sakura_arts creator profile not found — skipping APPROVED application')
  } else {
    const sakuraUserId = sakuraProfile.user.id
    console.log(`\n🌸 Processing sakura_arts — userId: ${sakuraUserId}`)

    await p.creatorApplication.upsert({
      where: { userId: sakuraUserId },
      create: {
        userId: sakuraUserId,
        status: 'APPROVED',
        displayName: 'Sakura Arts',
        username: 'sakura_arts',
        bio: 'Digital illustrator from Kuala Lumpur specialising in original characters and fan art. Comic Fiesta veteran since 2018.',
        categoryTags: JSON.stringify(['Digital Art', 'Cosplay Print', 'Stickers', 'Illustration']),
        legalFullName: 'Nur Aisyah binti Razali',
        dateOfBirth: new Date('1995-06-15'),
        nationality: 'Malaysian',
        country: 'Malaysia',
        phone: '+60123456789',
        idType: 'IC',
        idNumber: '950615-14-5678',
        bankName: 'CIMB Bank',
        bankAccountNumber: '7001234567',
        bankAccountName: 'Nur Aisyah binti Razali',
        submittedAt: new Date('2026-03-15T10:00:00.000Z'),
        reviewedAt: new Date('2026-03-17T14:00:00.000Z'),
        reviewedBy: SYSTEM,
        adminNote: 'Verified identity documents. Established creator with strong portfolio. Approved.',
      },
      update: {
        status: 'APPROVED',
        reviewedAt: new Date('2026-03-17T14:00:00.000Z'),
        reviewedBy: SYSTEM,
        adminNote: 'Verified identity documents. Established creator with strong portfolio. Approved.',
      },
    })
    console.log('   ✅ APPROVED application upserted for sakura_arts')

    // 4. Create CreatorAgreement records for sakura_arts for all 5 templates
    const agreedAt = new Date('2026-03-15T10:05:00.000Z')
    let signedCount = 0

    for (const template of templates) {
      const existing = await p.creatorAgreement.findFirst({
        where: { userId: sakuraUserId, templateId: template.id },
      })
      if (!existing) {
        await p.creatorAgreement.create({
          data: {
            userId: sakuraUserId,
            templateId: template.id,
            agreementType: template.type,
            agreementVersion: template.version,
            agreedAt,
            ipAddress: '175.143.12.34',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            signedName: 'Nur Aisyah binti Razali',
            agreementSnapshot: template.content,
            isActive: true,
          },
        })
        signedCount++
      }
    }
    console.log(`   ✅ CreatorAgreement records created: ${signedCount} (${templates.length - signedCount} already existed)`)

    // 5. Update sakura_arts user: creatorVerificationStatus → VERIFIED
    await p.user.update({
      where: { id: sakuraUserId },
      data: { creatorVerificationStatus: 'VERIFIED' },
    })
    console.log('   ✅ User creatorVerificationStatus → VERIFIED')
  }

  console.log('\n=== SEED COMPLETE ===')
}

main().catch(console.error).finally(() => p.$disconnect())
