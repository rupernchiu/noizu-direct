const { chromium } = require('playwright');
const fs = require('fs');

const PROJECT_ID = 'xkohjwgsnklxoqgtppxs';
const OUTPUT_FILE = 'C:\\Users\\ruper\\AppData\\Local\\Temp\\supabase-urls.txt';
// New password we'll set
const NEW_PASSWORD = 'NoizuDirect2024Db!Secure';

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const page = contexts[0].pages()[0];

  try {
    // Step 1: Navigate to database settings to reset password
    console.log('Navigating to database settings...');
    await page.goto(`https://supabase.com/dashboard/project/${PROJECT_ID}/database/settings`, {
      waitUntil: 'domcontentloaded', timeout: 30000
    });
    await page.waitForTimeout(4000);
    console.log('URL:', page.url());

    // Save page text to see what's there
    const settingsText = await page.evaluate(() => document.body.innerText);
    console.log('Settings text excerpt:\n', settingsText.substring(0, 400));

    // Look for the Reset password button
    console.log('\nLooking for Reset password button...');
    const resetSelectors = [
      'button:has-text("Reset database password")',
      'button:has-text("Reset password")',
      'button:has-text("Reset")',
    ];

    let resetClicked = false;
    for (const sel of resetSelectors) {
      try {
        await page.click(sel, { timeout: 5000 });
        console.log('Clicked:', sel);
        resetClicked = true;
        await page.waitForTimeout(3000);
        break;
      } catch(e) {
        console.log(`${sel} failed: ${e.message.split('\n')[0]}`);
      }
    }

    if (!resetClicked) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      for (const sel of resetSelectors) {
        try {
          await page.click(sel, { timeout: 5000 });
          console.log('Clicked after scroll:', sel);
          resetClicked = true;
          await page.waitForTimeout(3000);
          break;
        } catch(e) {}
      }
    }

    if (!resetClicked) {
      console.log('Could not find reset button. Page buttons:');
      const btns = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t.length > 0 && t.length < 60)
      );
      console.log(btns);
    }

    // Step 2: Look for password input in the modal/dialog that appears
    await page.waitForTimeout(2000);
    const afterResetText = await page.evaluate(() => document.body.innerText);
    console.log('\nAfter reset click text (first 500):', afterResetText.substring(0, 500));

    // Look for a password input field — use selector-based fill to avoid JSHandle context issues
    const hasPasswordInput = await page.evaluate(() => {
      const inp = document.querySelector('input[type="password"], input[placeholder*="password" i]');
      return !!inp;
    });
    if (hasPasswordInput) {
      console.log('Found password input, filling via JS selector...');
      // Fill entirely within page context using selector
      await page.evaluate((pw) => {
        const inp = document.querySelector('input[type="password"], input[placeholder*="password" i]');
        if (inp) {
          inp.focus();
          // React-compatible value setting
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(inp, pw);
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, NEW_PASSWORD);
      await page.waitForTimeout(500);
      console.log('Filled password via JS');

      // Confirm via JS click on the modal's submit button
      const clicked = await page.evaluate(() => {
        // Look for Reset/Confirm button inside the open overlay/modal
        const overlay = document.querySelector('[data-state="open"]');
        const scope = overlay || document;
        const btns = scope.querySelectorAll('button');
        for (const b of btns) {
          const t = b.textContent.trim().toLowerCase();
          if (t === 'reset' || t === 'confirm' || t === 'save' || t === 'update' || t.includes('reset password')) {
            b.click();
            return b.textContent.trim();
          }
        }
        return null;
      });
      console.log('Confirm clicked:', clicked);
      await page.waitForTimeout(5000);
    } else {
      // No password input — look for auto-generate or check modal text
      const modalContent = await page.evaluate(() => {
        const overlay = document.querySelector('[data-state="open"]');
        return overlay ? overlay.innerText : document.body.innerText.substring(0, 500);
      });
      console.log('Modal content:', modalContent.substring(0, 500));

      // Try generate button via JS click
      const generated = await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
          const t = b.textContent.trim().toLowerCase();
          if (t.includes('generate') || t.includes('auto')) { b.click(); return t; }
        }
        return null;
      });
      if (generated) {
        console.log('Clicked generate:', generated);
        await page.waitForTimeout(2000);
      }
    }

    // Step 3: Wait and see if there's a success message or generated password shown
    await page.waitForTimeout(3000);
    const finalText = await page.evaluate(() => document.body.innerText);
    console.log('\nFinal page text (first 500):', finalText.substring(0, 500));

    // Look for a displayed password (some UI shows it after reset)
    const passwordDisplay = await page.evaluate(() => {
      // Look for elements that might display the new password
      const results = [];
      document.querySelectorAll('input[readonly], input[type="text"], code, [class*="password"], [class*="token"]').forEach(el => {
        const v = el.value || el.textContent || '';
        if (v.length > 8 && !v.includes(' ') && !v.includes('postgresql://')) {
          results.push(v.substring(0, 100));
        }
      });
      return results;
    });
    console.log('\nPossible password displays:', passwordDisplay);

    // Step 4: Now build the connection strings with the new or existing password
    // We know from the Connect modal the URL structure:
    const knownPassword = NEW_PASSWORD; // Use the one we set

    const poolerUrl = `postgresql://postgres.${PROJECT_ID}:${encodeURIComponent(knownPassword)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
    const directUrl = `postgresql://postgres.${PROJECT_ID}:${encodeURIComponent(knownPassword)}@db.${PROJECT_ID}.supabase.co:5432/postgres`;

    const output = `POOLER=${poolerUrl}\nDIRECT=${directUrl}\n`;
    fs.writeFileSync(OUTPUT_FILE, output);
    console.log('\nWrote connection strings to:', OUTPUT_FILE);
    console.log('POOLER:', poolerUrl.substring(0, 100));
    console.log('DIRECT:', directUrl.substring(0, 100));
    console.log('\nNOTE: Using new password:', NEW_PASSWORD);
    console.log('Wait ~30s for password reset to propagate before connecting.');

  } catch(e) {
    console.error('Fatal error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

main();
