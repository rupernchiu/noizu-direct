/**
 * Phase 9b — Visual smoke tests for the tax architecture build.
 *
 * Fixture data is created by `npm run seed:tax` (prisma/seeds/tax-seed.ts).
 * Test users (all share password `tax-seed-password`):
 *   - tax-my-individual@noizu.test  — Scenario A (MY individual, no tax fields)
 *   - tax-id-individual@noizu.test  — Scenario B (ID individual, PPh withheld)
 *   - tax-sg-pending@noizu.test     — Scenario C (SG REQUESTED)
 *   - tax-sg-approved@noizu.test    — Scenario D (SG APPROVED, GST collected)
 *   - tax-buyer-1@noizu.test        — buyer (BUYER role)
 * Admin (regular User table, role=ADMIN):
 *   - admin@noizu.direct / admin123
 *
 * Auth is loaded from storageState files prepared by global-setup.ts. Each
 * test asserts key DOM landmarks and saves a PNG to ./screenshots/.
 *
 * Console errors are recorded for diagnostics but NOT used as fail gates —
 * Next dev mode emits "Failed to load resource: 404" messages from broken
 * upload assets that are unrelated to the tax pages under test. Real visual
 * regressions are caught by explicit `expect(...).toBeVisible()` calls.
 *
 * NOTE: read-only — no DB writes, no cleanup needed. Re-runnable.
 */
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'
import path from 'node:path'

const AUTH_DIR = path.join(__dirname, '.auth')
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots')

const HMR_NOISE_RE =
  /(HMR|webpack-internal|\[Fast Refresh\]|hot-reloader|next\/dist\/client\/dev|hydration|Hydration|\[next-auth\])/i
const ASSET_404_NOISE_RE = /Failed to load resource: the server responded with a status of 404/i

function attachConsoleCollector(page: Page) {
  const errors: string[] = []
  const notFound: string[] = []
  const onMessage = (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (HMR_NOISE_RE.test(text)) return
    if (ASSET_404_NOISE_RE.test(text)) {
      notFound.push(text)
      return
    }
    errors.push(text)
  }
  page.on('console', onMessage)
  return {
    errors,
    notFound,
    detach: () => page.off('console', onMessage),
  }
}

async function shot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  })
}

function logCollector(testName: string, c: { errors: string[]; notFound: string[] }) {
  if (c.errors.length > 0) {
    console.log(`  [${testName}] console errors (non-fatal): ${c.errors.length}`)
    for (const e of c.errors.slice(0, 3)) console.log(`    - ${e}`)
  }
  if (c.notFound.length > 0) {
    console.log(`  [${testName}] asset 404s (non-fatal): ${c.notFound.length}`)
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Scenario A — MY individual creator
// ───────────────────────────────────────────────────────────────────────────

test.describe('Scenario A — MY individual creator', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'creator-A.json') })

  test('A · /dashboard/finance/tax — earnings summary, NO withholding/collection', async ({ page }) => {
    const collector = attachConsoleCollector(page)
    const resp = await page.goto('/dashboard/finance/tax', { waitUntil: 'domcontentloaded' })
    expect(resp?.status(), 'page should load 2xx').toBeLessThan(400)

    await expect(page.getByRole('heading', { name: /Tax & Earnings Statement/i })).toBeVisible()
    await expect(page.getByText(/Earnings Summary/i)).toBeVisible()
    // Negative assertions: Scenario A creator has neither withholding nor collection.
    await expect(page.getByText(/Withheld at Payout/i)).toHaveCount(0)
    await expect(page.getByText(/Collected From Buyers On Your Behalf/i)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /PPh certificate/i })).toHaveCount(0)

    await shot(page, 'A-dashboard-finance-tax')
    collector.detach()
    logCollector('A · finance/tax', collector)
  })

  test('A · /dashboard/onboarding/tax — already-acked creator gets redirected', async ({ page }) => {
    const collector = attachConsoleCollector(page)
    await page.goto('/dashboard/onboarding/tax', { waitUntil: 'domcontentloaded' })
    // Server redirects to /dashboard when taxOnboardingAcknowledgedAt is set.
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10_000 }).not.toBe(
      '/dashboard/onboarding/tax',
    )
    await shot(page, 'A-onboarding-tax-redirect')
    collector.detach()
    logCollector('A · onboarding/tax', collector)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// Scenario B — ID individual creator (PPh-active)
// ───────────────────────────────────────────────────────────────────────────

