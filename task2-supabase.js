const { chromium } = require('playwright');
const fs = require('fs');
const crypto = require('crypto');

const OUTPUT = 'C:/Users/ruper/AppData/Local/Temp/pw-tasks/supabase-result.json';
const ENV_FILE = 'C:/Users/ruper/noizu-direct/.env';
const password = crypto.randomBytes(20).toString('hex') + 'Aa1!';

function appendToEnv(vars) {
  const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`).join('\n');
  fs.appendFileSync(ENV_FILE, '\n# Supabase\n' + lines + '\n');
}

(async () => {
  console.log('[Supabase] Connecting...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0] || await browser.newContext();
  const page = await context.newPage();

  try {
    // Start at dashboard to confirm login
    await page.goto('https://supabase.com/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log('[Supabase] Dashboard URL:', page.url());

    if (page.url().includes('sign-in') || page.url().includes('/auth')) {
      console.log('[Supabase] Waiting for login (up to 5 min)...');
      await page.waitForURL(url => url.href.includes('/dashboard') && !url.href.includes('sign-in'), { timeout: 300000 });
      await page.waitForTimeout(2000);
    }

    // Find org slug from the current URL or from the orgs API
    let orgSlug = page.url().match(/\/dashboard\/org\/([^\/]+)/)?.[1] || '';
    if (!orgSlug) {
      // Navigate to organizations and grab the first one
      await page.goto('https://supabase.com/dashboard/organizations', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      const orgLink = page.locator('a[href*="/dashboard/org/"]').first();
      if (await orgLink.count() > 0) {
        const href = await orgLink.getAttribute('href');
        orgSlug = href?.match(/\/org\/([^\/]+)/)?.[1] || '';
      }
    }
    console.log('[Supabase] Org slug:', orgSlug);

    // Navigate to new project — URL format: /dashboard/new/[org-slug]
    const newProjUrl = orgSlug
      ? `https://supabase.com/dashboard/new/${orgSlug}`
      : 'https://supabase.com/dashboard/new/new-project';
    console.log('[Supabase] Navigating to:', newProjUrl);
    await page.goto(newProjUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    console.log('[Supabase] Form URL:', page.url());
    console.log('[Supabase] Page title:', await page.title());

    // Log all inputs for debugging
    const inputInfo = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input')).map(i => ({ id: i.id, name: i.name, type: i.type, placeholder: i.placeholder, visible: i.offsetParent !== null }))
    );
    console.log('[Supabase] Inputs:', JSON.stringify(inputInfo));

    // Fill project name
    const nameSelectors = [
      'input[id="name"]',
      'input[name="name"]',
      'input[placeholder*="project name" i]',
      'input[placeholder*="Project name" i]',
      'input[aria-label*="project name" i]',
      'input[data-testid*="name" i]',
    ];
    let nameFilled = false;
    for (const sel of nameSelectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible().catch(() => false)) {
        await el.click();
        await el.fill('noizu-direct');
        await page.evaluate(el => el.dispatchEvent(new Event('input', { bubbles: true })), await el.elementHandle());
        console.log('[Supabase] Filled name via:', sel);
        nameFilled = true;
        break;
      }
    }
    if (!nameFilled) {
      // Use first visible non-password input
      const el = page.locator('input:not([type="password"]):not([type="hidden"]):not([type="checkbox"])').first();
      if (await el.count() > 0) {
        await el.fill('noizu-direct');
        console.log('[Supabase] Filled name via fallback input');
        nameFilled = true;
      }
    }

    await page.waitForTimeout(500);

    // Password
    const pwEl = page.locator('input[type="password"]').first();
    if (await pwEl.count() > 0) {
      await pwEl.fill(password);
      console.log('[Supabase] Filled password');
    }
    await page.waitForTimeout(400);

    // Region — Singapore
    const regionTrigger = page.locator('[data-radix-select-trigger], button[role="combobox"]').first();
    if (await regionTrigger.count() > 0) {
      await regionTrigger.click();
      await page.waitForTimeout(800);
      const sgOpt = page.locator('[role="option"]:has-text("Singapore")').first();
      if (await sgOpt.count() > 0) { await sgOpt.click(); console.log('[Supabase] Selected Singapore'); }
      else { await page.keyboard.press('Escape'); console.log('[Supabase] Singapore not found, using default'); }
    }
    await page.waitForTimeout(600);

    // Wait for submit to be enabled, then click
    console.log('[Supabase] Waiting for submit to be enabled...');
    await page.waitForFunction(() => {
      const btn = document.querySelector('button[type="submit"]');
      return btn && !btn.disabled;
    }, { timeout: 20000 }).catch(() => console.log('[Supabase] Submit still disabled, clicking force'));

    const submitBtn = page.locator('button[type="submit"], button:has-text("Create new project"), button:has-text("Create project")').first();
    await submitBtn.click({ force: true });
    console.log('[Supabase] Clicked create — waiting for provisioning (up to 3 min)...');

    await page.waitForURL(
      url => url.href.includes('/dashboard/project/') && !url.href.includes('new-project') && !url.href.includes('/new/'),
      { timeout: 180000 }
    );
    const projectRef = page.url().match(/\/project\/([^\/]+)/)?.[1];
    console.log('[Supabase] Project ref:', projectRef);
    await page.waitForTimeout(10000);

    // API settings
    await page.goto(`https://supabase.com/dashboard/project/${projectRef}/settings/api`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    let projectUrl = `https://${projectRef}.supabase.co`;
    const urlInput = page.locator('input[value*="supabase.co"]').first();
    if (await urlInput.count() > 0) projectUrl = (await urlInput.inputValue()).trim();

    let anonKey = '';
    const keyInput = page.locator('input[value*="eyJ"]').first();
    if (await keyInput.count() > 0) anonKey = (await keyInput.inputValue()).trim();

    // DB connection string
    await page.goto(`https://supabase.com/dashboard/project/${projectRef}/settings/database`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    let connStr = '';
    const connInputs = page.locator('input[value*="postgresql://"], input[value*="postgres://"]');
    const cnt = await connInputs.count();
    for (let i = 0; i < cnt; i++) {
      const v = await connInputs.nth(i).inputValue().catch(() => '');
      if (v.includes(':6543') || v.includes('pooler')) { connStr = v.replace('[YOUR-PASSWORD]', password); break; }
    }
    if (!connStr && cnt > 0) connStr = (await connInputs.first().inputValue()).replace('[YOUR-PASSWORD]', password);
    if (!connStr) connStr = `postgresql://postgres.${projectRef}:${password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;

    fs.writeFileSync(OUTPUT, JSON.stringify({ projectUrl, anonKey, connStr, password, projectRef, done: true }, null, 2));
    appendToEnv({ DATABASE_URL_SUPABASE: connStr, SUPABASE_URL: projectUrl, SUPABASE_ANON_KEY: anonKey });

    console.log('[Supabase] DONE. URL:', projectUrl);
    console.log('[Supabase] Anon key:', anonKey ? anonKey.slice(0, 20) + '...' : 'NOT FOUND');
    console.log('[Supabase] Password saved to output file');
  } catch (err) {
    console.error('[Supabase] ERROR:', err.message);
    fs.writeFileSync(OUTPUT, JSON.stringify({ error: err.message, done: false, password }));
  } finally {
    await page.close();
  }
})();
