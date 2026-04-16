import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const roles = await prisma.staffRole.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { description: { contains: q } }] } : undefined,
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ roles })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { name?: string; description?: string }
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const existing = await prisma.staffRole.findUnique({ where: { name: body.name.trim() } })
  if (existing) return NextResponse.json({ error: 'A role with that name already exists' }, { status: 409 })

  const role = await prisma.staffRole.create({
    data: { name: body.name.trim(), description: body.description?.trim() || null },
  })
  return NextResponse.json({ role }, { status: 201 })
}
