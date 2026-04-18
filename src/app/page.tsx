import React from 'react'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { JsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'noizu.direct — SEA Creator Marketplace for Cosplay, Doujin & Fan Art',
  description: 'Buy original art, doujin prints, cosplay merch and commissions from verified Southeast Asian creators. Escrow-protected payments. Fan art friendly.',
  alternates: { canonical: 'https://noizu.direct/' },
  openGraph: {
    type: 'website',
    locale: 'en_MY',
    siteName: 'noizu.direct',
    url: 'https://noizu.direct',
    title: 'noizu.direct — Buy Cosplay, Doujin & Fan Art from SEA Creators',
    description: 'Buy from verified SEA creators. Escrow-protected payments. Fan art friendly.',
    images: [{
      url: 'https://pub-7c92c7b3ba5f4f38a598ddc8e89ba361.r2.dev/logos/logo-light.webp',
      width: 1200,
      height: 630,
      alt: 'noizu.direct — Southeast Asian Creator Marketplace',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'noizu.direct — SEA Creator Marketplace',
    description: 'Buy from verified SEA creators. Escrow-protected. Fan art friendly.',
    images: ['https://pub-7c92c7b3ba5f4f38a598ddc8e89ba361.r2.dev/logos/logo-light.webp'],
  },
}
import HeroSection from '@/components/sections/HeroSection'
import { TrustBar } from '@/components/sections/TrustBar'
import FeaturedCreatorsSection from '@/components/sections/FeaturedCreatorsSection'
import CategoriesSection from '@/components/sections/CategoriesSection'
import NewDropsSection from '@/components/sections/NewDropsSection'
import HowItWorksSection from '@/components/sections/HowItWorksSection'
import TrendingSection from '@/components/sections/TrendingSection'
import { AdminPopup } from '@/components/ui/AdminPopup'
import CreatorPainPointsSection from '@/components/sections/CreatorPainPointsSection'
import CreatorSpotlightSection from '@/components/sections/CreatorSpotlightSection'
import CommissionSpotlightSection from '@/components/sections/CommissionSpotlightSection'
import CommunityProofSection from '@/components/sections/CommunityProofSection'
import FinalCreatorCTASection from '@/components/sections/FinalCreatorCTASection'

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
    name: 'noizu.direct',
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
    name: 'noizu.direct',
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
            return (
              <React.Fragment key={section.id}>
                <HeroSection content={content} stats={{ creators: creatorCount, products: productCount, buyers: buyerCount }} />
                <TrustBar />
                <CreatorPainPointsSection />
                <HowItWorksSection />
                <CreatorSpotlightSection />
                <CommissionSpotlightSection />
              </React.Fragment>
            )
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
      <TrendingSection />
      <CommunityProofSection />
      <FinalCreatorCTASection />
    </div>
  )
}
