import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { NavLink } from '@/components/ui/NavLink'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { MobileNavDrawer } from '@/components/ui/MobileNavDrawer'
import { User, ShoppingBag, Download, Ticket, Bell, FileText, Heart, Users, Scale, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  const role = (session.user as { role?: string }).role
  const isCreator = role === 'CREATOR' || role === 'ADMIN'

  const navItems = (
    <>
      {isCreator && (
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-2 py-1 mb-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-border/40 shrink-0"
        >
          ← Creator Dashboard
        </Link>
      )}
      <NavLink href="/account"><User className="size-4" />Profile</NavLink>
      <NavLink href="/account/orders"><ShoppingBag className="size-4" />Orders</NavLink>
      <NavLink href="/account/downloads"><Download className="size-4" />Downloads</NavLink>
      <NavLink href="/account/tickets"><Ticket className="size-4" />Tickets</NavLink>
      <NavLink href="/account/notifications"><Bell className="size-4" />Notifications</NavLink>
      <NavLink href="/account/statements"><FileText className="size-4" />Statements</NavLink>
      <NavLink href="/account/wishlist"><Heart className="size-4" />Wishlist</NavLink>
      <NavLink href="/account/following"><Users className="size-4" />Following</NavLink>
      <NavLink href="/account/subscriptions"><Sparkles className="size-4" />Subscriptions</NavLink>
      <NavLink href="/account/disputes"><Scale className="size-4" />Disputes</NavLink>
    </>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <MobileNavDrawer title="My Account">{navItems}</MobileNavDrawer>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">My Account</h1>
          </div>
          <NotificationBell />
        </div>
        <div className="flex gap-8 flex-col md:flex-row">
          <aside className="hidden md:block md:w-56 shrink-0">
            <nav className="flex md:flex-col gap-1">
              {navItems}
            </nav>
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
