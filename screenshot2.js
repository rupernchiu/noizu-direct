const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();

  // Tablet 768px
  let page = await browser.newPage();
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('http://localhost:7000', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'screenshot-tablet.png', fullPage: true });
  console.log('Tablet screenshot taken');

  // Desktop — scroll down to see sections below fold
  page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:7000', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'screenshot-desktop2.png', fullPage: true });
  console.log('Desktop2 screenshot taken');

  await browser.close();
  console.log('Done');
})();
