import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import {
  openOrAttachTicket,
  notifyOtherParty,
  hasAngleBrackets,
  normaliseSubject,
  BODY_MAX,
  TicketBlockedError,
} from '@/lib/tickets'

// GET /api/tickets?status=open|closed&kind=...
// Returns tickets for the current user (as buyer or creator), newest activity first.
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const url = new URL(req.url)
  const statusQ = url.searchParams.get('status')
  const kindQ = url.searchParams.get('kind')

  const status =
    statusQ === 'closed' ? 'CLOSED' : statusQ === 'all' ? undefined : 'OPEN'

  const tickets = await prisma.ticket.findMany({
    where: {
      OR: [{ buyerId: userId }, { creatorId: userId }],
      ...(status ? { status } : {}),
      ...(kindQ ? { kind: kindQ } : {}),
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 50,
    select: {
      id: true,
      subject: true,
      kind: true,
      status: true,
      buyerId: true,
      creatorId: true,
      lastMessageAt: true,
      closedAt: true,
      purgeAt: true,
      buyer: {
        select: {
          id: true,
          name: true,
          avatar: true,
          creatorProfile: { select: { username: true, displayName: true } },
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          avatar: true,
          creatorProfile: { select: { username: true, displayName: true, avatar: true } },
        },
      },
      readMarkers: {
        where: { userId },
        select: { lastReadAt: true },
      },
    },
  })

  // Pull last message preview + unread counts in bulk.
  const ticketIds = tickets.map((t) => t.id)
  const lastMsgs = ticketIds.length
    ? await prisma.ticketMessage.findMany({
        where: { ticketId: { in: ticketIds }, systemKind: null, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        distinct: ['ticketId'],
        select: { ticketId: true, body: true, createdAt: true, senderId: true },
      })
    : []
  const lastByTicket = new Map(lastMsgs.map((m) => [m.ticketId, m]))

  const augmented = tickets.map((t) => {
    const marker = t.readMarkers[0]
    const lastReadAt = marker?.lastReadAt ?? null
    const unread =
      !lastReadAt
        ? 1 // never read — show a single badge dot
        : lastReadAt < t.lastMessageAt
          ? 1
          : 0
    const last = lastByTicket.get(t.id)
    return {
      id: t.id,
      subject: t.subject,
      kind: t.kind,
      status: t.status,
      isBuyer: t.buyerId === userId,
      lastMessageAt: t.lastMessageAt,
      lastMessagePreview: last?.body?.slice(0, 140) ?? null,
      lastMessageSenderId: last?.senderId ?? null,
      closedAt: t.closedAt,
      purgeAt: t.purgeAt,
      unread,
      counterparty:
        t.buyerId === userId
          ? {
              id: t.creator.id,
              name: t.creator.creatorProfile?.displayName ?? t.creator.name,
              avatar: t.creator.creatorProfile?.avatar ?? t.creator.avatar,
              username: t.creator.creatorProfile?.username ?? null,
            }
          : {
              id: t.buyer.id,
              name: t.buyer.name,
              avatar: t.buyer.avatar,
              username: null,
            },
    }
  })

  return NextResponse.json({ tickets: augmented })
}

// POST /api/tickets — BUYER opens a GENERAL ticket against a creator.
// Auto-opened tickets (COMMISSION/QUOTE/ORDER) go through their own hooks, not here.
const openSchema = z.object({
  creatorUsername: z.string().trim().min(1).max(64),
  subject: z.string().trim().min(1).max(140),
  body: z.string().trim().min(1).max(BODY_MAX),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const buyerId = session.user.id

  const json = await req.json().catch(() => null)
  const parsed = openSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  if (hasAngleBrackets(parsed.data.subject) || hasAngleBrackets(parsed.data.body)) {
    return NextResponse.json({ error: 'HTML not allowed' }, { status: 400 })
  }

  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { username: parsed.data.creatorUsername },
    select: { userId: true, displayName: true },
  })
  if (!creatorProfile) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  if (creatorProfile.userId === buyerId) {
    return NextResponse.json({ error: 'Cannot open a ticket with yourself' }, { status: 400 })
  }

  // Rate-limit NEW ticket opens separately from replies (lower budget).
  const rl = await rateLimit('tickets-new', buyerId, 5, 3600)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'You are opening tickets too fast. Try again in an hour.' },
      { status: 429, headers: rateLimitHeaders(rl, 5) },
    )
  }

  try {
    const ticket = await prisma.$transaction(async (tx) => {
      return await openOrAttachTicket(
        {
          kind: 'GENERAL',
          buyerId,
          creatorId: creatorProfile.userId,
          subject: normaliseSubject(parsed.data.subject),
          openedById: buyerId,
          seedBody: parsed.data.body.trim(),
        },
        tx,
      )
    })

    await notifyOtherParty(
      ticket,
      buyerId,
      'TICKET_OPENED',
      'New ticket',
      `${session.user.name ?? 'A buyer'} opened a ticket: "${ticket.subject}"`,
    )

    return NextResponse.json({ ticket }, { headers: rateLimitHeaders(rl, 5) })
  } catch (err) {
    if (err instanceof TicketBlockedError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    throw err
  }
}
