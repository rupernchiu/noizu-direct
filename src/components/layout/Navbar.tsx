'use client'

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { Menu, User, LogOut, LayoutDashboard, ShoppingBag, Shield, Download, ShoppingCart } from 'lucide-react'
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
import { useState, useEffect, useRef } from 'react'

interface SessionUser {
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string
}

function getRoleLinks(role: string | undefined) {
  if (role === 'ADMIN') {
    return {
      profile: '/account',
      orders: '/admin/orders',
      extra: { href: '/admin', label: 'Admin', icon: 'admin' as const },
      downloads: null,
    }
  }
  if (role === 'CREATOR') {
    return {
      profile: '/dashboard/profile',
      orders: '/dashboard/orders',
      extra: { href: '/dashboard', label: 'Creator Dashboard', icon: 'dashboard' as const },
      downloads: null,
    }
  }
  return {
    profile: '/account',
    orders: '/account/orders',
    extra: null,
    downloads: '/account/downloads',
  }
}

// ── Cart Icon ──────────────────────────────────────────────────────────────────

function CartIcon() {
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('nd_cart_count')
    setCount(stored ? parseInt(stored, 10) || 0 : 0)
  }, [])

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    if (open) {
      document.addEventListener('mousedown', onOut)
      window.addEventListener('keydown', onEsc)
    }
    return () => {
      document.removeEventListener('mousedown', onOut)
      window.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => setOpen(o => !o)}
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
      >
        <ShoppingCart size={20} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: '4px', right: '4px',
            width: '8px', height: '8px',
            background: '#ef4444', borderRadius: '50%',
            border: '1.5px solid var(--background)',
          }} />
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 50,
          width: '320px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
          }}>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--foreground)' }}>
              Shopping cart
            </p>
            {count > 0 && (
              <span style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
                {count} item{count !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Empty state */}
          {count === 0 && (
            <div style={{
              padding: '32px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            }}>
              <ShoppingCart size={48} style={{ color: 'var(--muted-foreground)', marginBottom: '12px', opacity: 0.4 }} />
              <p style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 500, color: 'var(--foreground)' }}>
                Your cart is empty
              </p>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                Browse products and add items to your cart
              </p>
              <Link
                href="/marketplace"
                onClick={() => setOpen(false)}
                style={{
                  display: 'block', width: '100%',
                  background: '#7c3aed', color: '#fff',
                  padding: '10px 0',
                  borderRadius: '20px',
                  fontSize: '14px', fontWeight: 600,
                  textAlign: 'center', textDecoration: 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#6d28d9')}
                onMouseLeave={e => (e.currentTarget.style.background = '#7c3aed')}
              >
                Browse Marketplace
              </Link>
            </div>
          )}

          {/* Filled state — future: render cart items here */}
          {count > 0 && (
            <div>
              {/* Cart items would be rendered here */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                <Link
                  href="/checkout"
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'block', width: '100%',
                    background: '#7c3aed', color: '#fff',
                    padding: '12px 0',
                    borderRadius: '8px',
                    fontSize: '14px', fontWeight: 600,
                    textAlign: 'center', textDecoration: 'none',
                  }}
                >
                  Go to checkout
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Navbar ─────────────────────────────────────────────────────────────────────

export default function Navbar() {
  const { data: session } = useSession()
  const user = session?.user as SessionUser | undefined
  const links = getRoleLinks(user?.role)

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
        <DropdownMenuItem render={<Link href={links.profile} />} className="flex items-center gap-2 cursor-pointer">
          <User className="size-4" />
          My Profile
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={links.orders} />} className="flex items-center gap-2 cursor-pointer">
          <ShoppingBag className="size-4" />
          Orders
        </DropdownMenuItem>
        {links.downloads && (
          <DropdownMenuItem render={<Link href={links.downloads} />} className="flex items-center gap-2 cursor-pointer">
            <Download className="size-4" />
            Downloads
          </DropdownMenuItem>
        )}
        {links.extra && (
          <DropdownMenuItem render={<Link href={links.extra.href} />} className="flex items-center gap-2 cursor-pointer">
            {links.extra.icon === 'admin' ? <Shield className="size-4" /> : <LayoutDashboard className="size-4" />}
            {links.extra.label}
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
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-screen-xl mx-auto px-6">
        {/* Outer: position:relative so absolute children are constrained to this container */}
        <div className="relative flex items-center h-14">
          {/* Left — Logo (absolute so it doesn't participate in centering calc) */}
          <div className="absolute left-0 flex items-center">
            <Link href="/" className="flex items-center shrink-0">
              <span className="text-lg font-bold text-foreground">NOIZU</span>
              <span className="text-lg font-bold text-secondary">-DIRECT</span>
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
            <CartIcon />
            <ThemeToggle />
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
                    <span className="text-lg font-bold text-foreground">NOIZU</span>
                    <span className="text-lg font-bold text-secondary">-DIRECT</span>
                  </Link>
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
                        <Link
                          href={links.profile}
                          className="flex items-center gap-2 text-sm text-foreground hover:text-secondary py-2"
                        >
                          <User className="size-4" />
                          My Profile
                        </Link>
                        <Link
                          href={links.orders}
                          className="flex items-center gap-2 text-sm text-foreground hover:text-secondary py-2"
                        >
                          <ShoppingBag className="size-4" />
                          Orders
                        </Link>
                        {links.downloads && (
                          <Link
                            href={links.downloads}
                            className="flex items-center gap-2 text-sm text-foreground hover:text-secondary py-2"
                          >
                            <Download className="size-4" />
                            Downloads
                          </Link>
                        )}
                        {links.extra && (
                          <Link
                            href={links.extra.href}
                            className="flex items-center gap-2 text-sm text-foreground hover:text-secondary py-2"
                          >
                            {links.extra.icon === 'admin' ? <Shield className="size-4" /> : <LayoutDashboard className="size-4" />}
                            {links.extra.label}
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
