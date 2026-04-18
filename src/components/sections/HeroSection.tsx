import Link from 'next/link'

interface HeroContent {
  headline: string
  subtext: string
  ctaPrimary: { text: string; link: string }
  ctaSecondary: { text: string; link: string }
  bgImage?: string
}

interface HeroSectionProps {
  content: HeroContent
  stats?: {
    creators: number
    products: number
    buyers: number
  }
}

function formatStat(n: number): string {
  if (n >= 1_000_000) return `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(n / 1_000_000)}M+`
  if (n >= 1_000) return `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(n / 1_000)}K+`
  return `${n}+`
}

export default function HeroSection({ content, stats }: HeroSectionProps) {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {content.bgImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={content.bgImage} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-background via-surface to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(124,58,237,0.15),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(0,212,170,0.08),transparent)]" />
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-secondary/5 blur-3xl pointer-events-none" />
        </>
      )}

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <h1
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
        >
          {content.headline}
        </h1>

        <p
          className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
        >
          {content.subtext}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={content.ctaPrimary.link}
            className="inline-flex items-center justify-center px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all hover:shadow-[0_0_30px_rgba(124,58,237,0.4)] text-base"
          >
            {content.ctaPrimary.text}
          </Link>
          <Link
            href={content.ctaSecondary.link}
            className="inline-flex items-center justify-center px-8 py-3.5 border border-white/70 hover:border-white bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all text-base"
          >
            {content.ctaSecondary.text}
          </Link>
        </div>

        {/* stat strip */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 text-center">
          {[
            { value: stats ? formatStat(stats.creators) : '500+', label: 'Creators' },
            { value: stats ? formatStat(stats.products) : '10K+', label: 'Products' },
            { value: stats ? formatStat(stats.buyers) : '50K+', label: 'Members' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-white/70 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
