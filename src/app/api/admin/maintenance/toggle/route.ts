import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

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

  // Mirror the flag into Redis so middleware (edge runtime) can read it without
  // a per-request fetch to our own API. Middleware already caches for 30s, so
  // worst-case staleness after toggling is 30s.
  try {
    await redis.set('platform:maintenance', updated.maintenanceMode ? 'true' : 'false')
  } catch (err) {
    console.warn('[admin/maintenance/toggle] redis sync failed', err)
  }

  return NextResponse.json(updated)
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.platformSettings.findFirst({
    select: { maintenanceMode: true, maintenanceMessage: true },
  })

  // Opportunistic backfill so a fresh Redis still reflects the db state
  // without requiring an admin to re-toggle.
  try {
    await redis.set('platform:maintenance', settings?.maintenanceMode ? 'true' : 'false')
  } catch { /* non-fatal */ }

  return NextResponse.json({
    enabled: settings?.maintenanceMode ?? false,
    message: settings?.maintenanceMessage ?? null,
  })
}
