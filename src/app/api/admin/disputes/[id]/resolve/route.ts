import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { releaseEscrow, refundEscrow } from '@/lib/escrow-processor'
import { requireAdmin } from '@/lib/guards'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const body = await req.json() as { action: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'RELEASE'; amount?: number; adminNote: string }

  const dispute = await prisma.dispute.findUnique({ where: { id }, include: { order: true } })
  if (!dispute) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const adminId = (session.user as any).id as string
  await prisma.dispute.update({
    where: { id },
    data: { adminNote: body.adminNote, status: body.action === 'RELEASE' ? 'RESOLVED_RELEASE' : 'RESOLVED_REFUND', resolvedBy: adminId, resolvedAt: new Date() },
  })

  if (body.action === 'RELEASE') {
    await releaseEscrow(dispute.orderId, adminId, `Admin: ${body.adminNote}`)
  } else {
    const refundAmt = body.action === 'FULL_REFUND' ? dispute.order.amountUsd : (body.amount ?? 0)
    await refundEscrow(dispute.orderId, refundAmt, adminId, `Admin: ${body.adminNote}`)
  }

  return NextResponse.json({ ok: true })
}
