import { NextResponse } from 'next/server'
import { requireCreator } from '@/lib/guards'
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
  // Facebook: use full URL as embedId
  return url
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const creatorId = searchParams.get('creatorId')
  if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 })

  const videos = await prisma.video.findMany({
    where: { creatorId, isActive: true },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(videos)
}

export async function POST(req: Request) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })

  const body = await req.json() as { title: string; platform: string; url: string; description?: string; order?: number }

  const embedId = extractEmbedId(body.platform, body.url)

  const video = await prisma.video.create({
    data: {
      creatorId: profile.id,
      title: body.title,
      description: body.description ?? null,
      platform: body.platform,
      url: body.url,
      embedId,
      order: body.order ?? 0,
    },
  })
  return NextResponse.json(video)
}
