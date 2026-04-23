import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { NavLink } from '@/components/ui/NavLink'
import { LayoutDashboard, Users, Package, ShoppingBag, DollarSign, FileText, Megaphone, Settings, Image, Zap, Menu, HardDrive, Tag, ScrollText, ClipboardList, UserCog, ListChecks, ShieldCheck, Tags, Mail, Star, TrendingUp, AlertTriangle, Shield } from 'lucide-react'
import { loadStaffActor, can } from '@/lib/staffPolicy'
import { AdminMobileNav } from './AdminMobileNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const isMainAdmin = session && (session.user as any).role === 'ADMIN'

  let showStaffSection = !!isMainAdmin
  let showMainNav = !!isMainAdmin

  if (!isMainAdmin) {
    const staffActor = await loadStaffActor()
    if (!staffActor) redirect('/')
    showStaffSection = staffActor.isSuperAdmin || can(staffActor, 'staff.view')
    showMainNav = false
  }

  const mobileNavItems: { href: string; label: string; group?: string }[] = []
  if (showMainNav) {
    mobileNavItems.push(
      { href: '/admin',                      label: 'Overview',         group: 'Main' },
      { href: '/admin/creators',             label: 'Creators',         group: 'Main' },
      { href: '/admin/products',             label: 'Products',         group: 'Main' },
      { href: '/admin/orders',               label: 'Orders',           group: 'Main' },
      { href: '/admin/transactions',         label: 'Transactions',     group: 'Main' },
      { href: '/admin/payouts',              label: 'Payouts',          group: 'Main' },
      { href: '/admin/finance',              label: 'Finance',          group: 'Main' },
      { href: '/admin/chargebacks',          label: 'Chargebacks',      group: 'Main' },
      { href: '/admin/fraud',                label: 'Fraud',            group: 'Main' },
      { href: '/admin/emails',               label: 'Emails',           group: 'Main' },
      { href: '/admin/cms',                  label: 'CMS',              group: 'Main' },
      { href: '/admin/cms/navigation',       label: 'Navigation',       group: 'Main' },
      { href: '/admin/popups',               label: 'Popups',           group: 'Main' },
      { href: '/admin/announcements',        label: 'Announcements',    group: 'Main' },
      { href: '/admin/media',                label: 'Media',            group: 'Main' },
      { href: '/admin/settings',             label: 'Settings',         group: 'Main' },
      { href: '/admin/storage',              label: 'Storage Monitor',  group: 'Storage' },
      { href: '/admin/storage/pricing',      label: 'Storage Pricing',  group: 'Storage' },
      { href: '/admin/agreements',           label: 'Agreements',       group: 'Platform' },
      { href: '/admin/creators/applications', label: 'Applications',    group: 'Platform' },
      { href: '/admin/reviews',              label: 'Reviews',          group: 'Platform' },
    )
  }
  if (showStaffSection) {
    mobileNavItems.push(
      { href: '/admin/staff',             label: 'Staff Users',  group: 'Staff' },
      { href: '/admin/staff/roles',       label: 'Roles',        group: 'Staff' },
      { href: '/admin/staff/permissions', label: 'Permissions',  group: 'Staff' },
      { href: '/admin/staff/audit',       label: 'Audit Log',    group: 'Staff' },
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="px-2 py-0.5 rounded bg-destructive/20 text-destructive text-xs font-bold">ADMIN</span>
          <h1 className="text-xl font-bold text-foreground">noizu.direct Admin</h1>
        </div>
        <AdminMobileNav items={mobileNavItems} />
        <div className="flex gap-6 flex-col md:flex-row">
          <aside className="hidden md:block md:w-52 shrink-0">
            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
              {showMainNav && (
                <>
                  <NavLink href="/admin"><LayoutDashboard className="size-4" />Overview</NavLink>
                  <NavLink href="/admin/creators"><Users className="size-4" />Creators</NavLink>
                  <NavLink href="/admin/products"><Package className="size-4" />Products</NavLink>
                  <NavLink href="/admin/orders"><ShoppingBag className="size-4" />Orders</NavLink>
                  <NavLink href="/admin/transactions"><DollarSign className="size-4" />Transactions</NavLink>
                  <NavLink href="/admin/payouts"><DollarSign className="size-4" />Payouts</NavLink>
                  <NavLink href="/admin/finance"><TrendingUp className="size-4" />Finance</NavLink>
                  <NavLink href="/admin/chargebacks"><AlertTriangle className="size-4" />Chargebacks</NavLink>
                  <NavLink href="/admin/fraud"><Shield className="size-4" />Fraud</NavLink>
                  <NavLink href="/admin/emails"><Mail className="size-4" />Emails</NavLink>
                  <NavLink href="/admin/cms"><FileText className="size-4" />CMS</NavLink>
                  <NavLink href="/admin/cms/navigation"><Menu className="size-4" />Navigation</NavLink>
                  <NavLink href="/admin/popups"><Zap className="size-4" />Popups</NavLink>
                  <NavLink href="/admin/announcements"><Megaphone className="size-4" />Announcements</NavLink>
                  <NavLink href="/admin/media"><Image className="size-4" />Media</NavLink>
                  <NavLink href="/admin/settings"><Settings className="size-4" />Settings</NavLink>
                  <div className="hidden md:block my-2 h-px bg-border" />
                  <NavLink href="/admin/storage"><HardDrive className="size-4" />Storage Monitor</NavLink>
                  <NavLink href="/admin/storage/pricing"><Tag className="size-4" />Storage Pricing</NavLink>
                  <div className="hidden md:block my-2 h-px bg-border" />
                  <p className="hidden md:block px-2 py-0.5 text-[11px] uppercase text-muted-foreground font-medium select-none" style={{ letterSpacing: '0.08em' }}>Platform</p>
                  <NavLink href="/admin/agreements"><ScrollText className="size-4" />Agreements</NavLink>
                  <NavLink href="/admin/creators/applications"><ClipboardList className="size-4" />Applications</NavLink>
                  <NavLink href="/admin/reviews"><Star className="size-4" />Reviews</NavLink>
                </>
              )}
              {showStaffSection && (
                <>
                  {showMainNav && <div className="hidden md:block my-2 h-px bg-border" />}
                  <p className="hidden md:block px-2 py-0.5 text-[11px] uppercase text-muted-foreground font-medium select-none" style={{ letterSpacing: '0.08em' }}>Staff</p>
                  <NavLink href="/admin/staff"><UserCog className="size-4" />Staff Users</NavLink>
                  <NavLink href="/admin/staff/roles"><Tags className="size-4" />Roles</NavLink>
                  <NavLink href="/admin/staff/permissions"><ShieldCheck className="size-4" />Permissions</NavLink>
                  <NavLink href="/admin/staff/audit"><ListChecks className="size-4" />Audit Log</NavLink>
                </>
              )}
            </nav>
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
