/**
 * Google OAuth setup — connects to your existing Chrome via CDP.
 * Before running: in Chrome, go to chrome://settings and keep Chrome open.
 * This script opens a NEW Chrome window (side-by-side) with remote debugging,
 * pre-navigated to Google Cloud Console. You are already signed in via Google
 * account chooser (one click to pick rupernchiu@gmail.com).
 */

import { chromium } from 'playwright';
import { spawn, execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;

const REDIRECT_URIS = [
  'https://noizu-direct.vercel.app/api/auth/callback/google',
  'https://direct.noizu.asia/api/auth/callback/google',
  'http://localhost:7000/api/auth/callback/google',
];
const ORIGINS = [
  'https://noizu-direct.vercel.app',
  'https://direct.noizu.asia',
  'http://localhost:7000',
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  // Launch a separate Chrome instance with remote debugging
  // Uses a temp profile so it doesn't conflict with your running Chrome
  const tmpProfile = path.join(ROOT, '.tmp-chrome-profile');
  console.log('Launching a new Chrome window with remote debugging...');
  const chromeProc = spawn(CHROME, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${tmpProfile}`,
    '--no-first-run',
    '--no-default-browser-check',
    'https://accounts.google.com/AccountChooser?continue=https://console.cloud.google.com/apis/credentials',
  ], { detached: true, stdio: 'ignore' });
  chromeProc.unref();

  console.log('Waiting 4s for Chrome to start...');
  await sleep(4000);

  // Connect to the running Chrome via CDP
  const browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
  const contexts = browser.contexts();
  const context = contexts[0] ?? await browser.newContext();
  const pages = context.pages();
  const page = pages[0] ?? await context.newPage();

  console.log('\n>>> NEW CHROME WINDOW IS OPEN <<<');
  console.log('    Sign in with rupernchiu@gmail.com (Google account chooser).');
  console.log('    Waiting up to 3 minutes...\n');

  // Wait until we land on console.cloud.google.com (login complete)
  await page.waitForURL(u => u.toString().includes('console.cloud.google.com'), { timeout: 180000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await sleep(2000);
  console.log('✓ Signed in. Automating...');

  // ── Consent screen ───────────────────────────────────────────────────────
  await page.goto('https://console.cloud.google.com/apis/credentials/consent', {
    waitUntil: 'networkidle', timeout: 30000,
  });
  await sleep(2000);

  if (!page.url().includes('/edit')) {
    console.log('Configuring OAuth consent screen...');
    const ext = page.locator('mat-radio-button').filter({ hasText: 'External' });
    if (await ext.isVisible({ timeout: 6000 }).catch(() => false)) {
      await ext.click();
      await page.getByRole('button', { name: /^create$/i }).click();
      await sleep(2000);
    }
    const appName = page.locator('input[formcontrolname="displayName"]');
    if (await appName.isVisible({ timeout: 6000 }).catch(() => false)) await appName.fill('NOIZU-DIRECT');
    const sel = page.locator('mat-select[formcontrolname="userSupportEmail"]');
    if (await sel.isVisible({ timeout: 4000 }).catch(() => false)) {
      await sel.click(); await sleep(400);
      await page.locator('mat-option').filter({ hasText: 'rupernchiu@gmail.com' }).click().catch(() => {});
    }
    const dev = page.locator('input[formcontrolname="techEmail"]');
    if (await dev.isVisible({ timeout: 3000 }).catch(() => false)) await dev.fill('rupernchiu@gmail.com');
    for (let i = 0; i < 4; i++) {
      const btn = page.getByRole('button', { name: /save and continue|continue/i }).first();
      if (await btn.isVisible({ timeout: 4000 }).catch(() => false)) { await btn.click(); await sleep(1500); }
    }
    console.log('✓ Consent screen done.');
  } else {
    console.log('✓ Consent screen already set up.');
  }

  // ── Create OAuth client ──────────────────────────────────────────────────
  console.log('Creating OAuth 2.0 Client ID...');
  await page.goto('https://console.cloud.google.com/apis/credentials/oauthclient', {
    waitUntil: 'networkidle', timeout: 30000,
  });
  await sleep(2000);

  const typeSelect = page.locator('mat-select').first();
  if (await typeSelect.isVisible({ timeout: 6000 }).catch(() => false)) {
    await typeSelect.click(); await sleep(500);
    await page.locator('mat-option').filter({ hasText: 'Web application' }).click();
    await sleep(600);
  }
  const nameField = page.locator('input[formcontrolname="displayName"]').first();
  if (await nameField.isVisible({ timeout: 4000 }).catch(() => false)) {
    await nameField.clear(); await nameField.fill('NOIZU-DIRECT Web');
  }

  async function addUris(labelText, uris) {
    for (const uri of uris) {
      // Count inputs before clicking ADD URI so we can find the new one
      const before = await page.locator('input[type="text"]').count();

      const section = page.locator(`mat-card:has-text("${labelText}")`).first();
      const addBtn = section.locator('button:has-text("ADD URI"), button:has-text("Add URI")').first();
      if (await addBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
        await addBtn.click();
      } else {
        // Fallback: click last visible ADD URI button on page
        const allAdd = page.locator('button:has-text("ADD URI"), button:has-text("Add URI")');
        await allAdd.last().click().catch(() => {});
      }

      // Wait for a new input to appear
      await page.waitForFunction(
        count => document.querySelectorAll('input[type="text"]').length > count,
        before,
        { timeout: 5000 }
      ).catch(() => {});
      await sleep(200);

      // Fill the last text input on the page
      const allInputs = page.locator('input[type="text"]');
      await allInputs.last().fill(uri);
      await sleep(200);
    }
  }

  await addUris('Authorized JavaScript origins', ORIGINS);
  await addUris('Authorized redirect URIs', REDIRECT_URIS);

  await page.locator('button[type="submit"]').first().click().catch(() => {});
  await sleep(5000);

  // ── Extract credentials ──────────────────────────────────────────────────
  const html = await page.content();
  const idMatch = html.match(/([0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com)/);
  const secretMatch = html.match(/(GOCSPX-[A-Za-z0-9_\-]+)/);
  let clientId = idMatch?.[1] ?? '';
  let clientSecret = secretMatch?.[1] ?? '';

  if (!clientId || !clientSecret) {
    for (const inp of await page.locator('input').all()) {
      const v = await inp.inputValue().catch(() => '');
      if (v.includes('.apps.googleusercontent.com')) clientId = v;
      if (v.startsWith('GOCSPX-')) clientSecret = v;
    }
  }

  console.log(`Client ID: ${clientId ? '✓ found' : '✗ not found'}`);
  console.log(`Secret:    ${clientSecret ? '✓ found' : '✗ not found'}`);

  if (clientId && clientSecret) {
    let env = readFileSync(ENV_FILE, 'utf-8');
    env = env
      .replace(/^GOOGLE_CLIENT_ID=.*$/m, `GOOGLE_CLIENT_ID=${clientId}`)
      .replace(/^GOOGLE_CLIENT_SECRET=.*$/m, `GOOGLE_CLIENT_SECRET=${clientSecret}`);
    writeFileSync(ENV_FILE, env);
    console.log('✓ .env updated');

    for (const [name, val] of [['GOOGLE_CLIENT_ID', clientId], ['GOOGLE_CLIENT_SECRET', clientSecret]]) {
      for (const e of ['production', 'preview', 'development']) {
        try { execSync(`vercel env rm ${name} ${e} --yes`, { cwd: ROOT, stdio: 'pipe' }); } catch {}
      }
      try {
        execSync(`printf '%s' "${val.replace(/"/g, '\\"')}" | vercel env add ${name} production preview development`, {
          cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'],
        });
        console.log(`✓ ${name} → Vercel`);
      } catch (e) {
        console.error(`✗ ${name}:`, e.stderr?.toString()?.slice(0, 200));
      }
    }
    console.log('\n✅ Done! Google OAuth configured on Vercel.');
    console.log(`   Client ID: ${clientId}`);
  } else {
    console.log('\n⚠  Could not extract credentials. Copy them from the browser and run:');
    console.log('   printf "ID" | vercel env add GOOGLE_CLIENT_ID production preview development');
    console.log('   printf "SECRET" | vercel env add GOOGLE_CLIENT_SECRET production preview development');
    await sleep(180000);
  }

  await browser.close();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
