import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const post = await prisma.post.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(post)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const data: any = {}
  if ('title'          in body) data.title          = body.title
  if ('slug'           in body) data.slug            = body.slug
  if ('excerpt'        in body) data.excerpt         = body.excerpt
  if ('content'        in body) data.content         = body.content
  if ('coverImage'     in body) data.coverImage      = body.coverImage
  if ('status'         in body) data.status          = body.status
  if ('publishedAt'    in body) data.publishedAt     = body.publishedAt ? new Date(body.publishedAt) : null
  if ('scheduledAt'    in body) data.scheduledAt     = body.scheduledAt ? new Date(body.scheduledAt) : null
  if ('tags'           in body) data.tags            = JSON.stringify(body.tags ?? [])
  if ('seoTitle'       in body) data.seoTitle        = body.seoTitle
  if ('seoDescription' in body) data.seoDescription  = body.seoDescription

  const post = await prisma.post.update({ where: { id }, data })
  return NextResponse.json(post)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await prisma.post.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
