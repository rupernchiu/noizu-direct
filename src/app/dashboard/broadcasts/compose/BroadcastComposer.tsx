'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BroadcastCard, type BroadcastTemplate } from '@/components/ui/BroadcastCard'
import { Sparkles, Zap, Eye, Calendar, Heart, Trophy, Users, Upload, Image as ImageIcon, X, Info } from 'lucide-react'

// Must match /src/lib/broadcasts.ts limits.
const TITLE_MAX = 60
const BODY_MAX = 500
const CTA_TEXT_MAX = 30
const IMG_MAX_BYTES = 2 * 1024 * 1024

type Audience = 'ALL_FOLLOWERS' | 'SUBSCRIBERS_ONLY'

const TEMPLATE_CHOICES: { value: BroadcastTemplate; label: string; tagline: string; Icon: React.ElementType }[] = [
  { value: 'NEW_DROP',      label: 'New Drop',          tagline: 'Fresh listing or digital release',   Icon: Sparkles },
  { value: 'FLASH_SALE',    label: 'Flash Sale',        tagline: 'Time-limited discount',              Icon: Zap },
  { value: 'BEHIND_SCENES', label: 'Behind the Scenes', tagline: 'Process peek, work-in-progress',     Icon: Eye },
  { value: 'EVENT',         label: 'Event',             tagline: 'Stream, con, or pop-up',             Icon: Calendar },
  { value: 'THANK_YOU',     label: 'Thank You',         tagline: 'Appreciation for supporters',        Icon: Heart },
  { value: 'MILESTONE',     label: 'Milestone',         tagline: 'Follower count, goal, anniversary',  Icon: Trophy },
]

interface Props {
  creator: {
    username: string
    displayName: string | null
    avatar: string | null
  }
  audienceCounts: {
    allFollowers: number
    subscribersOnly: number
  }
}

const inputCls =
  'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors'

