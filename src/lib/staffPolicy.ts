/**
 * Staff permission policy engine.
 * Default-deny: every action requires explicit permission.
 * Super-admin staff bypass all checks.
 */

import { redirect } from 'next/navigation'
import { prisma } from './prisma'
import { getStaffSession, type StaffSessionData } from './staffAuth'

export interface StaffActor extends StaffSessionData {
  id: string
  name: string
  email: string
  permissions: Set<string>
}

/** Load the current staff actor from the session cookie + DB. Returns null if not authenticated. */
export async function loadStaffActor(): Promise<StaffActor | null> {
  const session = await getStaffSession()
  if (!session) return null

  const user = await prisma.staffUser.findUnique({
    where: { id: session.staffUserId, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      isSuperAdmin: true,
      permissions: {
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: {
          staffPermission: { select: { shortcode: true, isActive: true } },
        },
      },
    },
  })

  if (!user) return null

  const permissions = new Set<string>(
    user.permissions
      .filter((p) => p.staffPermission.isActive)
      .map((p) => p.staffPermission.shortcode),
  )

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    staffUserId: user.id,
    isSuperAdmin: user.isSuperAdmin,
    permissions,
  }
}

/** Returns true if the actor has the given permission shortcode (or is super admin). */
export function can(actor: StaffActor, shortcode: string): boolean {
  return actor.isSuperAdmin || actor.permissions.has(shortcode)
}

/**
 * Require a valid staff session. Optionally require a specific permission.
 * Redirects to /staff/login if not authenticated or not permitted.
 */
export async function requireStaffActor(shortcode?: string): Promise<StaffActor> {
  const actor = await loadStaffActor()
  if (!actor) redirect('/staff/login')
  if (shortcode && !can(actor, shortcode)) redirect('/staff/login')
  return actor
}

/** Require the actor to be a super-admin staff user. */
export async function requireSuperAdmin(): Promise<StaffActor> {
  const actor = await loadStaffActor()
  if (!actor) redirect('/staff/login')
  if (!actor.isSuperAdmin) redirect('/admin/staff')
  return actor
}
