import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id: string; role?: string }).id
  const role = (session.user as { id: string; role?: string }).role
  const { orderId } = await params

  const invoice = await prisma.invoice.findFirst({
    where: { orderId },
    include: { order: true },
  })

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  // Only buyer, creator of the order, or admin can download
  const order = invoice.order
  if (
    order &&
    order.buyerId !== userId &&
    order.creatorId !== userId &&
    role !== 'ADMIN'
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!invoice.pdfPath) {
    return NextResponse.json({ error: 'PDF not yet generated' }, { status: 404 })
  }

  const filePath = join(process.cwd(), invoice.pdfPath.replace(/^\//, ''))
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'PDF file not found' }, { status: 404 })
  }

  const buffer = readFileSync(filePath)
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.referenceNumber}.pdf"`,
    },
  })
}
