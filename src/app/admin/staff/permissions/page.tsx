import React from 'react'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { loadStaffActor, can } from '@/lib/staffPolicy'

export default async function StaffPermissionsPage() {
  const session = await auth()
  const isMainAdmin = session && (session.user as any).role === 'ADMIN'
  if (!isMainAdmin) {
    const actor = await loadStaffActor()
    if (!actor || (!actor.isSuperAdmin && !can(actor, 'staff.view'))) redirect('/staff/login')
  }

  const permissions = await prisma.staffPermission.findMany({
    orderBy: [{ component: 'asc' }, { action: 'asc' }],
    include: { _count: { select: { userGrants: true } } },
  })

  // Group by component
  const grouped: Record<string, typeof permissions> = {}
  for (const p of permissions) {
    if (!grouped[p.component]) grouped[p.component] = []
    grouped[p.component].push(p)
  }
  const components = Object.keys(grouped).sort()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Permission Catalog</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{permissions.length} permissions across {components.length} components</p>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Component</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Display Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Granted To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {components.map((component) => (
                <React.Fragment key={component}>
                  {grouped[component].map((perm, i) => (
                    <tr
                      key={perm.id}
                      className="border-b border-border last:border-0 hover:bg-background/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        {i === 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-primary/10 text-primary">
                            {component}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30 text-xs">↳</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono text-foreground/80">{perm.action}</code>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{perm.displayName}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs">{perm.description ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-foreground font-medium">{perm._count.userGrants}</td>
                      <td className="px-4 py-3">
                        {perm.isActive ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-500/15 text-green-400">Active</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-border text-muted-foreground">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
