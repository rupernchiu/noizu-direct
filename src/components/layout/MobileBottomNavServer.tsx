import { prisma } from '@/lib/prisma'
import { MobileBottomNav } from './MobileBottomNav'

export const revalidate = 300

export async function MobileBottomNavServer() {
  const items = await prisma.navItem.findMany({
    where: { navType: 'SECONDARY', isActive: true, position: { not: 'RIGHT' } },
    orderBy: { order: 'asc' },
    select: { id: true, label: true, url: true, dropdownType: true, dropdownContent: true },
  })

  if (items.length === 0) return null

  return (
    <MobileBottomNav
      items={items.map(i => ({
        id: i.id,
        label: i.label,
        href: i.url,
        dropdownType: i.dropdownType,
        dropdownContent: i.dropdownContent,
      }))}
    />
  )
}
