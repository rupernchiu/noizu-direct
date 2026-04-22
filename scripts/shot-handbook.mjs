import { chromium } from 'playwright'

const url = 'http://localhost:7000/creator-handbook'
const out = 'C:\\tmp\\creator-handbook.png'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
console.log('status:', resp?.status())
await page.waitForTimeout(800)
await page.screenshot({ path: out, fullPage: true })
console.log('saved:', out)
await browser.close()
