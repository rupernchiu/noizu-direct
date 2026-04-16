import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(announcements)
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text, link, color, isActive } = await req.json()

  if (!text?.trim()) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 })
  }

  const announcement = await prisma.announcement.create({
    data: {
      text,
      link: link ?? null,
      color: color ?? '#7c3aed',
      isActive: isActive ?? false,
    },
  })

  return NextResponse.json(announcement, { status: 201 })
}
