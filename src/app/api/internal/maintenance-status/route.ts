import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Lightweight endpoint called by middleware — keep this fast
export async function GET(req: NextRequest) {
  // Only allow calls from the same origin (middleware internal calls)
  const secret = req.headers.get('x-internal-secret')
  if (secret !== (process.env.CRON_SECRET ?? '')) {
    return NextResponse.json({ enabled: false })
  }

  try {
    const settings = await prisma.platformSettings.findFirst({
      select: { maintenanceMode: true, maintenanceMessage: true },
    })
    return NextResponse.json({
      enabled: settings?.maintenanceMode ?? false,
      message: settings?.maintenanceMessage ?? null,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ enabled: false })
  }
}
