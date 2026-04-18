import Link from 'next/link'

export default function FinalCreatorCTASection() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-secondary/5" />

      <div className="relative z-10 text-center max-w-2xl mx-auto px-4">
        <h2 className="text-4xl sm:text-5xl font-extrabold text-foreground mb-6">
          Ready when you are. Even if you&rsquo;re not sure yet.
        </h2>
        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
          Your store takes 10 minutes to set up. No monthly fees. No listing fees. 0% platform fee during our launch — you keep everything you earn. If it doesn&rsquo;t work out, there&rsquo;s nothing to cancel.
        </p>

        <Link
          href="/register/creator"
          className="inline-block px-10 py-4 text-lg font-bold text-white bg-primary hover:bg-primary/90 rounded-2xl transition-colors"
        >
          Create Your Free Store
        </Link>

        <Link
          href="/how-it-works"
          className="text-muted-foreground hover:text-foreground text-sm mt-4 block transition-colors"
        >
          See how it works &rarr;
        </Link>
      </div>
    </section>
  )
}
