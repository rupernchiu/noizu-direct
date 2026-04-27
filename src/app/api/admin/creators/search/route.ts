/**
 * GET /api/admin/creators/search?q=...&limit=10
 *
 * Lightweight typeahead for the admin tax dashboard creator filter (Phase 6).
 * Searches CreatorProfile by displayName, username, and User.email/name.
 *
 * Returns { creators: [{ userId, displayName, username, email, country }] }.
 *
 * Auth: admin only.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '10', 10) || 10))

  if (q.length === 0) return NextResponse.json({ creators: [] })

  // Match against CreatorProfile.displayName/username AND User.email/name.
  // Case-insensitive match — Postgres `mode: 'insensitive'` requires citext or
  // ILIKE — Prisma supports `contains` with `mode: 'insensitive'` for text cols.
  const profiles = await prisma.creatorProfile.findMany({
    where: {
      OR: [
        { displayName: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
      ],
    },
    take: limit,
    select: {
      userId: true,
      displayName: true,
      username: true,
      payoutCountry: true,
      taxJurisdiction: true,
      user: { select: { email: true, name: true } },
    },
    orderBy: { displayName: 'asc' },
  }).catch(() => [])

  return NextResponse.json({
    creators: profiles.map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      username: p.username,
      email: p.user?.email ?? null,
      name: p.user?.name ?? null,
      country: (p.payoutCountry ?? p.taxJurisdiction ?? null)?.toUpperCase() ?? null,
    })),
  })
}
