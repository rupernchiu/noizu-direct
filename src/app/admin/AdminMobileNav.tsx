'use client'

import { usePathname, useRouter } from 'next/navigation'

type Item = { href: string; label: string; group?: string }

export function AdminMobileNav({ items }: { items: Item[] }) {
  const pathname = usePathname()
  const router = useRouter()

  const active =
    items.find(i => pathname === i.href || pathname.startsWith(i.href + '/'))?.href ??
    items[0]?.href ??
    ''

  const groups = items.reduce<Record<string, Item[]>>((acc, it) => {
    const g = it.group ?? 'Main'
    ;(acc[g] ||= []).push(it)
    return acc
  }, {})

  return (
    <div className="md:hidden mb-4">
      <div className="relative">
        <select
          value={active}
          onChange={(e) => router.push(e.target.value)}
          className="w-full appearance-none cursor-pointer rounded-lg border border-border bg-card px-4 py-2.5 pr-10 text-sm font-semibold text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          aria-label="Admin section"
        >
          {Object.entries(groups).map(([group, groupItems]) => (
            <optgroup key={group} label={group}>
              {groupItems.map(it => (
                <option key={it.href} value={it.href}>
                  {it.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  )
}
