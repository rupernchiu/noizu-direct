import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const items = await prisma.media.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, url: true, filename: true, mimeType: true },
  })
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    url: string
    filename: string
    mimeType?: string
    fileSize?: number
    width?: number
    height?: number
  }
  const { url, filename, mimeType, fileSize, width, height } = body
  if (!url || !filename) {
    return NextResponse.json({ error: 'Missing url or filename' }, { status: 400 })
  }

  const userId = (session.user as any).id
  const media = await prisma.media.create({
    data: {
      url,
      filename,
      uploadedBy: userId,
      mimeType: mimeType ?? null,
      fileSize: fileSize ?? null,
      width: width ?? null,
      height: height ?? null,
    },
  })

  return NextResponse.json(media, { status: 201 })
}
