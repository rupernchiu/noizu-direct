import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const pages = await prisma.page.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ pages })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, slug, content, status, showInFooter, footerColumn, footerOrder, seoTitle, seoDescription } = body

  if (!title || !slug) return NextResponse.json({ error: 'title and slug are required' }, { status: 400 })

  const page = await prisma.page.create({
    data: {
      title,
      slug,
      content: content ?? null,
      status: status ?? 'DRAFT',
      showInFooter: showInFooter ?? false,
      footerColumn: footerColumn ?? null,
      footerOrder: footerOrder ?? null,
      seoTitle: seoTitle ?? null,
      seoDescription: seoDescription ?? null,
    },
  })

  return NextResponse.json(page, { status: 201 })
}
