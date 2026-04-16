import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { loadStaffActor } from '@/lib/staffPolicy'
import { PermissionsGrid } from './PermissionsGrid'

export default async function StaffPermissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const isMainAdmin = session && (session.user as any).role === 'ADMIN'
  if (!isMainAdmin) {
    const actor = await loadStaffActor()
    if (!actor || !actor.isSuperAdmin) redirect('/admin/staff')
  }

  const { id } = await params
  const [user, allPermissions, currentGrants] = await Promise.all([
    prisma.staffUser.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, isSuperAdmin: true },
    }),
    prisma.staffPermission.findMany({
      where: { isActive: true },
      orderBy: [{ component: 'asc' }, { action: 'asc' }],
    }),
    prisma.staffUserPermission.findMany({
      where: { staffUserId: id },
      select: { staffPermissionId: true, expiresAt: true },
    }),
  ])
  if (!user) notFound()

  // Group permissions by component
  const grouped = allPermissions.reduce<Record<string, typeof allPermissions>>((acc, p) => {
    if (!acc[p.component]) acc[p.component] = []
    acc[p.component].push(p)
    return acc
  }, {})

  const currentMap: Record<string, string | null> = {}
  for (const g of currentGrants) {
    currentMap[g.staffPermissionId] = g.expiresAt?.toISOString() ?? null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Staff Permissions</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {user.name} · {user.email}
          {user.isSuperAdmin && (
            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive/20 text-destructive">
              SUPER ADMIN — bypasses all checks
            </span>
          )}
        </p>
      </div>
      <PermissionsGrid
        staffUserId={id}
        grouped={grouped}
        currentMap={currentMap}
        isSuperAdmin={user.isSuperAdmin}
      />
    </div>
  )
}
