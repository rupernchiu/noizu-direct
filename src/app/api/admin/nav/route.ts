import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

export async function GET() {
  const items = await prisma.navItem.findMany({ orderBy: [{ navType: 'asc' }, { order: 'asc' }] })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    label: string
    url?: string
    navType?: string
    position?: string
    order?: number
    dropdownType?: string
    dropdownContent?: object
    openInNewTab?: boolean
    isActive?: boolean
  }

  const item = await prisma.navItem.create({
    data: {
      label: body.label,
      url: body.url ?? '#',
      navType: body.navType ?? 'SECONDARY',
      position: body.position ?? 'LEFT',
      order: body.order ?? 0,
      dropdownType: body.dropdownType ?? 'NONE',
      dropdownContent: JSON.stringify(body.dropdownContent ?? {}),
      openInNewTab: body.openInNewTab ?? false,
      isActive: body.isActive ?? true,
    },
  })
  return NextResponse.json(item, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Bulk reorder: [{ id, order, position }]
  const body = await req.json() as Array<{ id: string; order: number; position?: string }>
  await Promise.all(
    body.map(({ id, order, position }) =>
      prisma.navItem.update({ where: { id }, data: { order, ...(position ? { position } : {}) } })
    )
  )
  return NextResponse.json({ ok: true })
}
