/**
 * Backfill width/height/mimeType/fileSize for Media records that are missing them.
 *
 * Strategy:
 *  - picsum.photos URLs: parse width/height directly from the URL path
 *  - /uploads/ local files: read from disk with sharp
 *  - other external URLs: skip (would require outbound HTTP during a seed script)
 *
 * Usage: npx tsx scripts/backfill-media-dimensions.ts
 */
import 'dotenv/config'
import { existsSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import sharp from 'sharp'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const dbUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
const adapter = new PrismaBetterSqlite3({ url: dbUrl })
const prisma = new PrismaClient({ adapter } as any)

// Match https://picsum.photos/seed/<seed>/<width>/<height>
// or https://fastly.picsum.photos/seed/<seed>/<width>/<height>/...
const PICSUM_RE = /picsum\.photos\/(?:seed\/[^/]+\/)?(\d+)\/(\d+)/

async function main() {
  const records = await prisma.media.findMany({
    where: { OR: [{ width: null }, { height: null }] },
  })

  console.log(`Found ${records.length} record(s) with missing dimensions.`)
  if (records.length === 0) {
    await prisma.$disconnect()
    return
  }

  let updated = 0
  let skipped = 0

  for (const rec of records) {
    const update: { width?: number; height?: number; mimeType?: string; fileSize?: number } = {}

    // --- picsum.photos ---
    const picsumMatch = rec.url.match(PICSUM_RE)
    if (picsumMatch) {
      update.width = parseInt(picsumMatch[1], 10)
      update.height = parseInt(picsumMatch[2], 10)
      update.mimeType = update.mimeType ?? 'image/jpeg'
    }

    // --- local /uploads/ file ---
    if (rec.url.startsWith('/uploads/')) {
      const filePath = join(process.cwd(), 'public', rec.url)
      if (existsSync(filePath)) {
        try {
          const img = sharp(filePath)
          const meta = await img.metadata()
          if (meta.width) update.width = meta.width
          if (meta.height) update.height = meta.height
          if (meta.format) update.mimeType = `image/${meta.format}`
          const stat = statSync(filePath)
          update.fileSize = stat.size
        } catch {
          // not a recognised image format — skip
        }
      }
    }

    if (Object.keys(update).length === 0) {
      skipped++
      continue
    }

    await prisma.media.update({ where: { id: rec.id }, data: update })
    const dim = update.width && update.height ? `${update.width}×${update.height}` : '?'
    console.log(`  ✅ ${rec.filename} — ${dim}`)
    updated++
  }

  console.log(`\nDone. Updated: ${updated}, skipped (no parseable source): ${skipped}`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
