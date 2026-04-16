import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const VALID_PLANS = ['PRO', 'STUDIO', 'TOPUP_1GB', 'TOPUP_5GB', 'TOPUP_10GB'] as const
type PlanType = typeof VALID_PLANS[number]

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id as string
  const body = await req.json() as { planType?: string; amountCents?: number }

  if (!body.planType || !VALID_PLANS.includes(body.planType as PlanType)) {
    return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
  }

  await prisma.storagePurchase.create({
    data: {
      userId,
      planType: body.planType,
      amountCents: body.amountCents ?? 0,
      status: 'INTEREST',
    },
  })

  return NextResponse.json({ ok: true })
}
