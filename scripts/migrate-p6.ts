// Adds CreatorProfile.commissionDefaults column (P6 — commission-settings page with n-stage defaults)
import 'dotenv/config'
import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL,
})

const statements = [
  { name: 'CreatorProfile.commissionDefaults', sql: `ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "commissionDefaults" TEXT NOT NULL DEFAULT '{}'` },
]

async function main() {
  await client.connect()
  for (const { name, sql } of statements) {
    await client.query(sql)
    console.log(`  ok ${name}`)
  }
  await client.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
