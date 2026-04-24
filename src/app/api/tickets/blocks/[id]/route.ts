import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/tickets/blocks/[id] — creator removes a block.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const block = await prisma.userBlock.findUnique({ where: { id } })
  if (!block) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (block.blockerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await prisma.userBlock.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
