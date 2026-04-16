import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getStaffSession } from '@/lib/staffAuth'
import { loadStaffActor, can } from '@/lib/staffPolicy'
import Link from 'next/link'
import { CreateStaffPanel } from './CreateStaffPanel'
import { StaffActions } from './StaffActions'

const PER_PAGE = 20

export default async function StaffUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const session = await auth()
  const isMainAdmin = session && (session.user as any).role === 'ADMIN'

  let isSuperAdmin = isMainAdmin ?? false
  if (!isMainAdmin) {
    const actor = await loadStaffActor()
    if (!actor || (!actor.isSuperAdmin && !can(actor, 'staff.view'))) redirect('/staff/login')
    isSuperAdmin = actor.isSuperAdmin
  }

  // Get current staff user id for "(you)" indicator
  const staffSession = await getStaffSession()
  const currentStaffId = staffSession?.staffUserId ?? null

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1') || 1)
  const q = sp.q?.trim() ?? ''

  const where = q
    ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { department: { contains: q } }] }
    : {}

  const [total, users] = await Promise.all([
    prisma.staffUser.count({ where }),
    prisma.staffUser.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, name: true, email: true, department: true,
        isActive: true, isSuperAdmin: true, lastLogin: true, createdAt: true,
        _count: { select: { permissions: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Staff Users</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{total} staff member{total !== 1 ? 's' : ''}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: New User form */}
        {isSuperAdmin && (
          <div className="lg:col-span-1">
            <CreateStaffPanel />
          </div>
        )}

        {/* Right: User database */}
        <div className={isSuperAdmin ? 'lg:col-span-2 space-y-4' : 'lg:col-span-3 space-y-4'}>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {/* Header + search */}
            <div className="px-5 py-4 border-b border-border bg-background/40">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-sm font-semibold text-foreground">User Database</p>
                <form className="flex gap-2" method="GET">
                  <input
                    suppressHydrationWarning
                    name="q"
                    defaultValue={q}
                    placeholder="Search users…"
                    className="w-48 px-3 py-1.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors"
                  />
                  <button type="submit" className="px-3 py-1.5 rounded-lg text-xs font-medium bg-border text-muted-foreground hover:text-foreground transition-colors">
                    Search
                  </button>
                </form>
              </div>
            </div>

            {/* User cards */}
            <div className="divide-y divide-border">
              {users.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">No staff users found.</p>
              )}
              {users.map((u) => (
                <div key={u.id} className="px-5 py-4 hover:bg-background/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{u.name}</span>
                        {u.id === currentStaffId && (
                          <span className="text-xs text-muted-foreground">(you)</span>
                        )}
                        {u.isSuperAdmin && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive/20 text-destructive">SUPER ADMIN</span>
                        )}
                        {u.isActive ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-500/15 text-green-400">Active</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-border text-muted-foreground">Inactive</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        {u.department && <span>{u.department}</span>}
                        <span>
                          {u.isSuperAdmin ? 'All permissions' : `${u._count.permissions} permission${u._count.permissions !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>
                    {isSuperAdmin && (
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        <Link href={`/admin/staff/${u.id}/permissions`} className="px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-border transition-colors">
                          Permissions
                        </Link>
                        <Link href={`/admin/staff/${u.id}/edit`} className="px-2 py-1 rounded text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
                          Edit
                        </Link>
                        <StaffActions userId={u.id} isActive={u.isActive} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">Page {page} of {totalPages} · {total} total</p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link href={`?page=${page - 1}&q=${encodeURIComponent(q)}`} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-border text-muted-foreground hover:text-foreground transition-colors">
                      ← Previous
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link href={`?page=${page + 1}&q=${encodeURIComponent(q)}`} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-border text-muted-foreground hover:text-foreground transition-colors">
                      Next →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
