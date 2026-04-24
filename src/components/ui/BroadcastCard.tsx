import Link from 'next/link'
import { getR2Url } from '@/lib/r2'
import { Sparkles, Zap, Eye, Calendar, Heart, Trophy } from 'lucide-react'

// ── Shared broadcast render ──────────────────────────────────────────────────
// Six locked visual templates. Same data slots in all — the template enum just
// maps to a styled wrapper so creators can't ship off-brand HTML/fonts/colors.

export type BroadcastTemplate =
  | 'NEW_DROP'
  | 'FLASH_SALE'
  | 'BEHIND_SCENES'
  | 'EVENT'
  | 'THANK_YOU'
  | 'MILESTONE'

export interface BroadcastCardData {
  id?: string
  title: string
  body: string
  imageKey?: string | null
  ctaText?: string | null
  ctaUrl?: string | null
  template: BroadcastTemplate
  createdAt?: Date | string | null
  creatorName?: string | null
  creatorAvatarUrl?: string | null
  creatorUsername?: string | null
}

const TEMPLATE_META: Record<BroadcastTemplate, { label: string; Icon: React.ElementType; accent: string }> = {
  NEW_DROP:      { label: 'New Drop',          Icon: Sparkles, accent: 'from-violet-500/15 to-fuchsia-500/10 text-violet-500' },
  FLASH_SALE:    { label: 'Flash Sale',        Icon: Zap,      accent: 'from-amber-500/20 to-orange-500/10 text-amber-600' },
  BEHIND_SCENES: { label: 'Behind the Scenes', Icon: Eye,      accent: 'from-sky-500/15 to-cyan-500/10 text-sky-600' },
  EVENT:         { label: 'Event',             Icon: Calendar, accent: 'from-emerald-500/15 to-teal-500/10 text-emerald-600' },
  THANK_YOU:     { label: 'Thank You',         Icon: Heart,    accent: 'from-rose-500/20 to-pink-500/10 text-rose-600' },
  MILESTONE:     { label: 'Milestone',         Icon: Trophy,   accent: 'from-yellow-500/20 to-orange-400/10 text-yellow-600' },
}

function isHttpsUrl(s: string | null | undefined): s is string {
  return typeof s === 'string' && s.startsWith('https://')
}

export function BroadcastCard({ data }: { data: BroadcastCardData }) {
  const meta = TEMPLATE_META[data.template]
  const Icon = meta.Icon
  const hasCta = Boolean(data.ctaText && isHttpsUrl(data.ctaUrl))

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      {data.imageKey && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-background">
          <img src={getR2Url(data.imageKey)} alt="" className="size-full object-cover" />
        </div>
      )}

      <div className={`border-b border-border bg-gradient-to-r ${meta.accent} px-4 py-2`}>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
          <Icon className="size-3.5" />
          {meta.label}
        </div>
      </div>

      <div className="space-y-3 p-4">
        {(data.creatorName || data.creatorUsername) && (
          <div className="flex items-center gap-2">
            {data.creatorAvatarUrl ? (
              <img src={data.creatorAvatarUrl} alt="" className="size-6 rounded-full" />
            ) : (
              <div className="size-6 rounded-full bg-background" />
            )}
            <span className="text-xs font-medium text-foreground">
              {data.creatorName ?? data.creatorUsername}
            </span>
            {data.creatorUsername && data.creatorName && (
              <span className="text-xs text-muted-foreground">@{data.creatorUsername}</span>
            )}
          </div>
        )}

        <h2 className="text-base font-bold leading-snug text-foreground">{data.title}</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{data.body}</p>

        {hasCta && (
          <Link
            href={data.ctaUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {data.ctaText}
          </Link>
        )}
      </div>
    </article>
  )
}
