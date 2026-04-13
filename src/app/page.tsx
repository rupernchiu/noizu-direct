import { prisma } from '@/lib/prisma'
import HeroSection from '@/components/sections/HeroSection'
import FeaturedCreatorsSection from '@/components/sections/FeaturedCreatorsSection'
import CategoriesSection from '@/components/sections/CategoriesSection'
import NewDropsSection from '@/components/sections/NewDropsSection'

export default async function HomePage() {
  const sections = await prisma.section.findMany({
    where: { pageSlug: 'home', isActive: true },
    orderBy: { order: 'asc' },
  })

  return (
    <div className="min-h-screen bg-[#0d0d12]">
      {sections.map((section) => {
        const content = JSON.parse(section.content)
        switch (section.type) {
          case 'HERO':
            return <HeroSection key={section.id} content={content} />
          case 'FEATURED_CREATORS':
            return <FeaturedCreatorsSection key={section.id} content={content} />
          case 'CATEGORIES':
            return <CategoriesSection key={section.id} content={content} />
          case 'NEW_DROPS':
            return <NewDropsSection key={section.id} content={content} />
          default:
            return null
        }
      })}
    </div>
  )
}
