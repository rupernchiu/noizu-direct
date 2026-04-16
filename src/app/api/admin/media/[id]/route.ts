import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { requireAdmin } from '@/lib/guards'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const media = await prisma.media.findUnique({ where: { id } })
  if (!media) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete physical file if it is a local /uploads/ path
  if (media.url.startsWith('/uploads/')) {
    const filePath = join(process.cwd(), 'public', media.url)
    await unlink(filePath).catch(() => { /* already gone */ })
  }

  await prisma.media.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
