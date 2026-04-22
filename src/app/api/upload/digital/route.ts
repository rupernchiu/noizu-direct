import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extname } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { uploadToR2 } from '@/lib/r2'
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { sniffFirstBytes, type SniffedType } from '@/lib/file-sniff'

// H7 — 500 MB hard cap (up from 200 MB in the previous revision; still a
// conservative ceiling for audio/video deliverables).
const MAX_BYTES = 500 * 1024 * 1024

const ALLOWED_EXT = new Set([
  '.zip', '.rar', '.7z', '.tar', '.gz',
  '.pdf', '.psd', '.ai', '.eps',
  '.mp3', '.wav', '.flac',
  '.mp4', '.mov',
  '.epub',
])

// H7 — magic-byte allow-list. `.ai` and `.eps` are PDF-wrapped / PostScript
// and hard to sniff reliably, so we accept the extension alone for those.
// `file-type` is not a dependency of this project — see src/lib/file-sniff.ts
// for the hand-rolled sniffer. TODO(security): add `file-type` for broader
// and more reliable coverage.
const ALLOWED_MAGIC: Set<SniffedType> = new Set([
  'zip', 'rar', '7z', 'gz', 'tar', 'pdf', 'psd',
  'mp3', 'wav', 'flac', 'mp4', 'mov', 'epub',
])
const EXT_SKIP_SNIFF = new Set(['.ai', '.eps'])

// H7 — Upstash rate limit. 20 uploads / 5 min / user.
const RATE_SCOPE = 'digital-upload'
const RATE_LIMIT = 20
const RATE_WINDOW_SECONDS = 300

export async function POST(req: Request) {
  const session = await auth()
  const userId = session?.user ? (session.user as { id: string }).id : null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) return NextResponse.json({ error: 'Creator profile required' }, { status: 403 })

  // H7 — rate limit before doing any I/O.
  const rl = await rateLimit(RATE_SCOPE, userId, RATE_LIMIT, RATE_WINDOW_SECONDS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many uploads. Please wait a few minutes and try again.' },
      { status: 429, headers: rateLimitHeaders(rl, RATE_LIMIT) },
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max ${Math.round(MAX_BYTES / 1024 / 1024)}MB` },
      { status: 400 },
    )
  }

  const ext = extname(file.name).toLowerCase()
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { error: `File type not allowed. Accepted: ${Array.from(ALLOWED_EXT).join(', ')}` },
      { status: 400 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // ── H7 — magic-byte sniff ─────────────────────────────────────────────────
  // Don't trust `file.type` / extension. For PostScript-style formats (.ai,
  // .eps) we can't sniff reliably so we accept the extension alone; everything
  // else must match a known signature.
  if (!EXT_SKIP_SNIFF.has(ext)) {
    const sniffed = sniffFirstBytes(buffer)
    if (!sniffed || !ALLOWED_MAGIC.has(sniffed)) {
      console.warn('[upload/digital] magic-byte rejection', {
        userId,
        ext,
        claimedType: file.type,
        sniffed,
      })
      return NextResponse.json(
        { error: 'File bytes do not match an accepted digital-deliverable format.' },
        { status: 400 },
      )
    }
  }

  const key = `digital/${profile.id}/${uuidv4()}${ext}`
  const mime = file.type || 'application/octet-stream'

  await uploadToR2({ key, body: buffer, contentType: mime, visibility: 'private' })

  return NextResponse.json({
    key,
    filename: file.name,
    size: buffer.length,
    mime,
  }, { headers: rateLimitHeaders(rl, RATE_LIMIT) })
}
