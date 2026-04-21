import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getR2SignedUrl } from '@/lib/r2'
import { createReadStream, statSync } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'

const PAID_STATUSES = new Set(['PAID', 'PROCESSING', 'DELIVERED', 'COMPLETED'])

interface DigitalFile {
  key: string
  filename: string
  size: number
  mime: string
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const url = new URL(req.url)
  const idxParam = url.searchParams.get('idx')

  const session = await auth()
  const userId = session?.user ? (session.user as { id: string }).id : null
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const order = await prisma.order.findFirst({
    where: { downloadToken: token },
    include: { product: true },
  })

  if (!order) return new Response('Not found', { status: 404 })
  if (order.buyerId !== userId) return new Response('Forbidden', { status: 403 })
  if (!order.downloadExpiry || order.downloadExpiry < new Date()) {
    return new Response('Download link expired', { status: 410 })
  }
  if (!PAID_STATUSES.has(order.status)) {
    return new Response('Order not paid', { status: 402 })
  }

  // Multi-file path: digitalFiles JSON array takes precedence
  const digitalFilesJson = (order.product as { digitalFiles?: string | null }).digitalFiles
  if (digitalFilesJson) {
    let files: DigitalFile[] = []
    try { files = JSON.parse(digitalFilesJson) as DigitalFile[] } catch { files = [] }
    if (files.length > 0) {
      const idx = idxParam ? parseInt(idxParam, 10) : 0
      if (Number.isNaN(idx) || idx < 0 || idx >= files.length) {
        return new Response('Invalid file index', { status: 400 })
      }
      const file = files[idx]
      const signed = await getR2SignedUrl(file.key, 300)
      return Response.redirect(signed, 302)
    }
  }

  // Legacy single-file fallback
  const filePath = order.product.digitalFile
  if (!filePath) return new Response('No file attached to this product', { status: 404 })

  const filename = order.product.title.replace(/[^a-z0-9_\-. ]/gi, '_')

  if (!filePath.startsWith('/') && !filePath.startsWith('http')) {
    const signed = await getR2SignedUrl(filePath, 300)
    return Response.redirect(signed, 302)
  }

  const normalised = filePath.startsWith('/') ? filePath.slice(1) : filePath
  const publicRoot = join(process.cwd(), 'public')
  const abs = join(publicRoot, normalised)

  if (!abs.startsWith(publicRoot + '/') && abs !== publicRoot) {
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const size = statSync(abs).size
    const nodeStream = createReadStream(abs)
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>
    return new Response(webStream, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(size),
      },
    })
  } catch {
    return new Response('File not found on server', { status: 404 })
  }
}
