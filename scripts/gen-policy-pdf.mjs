import { chromium } from 'playwright'
import { join } from 'path'
import { homedir } from 'os'

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 40px 48px; line-height: 1.6; }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; color: #111; }
  .subtitle { font-size: 12px; color: #666; margin-bottom: 32px; }
  h2 { font-size: 14px; font-weight: 700; margin: 28px 0 10px; color: #111; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; }
  h3 { font-size: 12px; font-weight: 600; margin: 16px 0 6px; color: #333; }
  p { margin-bottom: 8px; color: #333; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; font-size: 10.5px; }
  th { background: #f5f3ff; color: #5b21b6; font-weight: 600; text-align: left; padding: 7px 10px; border: 1px solid #ddd; }
  td { padding: 6px 10px; border: 1px solid #e5e5e5; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 9.5px; font-weight: 600; }
  .badge-purple { background: #f5f3ff; color: #5b21b6; }
  .badge-green { background: #f0fdf4; color: #166534; }
  .note { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 8px 12px; margin: 10px 0; font-size: 10.5px; color: #444; }
  .section { margin-bottom: 24px; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e5e5; font-size: 9.5px; color: #999; text-align: center; }
  ul { padding-left: 18px; margin-bottom: 8px; }
  li { margin-bottom: 3px; }
</style>
</head>
<body>

<h1>NOIZU DIRECT — Platform Policy Reference</h1>
<p class="subtitle">Escrow, Payout & Commission Policy · Version 1.0 · Effective April 2026 · Internal Reference Document</p>

<div class="section">
<h2>1. Product Types & Escrow Policy</h2>
<table>
  <tr>
    <th>Product Type</th>
    <th>Base Escrow Hold</th>
    <th>Release Trigger</th>
    <th>Dispute Window</th>
  </tr>
  <tr>
    <td><strong>Digital Print</strong></td>
    <td>48 hours from payment</td>
    <td>Auto-release after hold expires</td>
    <td>7 days from order</td>
  </tr>
  <tr>
    <td><strong>Physical Product</strong></td>
    <td>14 days after tracking added</td>
    <td>Buyer confirms received OR timeout</td>
    <td>14 days from tracking</td>
  </tr>
  <tr>
    <td><strong>POD (Print-on-Demand)</strong></td>
    <td>30 days after tracking added</td>
    <td>Buyer confirms received OR timeout</td>
    <td>30 days from tracking</td>
  </tr>
  <tr>
    <td><strong>Commission</strong></td>
    <td>Deposit: 48h after creator acceptance<br>Balance: 30 days after delivery</td>
    <td>Buyer accepts OR timeout (each portion)</td>
    <td>30 days from first delivery</td>
  </tr>
</table>
<div class="note">All escrow hold durations are configurable in PlatformSettings. The values above are the current defaults.</div>
</div>

<div class="section">
<h2>2. New Creator Modifier</h2>
<p>An additional <strong>+7 days</strong> is added to the base escrow hold for new creators. This modifier applies until <em>both</em> conditions are met:</p>
<ul>
  <li>KYC verification approved (creatorVerificationStatus = VERIFIED)</li>
  <li>10 or more completed orders on the platform</li>
</ul>
<table>
  <tr><th>Example</th><th>Base</th><th>Modifier</th><th>Total Hold</th></tr>
  <tr><td>New creator · Digital Print</td><td>48 hours</td><td>+7 days</td><td>~9 days</td></tr>
  <tr><td>New creator · Physical</td><td>14 days</td><td>+7 days</td><td>21 days</td></tr>
  <tr><td>New creator · Commission deposit</td><td>48 hours</td><td>+7 days</td><td>~9 days</td></tr>
  <tr><td>Graduated creator · Any product</td><td>Base only</td><td>None</td><td>Base only</td></tr>
</table>
</div>

<div class="section">
<h2>3. Commission Flow</h2>
<h3>Order Placement</h3>
<p>Buyer pays 100% of the commission price upfront. All funds held in escrow. Buyer explicitly consents to deposit release terms at checkout. Commission Transaction is created with status <code>ESCROW</code> (not yet in creator payout balance).</p>

<h3>48-Hour Acceptance Window</h3>
<p>Creator has 48 hours to accept or decline the commission. If no action is taken, the order auto-cancels and the buyer receives a full refund.</p>

<h3>Deposit Release</h3>
<p>Once the creator accepts, the deposit portion (creator-set %, e.g. 30–70%) enters a 48-hour release hold (+ new creator modifier if applicable). After the hold, a separate <code>COMPLETED</code> Transaction is created for the deposit amount and it becomes available in the creator's payout balance.</p>

<h3>Delivery & Balance Release</h3>
<p>Creator uploads delivery files. A 30-day acceptance window starts. Buyer can accept delivery (immediate balance release) or request revisions (counter decrements). If buyer does not respond within 30 days, balance auto-releases. A second <code>COMPLETED</code> Transaction is created for the balance amount.</p>

<h3>Cancellation Rules</h3>
<table>
  <tr><th>When cancelled</th><th>Deposit</th><th>Balance</th></tr>
  <tr><td>Before creator accepts (or 48h timeout)</td><td>Full refund to buyer</td><td>Full refund to buyer</td></tr>
  <tr><td>After creator accepts (admin cancel)</td><td>Kept by creator</td><td>Refunded to buyer</td></tr>
</table>
</div>

<div class="section">
<h2>4. Revision Policy</h2>
<p>Creators set the number of included revisions on their commission listing. The platform tracks usage via a counter on the order.</p>
<ul>
  <li>Each revision request decrements the counter and notifies the creator</li>
  <li>When the limit is reached, both parties are notified — but the platform does not block further requests</li>
  <li>Extra revision charges are at the creator's discretion (not enforced by the platform in v1)</li>
</ul>
</div>

<div class="section">
<h2>5. Payout Eligibility</h2>
<p>A creator must meet <strong>all</strong> of the following to request a payout:</p>
<ul>
  <li>Account status: ACTIVE</li>
  <li>No open disputes on any order</li>
  <li>No existing PENDING payout request</li>
  <li>Available balance ≥ MYR 50</li>
  <li>Payout bank details configured (Airwallex beneficiary or PayPal)</li>
  <li><strong>New creator gate:</strong> KYC verified + 10 completed orders (or at least 1 prior successful payout)</li>
</ul>
<h3>Payout Flow</h3>
<p>Creator requests → Admin approves → Airwallex transfer initiated → Cron reconciler polls status daily → Marked PAID or REJECTED</p>
</div>

<div class="section">
<h2>6. Configurable Settings (PlatformSettings)</h2>
<table>
  <tr><th>Field</th><th>Default</th><th>Description</th></tr>
  <tr><td>digitalEscrowHours</td><td>48</td><td>Hours to hold digital order escrow</td></tr>
  <tr><td>physicalEscrowDays</td><td>14</td><td>Days to hold physical order after tracking</td></tr>
  <tr><td>podEscrowDays</td><td>30</td><td>Days to hold POD order after tracking</td></tr>
  <tr><td>commissionEscrowDays</td><td>30</td><td>Days to hold commission balance after delivery</td></tr>
  <tr><td>newCreatorEscrowExtraDays</td><td>7</td><td>Extra hold days for new creators</td></tr>
  <tr><td>newCreatorTransactionThreshold</td><td>10</td><td>Completed orders needed to graduate</td></tr>
</table>
</div>

<div class="footer">
  NOIZU DIRECT · Internal Policy Reference · Generated ${new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
</div>

</body>
</html>`

async function run() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'domcontentloaded' })

  const outputPath = join(homedir(), 'Downloads', 'noizu-direct-policy-reference.pdf')
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
