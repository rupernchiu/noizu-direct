'use client'

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { Menu, User, LogOut, LayoutDashboard, ShoppingBag, Shield } from 'lucide-react'
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

interface SessionUser {
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string
}

export default function Navbar() {
  const { data: session } = useSession()
  const user = session?.user as SessionUser | undefined

  const desktopNavLinks = (
    <>
      <Link
        href="/marketplace"
        className="text-sm font-medium text-[#f0f0f5] hover:text-[#00d4aa] transition-colors"
      >
        Marketplace
      </Link>
      <Link
        href="/creators"
        className="text-sm font-medium text-[#f0f0f5] hover:text-[#00d4aa] transition-colors"
      >
        Creators
      </Link>
    </>
  )

  const authSection = session ? (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors outline-none"
      >
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-[#7c3aed] text-white text-xs">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-[#f0f0f5]">{user?.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-[#16161f] border-[#2a2a3a]">
        <DropdownMenuItem render={<Link href="/profile" />} className="flex items-center gap-2 cursor-pointer">
          <User className="size-4" />
          My Profile
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/orders" />} className="flex items-center gap-2 cursor-pointer">
          <ShoppingBag className="size-4" />
          Orders
        </DropdownMenuItem>
        {user?.role === 'CREATOR' && (
          <DropdownMenuItem render={<Link href="/dashboard" />} className="flex items-center gap-2 cursor-pointer">
            <LayoutDashboard className="size-4" />
            Creator Dashboard
          </DropdownMenuItem>
        )}
        {user?.role === 'ADMIN' && (
          <DropdownMenuItem render={<Link href="/admin" />} className="flex items-center gap-2 cursor-pointer">
            <Shield className="size-4" />
            Admin
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer text-red-400 focus:text-red-400"
          onSelect={() => { void signOut() }}
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
        className="bg-[#7c3aed] hover:bg-[#7c3aed]/90 text-white"
        render={<Link href="/register" />}
      >
        Sign Up
      </Button>
    </div>
  )

  return (
    <nav className="sticky top-0 z-50 bg-[#0d0d12]/95 backdrop-blur-sm border-b border-[#2a2a3a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-white">NOIZU</span>
            <span className="text-xl font-bold text-[#00d4aa]">-DIRECT</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {desktopNavLinks}
          </div>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center">
            {authSection}
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger
                className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-white/5 transition-colors outline-none"
                aria-label="Open menu"
              >
                <Menu className="size-5 text-[#f0f0f5]" />
              </SheetTrigger>
              <SheetContent side="right" className="bg-[#16161f] border-[#2a2a3a] w-72">
                <div className="flex flex-col gap-6 pt-8 px-4">
                  {/* Mobile logo */}
                  <Link href="/" className="flex items-center">
                    <span className="text-lg font-bold text-white">NOIZU</span>
                    <span className="text-lg font-bold text-[#00d4aa]">-DIRECT</span>
                  </Link>
                  {/* Mobile nav links */}
                  <div className="flex flex-col gap-4">
                    <Link
                      href="/marketplace"
                      className="text-sm font-medium text-[#f0f0f5] hover:text-[#00d4aa] transition-colors"
                    >
                      Marketplace
                    </Link>
                    <Link
                      href="/creators"
                      className="text-sm font-medium text-[#f0f0f5] hover:text-[#00d4aa] transition-colors"
                    >
                      Creators
                    </Link>
                  </div>
                  {/* Mobile auth */}
                  <div className="flex flex-col gap-2">
                    {session ? (
                      <>
                        <Link
                          href="/profile"
                          className="flex items-center gap-2 text-sm text-[#f0f0f5] hover:text-[#00d4aa] py-2"
                        >
                          <User className="size-4" />
                          My Profile
                        </Link>
                        <Link
                          href="/orders"
                          className="flex items-center gap-2 text-sm text-[#f0f0f5] hover:text-[#00d4aa] py-2"
                        >
                          <ShoppingBag className="size-4" />
                          Orders
                        </Link>
                        {user?.role === 'CREATOR' && (
                          <Link
                            href="/dashboard"
                            className="flex items-center gap-2 text-sm text-[#f0f0f5] hover:text-[#00d4aa] py-2"
                          >
                            <LayoutDashboard className="size-4" />
                            Creator Dashboard
                          </Link>
                        )}
                        {user?.role === 'ADMIN' && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-2 text-sm text-[#f0f0f5] hover:text-[#00d4aa] py-2"
                          >
                            <Shield className="size-4" />
                            Admin
                          </Link>
                        )}
                        <button
                          onClick={() => { void signOut() }}
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
                          className="bg-[#7c3aed] hover:bg-[#7c3aed]/90 text-white"
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
