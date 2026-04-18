import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

function adminOnly(role: string | undefined) {
  return role !== 'ADMIN'
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (adminOnly((session?.user as any)?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  await prisma.productReview.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (adminOnly((session?.user as any)?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const { isVisible } = await req.json() as { isVisible: boolean }
  const updated = await prisma.productReview.update({ where: { id }, data: { isVisible } })
  return NextResponse.json(updated)
}
