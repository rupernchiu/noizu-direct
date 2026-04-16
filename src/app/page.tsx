import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { JsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'NOIZU-DIRECT — SEA Creator Marketplace | Buy Direct',
  description: 'Shop directly from Southeast Asian cosplay, doujin, and anime art creators. Digital downloads, physical merch, and POD products with buyer protection.',
  alternates: { canonical: 'https://noizu.direct/' },
  openGraph: {
    title: 'NOIZU-DIRECT — SEA Creator Marketplace | Buy Direct',
    description: 'Shop directly from Southeast Asian cosplay, doujin, and anime art creators.',
    url: 'https://noizu.direct/',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630, alt: 'NOIZU-DIRECT — SEA Creator Marketplace' }],
  },
}
import HeroSection from '@/components/sections/HeroSection'
import FeaturedCreatorsSection from '@/components/sections/FeaturedCreatorsSection'
import CategoriesSection from '@/components/sections/CategoriesSection'
import NewDropsSection from '@/components/sections/NewDropsSection'
import HowItWorksSection from '@/components/sections/HowItWorksSection'
import { AdminPopup } from '@/components/ui/AdminPopup'

export default async function HomePage() {
  const [sections, popupAd, creatorCount, productCount, buyerCount] = await Promise.all([
    prisma.section.findMany({
      where: { pageSlug: 'home', isActive: true },
      orderBy: { order: 'asc' },
    }),
    prisma.popupAd.findFirst({
      where: {
        isActive: true,
        OR: [
          { startsAt: null },
          { startsAt: { lte: new Date() } },
        ],
        AND: [
          { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.creatorProfile.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'BUYER' } }),
  ])

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'NOIZU-DIRECT',
    alternateName: 'Noizu Direct',
    url: 'https://noizu.direct',
    description: 'Southeast Asian creator marketplace for cosplay, doujin, and anime art',
    inLanguage: 'en-MY',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: 'https://noizu.direct/search?q={search_term}' },
      'query-input': 'required name=search_term',
    },
  }

  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'NOIZU-DIRECT',
    url: 'https://noizu.direct',
    logo: { '@type': 'ImageObject', url: 'https://noizu.direct/logo.png', width: 200, height: 60 },
    description: 'Southeast Asian creator marketplace connecting cosplayers, illustrators, and doujin artists with fans.',
    foundingLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressCountry: 'MY', addressRegion: 'Selangor' } },
    areaServed: ['MY', 'SG', 'PH', 'ID', 'TH'],
    knowsAbout: ['cosplay', 'doujin', 'anime art', 'creator economy', 'Southeast Asia'],
    sameAs: ['https://twitter.com/noizudirect'],
    contactPoint: { '@type': 'ContactPoint', email: 'hello@noizu.direct', contactType: 'customer service' },
  }

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={[websiteSchema, orgSchema]} />
      {popupAd && (
        <AdminPopup popup={{
          id:          popupAd.id,
          title:       popupAd.title,
          description: popupAd.description,
          imageUrl:    popupAd.imageUrl,
          ctaText:     popupAd.ctaText,
          ctaLink:     popupAd.ctaLink,
        }} />
      )}
      {sections.map((section) => {
        const content = JSON.parse(section.content)
        switch (section.type) {
          case 'HERO':
            return <HeroSection key={section.id} content={content} stats={{ creators: creatorCount, products: productCount, buyers: buyerCount }} />
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
      <HowItWorksSection />
    </div>
  )
}
