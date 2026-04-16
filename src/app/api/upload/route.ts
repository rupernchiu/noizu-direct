import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { writeFileSync, mkdirSync } from 'fs'
import { join, extname } from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'

const SVG_MIME = 'image/svg+xml'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const subdir = (formData.get('subdir') as string) ?? 'products'

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const dir = join(process.cwd(), 'public', 'uploads', subdir)
  mkdirSync(dir, { recursive: true })

  const isSvg = file.type === SVG_MIME
  const rawBuffer = Buffer.from(await file.arrayBuffer())

  let finalBuffer: Buffer
  let finalExt: string
  let mimeType: string
  let width: number | undefined
  let height: number | undefined

  if (isSvg) {
    // Keep SVG as-is
    finalBuffer = rawBuffer
    finalExt = '.svg'
    mimeType = SVG_MIME
  } else {
    // Convert everything else to WebP
    const img = sharp(rawBuffer)
    const meta = await img.metadata()
    width = meta.width
    height = meta.height
    finalBuffer = await img.webp({ quality: 88 }).toBuffer()
    finalExt = '.webp'
    mimeType = 'image/webp'
  }

  const filename = `${uuidv4()}${finalExt}`
  writeFileSync(join(dir, filename), finalBuffer)

  return NextResponse.json({
    url: `/uploads/${subdir}/${filename}`,
    filename,
    mimeType,
    fileSize: finalBuffer.length,
    width: width ?? null,
    height: height ?? null,
  })
}
