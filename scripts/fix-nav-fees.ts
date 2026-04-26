import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
const pool = new Pool({ connectionString: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any)
function rewriteUrls(value: any): any {
  if (typeof value === 'string') return value === '/fees' ? '/fees-payouts' : value
  if (Array.isArray(value)) return value.map(rewriteUrls)
  if (value && typeof value === 'object') {
    const out: any = {}
    for (const k of Object.keys(value)) out[k] = rewriteUrls(value[k])
    return out
  }
  return value
}
async function main() {
  const rows = await prisma.$queryRawUnsafe(`SELECT id, label, "dropdownContent" FROM "NavItem" WHERE "dropdownContent" IS NOT NULL`) as any[]
  for (const r of rows) {
    const parsed = typeof r.dropdownContent === 'string' ? JSON.parse(r.dropdownContent) : r.dropdownContent
    const fixed = rewriteUrls(parsed)
    if (JSON.stringify(parsed) === JSON.stringify(fixed)) continue
    const json = JSON.stringify(fixed)
    await prisma.$executeRawUnsafe(`UPDATE "NavItem" SET "dropdownContent" = $1::jsonb, "updatedAt" = NOW() WHERE id = $2`, json, r.id)
    console.log(`Updated [${r.label}]`)
  }
  console.log('Done.')
}
main().then(()=>pool.end())
