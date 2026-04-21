import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { SecondaryNavClient } from './SecondaryNavClient'

// No route-level revalidate — session is per-request.
// NavItems are rarely changed; Prisma's own query caching is sufficient.

export async function SecondaryNav() {
  const [items, session] = await Promise.all([
    prisma.navItem.findMany({
      where: { navType: 'SECONDARY', isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        label: true,
        url: true,
        position: true,
        dropdownType: true,
        dropdownContent: true,
        openInNewTab: true,
      },
    }),
    auth(),
  ])

  if (items.length === 0) return null

  const userRole = (session?.user as { role?: string } | undefined)?.role ?? null

  return (
    <nav
      className="border-b border-border hidden md:block"
      style={{ background: 'var(--surface)' }}
    >
      <div
        className="max-w-screen-xl mx-auto"
        style={{ padding: '0 24px', height: '44px', display: 'flex', alignItems: 'center' }}
      >
        <SecondaryNavClient items={items} userRole={userRole} />
      </div>
    </nav>
  )
}
