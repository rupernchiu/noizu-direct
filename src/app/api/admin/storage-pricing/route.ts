import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return null
  return session
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let config = await prisma.storagePricingConfig.findUnique({ where: { id: 'config' } })
  if (!config) config = await prisma.storagePricingConfig.create({ data: { id: 'config' } })

  return NextResponse.json({ config })
}

export async function PATCH(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as Record<string, unknown>

  const allowed = [
    'freePlanMb',
    'creatorPlanGb', 'creatorPlanPriceCents',
    'proPlanGb', 'proPlanPriceCents',
    'overageCentsPerGb', 'overageGracePercent',
    'warningThreshold1', 'warningThreshold2',
    'gracePeriodDays', 'orphanAgeDays', 'deleteWarningHours',
    'feeGraceDays', 'feePayoutBlockDays', 'feeSuspendDays',
  ] as const

  const data: Record<string, number> = {}
  for (const key of allowed) {
    if (key in body && typeof body[key] === 'number') {
      data[key] = body[key] as number
    }
  }

  const config = await prisma.storagePricingConfig.upsert({
    where: { id: 'config' },
    create: { id: 'config', ...data },
    update: data,
  })

  return NextResponse.json({ config })
}
