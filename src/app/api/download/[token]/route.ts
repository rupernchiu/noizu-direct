import { prisma } from '@/lib/prisma'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const order = await prisma.order.findFirst({
    where: { downloadToken: token },
    include: { product: true },
  })

  if (!order || !order.downloadExpiry || order.downloadExpiry < new Date()) {
    return new Response('Expired or not found', { status: 410 })
  }

  const filePath = order.product.digitalFile
  if (!filePath) return new Response('No file attached to this product', { status: 404 })

  const normalised = filePath.startsWith('/') ? filePath.slice(1) : filePath
  const publicRoot = join(process.cwd(), 'public')
  const abs = join(publicRoot, normalised)

  // Path traversal guard: resolved path must remain inside public/
  if (!abs.startsWith(publicRoot + '/') && abs !== publicRoot) {
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const buf = readFileSync(abs)
    const filename = order.product.title.replace(/[^a-z0-9_\-. ]/gi, '_')
    return new Response(buf, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(buf.length),
      },
    })
  } catch {
    return new Response('File not found on server', { status: 404 })
  }
}
