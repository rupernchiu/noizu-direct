import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import sanitizeHtml from 'sanitize-html'

export const metadata: Metadata = {
  title: 'Terms of Service | noizu.direct',
  description: 'Read the noizu.direct terms of service for buyers and creators on the SEA creator marketplace.',
  alternates: { canonical: 'https://noizu.direct/terms' },
  robots: { index: true, follow: false },
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'figure', 'figcaption', 'h1', 'h2', 'h3', 'h4']),
  allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt', 'width', 'height', 'class'], '*': ['class'] },
}

export default async function TermsPage() {
  const page = await prisma.page.findUnique({ where: { slug: 'terms' } })

  const title = page?.title ?? 'Terms of Service'
  const rawContent = page?.content
  const safeContent = rawContent ? sanitizeHtml(rawContent, SANITIZE_OPTIONS) : null

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-3xl font-bold text-foreground">{title}</h1>
        <p className="mb-10 text-sm text-muted-foreground">Last updated: April 2026</p>

        {safeContent ? (
          <div className="rounded-xl bg-card border border-border p-8">
            <div
              className="prose prose-invert max-w-none text-foreground prose-headings:text-foreground prose-a:text-primary"
              dangerouslySetInnerHTML={{ __html: safeContent }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl bg-card border border-border p-8 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                By accessing or using noizu.direct, you agree to be bound by these Terms of Service
                and all applicable laws and regulations. If you do not agree with any of these terms,
                you are prohibited from using this platform.
              </p>
            </div>

            <div className="rounded-xl bg-card border border-border p-8 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">2. Use of the Platform</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                noizu.direct provides a marketplace for creators to sell digital and physical products
                directly to buyers. You agree to use this platform only for lawful purposes and in a
                manner that does not infringe the rights of others.
              </p>
            </div>

            <div className="rounded-xl bg-card border border-border p-8 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">3. Purchases and Payments</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                All transactions are processed in USD. A processing fee of 2.5% applies to each
                transaction. By completing a purchase, you authorize the payment of the listed amount
                plus applicable fees.
              </p>
            </div>

            <div className="rounded-xl bg-card border border-border p-8 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">4. Creator Responsibilities</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Creators are responsible for the accuracy of their listings, fulfillment of digital
                and physical orders, and compliance with applicable copyright and intellectual property
                laws. noizu.direct reserves the right to remove listings that violate these terms.
              </p>
            </div>

            <div className="rounded-xl bg-card border border-border p-8 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">5. Limitation of Liability</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                noizu.direct is provided on an &quot;as is&quot; basis. We make no warranties, expressed or
                implied, regarding the platform&apos;s availability, accuracy, or fitness for a particular
                purpose. In no event shall noizu.direct be liable for any indirect, incidental, or
                consequential damages.
              </p>
            </div>

            <div className="rounded-xl bg-card border border-border p-8 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">6. Contact</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                For any questions regarding these Terms of Service, please contact us through the
                platform&apos;s messaging system or email us at support@noizu.direct.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
