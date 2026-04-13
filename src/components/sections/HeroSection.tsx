import Link from 'next/link'

interface HeroContent {
  headline: string
  subtext: string
  ctaPrimary: { text: string; link: string }
  ctaSecondary: { text: string; link: string }
}

export default function HeroSection({ content }: { content: HeroContent }) {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* decorative bg */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d12] via-[#16161f] to-[#0d0d12]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(124,58,237,0.15),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(0,212,170,0.08),transparent)]" />

      {/* floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[#7c3aed]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-[#00d4aa]/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#7c3aed]/30 bg-[#7c3aed]/10 text-[#a78bfa] text-sm font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] animate-pulse" />
          Southeast Asia&apos;s Creator Marketplace
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-[#f0f0f5] leading-tight mb-6">
          {content.headline}
        </h1>

        <p className="text-lg sm:text-xl text-[#8888aa] max-w-2xl mx-auto mb-10 leading-relaxed">
          {content.subtext}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={content.ctaPrimary.link}
            className="inline-flex items-center justify-center px-8 py-3.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold rounded-xl transition-all hover:shadow-[0_0_30px_rgba(124,58,237,0.4)] text-base"
          >
            {content.ctaPrimary.text}
          </Link>
          <Link
            href={content.ctaSecondary.link}
            className="inline-flex items-center justify-center px-8 py-3.5 border border-[#2a2a3a] hover:border-[#7c3aed]/50 text-[#f0f0f5] hover:text-[#a78bfa] font-semibold rounded-xl transition-all text-base"
          >
            {content.ctaSecondary.text}
          </Link>
        </div>

        {/* stat strip */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 text-center">
          {[
            { value: '500+', label: 'Creators' },
            { value: '10K+', label: 'Products' },
            { value: '50K+', label: 'Buyers' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-[#f0f0f5]">{stat.value}</div>
              <div className="text-sm text-[#8888aa] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
