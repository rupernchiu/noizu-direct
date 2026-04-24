import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const LIMIT_BYTES = 100 * 1024 * 1024

function fileNameFromR2Key(r2Key: string): string {
  const tail = r2Key.split('/').pop()
  return tail && tail.length > 0 ? tail : r2Key
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  try {
    const attachments = await prisma.ticketAttachment.findMany({
      where: { uploaderId: userId, supersededAt: null },
      select: {
        id: true,
        ticketId: true,
        viewerUrl: true,
        r2Key: true,
        mimeType: true,
        fileSize: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    let imageFiles = 0
    let imageBytes = 0
    let pdfFiles = 0
    let pdfBytes = 0
    const files: Array<{
      url: string
      name: string
      size: number
      type: string
      date: string
      ticketId: string
      attachmentId: string
    }> = []

    for (const att of attachments) {
      const name = fileNameFromR2Key(att.r2Key)
      const mime = att.mimeType ?? ''
      const isImage = mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|avif)$/i.test(name)
      const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(name)
      const size = att.fileSize ?? 0

      if (isImage) {
        imageFiles++
        imageBytes += size
      } else if (isPdf) {
        pdfFiles++
        pdfBytes += size
      }

      files.push({
        url: att.viewerUrl,
        name,
        size,
        type: isImage ? 'image' : isPdf ? 'pdf' : 'other',
        date: att.createdAt.toISOString(),
        ticketId: att.ticketId,
        attachmentId: att.id,
      })
    }

    const used = imageBytes + pdfBytes
    const breakdown = [
      { category: 'Ticket images', files: imageFiles, bytes: imageBytes },
      { category: 'Ticket PDFs', files: pdfFiles, bytes: pdfBytes },
    ]

    return NextResponse.json({
      used,
      limit: LIMIT_BYTES,
      usedMB: Math.round((used / (1024 * 1024)) * 10) / 10,
      limitMB: 100,
      percentUsed: Math.round((used / LIMIT_BYTES) * 100),
      breakdown,
      files,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
