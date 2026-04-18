import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { uploadToR2 } from '@/lib/r2'

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 })
  }

  const allowed = ['image/webp', 'image/jpeg', 'image/jpg']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only WebP or JPG files are allowed' }, { status: 400 })
  }

  const key = (form.get('key') as string | null) === 'thumbnail' ? 'cms/hero/hero-thumbnail.webp' : 'cms/hero/hero-bg.webp'
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const url = await uploadToR2(buffer, key, file.type)

  return NextResponse.json({ url })
}
