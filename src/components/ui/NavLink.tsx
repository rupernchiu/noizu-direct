'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
        active
          ? 'bg-[#7c3aed] text-white'
          : 'text-[#8888aa] hover:bg-[#1e1e2a] hover:text-[#f0f0f5]'
      )}
    >
      {children}
    </Link>
  )
}
