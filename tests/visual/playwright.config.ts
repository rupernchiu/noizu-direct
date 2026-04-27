/**
 * Phase 9b — Playwright config for visual smoke tests on tax pages.
 *
 * Scoped to `tests/visual/` only — runs against the local dev server on
 * port 7000 (started separately, not by Playwright). Chromium-only,
 * headless, sequential. Test fixtures live in tests/visual/screenshots/.
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: __dirname,
  testMatch: /.*\.spec\.ts$/,
  globalSetup: require.resolve('./global-setup'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:7000',
    headless: true,
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    trace: 'off',
    video: 'off',
    screenshot: 'off', // each test takes its own screenshot explicitly
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
