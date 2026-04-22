// SECURITY: Identity documents stored in R2 private/ prefix.
// Never accessible without authentication. Admin-only access for identity category.
//
// PUBLIC files:  R2 uploads/ prefix → served via R2 public URL
// PRIVATE files: R2 private/ prefix → served via /api/files/ with auth check

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { extname } from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import { uploadToR2 } from '@/lib/r2'
import { prisma } from '@/lib/prisma'
import { checkUploadAllowed } from '@/lib/storage-quota'

// Categories that count against the user's storage quota. Transactional uploads
// (identity docs, dispute evidence, message attachments) are admin-reviewed
// small files; we don't want them crashing a creator's upload flow.
const QUOTA_COUNTED_CATEGORIES = new Set([
  'product_image', 'portfolio', 'profile_avatar', 'profile_banner',
  'profile_logo', 'blog_cover', 'media', 'other',
])

const PRIVATE_CATEGORIES = new Set(['identity', 'dispute_evidence', 'message_attachment'])

// Size limits in bytes per category
const SIZE_LIMITS: Record<string, number> = {
  identity:            10 * 1024 * 1024,
  dispute_evidence:     5 * 1024 * 1024,
  message_attachment:   5 * 1024 * 1024,
  product_image:        5 * 1024 * 1024,
  portfolio:            5 * 1024 * 1024,
  profile_avatar:       2 * 1024 * 1024,
  profile_banner:       5 * 1024 * 1024,
  profile_logo:         2 * 1024 * 1024,
  blog_cover:           5 * 1024 * 1024,
  media:                5 * 1024 * 1024,
  other:                5 * 1024 * 1024,
}

// SVG omitted intentionally: it's an XML document that can execute script
// and is trivially weaponized for XSS when served from the same origin as
// authenticated pages. Avatars, banners, and product images must be raster.
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
])
const ALLOWED_TYPES = new Set([...ALLOWED_IMAGE_TYPES, 'application/pdf'])

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // category drives routing; fall back to subdir for backward compat
  const category = (formData.get('category') as string | null) || 'other'
  const subdir   = (formData.get('subdir')   as string | null) || category.replace(/_/g, '-')

  // Validate MIME type
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Allowed: JPG, PNG, WebP, GIF, PDF' },
      { status: 400 },
    )
  }

  // Validate size
  const maxSize = SIZE_LIMITS[category] ?? SIZE_LIMITS.other
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / 1024 / 1024)
    return NextResponse.json(
      { error: `File too large. Maximum size for ${category}: ${maxMB}MB` },
      { status: 400 },
    )
  }

  // Storage quota enforcement (for categories that count toward user's plan)
  const userId = (session.user as { id: string }).id
  if (QUOTA_COUNTED_CATEGORIES.has(category)) {
    const check = await checkUploadAllowed(userId, file.size)
    if (!check.allow) {
      return NextResponse.json(
        { error: check.reason ?? 'Storage quota exceeded', code: 'QUOTA_EXCEEDED' },
        { status: 413 },
      )
    }
  }

  const isPrivate = PRIVATE_CATEGORIES.has(category)
  const isPdf     = file.type === 'application/pdf'
  const isImage   = ALLOWED_IMAGE_TYPES.has(file.type)

  const rawBuffer = Buffer.from(await file.arrayBuffer())

  let finalBuffer: Buffer
  let finalExt: string
  let mimeType: string

  if (isPdf || isPrivate) {
    // Keep originals: PDFs always, and identity docs for legibility.
    finalBuffer = rawBuffer
    finalExt    = `.${extname(file.name).slice(1).toLowerCase() || 'pdf'}`
    mimeType    = file.type
  } else if (isImage) {
    // Re-encode public images to WebP. Re-encoding is the sanitization boundary:
    // it strips EXIF, neutralizes polyglot payloads, and normalizes format. If
    // sharp rejects the bytes, we refuse to store the file — never fall back to
    // saving raw user bytes under an image/* content-type.
    try {
      finalBuffer = await sharp(rawBuffer).webp({ quality: 88 }).toBuffer()
      finalExt    = '.webp'
      mimeType    = 'image/webp'
    } catch (err) {
      console.warn('[upload] sharp rejected image', {
        userId,
        category,
        originalType: file.type,
        size: rawBuffer.length,
        err: (err as Error).message,
      })
      return NextResponse.json(
        { error: 'Unable to process image. Make sure the file is a valid JPG, PNG, WebP, or GIF.' },
        { status: 400 },
      )
    }
  } else {
    finalBuffer = rawBuffer
    finalExt    = extname(file.name) || '.bin'
    mimeType    = file.type
  }

  const filename = `${uuidv4()}${finalExt}`
  const folder   = subdir

  let r2Key: string
  let publicUrl: string

  if (isPrivate) {
    r2Key     = `private/${folder}/${filename}`
    publicUrl = `/api/files/${folder}/${filename}`
    await uploadToR2(finalBuffer, r2Key, mimeType)
  } else {
    r2Key     = `uploads/${folder}/${filename}`
    publicUrl = await uploadToR2(finalBuffer, r2Key, mimeType)
  }

  // Track uploads that count against user storage so the dashboard usage +
  // quota enforcement stay accurate. Private categories are excluded — they
  // aren't billed against the creator quota.
  if (QUOTA_COUNTED_CATEGORIES.has(category)) {
    await prisma.media.create({
      data: {
        url: publicUrl,
        filename,
        mimeType,
        fileSize: finalBuffer.length,
        uploadedBy: userId,
      },
    }).catch(() => {})
  }

  return NextResponse.json({
    url:       publicUrl,
    filename,
    mimeType,
    fileSize:  finalBuffer.length,
    isPrivate,
  })
}
