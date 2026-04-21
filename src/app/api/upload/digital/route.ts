import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extname } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { uploadToR2 } from '@/lib/r2'

const MAX_BYTES = 200 * 1024 * 1024

const ALLOWED_EXT = new Set([
  '.zip', '.rar', '.7z', '.tar', '.gz',
  '.pdf', '.psd', '.ai', '.eps',
  '.mp3', '.wav', '.flac',
  '.mp4', '.mov',
  '.epub',
])

export async function POST(req: Request) {
  const session = await auth()
  const userId = session?.user ? (session.user as { id: string }).id : null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) return NextResponse.json({ error: 'Creator profile required' }, { status: 403 })

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
  const key = `digital/${profile.id}/${uuidv4()}${ext}`
  const mime = file.type || 'application/octet-stream'

  await uploadToR2(buffer, key, mime)

  return NextResponse.json({
    key,
    filename: file.name,
    size: buffer.length,
    mime,
  })
}
