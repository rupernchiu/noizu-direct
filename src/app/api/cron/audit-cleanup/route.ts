import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStaffSessionFromRequest } from '@/lib/staffAuth'
import { isCronAuthorized } from '@/lib/cron-auth'

export async function POST(req: NextRequest) {
  // Allow: isSuperAdmin staff session OR valid CRON_SECRET (timing-safe).
  // We keep admin-fallback off here because this route has its own staff-session
  // fallback above — a NextAuth admin session shouldn't be able to trigger an
  // audit-log purge.
  const staffSession = getStaffSessionFromRequest(req)
  const authorized =
    staffSession?.isSuperAdmin === true ||
    (await isCronAuthorized(req, { allowAdminFallback: false }))

  if (!authorized) {
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
