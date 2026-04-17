const { chromium } = require('playwright');
const fs = require('fs');

const OUTPUT = 'C:/Users/ruper/AppData/Local/Temp/pw-tasks/cloudflare-result.json';
const ENV_FILE = 'C:/Users/ruper/noizu-direct/.env';
const BUCKET_NAME = 'noizu-direct-uploads';
const ACCOUNT_ID = '3216e1a50b0896e17d1c9219a2294717';

function appendToEnv(vars) {
  const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`).join('\n');
  fs.appendFileSync(ENV_FILE, '\n# Cloudflare R2\n' + lines + '\n');
}

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0] || await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`https://dash.cloudflare.com/${ACCOUNT_ID}/home`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Create R2 bucket via CF API (session cookies included automatically)
    console.log('[Cloudflare] Creating R2 bucket via API...');
    const bucketResult = await page.evaluate(({ accountId, bucketName }) =>
      fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: bucketName, locationHint: 'APAC' })
      }).then(r => r.json()).catch(e => ({ error: e.message })),
    { accountId: ACCOUNT_ID, bucketName: BUCKET_NAME });
    console.log('[Cloudflare] Bucket result:', JSON.stringify(bucketResult));

    // Create API token with R2 permissions
    console.log('[Cloudflare] Creating R2 API token...');
    const tokenResult = await page.evaluate(({ accountId }) =>
      fetch('https://api.cloudflare.com/client/v4/user/tokens', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'noizu-direct-r2-rw',
          policies: [{
            effect: 'allow',
            resources: { [`com.cloudflare.api.account.${accountId}`]: '*' },
            permission_groups: [
              { id: 'f7f4b39e73b34f8ae7e7b4f4ac4e3ca0' },
              { id: '6a018a9f70294d43a0bb945b09b2f2ae' }
            ]
          }]
        })
      }).then(r => r.json()).catch(e => ({ error: e.message })),
    { accountId: ACCOUNT_ID });
    console.log('[Cloudflare] Token result:', JSON.stringify(tokenResult));

    const bucketOk = bucketResult?.success || false;
    const tokenOk = tokenResult?.success || false;
    const tokenValue = tokenResult?.result?.value || '';
    const endpoint = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

    const result = {
      accountId: ACCOUNT_ID, bucketName: BUCKET_NAME, endpoint,
      bucketCreated: bucketOk, tokenCreated: tokenOk,
      cfApiToken: tokenValue,
      note: 'R2 S3 access keys: go to Cloudflare dashboard > R2 > Manage R2 API Tokens to generate S3-compatible keys',
      done: bucketOk
    };
    fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));

    appendToEnv({
      CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
      R2_ACCESS_KEY_ID: 'COPY_FROM_CLOUDFLARE_DASHBOARD',
      R2_SECRET_ACCESS_KEY: 'COPY_FROM_CLOUDFLARE_DASHBOARD',
      R2_BUCKET_NAME: BUCKET_NAME,
      R2_ENDPOINT: endpoint,
      CLOUDFLARE_API_TOKEN: tokenValue || 'SEE_RESULT_FILE',
    });

    console.log('[Cloudflare] DONE. Bucket:', bucketOk, '| Token:', tokenOk);
    if (!bucketOk) console.log('[Cloudflare] Bucket errors:', JSON.stringify(bucketResult?.errors));
    console.log('[Cloudflare] NOTE: R2 needs to be activated at dash.cloudflare.com > R2 > Plans before S3 keys work.');
  } catch (err) {
    console.error('[Cloudflare] ERROR:', err.message);
    fs.writeFileSync(OUTPUT, JSON.stringify({ error: err.message, done: false, accountId: ACCOUNT_ID }));
  } finally {
    await page.close();
  }
})();
