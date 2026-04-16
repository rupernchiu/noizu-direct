import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
