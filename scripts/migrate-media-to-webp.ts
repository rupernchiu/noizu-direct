/**
 * One-time migration: convert any non-WebP images in /public/uploads/
 * to WebP using sharp, then update the Media records in the database.
 *
 * Usage: npx tsx scripts/migrate-media-to-webp.ts
 */
import { readdirSync, unlinkSync, existsSync, writeFileSync } from 'fs'
import { join, extname, basename } from 'path'
import sharp from 'sharp'
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const dbUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
const adapter = new PrismaBetterSqlite3({ url: dbUrl })
const prisma = new PrismaClient({ adapter } as any)

const SKIP_EXTS = new Set(['.svg', '.webp'])
const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads')

async function walkDir(dir: string): Promise<string[]> {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walkDir(full))
    } else {
      files.push(full)
    }
  }
  return files
}

async function main() {
  if (!existsSync(UPLOADS_DIR)) {
    console.log('No /public/uploads/ directory — nothing to migrate.')
    return
  }

  const allFiles = await walkDir(UPLOADS_DIR)
  const toConvert = allFiles.filter((f) => !SKIP_EXTS.has(extname(f).toLowerCase()))

  if (toConvert.length === 0) {
    console.log('All files are already WebP or SVG — nothing to do.')
    return
  }

  console.log(`Found ${toConvert.length} file(s) to convert…`)

  let converted = 0
  let skipped = 0

  for (const filePath of toConvert) {
    const ext = extname(filePath)
    const webpPath = filePath.slice(0, -ext.length) + '.webp'
    const relOld = '/' + filePath.replace(join(process.cwd(), 'public') + '/', '').replace(/\\/g, '/')
    const relNew = '/' + webpPath.replace(join(process.cwd(), 'public') + '/', '').replace(/\\/g, '/')

    try {
      const img = sharp(filePath)
      const meta = await img.metadata()
      const buf = await img.webp({ quality: 88 }).toBuffer()

      // Write WebP file, remove original
      writeFileSync(webpPath, buf)
      unlinkSync(filePath)

      const newFilename = basename(webpPath)

      // Update DB record
      const record = await prisma.media.findFirst({ where: { url: relOld } })
      if (record) {
        await prisma.media.update({
          where: { id: record.id },
          data: {
            url: relNew,
            filename: newFilename,
            mimeType: 'image/webp',
            fileSize: buf.length,
            width: meta.width ?? null,
            height: meta.height ?? null,
          },
        })
        console.log(`  ✅ ${basename(filePath)} → ${newFilename} (DB updated)`)
      } else {
        console.log(`  ✅ ${basename(filePath)} → ${newFilename} (no DB record found)`)
      }
      converted++
    } catch (err) {
      console.warn(`  ⚠ Could not convert ${basename(filePath)}: ${err}`)
      skipped++
    }
  }

  console.log(`\nDone. Converted: ${converted}, skipped: ${skipped}`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
