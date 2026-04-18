const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 375, height: 667 });

  // Emulate slow 3G
  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: 1.5 * 1024 * 1024 / 8,
    uploadThroughput: 750 * 1024 / 8,
    latency: 40
  });

  const startTime = Date.now();
  await page.goto('http://localhost:7000', { waitUntil: 'networkidle' });
  const loadTime = Date.now() - startTime;

  // Get performance metrics
  const perfData = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const resources = performance.getEntriesByType('resource');

    const resourceSummary = resources.reduce((acc, r) => {
      const type = r.initiatorType;
      if (!acc[type]) acc[type] = { count: 0, totalBytes: 0 };
      acc[type].count++;
      acc[type].totalBytes += r.transferSize || 0;
      return acc;
    }, {});

    // Find largest resources
    const top10 = [...resources]
      .sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0))
      .slice(0, 10)
      .map(r => ({ name: r.name.split('/').pop().substring(0,60), size: r.transferSize, duration: Math.round(r.duration) }));

    return {
      nav: nav ? {
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
        loadEvent: Math.round(nav.loadEventEnd),
        ttfb: Math.round(nav.responseStart - nav.requestStart),
        domInteractive: Math.round(nav.domInteractive),
      } : null,
      paint: paint.map(p => ({ name: p.name, time: Math.round(p.startTime) })),
      resourceSummary,
      top10Resources: top10,
      totalResources: resources.length,
    };
  });

  console.log('Load time (3G):', loadTime + 'ms');
  console.log(JSON.stringify(perfData, null, 2));

  // Take screenshot after load
  await page.screenshot({ path: 'mobile-perf-3g.png' });

  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
