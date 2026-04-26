import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
const pool = new Pool({ connectionString: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any)
const DEAD = ['/products', '/cart', '/account/messages', '/account/settings', '/account/broadcasts', '/dashboard/products', '/dashboard/payouts', '/dashboard/analytics', '/dashboard/verification', '/creator/apply', '/faq', '/fees', '/changelog', '/policies', '/legal']
function findUrlsInJson(value: any, out: string[] = []): string[] {
  if (value == null) return out
  if (typeof value === 'string') {
    if (value.startsWith('/') || value.startsWith('http')) out.push(value)
    return out
  }
  if (Array.isArray(value)) { for (const v of value) findUrlsInJson(v, out); return out }
  if (typeof value === 'object') { for (const k of Object.keys(value)) findUrlsInJson(value[k], out); return out }
  return out
}
async function main() {
  const all = await prisma.$queryRawUnsafe(`SELECT id, label, url, "navType", "dropdownType", "dropdownContent" FROM "NavItem" ORDER BY "label" ASC`) as any[]
  console.log('NavItem rows:', all.length)
  for (const r of all) {
    console.log(`\n[${r.label}] url=${r.url} navType=${r.navType} dropdownType=${r.dropdownType}`)
    if (r.dropdownContent) {
      const parsed = typeof r.dropdownContent === 'string' ? JSON.parse(r.dropdownContent) : r.dropdownContent
      const urls = findUrlsInJson(parsed)
      const dead = urls.filter(u => DEAD.includes(u) || u.startsWith('/products/') || u.startsWith('/cart/'))
      console.log('  urls:', urls.join(' | '))
      if (dead.length) console.log('  ⚠ DEAD:', dead.join(' | '))
    }
  }
}
main().then(()=>pool.end())
