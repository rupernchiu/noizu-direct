import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
const pool = new Pool({ connectionString: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any)
async function main() {
  const pages = await prisma.$queryRawUnsafe(`SELECT slug, title, "showInFooter", "footerColumn", status FROM "Page" ORDER BY slug`) as any[]
  console.log('Pages in DB:', pages.length)
  for (const p of pages) console.log(`  /${p.slug} — ${p.title} — footer=${p.showInFooter} col=${p.footerColumn} status=${p.status}`)
}
main().then(()=>pool.end())
