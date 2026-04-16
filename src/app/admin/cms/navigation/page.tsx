import { NavBuilder } from './NavBuilder'

interface Props { searchParams: Promise<{ tab?: string }> }

export default async function NavigationAdminPage({ searchParams }: Props) {
  const { tab = 'secondary' } = await searchParams

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Navigation Manager</h1>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6">
        {(['secondary', 'primary'] as const).map(t => (
          <a
            key={t}
            href={`/admin/cms/navigation?tab=${t}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t} Nav
          </a>
        ))}
      </div>

      <NavBuilder navType={tab === 'primary' ? 'PRIMARY' : 'SECONDARY'} />
    </div>
  )
}
