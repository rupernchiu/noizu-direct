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

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "NewsletterSubscriber" (
      "id"             TEXT PRIMARY KEY,
      "email"          TEXT UNIQUE NOT NULL,
      "source"         TEXT NOT NULL DEFAULT 'footer',
      "status"         TEXT NOT NULL DEFAULT 'ACTIVE',
      "locale"         TEXT,
      "userAgent"      TEXT,
      "ip"             TEXT,
      "subscribedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "unsubscribedAt" TIMESTAMP(3),
      "confirmedAt"    TIMESTAMP(3)
    );
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_status_subscribedAt_idx" ON "NewsletterSubscriber"("status", "subscribedAt");`)
  await client.query(`CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_source_idx" ON "NewsletterSubscriber"("source");`)
  console.log('NewsletterSubscriber table + indexes ready.')
} finally {
  await client.end()
}
