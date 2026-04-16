import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import sanitizeHtml from 'sanitize-html'

export const metadata: Metadata = {
  title: 'About NOIZU-DIRECT | SEA Creator Marketplace',
  description: 'NOIZU-DIRECT is a Southeast Asian creator marketplace founded by NOIZU, organizer of World Cosplay Summit Malaysia. Connecting SEA cosplayers, illustrators, and doujin artists with fans.',
  alternates: { canonical: 'https://noizu.direct/about' },
  openGraph: {
    title: 'About NOIZU-DIRECT | SEA Creator Marketplace',
    description: 'NOIZU-DIRECT connects Southeast Asian cosplayers, illustrators, and doujin artists with fans. Founded by NOIZU, organizer of World Cosplay Summit Malaysia.',
    url: 'https://noizu.direct/about',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630, alt: 'About NOIZU-DIRECT' }],
  },
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'figure', 'figcaption', 'iframe', 'h1', 'h2', 'h3', 'h4']),
  allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt', 'width', 'height', 'class'], '*': ['class'] },
}

export default async function AboutPage() {
  const page = await prisma.page.findUnique({ where: { slug: 'about' } })

  const title = page?.title ?? 'About NOIZU-DIRECT'
  const rawContent = page?.content
  const safeContent = rawContent ? sanitizeHtml(rawContent, SANITIZE_OPTIONS) : null

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-foreground">{title}</h1>

        {safeContent ? (
          <div className="rounded-xl bg-card border border-border p-8">
            <div
              className="prose prose-invert max-w-none text-foreground prose-headings:text-foreground prose-a:text-primary"
              dangerouslySetInnerHTML={{ __html: safeContent }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl bg-card border border-border p-8">
              <h2 className="mb-4 text-xl font-semibold text-foreground">Our Mission</h2>
              <p className="leading-relaxed text-muted-foreground">
                NOIZU-DIRECT was built to give Southeast Asian creators a direct line to their fans —
                no middlemen, no barriers, just creators doing what they love and fans supporting them
                directly.
              </p>
            </div>

            <div className="rounded-xl bg-card border border-border p-8">
              <h2 className="mb-4 text-xl font-semibold text-foreground">Supporting SEA Creators</h2>
              <p className="leading-relaxed text-muted-foreground">
                Southeast Asia is home to some of the world's most talented artists, illustrators,
                cosplayers, and makers. NOIZU-DIRECT is built for them — offering low fees,
                multi-currency support, and a community that celebrates SEA creative culture.
              </p>
            </div>

            <div className="rounded-xl bg-card border border-border p-8">
              <h2 className="mb-4 text-xl font-semibold text-foreground">What We Offer</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-secondary" />
                  Digital and physical product listings for artists and makers
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-secondary" />
                  Commission management for custom work
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-secondary" />
                  Direct messaging between creators and buyers
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-secondary" />
                  Multi-currency payouts powered by Airwallex
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
