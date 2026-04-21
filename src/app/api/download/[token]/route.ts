import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getR2SignedUrl } from '@/lib/r2'
import { createReadStream, statSync } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'

const PAID_STATUSES = new Set(['PAID', 'PROCESSING', 'DELIVERED', 'COMPLETED'])

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

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

  const filePath = order.product.digitalFile
  if (!filePath) return new Response('No file attached to this product', { status: 404 })

  const filename = order.product.title.replace(/[^a-z0-9_\-. ]/gi, '_')

  // R2 key (no leading slash → treat as bucket key): redirect to time-limited signed URL
  if (!filePath.startsWith('/') && !filePath.startsWith('http')) {
    const url = await getR2SignedUrl(filePath, 300)
    return Response.redirect(url, 302)
  }

  // Legacy local-file path: stream from public/, with traversal guard
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