test.describe('Scenario B — ID individual creator (PPh)', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'creator-B.json') })

  test('B · /dashboard/finance/tax — withholding section + cert button', async ({ page }) => {
    const collector = attachConsoleCollector(page)
    const resp = await page.goto('/dashboard/finance/tax', { waitUntil: 'domcontentloaded' })
    expect(resp?.status()).toBeLessThan(400)

    await expect(page.getByRole('heading', { name: /Tax & Earnings Statement/i })).toBeVisible()
    await expect(page.getByText(/Earnings Summary/i)).toBeVisible()
    await expect(page.getByText(/Withheld at Payout/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /PPh certificate/i })).toBeVisible()

    await shot(page, 'B-dashboard-finance-tax')
    collector.detach()
    logCollector('B · finance/tax', collector)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// Scenario C — SG REQUESTED (sales-tax pending)
// ───────────────────────────────────────────────────────────────────────────

test.describe('Scenario C — SG REQUESTED', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'creator-C.json') })

  test('C · /dashboard/finance/tax/sales-tax-opt-in — Pending admin review card', async ({ page }) => {
    const collector = attachConsoleCollector(page)
    const resp = await page.goto('/dashboard/finance/tax/sales-tax-opt-in', { waitUntil: 'domcontentloaded' })
    expect(resp?.status()).toBeLessThan(400)

    await expect(page.getByRole('heading', { name: /Sales tax collection/i })).toBeVisible()
    await expect(page.getByText(/Pending admin review/i)).toBeVisible()

    await shot(page, 'C-sales-tax-opt-in-pending')
    collector.detach()
    logCollector('C · sales-tax-opt-in', collector)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// Scenario D — SG APPROVED (sales-tax active)
// ───────────────────────────────────────────────────────────────────────────

test.describe('Scenario D — SG APPROVED', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'creator-D.json') })

  test('D · /dashboard/finance/tax — Collected From Buyers section', async ({ page }) => {
    const collector = attachConsoleCollector(page)
    const resp = await page.goto('/dashboard/finance/tax', { waitUntil: 'domcontentloaded' })
    expect(resp?.status()).toBeLessThan(400)

    await expect(page.getByRole('heading', { name: /Tax & Earnings Statement/i })).toBeVisible()
    await expect(page.getByText(/Collected From Buyers On Your Behalf/i)).toBeVisible()

    await shot(page, 'D-dashboard-finance-tax')
    collector.detach()
    logCollector('D · finance/tax', collector)
  })

  test('D · /dashboard/finance/tax/sales-tax-opt-in — Active card visible', async ({ page }) => {
    const collector = attachConsoleCollector(page)
    const resp = await page.goto('/dashboard/finance/tax/sales-tax-opt-in', { waitUntil: 'domcontentloaded' })
    expect(resp?.status()).toBeLessThan(400)

    await expect(page.getByRole('heading', { name: /Sales tax collection/i })).toBeVisible()
    await expect(page.getByText(/^Active$/i).first()).toBeVisible()

    await shot(page, 'D-sales-tax-opt-in-active')
    collector.detach()
    logCollector('D · sales-tax-opt-in', collector)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// Admin
// ───────────────────────────────────────────────────────────────────────────

test.describe('Admin', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'admin.json') })

  test('Admin · /admin/finance/tax — 5 tabs visible, each tab clickable', async ({ page }) => {
    const collector = attachConsoleCollector(page)
    const resp = await page.goto('/admin/finance/tax', { waitUntil: 'domcontentloaded' })
    expect(resp?.status()).toBeLessThan(400)

    await expect(page.getByRole('heading', { name: /Tax & Compliance/i })).toBeVisible()

    const tabLabels = [
      /^Destination$/,
      /Creator-Origin/,
      /Reverse-Charge/,
      /Creator's Sales Tax/,
      /Platform Fee Tax/,
    ]
    for (const label of tabLabels) {
      await expect(page.getByRole('button', { name: label })).toBeVisible()
    }
    // Click each tab in order; assert no navigation crash.
    for (const label of tabLabels) {
      await page.getByRole('button', { name: label }).click()
      await page.waitForTimeout(400) // allow tab body fetch to settle
    }

    await shot(page, 'admin-finance-tax')
    collector.detach()
    logCollector('Admin · finance/tax', collector)
  })

  test('Admin · /admin/creators/sales-tax-applications — Pending tab lists tax-sg-pending', async ({ page }) => {
    const collector = attachConsoleCollector(page)
    const resp = await page.goto('/admin/creators/sales-tax-applications', { waitUntil: 'domcontentloaded' })
    expect(resp?.status()).toBeLessThan(400)

    // Pending tab is the default. Look for the Scenario C creator's email.
    await expect(page.getByText('tax-sg-pending@noizu.test').first()).toBeVisible()

    await shot(page, 'admin-sales-tax-applications')
    collector.detach()
    logCollector('Admin · sales-tax-applications', collector)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// Buyer — receipt detail
// ───────────────────────────────────────────────────────────────────────────

test.describe('Buyer — order receipts', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'buyer.json') })

  test("Buyer · Scenario D order — Seller's GST line visible", async ({ page }) => {
    const collector = attachConsoleCollector(page)
    // Scenario D order #3 is still PAID and carries creatorSalesTaxAmountUsd > 0.
    const resp = await page.goto('/account/orders/tax-seed-D-order-3', { waitUntil: 'domcontentloaded' })
    expect(resp?.status()).toBeLessThan(400)

    // FROM CREATOR / FROM noizu.direct sections (case-insensitive).
    await expect(page.getByText(/^From creator/i).first()).toBeVisible()
    await expect(page.getByText(/From noizu\.direct/i).first()).toBeVisible()
    // Seller's GST line — only renders when creatorSalesTaxAmountUsd > 0.
    await expect(page.getByText(/Seller's GST/i)).toBeVisible()

    await shot(page, 'buyer-order-D-receipt')
    collector.detach()
    logCollector('Buyer · order D', collector)
  })

  test("Buyer · Scenario A order — no Seller's tax line", async ({ page }) => {
    const collector = attachConsoleCollector(page)
    const resp = await page.goto('/account/orders/tax-seed-A-order-3', { waitUntil: 'domcontentloaded' })
    expect(resp?.status()).toBeLessThan(400)

    await expect(page.getByText(/^From creator/i).first()).toBeVisible()
    await expect(page.getByText(/Seller's (GST|SST|VAT|PPN)/i)).toHaveCount(0)

    await shot(page, 'buyer-order-A-receipt')
    collector.detach()
    logCollector('Buyer · order A', collector)
  })
})
