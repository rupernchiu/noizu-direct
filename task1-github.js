const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');

const REPO_DIR = 'C:/Users/ruper/noizu-direct';
const OUTPUT = 'C:/Users/ruper/AppData/Local/Temp/pw-tasks/github-result.json';

function getGitHubUsername(page) {
  return page.evaluate(() => {
    const el = document.querySelector('meta[name="user-login"]') || document.querySelector('[data-login]');
    return el?.getAttribute('content') || el?.getAttribute('data-login') || '';
  });
}

(async () => {
  console.log('[GitHub] Connecting...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0] || await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://github.com/new', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('[GitHub] URL:', page.url());

    if (!page.url().startsWith('https://github.com/new')) {
      console.log('[GitHub] Waiting for auth (5 min)...');
      await page.waitForURL(
        url => url.hostname === 'github.com' && !url.pathname.startsWith('/login') && !url.pathname.startsWith('/sessions'),
        { timeout: 300000 }
      );
      await page.goto('https://github.com/new', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
    }

    const username = await getGitHubUsername(page);
    console.log('[GitHub] Logged in as:', username);

    // Check if repo already exists — try to navigate to it
    if (username) {
      const existingUrl = `https://github.com/${username}/noizu-direct`;
      const checkResp = await page.evaluate(url =>
        fetch(url, { method: 'HEAD' }).then(r => r.status),
        existingUrl
      );
      if (checkResp === 200) {
        console.log('[GitHub] Repo already exists at:', existingUrl);
        const httpsUrl = existingUrl + '.git';
        fs.writeFileSync(OUTPUT, JSON.stringify({ url: httpsUrl, done: true }));
        try { execSync(`cd "${REPO_DIR}" && git remote remove origin`, { stdio: 'ignore' }); } catch (_) {}
        execSync(`cd "${REPO_DIR}" && git remote add origin "${httpsUrl}"`, { stdio: 'inherit' });
        execSync(`cd "${REPO_DIR}" && git push -u origin master`, { stdio: 'inherit' });
        console.log('[GitHub] DONE (existing repo):', httpsUrl);
        return;
      }
    }

    // Fill repo name
    console.log('[GitHub] Filling form...');
    const nameInput = page.locator('#repository-name-input').first();
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await nameInput.fill('noizu-direct');
    await page.waitForTimeout(600);

    // Check for name availability error
    const nameError = page.locator('.error, [role="alert"], .flash-error').first();
    if (await nameError.count() > 0 && await nameError.isVisible()) {
      const errText = await nameError.textContent();
      console.log('[GitHub] Name error:', errText);
    }

    // Private
    const privateRadio = page.locator('#repository_private, input[value="private"]').first();
    if (await privateRadio.count() > 0) await privateRadio.click({ force: true });

    // Uncheck auto-init
    const initCheck = page.locator('#repository_auto_init').first();
    if (await initCheck.count() > 0 && await initCheck.isChecked()) await initCheck.uncheck();

    await page.waitForTimeout(400);
    console.log('[GitHub] Submitting...');

    // Click submit and wait for URL to change away from /new
    const specificBtn = page.locator('[data-target="new-repository.submitButton"]').first();
    if (await specificBtn.count() > 0) {
      await specificBtn.click();
    } else {
      // Find visible submit button in the main form (not in dialogs)
      const submitBtns = page.locator('button[type="submit"]');
      const count = await submitBtns.count();
      for (let i = 0; i < count; i++) {
        const btn = submitBtns.nth(i);
        const visible = await btn.isVisible().catch(() => false);
        const text = await btn.textContent().catch(() => '');
        console.log(`[GitHub] Submit btn ${i}: visible=${visible} text="${text?.trim()}"`);
        if (visible && (text?.includes('Create repository') || text?.includes('Create a repository'))) {
          await btn.click();
          break;
        }
      }
    }

    // Wait for URL to change — if stays on /new there's a validation error
    try {
      await page.waitForURL(url => !url.href.endsWith('/new') && url.hostname === 'github.com', { timeout: 15000 });
    } catch (_) {
      // Still on /new — check for errors
      const errorText = await page.evaluate(() => {
        const els = document.querySelectorAll('.error, [role="alert"], .flash-error, .flash-warn, dd.error');
        return Array.from(els).map(e => e.textContent?.trim()).filter(Boolean).join(' | ');
      });
      console.log('[GitHub] Still on /new. Errors:', errorText || 'none found');
      // Log all visible submit buttons text
      const btns = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button[type="submit"]')).map(b => ({ text: b.textContent?.trim(), visible: b.offsetParent !== null, disabled: b.disabled }))
      );
      console.log('[GitHub] Submit buttons:', JSON.stringify(btns));
      throw new Error('Form submitted but stayed on /new. Errors: ' + errorText);
    }

    await page.waitForTimeout(2000);
    const repoUrl = page.url();
    console.log('[GitHub] Created:', repoUrl);
    const httpsUrl = repoUrl.replace(/\/$/, '') + '.git';
    fs.writeFileSync(OUTPUT, JSON.stringify({ url: httpsUrl, done: true }));

    try { execSync(`cd "${REPO_DIR}" && git remote remove origin`, { stdio: 'ignore' }); } catch (_) {}
    execSync(`cd "${REPO_DIR}" && git remote add origin "${httpsUrl}"`, { stdio: 'inherit' });
    execSync(`cd "${REPO_DIR}" && git push -u origin master`, { stdio: 'inherit' });
    console.log('[GitHub] DONE:', httpsUrl);
  } catch (err) {
    console.error('[GitHub] ERROR:', err.message);
    fs.writeFileSync(OUTPUT, JSON.stringify({ error: err.message, done: false }));
  } finally {
    await page.close();
  }
})();
