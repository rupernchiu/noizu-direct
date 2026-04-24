import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCreatorProfile } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import {
  canCreatorBroadcast,
  createBroadcast,
  TITLE_MAX,
  BODY_MAX,
  CTA_TEXT_MAX,
} from '@/lib/broadcasts'

const BROADCAST_TEMPLATES = ['NEW_DROP', 'FLASH_SALE', 'BEHIND_SCENES', 'EVENT', 'THANK_YOU', 'MILESTONE'] as const
const BROADCAST_AUDIENCES = ['ALL_FOLLOWERS', 'SUBSCRIBERS_ONLY'] as const

// CTA URL must be an https URL. We don't attempt a full allow-list of domains
// here — creators can legitimately link to their own socials, Patreon, etc.
// Validation stays shallow at the API and the UI surfaces the raw URL to the
// reader (scheme is shown, nothing is auto-followed).
const CtaUrlSchema = z.string().url().startsWith('https://').max(500)

const CreateSchema = z.object({
  title: z.string().trim().min(1).max(TITLE_MAX),
  body: z.string().trim().min(1).max(BODY_MAX),
  template: z.enum(BROADCAST_TEMPLATES),
  audience: z.enum(BROADCAST_AUDIENCES),
  imageKey: z.string().max(300).nullable().optional(),
  ctaText: z.string().trim().max(CTA_TEXT_MAX).nullable().optional(),
  ctaUrl: CtaUrlSchema.nullable().optional(),
})

// GET /api/creator/broadcasts — list this creator's sent broadcasts, newest first.
export async function GET(req: Request) {
  const guard = await requireCreatorProfile()
  if (!guard) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const take = Math.min(Math.max(Number(url.searchParams.get('take') ?? 50) || 50, 1), 100)

  const rows = await prisma.broadcast.findMany({
    where: { creatorId: guard.profile.id },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      title: true,
      body: true,
      template: true,
      audience: true,
      imageKey: true,
      ctaText: true,
      ctaUrl: true,
      createdAt: true,
      _count: { select: { notifications: true } },
    },
  })

  const broadcasts = rows.map(r => ({
    id: r.id,
    title: r.title,
    body: r.body,
    template: r.template,
    audience: r.audience,
    imageKey: r.imageKey,
    ctaText: r.ctaText,
    ctaUrl: r.ctaUrl,
    createdAt: r.createdAt,
    recipientCount: r._count.notifications,
  }))

  return NextResponse.json({ broadcasts })
}

// POST /api/creator/broadcasts — compose + send a new broadcast.
export async function POST(req: Request) {
  const guard = await requireCreatorProfile()
  if (!guard) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Burst guard: 10 attempts per minute stops click-spam before we hit the
  // day/month caps in canCreatorBroadcast.
  const rl = await rateLimit('broadcast:create', guard.userId, 10, 60)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a moment.' },
      { status: 429, headers: rateLimitHeaders(rl, 10) },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const input = parsed.data

  // One of ctaText / ctaUrl requires the other — a label with no link or a
  // bare link with no label are both confusing for readers.
  const hasText = Boolean(input.ctaText)
  const hasUrl = Boolean(input.ctaUrl)
  if (hasText !== hasUrl) {
    return NextResponse.json(
      { error: 'CTA text and URL must both be set, or both left empty.' },
      { status: 400 },
    )
  }

  const eligibility = await canCreatorBroadcast(guard.profile.id)
  if (!eligibility.ok) {
    return NextResponse.json(
      {
        error:
          eligibility.reason === 'daily_cap'
            ? 'Daily broadcast limit reached (3/day).'
            : 'Monthly broadcast limit reached (30/month).',
        reason: eligibility.reason,
        sentToday: eligibility.sentToday,
        sentThisMonth: eligibility.sentThisMonth,
      },
      { status: 429 },
    )
  }

  const result = await createBroadcast({
    creatorId: guard.profile.id,
    title: input.title,
    body: input.body,
    template: input.template,
    audience: input.audience,
    imageKey: input.imageKey ?? null,
    ctaText: input.ctaText ?? null,
    ctaUrl: input.ctaUrl ?? null,
  })

  return NextResponse.json(
    {
      id: result.broadcast.id,
      recipientCount: result.recipientCount,
      deferred: result.deferred,
      createdAt: result.broadcast.createdAt,
    },
    { status: 201, headers: rateLimitHeaders(rl, 10) },
  )
}
