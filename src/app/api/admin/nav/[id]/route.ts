import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

type Params = { params: Promise<{ id: string }> }

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
  const body = await req.json() as {
    label?: string
    url?: string
    navType?: string
    position?: string
    order?: number
    dropdownType?: string
    dropdownContent?: object
    openInNewTab?: boolean
    isActive?: boolean
  }

  const data: Record<string, unknown> = { ...body }
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
