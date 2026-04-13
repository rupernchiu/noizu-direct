import { prisma } from '@/lib/prisma'

export default async function AboutPage() {
  const page = await prisma.page.findUnique({ where: { slug: 'about' } })

  const title = page?.title ?? 'About NOIZU-DIRECT'
  const content = page?.content

  return (
    <div className="min-h-screen bg-[#0d0d12] py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-[#f0f0f5]">{title}</h1>

        {content ? (
          <div className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] p-8">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#8888aa]">{content}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] p-8">
              <h2 className="mb-4 text-xl font-semibold text-[#f0f0f5]">Our Mission</h2>
              <p className="leading-relaxed text-[#8888aa]">
                NOIZU-DIRECT was built to give Southeast Asian creators a direct line to their fans —
                no middlemen, no barriers, just creators doing what they love and fans supporting them
                directly.
              </p>
            </div>

            <div className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] p-8">
              <h2 className="mb-4 text-xl font-semibold text-[#f0f0f5]">Supporting SEA Creators</h2>
              <p className="leading-relaxed text-[#8888aa]">
                Southeast Asia is home to some of the world's most talented artists, illustrators,
                cosplayers, and makers. NOIZU-DIRECT is built for them — offering low fees,
                multi-currency support, and a community that celebrates SEA creative culture.
              </p>
            </div>

            <div className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] p-8">
              <h2 className="mb-4 text-xl font-semibold text-[#f0f0f5]">What We Offer</h2>
              <ul className="space-y-2 text-[#8888aa]">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-[#00d4aa]" />
                  Digital and physical product listings for artists and makers
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-[#00d4aa]" />
                  Commission management for custom work
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-[#00d4aa]" />
                  Direct messaging between creators and buyers
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-[#00d4aa]" />
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
