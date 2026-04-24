import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { sendAbuseReport } from '@/lib/emails/abuseReport'

const schema = z.object({
  reason: z.string().trim().min(5).max(500),
})

// POST /api/tickets/[id]/messages/[messageId]/report — flag a message for abuse review.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { id, messageId } = await params

  const json = await req.json().catch(() => null)
  const parsed = schema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  // Prevent report-spam: 5/hr per user.
  const rl = await rateLimit('tickets-report', userId, 5, 3600)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many reports. Try again later.' },
      { status: 429, headers: rateLimitHeaders(rl, 5) },
    )
  }

  const msg = await prisma.ticketMessage.findUnique({
    where: { id: messageId },
    include: {
      ticket: { select: { id: true, subject: true, buyerId: true, creatorId: true } },
      sender: { select: { id: true, name: true } },
    },
  })
  if (!msg || msg.ticket.id !== id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const isParty = msg.ticket.buyerId === userId || msg.ticket.creatorId === userId
  if (!isParty) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (msg.senderId === userId) {
    return NextResponse.json({ error: 'Cannot report your own message.' }, { status: 400 })
  }

  const now = new Date()
  // First report wins — idempotent-ish.
  if (!msg.reportedAt) {
    await prisma.ticketMessage.update({
      where: { id: messageId },
      data: { reportedAt: now, reportedById: userId },
    })
  }

  const reporter = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })

  await sendAbuseReport({
    ticketId: id,
    ticketSubject: msg.ticket.subject,
    messageId,
    messagePreview: msg.body,
    reason: parsed.data.reason,
    reporterUserId: userId,
    reporterName: reporter?.name ?? 'Unknown',
    reporterEmail: reporter?.email ?? null,
    targetUserId: msg.senderId,
    targetName: msg.sender.name,
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[abuse-report] dispatch failed', err)
  })

  return NextResponse.json({ ok: true }, { headers: rateLimitHeaders(rl, 5) })
}
