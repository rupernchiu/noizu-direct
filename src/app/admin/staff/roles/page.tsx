import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { loadStaffActor, can } from '@/lib/staffPolicy'
import { CreateRoleForm } from './CreateRoleForm'
import { RoleCard } from './RoleCard'

export default async function StaffRolesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const session = await auth()
  const isMainAdmin = session && (session.user as any).role === 'ADMIN'
  if (!isMainAdmin) {
    const actor = await loadStaffActor()
    if (!actor || (!actor.isSuperAdmin && !can(actor, 'staff.view'))) redirect('/staff/login')
  }

  const sp = await searchParams
  const q = sp.q?.trim() ?? ''

  const where = q
    ? { OR: [{ name: { contains: q } }, { description: { contains: q } }] }
    : {}

  const [total, roles] = await Promise.all([
    prisma.staffRole.count({ where }),
    prisma.staffRole.findMany({ where, orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Staff Roles</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Optional presets — not enforced at runtime</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: New Role form */}
        <div className="lg:col-span-1">
          <CreateRoleForm />
        </div>

        {/* Right: Role Presets list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-background/40">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-sm font-semibold text-foreground">
                  Role Presets <span className="ml-2 text-xs font-normal text-muted-foreground">{total} total</span>
                </p>
                <form className="flex gap-2" method="GET">
                  <input
                    suppressHydrationWarning
                    name="q"
                    defaultValue={q}
                    placeholder="Search roles…"
                    className="w-40 px-3 py-1.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors"
                  />
                  <button type="submit" className="px-3 py-1.5 rounded-lg text-xs font-medium bg-border text-muted-foreground hover:text-foreground transition-colors">
                    Search
                  </button>
                </form>
              </div>
            </div>

            <div className="divide-y divide-border">
              {roles.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">No roles found.</p>
              )}
              {roles.map((role) => (
                <RoleCard key={role.id} role={role} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
