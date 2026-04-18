const conventions = [
  { name: 'Comic Fiesta', note: "KL's biggest anime convention" },
  { name: 'Animangaki', note: null },
  { name: 'WCS Malaysia', note: 'World Cosplay Summit' },
  { name: 'STGCC Singapore', note: null },
  { name: 'AniFest Philippines', note: null },
]

const stats = [
  { value: '5 countries', label: 'Malaysia · Singapore · Philippines · Indonesia · Thailand' },
  { value: 'Fan art friendly', label: 'No IP gatekeeping' },
  { value: '0% fee', label: 'During our launch period' },
]

export default function CommunityProofSection() {
  return (
    <section className="bg-surface border-y border-border py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            From the community, for the community
          </p>
          <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl mb-4">
            If you&rsquo;ve been to Comic Fiesta or Animangaki, you already know this world.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            NOIZU-DIRECT was built by and for the SEA cosplay and doujin community. We know the table fees, the late-night printing runs, the three-hour commission queues. This platform exists because we lived it.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-14">
          {conventions.map((c) => (
            <span
              key={c.name}
              className="border border-border rounded-full px-4 py-2 text-sm font-medium text-foreground bg-card hover:border-primary/50 transition-colors cursor-default"
              title={c.note ?? undefined}
            >
              {c.name}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {stats.map((stat) => (
            <div key={stat.value}>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
