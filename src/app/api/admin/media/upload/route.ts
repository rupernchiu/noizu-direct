import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import { uploadToR2 } from '@/lib/r2'

// H8 — SVG deliberately not allowed (XML ⇒ stored-XSS vector when served
// from the same origin). PDFs stay allowed; raster images are re-encoded to
// WebP via sharp so EXIF/metadata is stripped and polyglots are neutralized.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
])

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  // Explicitly reject SVG even if somebody re-adds it to the allow-list later.
  if (file.type === 'image/svg+xml') {
    return NextResponse.json(
      { error: 'SVG uploads are disabled. Convert to PNG/WebP and try again.' },
      { status: 400 },
    )
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Allowed: JPG, PNG, WebP, GIF, PDF' },
      { status: 400 },
    )
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size is 10 MB' }, { status: 400 })
  }

  const raw = Buffer.from(await file.arrayBuffer())

  // H8 — sharp re-encode for raster images → EXIF stripped, polyglots broken.
  // PDFs pass through unchanged (no renderer; admin-only).
  let finalBuffer: Buffer
  let finalMime: string
  let finalExt: string

  if (file.type === 'application/pdf') {
    finalBuffer = raw
    finalMime = 'application/pdf'
    finalExt = 'pdf'
  } else {
    try {
      finalBuffer = await sharp(raw).webp({ quality: 90 }).toBuffer()
      finalMime = 'image/webp'
      finalExt = 'webp'
    } catch (err) {
      console.warn('[admin/media/upload] sharp rejected image', {
        adminId: (session.user as { id: string }).id,
        originalType: file.type,
        size: raw.length,
        err: (err as Error).message,
      })
      return NextResponse.json(
        { error: 'Unable to process image. Make sure the file is a valid JPG, PNG, WebP, or GIF.' },
        { status: 400 },
      )
    }
  }

  // H8 — sanitize filename for DB. The R2 key uses a random UUID; the stored
  // filename is only for display/download hinting, never as a path component.
  const sanitizedName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 255) || `media.${finalExt}`

  const key = `uploads/media/${uuidv4()}.${finalExt}`
  const url = await uploadToR2({
    key,
    body: finalBuffer,
    contentType: finalMime,
    visibility: 'public',
  })

  const userId = (session.user as { id: string }).id
  const media = await prisma.media.create({
    data: {
      url,
      filename: sanitizedName,
      uploadedBy: userId,
      mimeType: finalMime,
      fileSize: finalBuffer.length,
    },
  })

  return NextResponse.json({ url, id: media.id }, { status: 201 })
}
