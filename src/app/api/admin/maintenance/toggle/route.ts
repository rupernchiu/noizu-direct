import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { enabled: boolean; message?: string }

  let settings = await prisma.platformSettings.findFirst()
  if (!settings) {
    settings = await prisma.platformSettings.create({ data: {} })
  }

  const updated = await prisma.platformSettings.update({
    where: { id: settings.id },
    data: {
      maintenanceMode: body.enabled,
      ...(body.message !== undefined ? { maintenanceMessage: body.message || null } : {}),
    },
    select: { maintenanceMode: true, maintenanceMessage: true },
  })

  return NextResponse.json(updated)
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.platformSettings.findFirst({
    select: { maintenanceMode: true, maintenanceMessage: true },
  })

  return NextResponse.json({
    enabled: settings?.maintenanceMode ?? false,
    message: settings?.maintenanceMessage ?? null,
  })
}