export function BroadcastComposer({ creator, audienceCounts }: Props) {
  const router = useRouter()

  const [template, setTemplate] = useState<BroadcastTemplate>('NEW_DROP')
  const [audience, setAudience] = useState<Audience>('ALL_FOLLOWERS')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [imageKey, setImageKey] = useState<string | null>(null)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const reach = audience === 'ALL_FOLLOWERS' ? audienceCounts.allFollowers : audienceCounts.subscribersOnly

  const ctaProblem = useMemo(() => {
    const hasText = ctaText.trim().length > 0
    const hasUrl = ctaUrl.trim().length > 0
    if (hasText !== hasUrl) return 'Set both CTA text and URL, or leave both empty.'
    if (hasUrl && !ctaUrl.trim().startsWith('https://')) return 'CTA URL must start with https://.'
    return null
  }, [ctaText, ctaUrl])

  const canSubmit =
    !submitting &&
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    !ctaProblem &&
    reach > 0

  async function handleUpload(file: File) {
    setUploadError(null)
    if (file.size > IMG_MAX_BYTES) {
      setUploadError('Image must be under 2MB.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Use JPG, PNG, or WebP.')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('category', 'broadcast_image')
      fd.append('subdir', 'broadcast-image')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = (await res.json()) as { url?: string; key?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      if (!data.key) throw new Error('Upload succeeded but no key returned')
      setImageKey(data.key)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit() {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/creator/broadcasts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          template,
          audience,
          imageKey,
          ctaText: ctaText.trim() || null,
          ctaUrl: ctaUrl.trim() || null,
        }),
      })
      const data = (await res.json()) as { id?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Could not send broadcast')
      router.push('/dashboard/broadcasts')
      router.refresh()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not send broadcast')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">New broadcast</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A one-way announcement to your audience. Replies route through tickets, not this card.
          </p>
        </div>

        <section className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">Template</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TEMPLATE_CHOICES.map(choice => {
              const Icon = choice.Icon
              const active = template === choice.value
              return (
                <button
                  key={choice.value}
                  type="button"
                  onClick={() => setTemplate(choice.value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    active
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-surface hover:border-primary/50'
                  }`}
                >
                  <Icon className="size-5 text-foreground" />
                  <p className="mt-1.5 text-sm font-semibold text-foreground">{choice.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{choice.tagline}</p>
                </button>
              )
            })}
          </div>
        </section>

        <section className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">Who sees this</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAudience('ALL_FOLLOWERS')}
              className={`rounded-xl border p-3 text-left ${
                audience === 'ALL_FOLLOWERS'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-surface hover:border-primary/50'
              }`}
            >
              <Users className="size-5 text-foreground" />
              <p className="mt-1.5 text-sm font-semibold text-foreground">All followers</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{audienceCounts.allFollowers} reached</p>
            </button>
            <button
              type="button"
              onClick={() => setAudience('SUBSCRIBERS_ONLY')}
              className={`rounded-xl border p-3 text-left ${
                audience === 'SUBSCRIBERS_ONLY'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-surface hover:border-primary/50'
              }`}
            >
              <Heart className="size-5 text-foreground" />
              <p className="mt-1.5 text-sm font-semibold text-foreground">Supporters only</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {audienceCounts.subscribersOnly} reached · donated $1+ in 90d
              </p>
            </button>
          </div>
          {reach === 0 && (
            <p className="rounded-lg bg-amber-500/10 p-2 text-xs text-amber-700">
              <Info className="mr-1 inline size-3" />
              No recipients in this audience yet.
            </p>
          )}
        </section>

        <section className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">
            Title
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {title.length}/{TITLE_MAX}
            </span>
          </label>
          <input
            className={inputCls}
            type="text"
            value={title}
            maxLength={TITLE_MAX}
            placeholder="Short headline"
            onChange={e => setTitle(e.target.value)}
          />
        </section>

        <section className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">
            Message
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {body.length}/{BODY_MAX}
            </span>
          </label>
          <textarea
            className={`${inputCls} min-h-[120px] resize-y`}
            value={body}
            maxLength={BODY_MAX}
            placeholder="Tell your fans what's new."
            onChange={e => setBody(e.target.value)}
          />
        </section>

        <section className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">Hero image (optional)</label>
          {imageKey ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <ImageIcon className="size-5 text-muted-foreground" />
              <span className="flex-1 truncate text-xs text-muted-foreground">{imageKey}</span>
              <button
                type="button"
                onClick={() => setImageKey(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                aria-label="Remove image"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-surface p-3 text-sm text-muted-foreground hover:border-primary/50">
              <Upload className="size-4" />
              {uploading ? 'Uploading…' : 'Choose image (JPG, PNG, WebP — max 2MB)'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleUpload(f)
                  e.currentTarget.value = ''
                }}
              />
            </label>
          )}
          {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
        </section>

        <section className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">Call-to-action (optional)</label>
          <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
            <input
              className={inputCls}
              type="text"
              value={ctaText}
              maxLength={CTA_TEXT_MAX}
              placeholder="Button text"
              onChange={e => setCtaText(e.target.value)}
            />
            <input
              className={inputCls}
              type="url"
              value={ctaUrl}
              placeholder="https://…"
              onChange={e => setCtaUrl(e.target.value)}
            />
          </div>
          {ctaProblem && <p className="text-xs text-red-600">{ctaProblem}</p>}
        </section>

        {submitError && (
          <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700">{submitError}</p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <Link
            href="/dashboard/broadcasts"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? 'Sending…' : `Send to ${reach} ${reach === 1 ? 'person' : 'people'}`}
          </button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
        <BroadcastCard
          data={{
            title: title || 'Your headline',
            body: body || 'Your message will appear here.',
            template,
            imageKey: imageKey,
            ctaText: ctaText || null,
            ctaUrl: ctaUrl || null,
            creatorName: creator.displayName ?? creator.username,
            creatorUsername: creator.username,
            creatorAvatarUrl: creator.avatar,
          }}
        />
      </aside>
    </div>
  )
}
