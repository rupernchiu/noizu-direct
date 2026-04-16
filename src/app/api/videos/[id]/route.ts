import { NextResponse } from 'next/server'
import { requireCreator, getOwnedByCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

function extractEmbedId(platform: string, url: string): string {
  if (platform === 'YOUTUBE') {
    const patterns = [
      /youtu\.be\/([^?&#]+)/,
      /youtube\.com\/watch\?v=([^&#]+)/,
      /youtube\.com\/embed\/([^?&#]+)/,
      /youtube\.com\/shorts\/([^?&#]+)/,
    ]
    for (const p of patterns) {
      const m = url.match(p)
      if (m) return m[1]
    }
    return url
  }
  return url
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const video = await getOwnedByCreator((session.user as any).id, (creatorId) =>
    prisma.video.findFirst({ where: { id, creatorId } })
  )
  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json() as Partial<{ title: string; platform: string; url: string; description: string; order: number; isActive: boolean }>

  let embedId = video.embedId
  if (body.url || body.platform) {
    const platform = body.platform ?? video.platform
    const url = body.url ?? video.url
    embedId = extractEmbedId(platform, url)
  }

  const updated = await prisma.video.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.platform !== undefined && { platform: body.platform }),
      ...(body.url !== undefined && { url: body.url }),
      ...(body.order !== undefined && { order: body.order }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      embedId,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const video = await getOwnedByCreator((session.user as any).id, (creatorId) =>
    prisma.video.findFirst({ where: { id, creatorId } })
  )
  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.video.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
