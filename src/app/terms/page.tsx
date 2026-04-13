import { prisma } from '@/lib/prisma'

export default async function TermsPage() {
  const page = await prisma.page.findUnique({ where: { slug: 'terms' } })

  const title = page?.title ?? 'Terms of Service'
  const content = page?.content

  return (
    <div className="min-h-screen bg-[#0d0d12] py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-3xl font-bold text-[#f0f0f5]">{title}</h1>
        <p className="mb-10 text-sm text-[#8888aa]">Last updated: April 2026</p>

        {content ? (
          <div className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] p-8">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#8888aa]">{content}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] p-8 space-y-4">
              <h2 className="text-lg font-semibold text-[#f0f0f5]">1. Acceptance of Terms</h2>
              <p className="text-sm leading-relaxed text-[#8888aa]">
                By accessing or using NOIZU-DIRECT, you agree to be bound by these Terms of Service
                and all applicable laws and regulations. If you do not agree with any of these terms,
                you are prohibited from using this platform.
              </p>
            </div>

            <div className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] p-8 space-y-4">
              <h2 className="text-lg font-semibold text-[#f0f0f5]">2. Use of the Platform</h2>
              <p className="text-sm leading-relaxed text-[#8888aa]">
                NOIZU-DIRECT provides a marketplace for creators to sell digital and physical products
                directly to buyers. You agree to use this platform only for lawful purposes and in a
                manner that does not infringe the rights of others.
              </p>
            </div>

            <div className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] p-8 space-y-4">
              <h2 className="text-lg font-semibold text-[#f0f0f5]">3. Purchases and Payments</h2>
              <p className="text-sm leading-relaxed text-[#8888aa]">
                All transactions are processed in USD. A processing fee of 2.5% applies to each
                transaction. By completing a purchase, you authorize the payment of the listed amount
                plus applicable fees.
              </p>
            </div>

            <div className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] p-8 space-y-4">
              <h2 className="text-lg font-semibold text-[#f0f0f5]">4. Creator Responsibilities</h2>
              <p className="text-sm leading-relaxed text-[#8888aa]">
                Creators are responsible for the accuracy of their listings, fulfillment of digital
                and physical orders, and compliance with applicable copyright and intellectual property
                laws. NOIZU-DIRECT reserves the right to remove listings that violate these terms.
              </p>
            </div>

            <div className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] p-8 space-y-4">
              <h2 className="text-lg font-semibold text-[#f0f0f5]">5. Limitation of Liability</h2>
              <p className="text-sm leading-relaxed text-[#8888aa]">
                NOIZU-DIRECT is provided on an &quot;as is&quot; basis. We make no warranties, expressed or
                implied, regarding the platform&apos;s availability, accuracy, or fitness for a particular
                purpose. In no event shall NOIZU-DIRECT be liable for any indirect, incidental, or
                consequential damages.
              </p>
            </div>

            <div className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] p-8 space-y-4">
              <h2 className="text-lg font-semibold text-[#f0f0f5]">6. Contact</h2>
              <p className="text-sm leading-relaxed text-[#8888aa]">
                For any questions regarding these Terms of Service, please contact us through the
                platform&apos;s messaging system or email us at support@noizu-direct.com.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
