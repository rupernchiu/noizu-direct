import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const LIMIT_BYTES = 100 * 1024 * 1024

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  try {
    const messages = await prisma.message.findMany({
      where: {
        senderId: userId,
        NOT: { attachments: '[]' },
      },
      select: { id: true, attachments: true, createdAt: true },
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
      messageId: string
    }> = []

    for (const msg of messages) {
      let attachments: Array<{ url: string; name: string; size: number; type: string }> = []
      try {
        attachments = JSON.parse(msg.attachments)
      } catch {
        continue
      }
      for (const att of attachments) {
        const isImage = att.type === 'image' || /\.(jpe?g|png|gif|webp|avif)$/i.test(att.name ?? '')
        const isPdf = att.type === 'pdf' || /\.pdf$/i.test(att.name ?? '')
        const size = att.size ?? 0

        if (isImage) {
          imageFiles++
          imageBytes += size
        } else if (isPdf) {
          pdfFiles++
          pdfBytes += size
        }

        files.push({
          url: att.url,
          name: att.name,
          size,
          type: isImage ? 'image' : isPdf ? 'pdf' : 'other',
          date: msg.createdAt.toISOString(),
          messageId: msg.id,
        })
      }
    }

    const used = imageBytes + pdfBytes
    const breakdown = [
      { category: 'Message images', files: imageFiles, bytes: imageBytes },
      { category: 'Message PDFs', files: pdfFiles, bytes: pdfBytes },
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
