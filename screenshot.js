const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();

  // Desktop 1440px
  let page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:7000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'screenshot-desktop.png', fullPage: true });
  console.log('Desktop screenshot taken');

  // Mobile 375px
  page = await browser.newPage();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:7000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'screenshot-mobile.png', fullPage: true });
  console.log('Mobile screenshot taken');

  // Tablet 768px
  page = await browser.newPage();
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('http://localhost:7000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'screenshot-tablet.png', fullPage: true });
  console.log('Tablet screenshot taken');

  await browser.close();
  console.log('All screenshots done');
})();
