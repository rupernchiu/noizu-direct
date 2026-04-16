import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStaffSessionFromRequest } from '@/lib/staffAuth'

export async function POST(req: NextRequest) {
  // Allow: isSuperAdmin staff session OR valid x-cron-secret header
  const staffSession = getStaffSessionFromRequest(req)
  const cronSecret = process.env.CRON_SECRET
  const headerSecret = req.headers.get('x-cron-secret')

  const isAuthorized =
    (staffSession?.isSuperAdmin === true) ||
    (cronSecret && headerSecret === cronSecret)

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 2)

  const result = await prisma.auditEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })

  return NextResponse.json({
    deleted: result.count,
    message: `Audit cleanup complete. ${result.count} record${result.count !== 1 ? 's' : ''} deleted.`,
  })
}
