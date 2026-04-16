import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { NavLink } from '@/components/ui/NavLink'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { LayoutDashboard, Package, ShoppingBag, MessageCircle, DollarSign, Users, User, Video, Heart, Zap, Printer } from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Creator Dashboard</h1>
          <NotificationBell />
        </div>
        <div className="flex gap-8 flex-col md:flex-row">
          <aside className="md:w-56 shrink-0">
            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {/* Store management */}
              <NavLink href="/dashboard"><LayoutDashboard className="size-4" />Overview</NavLink>
              <NavLink href="/dashboard/listings"><Package className="size-4" />Listings</NavLink>
              <NavLink href="/dashboard/orders"><ShoppingBag className="size-4" />Orders</NavLink>
              <NavLink href="/dashboard/messages"><MessageCircle className="size-4" />Messages</NavLink>
              <NavLink href="/dashboard/earnings"><DollarSign className="size-4" />Earnings</NavLink>
              <NavLink href="/dashboard/fans"><Users className="size-4" />Fans</NavLink>
              {/* Separator */}
              <div className="hidden md:block my-2 h-px bg-border" />
              {/* Content */}
              <NavLink href="/dashboard/videos"><Video className="size-4" />Videos</NavLink>
              <NavLink href="/dashboard/support"><Heart className="size-4" />Support</NavLink>
              <NavLink href="/dashboard/pod-settings"><Printer className="size-4" />POD Settings</NavLink>
              <NavLink href="/dashboard/popup"><Zap className="size-4" />Popup</NavLink>
              {/* Separator */}
              <div className="hidden md:block my-2 h-px bg-border" />
              <NavLink href="/dashboard/profile"><User className="size-4" />Profile</NavLink>
            </nav>
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
