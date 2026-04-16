import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const popup = await prisma.popupAd.findFirst({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(popup)
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { title, description, imageUrl, ctaText, ctaLink, isActive, startsAt, endsAt } = body
  if (!title?.trim() || !ctaText?.trim() || !ctaLink?.trim()) {
    return NextResponse.json({ error: 'title, ctaText and ctaLink are required' }, { status: 400 })
  }
  const popup = await prisma.popupAd.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      ctaText: ctaText.trim(),
      ctaLink: ctaLink.trim(),
      isActive: Boolean(isActive),
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  })
  return NextResponse.json(popup, { status: 201 })
}

export async function PATCH(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (fields.title       !== undefined) data.title       = fields.title.trim()
  if (fields.description !== undefined) data.description = fields.description?.trim() || null
  if (fields.imageUrl    !== undefined) data.imageUrl    = fields.imageUrl?.trim()    || null
  if (fields.ctaText     !== undefined) data.ctaText     = fields.ctaText.trim()
  if (fields.ctaLink     !== undefined) data.ctaLink     = fields.ctaLink.trim()
  if (fields.isActive    !== undefined) data.isActive    = Boolean(fields.isActive)
  if (fields.startsAt    !== undefined) data.startsAt    = fields.startsAt ? new Date(fields.startsAt) : null
  if (fields.endsAt      !== undefined) data.endsAt      = fields.endsAt   ? new Date(fields.endsAt)   : null

  const popup = await prisma.popupAd.update({ where: { id }, data })
  return NextResponse.json(popup)
}

export async function DELETE(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.popupAd.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
