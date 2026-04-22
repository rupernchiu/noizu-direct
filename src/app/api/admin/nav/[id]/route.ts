import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

type Params = { params: Promise<{ id: string }> }

// M9 — mass-assignment mitigation. We previously spread the body into the
// prisma.update data object, which meant any future non-admin-writable field
// added to NavItem (createdAt, id, internal flags) would silently accept
// caller input. Explicit allow-list here.
const updateSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  url: z.string().trim().max(2048).optional(),
  navType: z.enum(['SECONDARY', 'PRIMARY', 'MOBILE']).optional(),
  position: z.enum(['LEFT', 'RIGHT', 'CENTER']).optional(),
  order: z.number().int().optional(),
  dropdownType: z.enum(['NONE', 'SIMPLE_LIST', 'MEGA_MENU', 'FEATURE_CARD']).optional(),
  dropdownContent: z.record(z.string(), z.unknown()).optional(),
  openInNewTab: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).strict()

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const item = await prisma.navItem.findUnique({ where: { id } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const json = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const body = parsed.data

  const data: Record<string, unknown> = {}
  if (body.label !== undefined) data.label = body.label
  if (body.url !== undefined) data.url = body.url
  if (body.navType !== undefined) data.navType = body.navType
  if (body.position !== undefined) data.position = body.position
  if (body.order !== undefined) data.order = body.order
  if (body.dropdownType !== undefined) data.dropdownType = body.dropdownType
  if (body.openInNewTab !== undefined) data.openInNewTab = body.openInNewTab
  if (body.isActive !== undefined) data.isActive = body.isActive
  if (body.dropdownContent !== undefined) {
    data.dropdownContent = JSON.stringify(body.dropdownContent)
  }

  const item = await prisma.navItem.update({ where: { id }, data })
  return NextResponse.json(item)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await prisma.navItem.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
