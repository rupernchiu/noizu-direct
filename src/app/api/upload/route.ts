import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { writeFileSync, mkdirSync } from 'fs'
import { join, extname } from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const subdir = (formData.get('subdir') as string) ?? 'products'

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const ext = extname(file.name) || '.bin'
  const filename = `${uuidv4()}${ext}`
  const dir = join(process.cwd(), 'public', 'uploads', subdir)
  mkdirSync(dir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  writeFileSync(join(dir, filename), buffer)

  return NextResponse.json({ url: `/uploads/${subdir}/${filename}` })
}
