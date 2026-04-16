import { prisma } from '@/lib/prisma'
import { SecondaryNavClient } from './SecondaryNavClient'

export const revalidate = 300

export async function SecondaryNav() {
  const items = await prisma.navItem.findMany({
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
  })

  if (items.length === 0) return null

  return (
    <nav
      className="border-b border-border hidden md:block"
      style={{ background: 'var(--surface)' }}
    >
      <div
        className="max-w-screen-xl mx-auto"
        style={{ padding: '0 24px', height: '44px', display: 'flex', alignItems: 'center' }}
      >
        <SecondaryNavClient items={items} />
      </div>
    </nav>
  )
}
