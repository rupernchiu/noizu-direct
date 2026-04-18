'use client'

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { Menu, LogOut, LayoutDashboard, Bell, ShoppingCart } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { CurrencySelector } from './CurrencySelector'
import { useCartStore } from '@/lib/cart-store'
import { Logo } from '@/components/ui/Logo'

interface SessionUser {
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string
}

// ── Cart Icon ──────────────────────────────────────────────────────────────────

function CartIcon() {
  const { itemCount, openCart } = useCartStore()

  return (
    <button
      type="button"
      onClick={openCart}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '36px', height: '36px',
        background: 'transparent', border: 'none',
        borderRadius: '8px', cursor: 'pointer',
        position: 'relative', color: 'var(--foreground)',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      aria-label={`Shopping cart${itemCount > 0 ? `, ${itemCount} items` : ''}`}
    >
      <ShoppingCart size={20} />
      {itemCount > 0 && (
        <span style={{
          position: 'absolute', top: '2px', right: '2px',
          minWidth: '16px', height: '16px',
          background: '#ef4444', borderRadius: '8px',
          border: '1.5px solid var(--background)',
          fontSize: '10px', fontWeight: 700,
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 3px',
          lineHeight: 1,
        }}>
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </button>
  )
}

// ── Mobile Cart Button ─────────────────────────────────────────────────────────

function MobileCartButton() {
  const { itemCount, openCart } = useCartStore()

  return (
    <button
      type="button"
      onClick={openCart}
      className="flex items-center gap-3 w-full text-sm py-3 px-1 text-foreground hover:text-primary transition-colors"
    >
      <ShoppingCart className="w-4 h-4 flex-shrink-0" />
      <span>Cart{itemCount > 0 ? ` (${itemCount})` : ''}</span>
    </button>
  )
}

// ── Navbar ─────────────────────────────────────────────────────────────────────

export default function Navbar() {
  const { data: session } = useSession()
  const user = session?.user as SessionUser | undefined
  const isCreator = ['CREATOR', 'ADMIN'].includes(user?.role ?? '')
  const isAdmin = user?.role === 'ADMIN'

  async function handleSignOut() {
    try {
      await signOut({ redirect: false })
    } catch {
      // ignore
    }
    await fetch('/api/auth/signout-force', { method: 'POST' })
    window.location.href = '/'
  }

  const authSection = session ? (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-border/60 transition-colors outline-none"
      >
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-primary text-white text-xs">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-foreground">{user?.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-surface border-border">
        {/* Role badge */}
        <div className="px-2 py-1.5">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            {isAdmin ? 'Admin' : isCreator ? 'Creator' : 'Member'}
          </span>
        </div>
        <DropdownMenuSeparator />
        {/* My Dashboard */}
        <DropdownMenuItem
          render={<Link href={isAdmin ? '/admin' : isCreator ? '/dashboard' : '/account'} />}
          className="flex items-center gap-2 cursor-pointer"
        >
          <LayoutDashboard className="size-4" />
          My Dashboard
        </DropdownMenuItem>
        {/* Notifications — skip for admin */}
        {!isAdmin && (
          <DropdownMenuItem render={<Link href="/account/notifications" />} className="flex items-center gap-2 cursor-pointer">
            <Bell className="size-4" />
            Notifications
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer text-red-400 focus:text-red-400"
          onClick={() => { void handleSignOut() }}
        >
          <LogOut className="size-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        render={<Link href="/login" />}
      >
        Log In
      </Button>
      <Button
        className="bg-primary hover:bg-primary/90 text-white"
        render={<Link href="/register" />}
      >
        Sign Up
      </Button>
    </div>
  )

  return (
    <nav className="bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-screen-xl mx-auto px-6">
        {/* Outer: position:relative so absolute children are constrained to this container */}
        <div className="relative flex items-center h-14">
          {/* Left — Logo (absolute so it doesn't participate in centering calc) */}
          <div className="absolute left-0 flex items-center">
            <Link href="/" className="flex items-center shrink-0">
              <Logo />
            </Link>
          </div>

          {/* Center — truly centered links */}
          <div
            className="hidden md:flex items-center gap-1"
            style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}
          >
            <Link
              href="/marketplace"
              className="px-3 py-1.5 text-[15px] font-medium text-foreground hover:text-secondary transition-colors rounded-lg hover:bg-border/40"
            >
              Marketplace
            </Link>
            <Link
              href="/creators"
              className="px-3 py-1.5 text-[15px] font-medium text-foreground hover:text-secondary transition-colors rounded-lg hover:bg-border/40"
            >
              Creators
            </Link>
          </div>

          {/* Right — icons (margin-left: auto pushes to right edge) */}
          <div className="hidden md:flex items-center gap-1 ml-auto">
            <CurrencySelector />
            <ThemeToggle />
            <CartIcon />
            {authSection}
          </div>

          {/* Mobile hamburger (always visible on small screens, sits at right) */}
          <div className="md:hidden ml-auto">
            <Sheet>
              <SheetTrigger
                className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-border/60 transition-colors outline-none"
                aria-label="Open menu"
              >
                <Menu className="size-5 text-foreground" />
              </SheetTrigger>
              <SheetContent side="right" className="bg-surface border-border w-72">
                <div className="flex flex-col gap-6 pt-8 px-4">
                  {/* Mobile logo */}
                  <Link href="/" className="flex items-center">
                    <Logo />
                  </Link>
                  {/* Mobile cart */}
                  <MobileCartButton />
                  {/* Mobile nav links */}
                  <div className="flex flex-col gap-4">
                    <Link
                      href="/marketplace"
                      className="text-sm font-medium text-foreground hover:text-secondary transition-colors"
                    >
                      Marketplace
                    </Link>
                    <Link
                      href="/creators"
                      className="text-sm font-medium text-foreground hover:text-secondary transition-colors"
                    >
                      Creators
                    </Link>
                  </div>
                  {/* Theme toggle */}
                  <ThemeToggle mobile />
                  {/* Mobile auth */}
                  <div className="flex flex-col gap-2">
                    {session ? (
                      <>
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide py-1">
                          {isAdmin ? 'Admin' : isCreator ? 'Creator' : 'Member'}
                        </span>
                        <Link
                          href={isAdmin ? '/admin' : isCreator ? '/dashboard' : '/account'}
                          className="flex items-center gap-2 text-sm text-foreground hover:text-secondary py-2"
                        >
                          <LayoutDashboard className="size-4" />
                          My Dashboard
                        </Link>
                        {!isAdmin && (
                          <Link
                            href="/account/notifications"
                            className="flex items-center gap-2 text-sm text-foreground hover:text-secondary py-2"
                          >
                            <Bell className="size-4" />
                            Notifications
                          </Link>
                        )}
                        <button
                          onClick={() => { void handleSignOut() }}
                          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 py-2 text-left"
                        >
                          <LogOut className="size-4" />
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          className="justify-start"
                          render={<Link href="/login" />}
                        >
                          Log In
                        </Button>
                        <Button
                          className="bg-primary hover:bg-primary/90 text-white"
                          render={<Link href="/register" />}
                        >
                          Sign Up
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
