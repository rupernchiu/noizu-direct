const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();

  // Hero section close-up desktop
  let page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:7000', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  // Screenshot just the viewport (above the fold)
  await page.screenshot({ path: 'screenshot-hero-desktop.png', fullPage: false });
  console.log('Hero desktop done');

  // Hero mobile
  page = await browser.newPage();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:7000', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshot-hero-mobile.png', fullPage: false });
  console.log('Hero mobile done');

  // Nav close-up
  page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 200 });
  await page.goto('http://localhost:7000', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot-nav.png', fullPage: false });
  console.log('Nav done');

  await browser.close();
})();
