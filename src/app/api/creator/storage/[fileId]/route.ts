import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id as string
  const { fileId } = await params

  const file = await prisma.media.findUnique({ where: { id: fileId } })
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (file.uploadedBy !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Try to delete from filesystem if it's a local upload
  if (file.url.startsWith('/uploads/')) {
    try {
      await unlink(join(process.cwd(), 'public', file.url))
    } catch {
      // File may already be gone — not fatal
    }
  }

  await prisma.media.delete({ where: { id: fileId } })

  return NextResponse.json({ ok: true, deletedBytes: file.fileSize ?? 0 })
}
