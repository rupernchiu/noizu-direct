const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();

  // iPhone SE (375px)
  let page = await browser.newPage();
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://localhost:7000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'mobile-375.png', fullPage: true });

  // Check nav menu - try multiple selectors
  const navSelectors = [
    '[data-testid="mobile-nav"]',
    'button[aria-label*="menu" i]',
    'button[aria-label*="Menu"]',
    '.hamburger',
    '[class*="mobile-menu"]',
    'button[aria-label*="navigation" i]',
    '[data-testid="hamburger"]',
    'button svg[class*="menu"]',
  ];

  let navFound = false;
  for (const sel of navSelectors) {
    try {
      const nav = await page.$(sel);
      if (nav) {
        console.log('Nav found with selector:', sel);
        await nav.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'mobile-375-nav.png' });
        navFound = true;
        break;
      }
    } catch(e) {}
  }

  if (!navFound) {
    console.log('No mobile nav hamburger found, capturing page HTML snippet');
    const html = await page.evaluate(() => document.querySelector('nav, header')?.innerHTML?.substring(0, 2000));
    console.log('NAV HTML:', html);
  }

  // Also capture any visible buttons in the top area
  const buttons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
    return btns.slice(0,10).map(b => ({
      text: b.textContent?.trim().substring(0,50),
      ariaLabel: b.getAttribute('aria-label'),
      classes: b.className?.substring(0,100),
      rect: b.getBoundingClientRect()
    }));
  });
  console.log('BUTTONS:', JSON.stringify(buttons, null, 2));

  await page.close();

  // iPhone 14 (390px)
  page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:7000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'mobile-390.png', fullPage: true });
  await page.close();

  // Tablet (768px)
  page = await browser.newPage();
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('http://localhost:7000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'mobile-768.png', fullPage: true });
  await page.close();

  await browser.close();
  console.log('All screenshots done');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
