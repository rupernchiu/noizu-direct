import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const page = await prisma.page.findUnique({ where: { id } })
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(page)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const data: any = {}
  if ('title'          in body) data.title          = body.title
  if ('slug'           in body) data.slug            = body.slug
  if ('content'        in body) data.content         = body.content
  if ('status'         in body) data.status          = body.status
  if ('showInFooter'   in body) data.showInFooter    = body.showInFooter
  if ('footerColumn'   in body) data.footerColumn    = body.footerColumn
  if ('footerOrder'    in body) data.footerOrder     = body.footerOrder
  if ('seoTitle'       in body) data.seoTitle        = body.seoTitle
  if ('seoDescription' in body) data.seoDescription  = body.seoDescription

  const page = await prisma.page.update({ where: { id }, data })
  return NextResponse.json(page)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await prisma.page.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
