import { chromium } from 'playwright'
import { join } from 'path'
import { homedir } from 'os'

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5px; color: #1a1a1a; padding: 40px 48px; line-height: 1.6; }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; color: #111; }
  .subtitle { font-size: 11px; color: #666; margin-bottom: 32px; }
  h2 { font-size: 13px; font-weight: 700; margin: 28px 0 10px; color: #111; border-bottom: 2px solid #7c3aed; padding-bottom: 5px; }
  h3 { font-size: 11px; font-weight: 700; margin: 14px 0 6px; color: #5b21b6; }
  h4 { font-size: 10.5px; font-weight: 600; margin: 10px 0 4px; color: #333; }
  p { margin-bottom: 7px; color: #333; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; font-size: 10px; }
  th { background: #f5f3ff; color: #5b21b6; font-weight: 600; text-align: left; padding: 6px 9px; border: 1px solid #ddd; }
  td { padding: 5px 9px; border: 1px solid #e5e5e5; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  code { font-family: 'Consolas', monospace; font-size: 9.5px; background: #f5f3ff; color: #5b21b6; padding: 1px 5px; border-radius: 3px; }
  .code-block { background: #13131a; color: #c4b5fd; padding: 10px 14px; border-radius: 6px; font-family: 'Consolas', monospace; font-size: 9px; margin: 6px 0 12px; white-space: pre-wrap; line-height: 1.7; }
  .note { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 7px 11px; margin: 8px 0; font-size: 10px; color: #444; }
  .warn { background: #fff1f2; border-left: 3px solid #f43f5e; padding: 7px 11px; margin: 8px 0; font-size: 10px; color: #444; }
  .ok { background: #f0fdf4; border-left: 3px solid #22c55e; padding: 7px 11px; margin: 8px 0; font-size: 10px; color: #444; }
  .section { margin-bottom: 20px; page-break-inside: avoid; }
  .flow { display: flex; align-items: flex-start; gap: 6px; margin: 8px 0; flex-wrap: wrap; }
  .step { background: #f5f3ff; border: 1px solid #ddd5fe; border-radius: 4px; padding: 4px 8px; font-size: 9.5px; color: #4c1d95; white-space: nowrap; }
  .arrow { color: #a78bfa; font-size: 12px; line-height: 2; }
  .footer { margin-top: 40px; padding-top: 10px; border-top: 1px solid #e5e5e5; font-size: 9px; color: #999; text-align: center; }
  ul { padding-left: 16px; margin-bottom: 7px; }
  li { margin-bottom: 2px; color: #333; }
  .badge { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 9px; font-weight: 600; }
  .badge-green { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
  .badge-red { background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; }
  .badge-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .badge-purple { background: #f5f3ff; color: #5b21b6; border: 1px solid #ddd5fe; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .col {}
</style>
</head>
<body>

<h1>NOIZU DIRECT — Payment System Technical Specifications</h1>
<p class="subtitle">Airwallex Integration · Escrow Architecture · Commission Flow · v1.0 · ${new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })} · Internal Reference</p>

<!-- ═══════════════════════════════════════════════════════════ -->
<div class="section">
<h2>1. System Overview</h2>
<p>NOIZU DIRECT uses <strong>Airwallex</strong> for all payment processing (sandbox: <code>api-demo.airwallex.com</code>, production: <code>api.airwallex.com</code>). There are two checkout flows and one unified webhook handler. Escrow is managed in-app via the Prisma database — Airwallex does not enforce escrow holds.</p>

<div class="two-col">
<div class="col">
<h3>Checkout Flows</h3>
<table>
  <tr><th>Flow</th><th>Route</th><th>UI</th><th>Payment Method</th></tr>
  <tr><td><strong>Cart Checkout</strong></td><td>/checkout</td><td>CheckoutPageClient</td><td>Drop-in SDK</td></tr>
  <tr><td><strong>Single Order</strong></td><td>/checkout/[orderId]</td><td>CheckoutClient</td><td>HPP Redirect</td></tr>
</table>
</div>
<div class="col">
<h3>Key Services</h3>
<table>
  <tr><th>Service</th><th>Provider</th></tr>
  <tr><td>Payment capture</td><td>Airwallex HPP / Drop-in SDK</td></tr>
  <tr><td>Payout transfer</td><td>Airwallex Transfers API</td></tr>
  <tr><td>Emails</td><td>Resend</td></tr>
  <tr><td>Escrow automation</td><td>In-app cron (escrow-processor)</td></tr>
  <tr><td>Payout reconciliation</td><td>In-app cron (payout-reconciler)</td></tr>
</table>
</div>
</div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<div class="section">
<h2>2. Payment IN — Cart Checkout (Drop-in SDK)</h2>
<p>Primary checkout flow. Uses the Airwallex Drop-in JavaScript widget embedded in-page. Orders are created <em>before</em> payment is captured, and activated by the webhook.</p>

<h3>Flow</h3>
<div class="flow">
  <span class="step">1. Buyer reviews cart</span><span class="arrow">→</span>
  <span class="step">2. POST /api/airwallex/payment-intent</span><span class="arrow">→</span>
  <span class="step">3. PENDING orders created in DB</span><span class="arrow">→</span>
  <span class="step">4. Airwallex intent created</span><span class="arrow">→</span>
  <span class="step">5. Drop-in SDK mounted</span><span class="arrow">→</span>
  <span class="step">6. Buyer pays</span><span class="arrow">→</span>
  <span class="step">7. Webhook fires</span><span class="arrow">→</span>
  <span class="step">8. Orders → PROCESSING</span><span class="arrow">→</span>
  <span class="step">9. Buyer → /orders?success=1</span>
</div>

<h3>POST /api/airwallex/payment-intent — Order Creation Logic</h3>
<table>
  <tr><th>Field</th><th>PENDING value (before payment)</th><th>Set by webhook on payment</th></tr>
  <tr><td>status</td><td>PENDING</td><td>PROCESSING</td></tr>
  <tr><td>escrowStatus</td><td>HELD</td><td>HELD (unchanged)</td></tr>
  <tr><td>downloadToken</td><td>null</td><td>crypto.randomUUID() — digital only</td></tr>
  <tr><td>downloadExpiry</td><td>null</td><td>now + 30 days — digital only</td></tr>
  <tr><td>escrowAutoReleaseAt</td><td>null</td><td>now + 48h + extraDays — digital only</td></tr>
  <tr><td>commissionStatus</td><td>PENDING_ACCEPTANCE — commission only</td><td>(unchanged)</td></tr>
  <tr><td>airwallexIntentId</td><td>Set before drop-in mount</td><td>(unchanged)</td></tr>
</table>
<div class="note">Stale PENDING orders for the same buyer are deleted before creating new ones, preventing orphaned payment intents.</div>

<h3>Airwallex Drop-in SDK Initialisation</h3>
<div class="code-block">Airwallex.init({ env: process.env.NEXT_PUBLIC_AIRWALLEX_ENV, origin: window.location.origin })
const dropIn = Airwallex.createElement('dropIn', {
  intent_id: intentId,
  client_secret: clientSecret,
  currency: 'USD',
})
dropIn.mount('#airwallex-dropin')
dropIn.on('success', () => router.push('/orders?success=1'))
dropIn.on('error', (e) => setPaymentError(e.detail.error.message))</div>

<div class="ok">The Drop-in SDK script is loaded from <code>https://checkout.airwallex.com/assets/bundle.x.min.js</code> (works for both demo and production — demo env is controlled by the <code>env</code> param in <code>Airwallex.init()</code>).</div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<div class="section">
<h2>3. Payment IN — Single Order HPP Redirect</h2>
<p>Legacy flow for orders pre-created outside the cart (e.g. admin-created orders). Redirects to Airwallex Hosted Payment Page.</p>

<div class="flow">
  <span class="step">1. Order pre-created as PENDING</span><span class="arrow">→</span>
  <span class="step">2. POST /api/checkout/intent</span><span class="arrow">→</span>
  <span class="step">3. Payment intent created</span><span class="arrow">→</span>
  <span class="step">4. HPP URL constructed</span><span class="arrow">→</span>
  <span class="step">5. window.location.href = hppUrl</span><span class="arrow">→</span>
  <span class="step">6. Buyer pays on Airwallex HPP</span><span class="arrow">→</span>
  <span class="step">7. Redirect to successUrl</span><span class="arrow">→</span>
  <span class="step">8. Webhook fires → order PAID</span>
</div>

<h3>HPP URL Construction</h3>
<div class="code-block">const isDemo = AIRWALLEX_BASE_URL.includes('demo')
const checkoutBase = isDemo
  ? 'https://checkout-demo.airwallex.com'
  : 'https://checkout.airwallex.com'

const hppUrl = \`\${checkoutBase}/#/payment/
  ?intent_id=\${intent.id}
  &client_secret=\${intent.client_secret}
  &currency=\${currency}
  &successUrl=\${encodeURIComponent('/order/success?orderId=...')}
  &cancelUrl=\${encodeURIComponent('/checkout/...')}\`</div>

<div class="warn"><strong>Note:</strong> <code>intent.next_action.url</code> is always <code>undefined</code> for this intent type. The HPP URL must be constructed manually from <code>intent.client_secret</code>. The old code incorrectly relied on next_action — this is now fixed.</div>

<h3>Handled by: /api/webhooks/airwallex (older handler)</h3>
<p>Sets order to <code>status: 'PAID'</code>, creates a <code>COMPLETED</code> Transaction immediately. This handler is used exclusively by the HPP single-order flow.</p>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<div class="section">
<h2>4. Webhook Handlers</h2>
<p>Two webhook routes exist. Both are protected by HMAC-SHA256 signature verification using <code>AIRWALLEX_WEBHOOK_SECRET</code>. Register the correct one with your Airwallex dashboard.</p>

<table>
  <tr><th>Route</th><th>Used by</th><th>Events handled</th></tr>
  <tr><td><code>/api/airwallex/webhook</code></td><td>Cart checkout (drop-in)</td><td>payment_intent.succeeded, payment_intent.failed, transfer.succeeded, transfer.failed</td></tr>
  <tr><td><code>/api/webhooks/airwallex</code></td><td>Single order (HPP)</td><td>payment_intent.succeeded</td></tr>
</table>

<h3>payment_intent.succeeded — /api/airwallex/webhook</h3>
<p>Finds all PENDING orders by <code>airwallexIntentId</code>. For each order:</p>
<table>
  <tr><th>Product type</th><th>escrowStatus after</th><th>escrowAutoReleaseAt</th><th>downloadToken</th><th>Transaction status</th></tr>
  <tr><td>DIGITAL</td><td>HELD</td><td>now + 48h + newCreatorExtraDays</td><td>Generated (UUID)</td><td>COMPLETED</td></tr>
  <tr><td>PHYSICAL / POD</td><td>HELD</td><td>null (set when tracking added)</td><td>null</td><td>COMPLETED</td></tr>
  <tr><td>COMMISSION</td><td>HELD</td><td>null (set when delivered)</td><td>null</td><td>ESCROW</td></tr>
</table>

<h3>Transaction Record Fields</h3>
<div class="code-block">grossAmountUsd = order.amountUsd            // total charged to buyer incl. processing fee
processingFee  = amountUsd × fee / (1 + fee)  // extract fee from inclusive total (default 2.5%)
creatorAmount  = amountUsd - processingFee
withdrawalFee  = 0                             // deducted at payout time, not captured here
currency       = order.displayCurrency
airwallexReference = intentId</div>

<h3>Signature Verification</h3>
<div class="code-block">const expected = crypto.createHmac('sha256', AIRWALLEX_WEBHOOK_SECRET).update(rawBody).digest('hex')
crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
// Missing/placeholder secret → 500 (deployment misconfiguration, not bypass)</div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<div class="section">
<h2>5. Escrow System</h2>
<p>Escrow is entirely in-app. <code>Order.escrowStatus</code> tracks state; <code>EscrowTransaction</code> logs every change. The <code>escrow-processor</code> cron runs daily and handles all auto-releases and cancellations.</p>

<h3>Escrow Status Transitions</h3>
<table>
  <tr><th>Status</th><th>Meaning</th></tr>
  <tr><td>HELD</td><td>Funds held; order in progress</td></tr>
  <tr><td>TRACKING_ADDED</td><td>Physical/POD: tracking number provided; release countdown started</td></tr>
  <tr><td>RELEASED</td><td>Escrow released; creator can withdraw</td></tr>
  <tr><td>REFUNDED</td><td>Full refund issued to buyer</td></tr>
  <tr><td>PARTIALLY_REFUNDED</td><td>Dispute resolved with partial refund</td></tr>
</table>

<h3>Auto-Release Schedule (Configurable in PlatformSettings)</h3>
<table>
  <tr><th>Product Type</th><th>Trigger</th><th>Hold Duration</th><th>New Creator Extra</th></tr>
  <tr><td>DIGITAL</td><td>Payment confirmed</td><td>48 hours (<code>digitalEscrowHours</code>)</td><td>+ 7 days</td></tr>
  <tr><td>PHYSICAL</td><td>Tracking number added</td><td>14 days (<code>physicalEscrowDays</code>)</td><td>+ 7 days</td></tr>
  <tr><td>POD</td><td>Tracking number added</td><td>30 days (<code>podEscrowDays</code>)</td><td>+ 7 days</td></tr>
  <tr><td>COMMISSION deposit</td><td>Creator accepts commission</td><td>48 hours</td><td>+ 7 days</td></tr>
  <tr><td>COMMISSION balance</td><td>Creator delivers files</td><td>30 days (<code>commissionEscrowDays</code>)</td><td>+ 7 days</td></tr>
</table>

<h3>New Creator Modifier</h3>
<p>+7 days applies until <em>both</em>: <code>creatorVerificationStatus = VERIFIED</code> AND 10+ completed orders (<code>newCreatorTransactionThreshold</code>). Implemented in <code>src/lib/creator-trust.ts → getNewCreatorExtraDays()</code>.</p>

<h3>Escrow Processor Cron Sections</h3>
<table>
  <tr><th>#</th><th>What it does</th><th>Condition</th></tr>
  <tr><td>1</td><td>Release physical/POD orders</td><td>escrowStatus=TRACKING_ADDED, escrowAutoReleaseAt ≤ now, no open dispute</td></tr>
  <tr><td>2</td><td>Release digital orders</td><td>escrowStatus=HELD, escrowAutoReleaseAt ≤ now, no fulfillmentDeadline, no commissionStatus</td></tr>
  <tr><td>3</td><td>Release commission balance</td><td>commissionStatus=DELIVERED, escrowAutoReleaseAt ≤ now</td></tr>
  <tr><td>4</td><td>Auto-cancel commissions</td><td>commissionStatus=PENDING_ACCEPTANCE, commissionAcceptDeadlineAt ≤ now</td></tr>
  <tr><td>5</td><td>Release commission deposit</td><td>commissionDepositAutoReleaseAt ≤ now, deposit not yet released</td></tr>
  <tr><td>6</td><td>Cancel overdue physical/POD</td><td>escrowStatus=HELD, fulfillmentDeadline ≤ now, no tracking, no commissionStatus</td></tr>
</table>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<div class="section">
<h2>6. Commission Flow</h2>

<h3>Stage 1 — Order Placement</h3>
<p>Buyer pays 100% upfront. Transaction created as <code>status: ESCROW</code>. Buyer consents to deposit release at checkout (<code>commissionDepositConsentAt</code> recorded). Order gets <code>commissionStatus: PENDING_ACCEPTANCE</code> and a 48-hour acceptance deadline.</p>

<h3>Stage 2 — Creator Accepts (POST /api/orders/[id]/commission/accept)</h3>
<p>Creator has 48h window. Sets <code>commissionStatus: ACCEPTED</code>, starts deposit escrow countdown: <code>commissionDepositAutoReleaseAt = now + 48h + extraDays</code>.</p>

<h3>Stage 3 — Deposit Releases (Escrow Processor Section 5)</h3>
<p>Creates a separate <code>COMPLETED</code> Transaction for the deposit amount. Sets <code>commissionDepositReleasedAt</code>. Deposit is now in creator's payout balance.</p>

<h3>Stage 4 — Creator Delivers (POST /api/orders/[id]/commission/deliver)</h3>
<p>Creator uploads files. Sets <code>escrowAutoReleaseAt = now + 30 days + extraDays</code> for the balance portion.</p>

<h3>Stage 5 — Balance Releases</h3>
<p>Either buyer accepts delivery (immediate) or 30-day timeout. A second <code>COMPLETED</code> Transaction is created for the balance amount. Both transactions together cover the full order amount.</p>

<h3>Cancellation Rules</h3>
<table>
  <tr><th>When</th><th>Deposit</th><th>Balance</th></tr>
  <tr><td>Before creator accepts (or 48h timeout)</td><td>Full refund to buyer</td><td>Full refund to buyer</td></tr>
  <tr><td>After creator accepts (admin cancel)</td><td>Kept by creator</td><td>Refunded to buyer</td></tr>
</table>

<h3>Commission Order Fields (Order model)</h3>
<div class="code-block">commissionStatus           // PENDING_ACCEPTANCE | ACCEPTED | REVISION_REQUESTED | DELIVERED | COMPLETED
commissionBriefText        // Buyer's brief (collected at checkout)
commissionReferenceImages  // JSON array of image URLs
commissionDepositPercent   // Creator-set %, e.g. 30
commissionDepositAmount    // Calculated in cents
commissionRevisionsAllowed // From product listing
commissionRevisionsUsed    // Decrements on each revision request
commissionAcceptDeadlineAt // 48h from order creation
commissionAcceptedAt       // When creator accepts
commissionDeliveredAt      // First delivery timestamp (not updated on redelivery)
commissionDeliveryFiles    // JSON array of file URLs
commissionBuyerAcceptedAt  // When buyer clicks accept delivery
commissionDepositConsentAt // Buyer consent recorded at checkout
commissionDepositAutoReleaseAt  // 48h after acceptance + extraDays
commissionDepositReleasedAt     // Null until deposit is released</div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<div class="section">
<h2>7. Payment OUT — Creator Payouts</h2>

<h3>Flow</h3>
<div class="flow">
  <span class="step">1. Creator requests payout</span><span class="arrow">→</span>
  <span class="step">2. POST /api/dashboard/payout</span><span class="arrow">→</span>
  <span class="step">3. Payout record PENDING</span><span class="arrow">→</span>
  <span class="step">4. Admin approves → APPROVED</span><span class="arrow">→</span>
  <span class="step">5. Admin executes → Airwallex transfer</span><span class="arrow">→</span>
  <span class="step">6. Payout → PROCESSING</span><span class="arrow">→</span>
  <span class="step">7. Webhook / cron reconciler → PAID or REJECTED</span>
</div>

<h3>Payout Eligibility Checks (in order)</h3>
<table>
  <tr><th>#</th><th>Check</th><th>Error if fails</th></tr>
  <tr><td>1</td><td>Minimum amount ≥ MYR 50 (5000 cents)</td><td>"Minimum payout is RM50"</td></tr>
  <tr><td>2</td><td>No existing PENDING payout</td><td>"You already have a pending payout request"</td></tr>
  <tr><td>3</td><td>No open disputes</td><td>"You have open disputes that must be resolved first"</td></tr>
  <tr><td>4</td><td>Account status = ACTIVE</td><td>"Your account must be active to request a payout"</td></tr>
  <tr><td>5</td><td>KYC verified + 10 completed orders (or prior PAID payout)</td><td>"Complete X more orders…"</td></tr>
  <tr><td>6</td><td>Payout details configured (bank or PayPal)</td><td>"Please set up your payout details first"</td></tr>
  <tr><td>7</td><td>Available balance ≥ requested amount</td><td>"Insufficient balance"</td></tr>
</table>

<h3>Available Balance Calculation</h3>
<div class="code-block">available = SUM(Transaction.creatorAmount WHERE status='COMPLETED')
          - SUM(Payout.amountUsd WHERE status != 'FAILED')</div>

<h3>Payout Execution (Admin: PATCH /api/admin/payouts/[id] action=paid)</h3>
<table>
  <tr><th>Payout method</th><th>API called</th><th>Stores</th></tr>
  <tr><td>bank_transfer</td><td>Airwallex POST /api/v1/transfers/create</td><td>airwallexTransferId</td></tr>
  <tr><td>paypal</td><td>PayPal Payouts API</td><td>airwallexTransferId (batch_id)</td></tr>
</table>
<div class="warn"><strong>Error handling:</strong> Transfer API errors now bubble up as 4xx/5xx responses. Payout status is only set to PROCESSING if the transfer call succeeds. A missing or unconfigured beneficiary returns 400 before attempting a transfer.</div>

<h3>Bank Details Storage</h3>
<p>Account details are encrypted at rest using AES-256-CBC (<code>PAYOUT_ENCRYPTION_KEY</code>, 32-byte key). Only a masked version is returned to the UI (last 4 digits). The Airwallex <code>beneficiary_id</code> is stored in plaintext on <code>CreatorProfile.airwallexBeneficiaryId</code>.</p>

<h3>Payout Reconciler Cron (/api/cron/payout-reconciler)</h3>
<p>Runs daily. Finds payouts in PROCESSING status where <code>processedAt</code> is over 24 hours ago and <code>airwallexTransferId</code> is set. Calls <code>GET /api/v1/transfers/{id}</code> to poll status. Maps Airwallex <code>SUCCEEDED/PAID → PAID</code> and <code>FAILED/REJECTED → REJECTED</code>. Also handled by webhook <code>transfer.succeeded</code> / <code>transfer.failed</code> events (whichever fires first).</p>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<div class="section">
<h2>8. Airwallex API Reference</h2>

<table>
  <tr><th>Function</th><th>Airwallex Endpoint</th><th>Used in</th></tr>
  <tr><td>getAirwallexToken()</td><td>POST /api/v1/authentication/login</td><td>All API calls (cached 30 min)</td></tr>
  <tr><td>createPaymentIntent()</td><td>POST /api/v1/pa/payment_intents/create</td><td>payment-intent route, checkout/intent route</td></tr>
  <tr><td>confirmPaymentIntent()</td><td>GET /api/v1/pa/payment_intents/{id}</td><td>Order verification</td></tr>
  <tr><td>createBeneficiary()</td><td>POST /api/v1/beneficiaries/create</td><td>Payout settings save</td></tr>
  <tr><td>executeTransfer()</td><td>POST /api/v1/transfers/create</td><td>Admin payout execution</td></tr>
  <tr><td>getTransferStatus()</td><td>GET /api/v1/transfers/{id}</td><td>Payout reconciler cron</td></tr>
</table>

<h3>Payment Intent Response Fields Used</h3>
<div class="code-block">intent.id             // Stored on order as airwallexIntentId; used to look up order in webhook
intent.client_secret  // Used to construct HPP URL or mount Drop-in SDK
intent.next_action    // Always undefined — do NOT use for HPP URL construction</div>

<h3>Beneficiary Fields</h3>
<div class="code-block">entity_type: 'PERSONAL'     // Hardcoded (no business accounts in v1)
bank_details.account_currency
bank_details.account_name
bank_details.bank_name
bank_details.account_number
bank_details.routing_number   // Optional (US/AU)
bank_details.swift_code       // Optional (international)</div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<div class="section">
<h2>9. Environment Variables</h2>

<table>
  <tr><th>Variable</th><th>Description</th><th>Sandbox value</th></tr>
  <tr><td>AIRWALLEX_CLIENT_ID</td><td>API client ID</td><td>From Airwallex demo dashboard</td></tr>
  <tr><td>AIRWALLEX_API_SECRET</td><td>API secret key</td><td>From Airwallex demo dashboard</td></tr>
  <tr><td>AIRWALLEX_BASE_URL</td><td>API base URL</td><td>https://api-demo.airwallex.com</td></tr>
  <tr><td>AIRWALLEX_ENV</td><td>Internal env flag (server-side)</td><td>demo</td></tr>
  <tr><td>NEXT_PUBLIC_AIRWALLEX_ENV</td><td>Env flag passed to Drop-in SDK</td><td>demo</td></tr>
  <tr><td>AIRWALLEX_WEBHOOK_SECRET</td><td>HMAC secret for webhook verification</td><td>From Airwallex demo dashboard → Webhooks</td></tr>
  <tr><td>PAYOUT_ENCRYPTION_KEY</td><td>AES-256 key for bank details (32 chars)</td><td>Generate: openssl rand -hex 16</td></tr>
  <tr><td>CRON_SECRET</td><td>Bearer token for cron authorization</td><td>Any random string</td></tr>
  <tr><td>NEXT_PUBLIC_APP_URL</td><td>Full app URL (used in HPP callback URLs)</td><td>http://localhost:7000</td></tr>
</table>
<div class="warn"><strong>Production:</strong> Change AIRWALLEX_BASE_URL → https://api.airwallex.com and NEXT_PUBLIC_AIRWALLEX_ENV → prod. The HPP checkout base auto-derives from the API base URL.</div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<div class="section">
<h2>10. Key File Map</h2>

<table>
  <tr><th>File</th><th>Purpose</th></tr>
  <tr><td>src/lib/airwallex.ts</td><td>Airwallex API client (token cache, all API functions)</td></tr>
  <tr><td>src/lib/creator-trust.ts</td><td>getNewCreatorExtraDays(), isGraduatedCreator()</td></tr>
  <tr><td>src/lib/escrow-processor.ts</td><td>runEscrowProcessor(), releaseEscrow(), refundEscrow(), cancelCommissionWithSplit()</td></tr>
  <tr><td>src/app/api/airwallex/payment-intent/route.ts</td><td>Cart checkout: create PENDING orders + payment intent → returns intentId + clientSecret</td></tr>
  <tr><td>src/app/api/airwallex/webhook/route.ts</td><td>Main webhook: payment success/failure + transfer success/failure</td></tr>
  <tr><td>src/app/api/webhooks/airwallex/route.ts</td><td>Legacy webhook for HPP single-order flow</td></tr>
  <tr><td>src/app/api/checkout/intent/route.ts</td><td>HPP flow: creates payment intent, constructs HPP URL from client_secret</td></tr>
  <tr><td>src/app/api/dashboard/payout/route.ts</td><td>Creator payout request (GET balance, POST request)</td></tr>
  <tr><td>src/app/api/dashboard/payout/settings/route.ts</td><td>Creator bank details + Airwallex beneficiary creation</td></tr>
  <tr><td>src/app/api/admin/payouts/[id]/route.ts</td><td>Admin approve/execute/reject payout</td></tr>
  <tr><td>src/app/api/cron/payout-reconciler/route.ts</td><td>Daily cron: poll Airwallex transfer status for stalled payouts</td></tr>
  <tr><td>src/app/api/cron/escrow-processor/route.ts</td><td>Daily cron: calls runEscrowProcessor()</td></tr>
  <tr><td>src/components/checkout/CheckoutPageClient.tsx</td><td>Cart checkout UI with Drop-in SDK</td></tr>
  <tr><td>src/components/checkout/CheckoutClient.tsx</td><td>Single-order checkout UI (HPP redirect)</td></tr>
  <tr><td>prisma/schema.prisma</td><td>Order, Transaction, Payout, EscrowTransaction, PlatformSettings models</td></tr>
</table>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<div class="section">
<h2>11. Known Limitations (v1)</h2>
<ul>
  <li>Airwallex beneficiary is hardcoded as <code>entity_type: 'PERSONAL'</code> — no business account support</li>
  <li>Payment method hardcoded as <code>LOCAL</code> in transfers — no SWIFT fallback</li>
  <li>4% withdrawal provision is visible in admin UI but not explicitly tracked in Transaction records (<code>withdrawalFee: 0</code>); the actual deduction happens at the point of transfer via Airwallex</li>
  <li>Cart checkout does not have commission brief input UI — commission orders via cart checkout will have <code>commissionBriefText: null</code></li>
  <li>No retry mechanism for failed webhook processing — rely on Airwallex's automatic retry schedule (typically 3 attempts)</li>
  <li>Payout currency is set at beneficiary creation time; changing currency requires re-creating the beneficiary</li>
</ul>
</div>

<div class="footer">
  NOIZU DIRECT · Payment System Technical Specifications · Generated ${new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })} · Internal Reference Only
</div>

</body>
</html>`

async function run() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'domcontentloaded' })

  const outputPath = join(homedir(), 'Downloads', 'noizu-direct-payment-techspecs.pdf')
  await page.pdf({
    path: outputPath,
    format: 'A4',
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    printBackground: true,
  })

  await browser.close()
  console.log('PDF saved to:', outputPath)
}

run().catch(e => { console.error(e); process.exit(1) })
