import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { NavLink } from '@/components/ui/NavLink'
import { LayoutDashboard, Users, Package, ShoppingBag, DollarSign, CreditCard, FileText, Megaphone, Settings, Image, Zap, Menu, Scale, Lock } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="px-2 py-0.5 rounded bg-destructive/20 text-destructive text-xs font-bold">ADMIN</span>
          <h1 className="text-xl font-bold text-foreground">NOIZU-DIRECT Admin</h1>
        </div>
        <div className="flex gap-6 flex-col md:flex-row">
          <aside className="md:w-52 shrink-0">
            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
              <NavLink href="/admin"><LayoutDashboard className="size-4" />Overview</NavLink>
              <NavLink href="/admin/creators"><Users className="size-4" />Creators</NavLink>
              <NavLink href="/admin/products"><Package className="size-4" />Products</NavLink>
              <NavLink href="/admin/orders"><ShoppingBag className="size-4" />Orders</NavLink>
              <NavLink href="/admin/escrow"><Lock className="size-4" />Escrow</NavLink>
              <NavLink href="/admin/disputes"><Scale className="size-4" />Disputes</NavLink>
              <NavLink href="/admin/transactions"><DollarSign className="size-4" />Transactions</NavLink>
              <NavLink href="/admin/payouts"><CreditCard className="size-4" />Payouts</NavLink>
              <NavLink href="/admin/cms"><FileText className="size-4" />CMS</NavLink>
              <NavLink href="/admin/cms/navigation"><Menu className="size-4" />Navigation</NavLink>
              <NavLink href="/admin/popups"><Zap className="size-4" />Popups</NavLink>
              <NavLink href="/admin/announcements"><Megaphone className="size-4" />Announcements</NavLink>
              <NavLink href="/admin/media"><Image className="size-4" />Media</NavLink>
              <NavLink href="/admin/settings"><Settings className="size-4" />Settings</NavLink>
            </nav>
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
