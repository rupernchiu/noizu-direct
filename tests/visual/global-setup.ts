/**
 * Phase 9b — Playwright global setup.
 *
 * Logs in each test user ONCE via the credentials form and saves the
 * resulting NextAuth cookies to `tests/visual/.auth/<role>.json`. The spec
 * then declares `test.use({ storageState: '...' })` per test instead of
 * filling the login form repeatedly — important because:
 *
 *   1. /api/auth/callback/credentials is rate-limited to 10/15min/IP
 *      (src/lib/auth.ts → LOGIN_RATE). With 10 visual tests + retries,
 *      individual logins per test trips the limiter.
 *   2. Re-using a single login is ~2× faster for the suite as a whole.
 */
import { chromium, type FullConfig } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'

const AUTH_DIR = path.join(__dirname, '.auth')
const BASE_URL = 'http://localhost:7000'

const USERS = [
  { key: 'creator-A', email: 'tax-my-individual@noizu.test', password: 'tax-seed-password' },
  { key: 'creator-B', email: 'tax-id-individual@noizu.test', password: 'tax-seed-password' },
  { key: 'creator-C', email: 'tax-sg-pending@noizu.test',    password: 'tax-seed-password' },
  { key: 'creator-D', email: 'tax-sg-approved@noizu.test',   password: 'tax-seed-password' },
  { key: 'buyer',     email: 'tax-buyer-1@noizu.test',       password: 'tax-seed-password' },
  { key: 'admin',     email: 'admin@noizu.direct',           password: 'admin123' },
] as const

async function loginAndSave(email: string, password: string, storagePath: string) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.locator('input#email').waitFor({ state: 'visible', timeout: 15_000 })
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 }),
    page.getByRole('button', { name: /^Sign in$/i }).click(),
  ])
  // Confirm session cookie is set.
  const cookies = await context.cookies()
  const sessionCookie = cookies.find(
    (c) => /authjs|next-auth/i.test(c.name) && /session|secure/i.test(c.name),
  )
  if (!sessionCookie) {
    // Don't fail loudly — but warn. The spec will still see auth via cookies.
    console.warn(`  [auth] no obvious session cookie for ${email}; continuing`)
  }
  await context.storageState({ path: storagePath })
  await browser.close()
}

export default async function globalSetup(_config: FullConfig) {
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })
  console.log('[global-setup] logging in test users (one-shot)...')
  // Sequential — credential rate-limit is per-IP, and serializing keeps the
  // pace under the 10-per-15min cap with comfortable headroom.
  for (const u of USERS) {
    const target = path.join(AUTH_DIR, `${u.key}.json`)
    try {
      await loginAndSave(u.email, u.password, target)
      console.log(`  [auth ✓] ${u.email} → ${path.basename(target)}`)
    } catch (e: any) {
      console.error(`  [auth ✗] ${u.email}: ${e?.message ?? String(e)}`)
      throw e
    }
  }
  console.log('[global-setup] done')
}
