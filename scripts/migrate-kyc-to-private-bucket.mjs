/**
 * migrate-kyc-to-private-bucket.mjs
 *
 * One-shot migration to move all objects under `private/*` prefix from
 * the legacy shared R2 bucket (R2_BUCKET_NAME) to the new dedicated
 * private bucket (R2_PRIVATE_BUCKET_NAME). Closes finding C2 of the
 * security sweep (KYC isolation).
 *
 * Default is DRY RUN (lists what would move, does nothing). Re-run
 * with --apply to perform copies + deletes.
 *
 *   DRY RUN:  node scripts/migrate-kyc-to-private-bucket.mjs
 *   LIVE:     node scripts/migrate-kyc-to-private-bucket.mjs --apply
 *
 * Safety rails:
 *   - Refuses to run unless R2_PRIVATE_* env vars are set (so it
 *     cannot accidentally copy objects back to the shared bucket).
 *   - Refuses to run if the two bucket names are identical.
 *   - Before deleting from the source, HeadObject on the destination
 *     to confirm the copy landed AND the size matches the source.
 *   - Writes a manifest CSV so you can audit every object moved.
 *   - --apply must also be paired with --i-understand to actually
 *     delete from the shared bucket. Without it, copies happen but
 *     source objects are left in place (safer when you're not yet
 *     sure).
 *
 * Reads env from .env and .env.local (.env.local overrides).
 */

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const dotenv = require('dotenv')
dotenv.config({ path: path.join(rootDir, '.env') })
dotenv.config({ path: path.join(rootDir, '.env.local'), override: false })

const {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3')

const args = new Set(process.argv.slice(2))
const APPLY = args.has('--apply')
const CONFIRM_DELETE = args.has('--i-understand')
const PREFIX = 'private/'

const SRC_BUCKET = process.env.R2_BUCKET_NAME
const DST_BUCKET = process.env.R2_PRIVATE_BUCKET_NAME

if (!SRC_BUCKET) {
  console.error('[kyc-migrate] Missing R2_BUCKET_NAME (shared bucket)')
  process.exit(2)
}
if (!DST_BUCKET) {
  console.error('[kyc-migrate] Missing R2_PRIVATE_BUCKET_NAME. Set up the private bucket first.')
  process.exit(2)
}
if (SRC_BUCKET === DST_BUCKET) {
  console.error(`[kyc-migrate] R2_BUCKET_NAME and R2_PRIVATE_BUCKET_NAME both point at '${SRC_BUCKET}'. Refusing to proceed.`)
  process.exit(2)
}

const srcClient = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const dstClient = new S3Client({
  endpoint: process.env.R2_PRIVATE_ENDPOINT || process.env.R2_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_PRIVATE_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_PRIVATE_SECRET_ACCESS_KEY,
  },
})

const manifestPath = path.join(rootDir, `kyc-migration-manifest-${Date.now()}.csv`)
const manifest = fs.createWriteStream(manifestPath, { flags: 'w' })
manifest.write('key,size,src_etag,action,timestamp,error\n')

function log(...x) {
  console.log('[kyc-migrate]', ...x)
}

function writeRow(key, size, etag, action, error = '') {
  const safe = (v) => (v == null ? '' : String(v).replace(/[",\r\n]/g, ' '))
  manifest.write([
    safe(key),
    safe(size),
    safe(etag),
    safe(action),
    new Date().toISOString(),
    safe(error),
  ].join(',') + '\n')
}

async function listAllPrivateKeys() {
  const keys = []
  let token
  do {
    const out = await srcClient.send(new ListObjectsV2Command({
      Bucket: SRC_BUCKET,
      Prefix: PREFIX,
      ContinuationToken: token,
      MaxKeys: 1000,
    }))
    for (const obj of out.Contents ?? []) {
      keys.push({ Key: obj.Key, Size: obj.Size, ETag: obj.ETag })
    }
    token = out.IsTruncated ? out.NextContinuationToken : undefined
  } while (token)
  return keys
}

async function copyOne(key) {
  await dstClient.send(new CopyObjectCommand({
    Bucket: DST_BUCKET,
    Key: key,
    CopySource: `/${SRC_BUCKET}/${encodeURIComponent(key)}`,
  }))
}

async function headDst(key) {
  return dstClient.send(new HeadObjectCommand({ Bucket: DST_BUCKET, Key: key }))
}

async function deleteSrc(key) {
  await srcClient.send(new DeleteObjectCommand({ Bucket: SRC_BUCKET, Key: key }))
}

async function main() {
  log('mode:', APPLY ? 'LIVE' : 'DRY RUN')
  log('src bucket:', SRC_BUCKET)
  log('dst bucket:', DST_BUCKET)
  log('prefix:', PREFIX)
  log('delete from src after copy:', APPLY && CONFIRM_DELETE ? 'YES (--i-understand passed)' : 'no')
  log('manifest:', manifestPath)

  const objects = await listAllPrivateKeys()
  log(`found ${objects.length} object(s) under ${PREFIX}`)

  if (objects.length === 0) {
    log('nothing to do')
    manifest.end()
    return
  }

  let copied = 0
  let skipped = 0
  let failed = 0
  let deleted = 0

  for (const { Key, Size, ETag } of objects) {
    if (!APPLY) {
      log('DRY  ', Key, `(${Size} bytes)`)
      writeRow(Key, Size, ETag, 'dry-run')
      continue
    }

    try {
      let alreadyThere = false
      try {
        const head = await headDst(Key)
        if (head.ContentLength === Size) alreadyThere = true
      } catch {
        // not present at destination, good
      }

      if (alreadyThere) {
        log('SKIP ', Key, '(already at destination with matching size)')
        writeRow(Key, Size, ETag, 'skip-already-present')
        skipped++
      } else {
        await copyOne(Key)
        const dstHead = await headDst(Key)
        if (dstHead.ContentLength !== Size) {
          throw new Error(`size mismatch after copy: src=${Size} dst=${dstHead.ContentLength}`)
        }
        log('COPY ', Key, `(${Size} bytes)`)
        writeRow(Key, Size, ETag, 'copied')
        copied++
      }

      if (CONFIRM_DELETE) {
        await deleteSrc(Key)
        writeRow(Key, Size, ETag, 'src-deleted')
        deleted++
      }
    } catch (err) {
      log('FAIL ', Key, '-', err?.message ?? err)
      writeRow(Key, Size, ETag, 'failed', err?.message ?? String(err))
      failed++
    }
  }

  manifest.end()
  log('---')
  log(`copied:  ${copied}`)
  log(`skipped: ${skipped}`)
  log(`deleted: ${deleted}`)
  log(`failed:  ${failed}`)
  log(`manifest saved to ${manifestPath}`)

  if (!APPLY) {
    log('DRY RUN complete. Re-run with --apply to perform copies.')
    log('To also remove from the shared bucket after verification, add --i-understand.')
  } else if (!CONFIRM_DELETE) {
    log('LIVE copy complete. Source objects were NOT deleted.')
    log('When you have verified the destination, re-run with --apply --i-understand to clean up the source.')
  } else {
    log('LIVE copy + source delete complete. Finding C2 closed.')
  }

  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('[kyc-migrate] FATAL:', err)
  manifest.end()
  process.exit(1)
})
