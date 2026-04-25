import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive
  if (body.expiresAt === null) data.expiresAt = null
  else if (typeof body.expiresAt === 'string') data.expiresAt = new Date(body.expiresAt)
  if (body.maxUses === null) data.maxUses = null
  else if (typeof body.maxUses === 'number' && body.maxUses > 0) data.maxUses = body.maxUses

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 })
  }

  const updated = await prisma.discountCode.update({ where: { id }, data })
  return NextResponse.json({ discountCode: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // If the code has been used we soft-deactivate to preserve the FK on Order
  // (Order.discountCodeId is a FK back to DiscountCode). Hard-delete only when
  // it's never been redeemed.
  const code = await prisma.discountCode.findUnique({
    where: { id },
    select: { id: true, usedCount: true },
  })
  if (!code) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (code.usedCount > 0) {
    await prisma.discountCode.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ ok: true, deactivated: true })
  }

  try {
    await prisma.discountCode.delete({ where: { id } })
    return NextResponse.json({ ok: true, deleted: true })
  } catch {
    await prisma.discountCode.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ ok: true, deactivated: true })
  }
}
