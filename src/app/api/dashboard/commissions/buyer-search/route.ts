import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/dashboard/commissions/buyer-search?q=<query>
//
// Returns buyers who have interacted with the logged-in creator
// (tickets, commission requests, past orders). Scoping search to
// real relationships prevents enumeration + eliminates the typo-leak risk
// of typing an arbitrary email.
//
// Response: [{ id, name, avatar, email, contexts: { tickets, requests, orders } }]
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (!profile) return NextResponse.json({ error: 'Creator profile required' }, { status: 403 })

  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().toLowerCase()

  const [tickets, requests, orders] = await Promise.all([
    prisma.ticket.findMany({
      where: { creatorId: userId },
      select: { buyerId: true },
    }),
    prisma.commissionRequest.findMany({
      where: { creatorId: profile.id },
      select: { buyerId: true, status: true },
    }),
    prisma.order.findMany({
      where: { creatorId: userId },
      select: { buyerId: true },
    }),
  ])

  const stats = new Map<string, { tickets: number; requests: number; openRequests: number; orders: number }>()
  const bump = (id: string, key: 'tickets' | 'requests' | 'openRequests' | 'orders') => {
    const s = stats.get(id) ?? { tickets: 0, requests: 0, openRequests: 0, orders: 0 }
    s[key] += 1
    stats.set(id, s)
  }
  for (const t of tickets) bump(t.buyerId, 'tickets')
  for (const r of requests) {
    bump(r.buyerId, 'requests')
    if (r.status === 'PENDING' || r.status === 'QUOTED') bump(r.buyerId, 'openRequests')
  }
  for (const o of orders) bump(o.buyerId, 'orders')

  const buyerIds = Array.from(stats.keys())
  if (buyerIds.length === 0) return NextResponse.json({ buyers: [] })

  const users = await prisma.user.findMany({
    where: {
      id: { in: buyerIds },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, email: true, avatar: true },
    take: 20,
  })

  const buyers = users
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      contexts: stats.get(u.id) ?? { tickets: 0, requests: 0, openRequests: 0, orders: 0 },
    }))
    .sort((a, b) => {
      const aScore = a.contexts.openRequests * 10 + a.contexts.orders * 3 + a.contexts.tickets + a.contexts.requests
      const bScore = b.contexts.openRequests * 10 + b.contexts.orders * 3 + b.contexts.tickets + b.contexts.requests
      return bScore - aScore
    })

  return NextResponse.json({ buyers })
}
