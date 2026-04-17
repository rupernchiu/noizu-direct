const { chromium } = require('playwright');
const fs = require('fs');

const GITHUB_RESULT = 'C:/Users/ruper/AppData/Local/Temp/pw-tasks/github-result.json';
const ENV_FILE = 'C:/Users/ruper/noizu-direct/.env';
const OUTPUT = 'C:/Users/ruper/AppData/Local/Temp/pw-tasks/vercel-result.json';

function readEnvVars() {
  const content = fs.readFileSync(ENV_FILE, 'utf8');
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    let val = trimmed.substring(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key) vars[key] = val;
  }
  return vars;
}

async function waitForGitHub(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(GITHUB_RESULT)) {
      const data = JSON.parse(fs.readFileSync(GITHUB_RESULT, 'utf8'));
      if (data.done && data.url) return data.url;
      if (data.done === false) throw new Error('GitHub failed: ' + data.error);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Timed out waiting for GitHub');
}

(async () => {
  const repoUrl = await waitForGitHub();
  console.log('[Vercel] GitHub done:', repoUrl);

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0] || await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://vercel.com/new', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
    console.log('[Vercel] URL:', page.url());

    if (page.url().includes('login') || page.url().includes('sign-in')) {
      await page.waitForURL(url => !url.href.includes('login') && !url.href.includes('sign-in'), { timeout: 300000 });
      await page.goto('https://vercel.com/new', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);
    }

    // Search for repo
    const search = page.locator('input[placeholder*="Search" i], input[type="search"]').first();
    if (await search.count() > 0) { await search.fill('noizu-direct'); await page.waitForTimeout(2000); }

    // Find Import button next to noizu-direct — use evaluate to walk DOM safely
    const clicked = await page.evaluate(() => {
      const allText = Array.from(document.querySelectorAll('*'));
      for (const el of allText) {
        if (el.textContent?.trim() === 'noizu-direct' && el.children.length === 0) {
          let parent = el.parentElement;
          for (let i = 0; i < 6; i++) {
            if (!parent) break;
            const btn = parent.querySelector('button, a');
            if (btn && /import/i.test(btn.textContent || '')) { btn.click(); return true; }
            parent = parent.parentElement;
          }
        }
      }
      // Fallback: click first Import button
      const btn = document.querySelector('button, a');
      const allBtns = Array.from(document.querySelectorAll('button, a'));
      const importBtn = allBtns.find(b => /^import$/i.test(b.textContent?.trim() || ''));
      if (importBtn) { importBtn.click(); return true; }
      return false;
    });
    console.log('[Vercel] Import clicked:', clicked);
    await page.waitForTimeout(4000);

    // Env vars — try bulk paste
    console.log('[Vercel] Adding env vars...');
    const envVars = readEnvVars();
    delete envVars.DATABASE_URL;
    const envText = Object.entries(envVars).map(([k, v]) => `${k}=${v}`).join('\n');

    const bulkBtn = page.locator('button:has-text("Paste"), button:has-text("Import .env")').first();
    if (await bulkBtn.count() > 0 && await bulkBtn.isVisible()) {
      await bulkBtn.click();
      await page.waitForTimeout(500);
      const ta = page.locator('textarea').first();
      if (await ta.count() > 0) {
        await ta.fill(envText);
        await page.waitForTimeout(400);
        const addBtn = page.locator('button:has-text("Add"), button:has-text("Import")').first();
        if (await addBtn.count() > 0) await addBtn.click();
        await page.waitForTimeout(1000);
        console.log('[Vercel] Env vars bulk pasted');
      }
    } else {
      console.log('[Vercel] No bulk paste — adding one by one');
      for (const [key, value] of Object.entries(envVars)) {
        try {
          const addMore = page.locator('button:has-text("Add More"), button:has-text("Add another")').first();
          if (await addMore.count() > 0) await addMore.click();
          await page.waitForTimeout(200);
          const ki = page.locator('input[placeholder*="KEY" i], input[placeholder*="Variable Name" i]').last();
          const vi = page.locator('input[placeholder*="VALUE" i], input[placeholder*="value" i]').last();
          if (await ki.count() > 0) await ki.fill(key);
          if (await vi.count() > 0) await vi.fill(value);
          await page.waitForTimeout(150);
        } catch (_) {}
      }
    }

    // Deploy
    console.log('[Vercel] Deploying...');
    const deployBtn = page.locator('button:has-text("Deploy")').first();
    if (await deployBtn.count() > 0 && await deployBtn.isVisible()) {
      await deployBtn.click();
      await page.waitForTimeout(5000);
      await page.waitForURL(url => url.href.includes('/deployments') || url.href.includes('?deploymentId=') || url.href.includes('/projects/'), { timeout: 180000 }).catch(() => {});
      await page.waitForTimeout(3000);
      const deployUrl = page.url();
      console.log('[Vercel] DONE:', deployUrl);
      fs.writeFileSync(OUTPUT, JSON.stringify({ deployUrl, done: true }));
    } else {
      console.log('[Vercel] Deploy button not found');
      fs.writeFileSync(OUTPUT, JSON.stringify({ done: false, error: 'Deploy button not found' }));
    }
  } catch (err) {
    console.error('[Vercel] ERROR:', err.message);
    fs.writeFileSync(OUTPUT, JSON.stringify({ error: err.message, done: false }));
  } finally {
    await page.close();
  }
})();
