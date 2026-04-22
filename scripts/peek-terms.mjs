import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const dotenv = require('dotenv')
dotenv.config({ path: path.join(rootDir, '.env') })
dotenv.config({ path: path.join(rootDir, '.env.local'), override: false })

const { Client } = require('pg')
const client = new Client({ connectionString: process.env.DATABASE_URL_DIRECT })
await client.connect()

const res = await client.query(
  `SELECT id, title, slug, status, "showInFooter", "footerColumn", "footerOrder",
          "seoTitle", "seoDescription",
          LENGTH(COALESCE(content, '')) AS content_len,
          LEFT(COALESCE(content, ''), 400) AS content_preview
   FROM "Page"
   WHERE slug IN ('terms', 'privacy', 'refund-policy', 'creator-agreement', 'cookies', 'dmca', 'community-guidelines')
   ORDER BY slug`
)
for (const row of res.rows) {
  console.log('---', row.slug, '---')
  console.log(row)
}
await client.end()
