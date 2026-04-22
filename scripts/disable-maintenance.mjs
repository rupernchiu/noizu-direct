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

const connectionString = process.env.DATABASE_URL_DIRECT
if (!connectionString) {
  console.error('[disable-maintenance] DATABASE_URL_DIRECT not set')
  process.exit(2)
}

const client = new Client({ connectionString })
await client.connect()

const before = await client.query(
  `SELECT id, "maintenanceMode", "maintenanceMessage" FROM "PlatformSettings" LIMIT 1`
)
console.log('BEFORE:', before.rows[0] ?? '(no row)')

if (before.rows.length === 0) {
  await client.query(
    `INSERT INTO "PlatformSettings" (id, "maintenanceMode", "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, false, NOW(), NOW())`
  )
  console.log('created new PlatformSettings row with maintenanceMode=false')
} else if (before.rows[0].maintenanceMode) {
  await client.query(
    `UPDATE "PlatformSettings" SET "maintenanceMode"=false WHERE id=$1`,
    [before.rows[0].id]
  )
  console.log('set maintenanceMode=false')
} else {
  console.log('already false — nothing to change')
}

const after = await client.query(
  `SELECT "maintenanceMode" FROM "PlatformSettings" LIMIT 1`
)
console.log('AFTER:', after.rows[0])

await client.end()
