'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputCls =
  'w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

const btnPrimary =
  'px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

const DEFAULT_SECTIONS = [
  { name: 'Shop', visible: true },
  { name: 'Portfolio', visible: true },
  { name: 'Videos', visible: true },
  { name: 'Commission', visible: true },
  { name: 'Support', visible: true },
]

interface SectionEntry {
  name: string
  visible: boolean
}

function parseFeaturedIds(raw: string | null): string[] {
  try { return JSON.parse(raw ?? '[]') as string[] } catch { return [] }
}

function parseSectionOrder(raw: string | null): SectionEntry[] {
  try {
    const parsed = JSON.parse(raw ?? '[]') as SectionEntry[]
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_SECTIONS
    return parsed
  } catch { return DEFAULT_SECTIONS }
}

function ErrorAlert({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
      {msg}
    </div>
  )
}

function SuccessAlert({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg bg-secondary/10 border border-secondary/30 px-4 py-3 text-sm text-secondary">
      {msg}
    </div>
  )
}

interface Product {
  id: string
  title: string
  type: string
}

interface Props {
  profile: {
    themeColor?: string | null
    featuredProductIds?: string | null
    sectionOrder?: string | null
  }
  products: Product[]
}

export function AppearanceSection({ profile, products }: Props) {
  const router = useRouter()
  const [themeColor, setThemeColor] = useState(profile.themeColor ?? '#7c3aed')
  const [featuredIds, setFeaturedIds] = useState<string[]>(parseFeaturedIds(profile.featuredProductIds ?? null))
  const [sections, setSections] = useState<SectionEntry[]>(parseSectionOrder(profile.sectionOrder ?? null))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function toggleFeatured(id: string) {
    setFeaturedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3) return prev // max 3
      return [...prev, id]
    })
  }

  function toggleSectionVisible(name: string) {
    setSections((prev) => prev.map((s) => s.name === name ? { ...s, visible: !s.visible } : s))
  }

  function moveSectionItem(index: number, direction: 'up' | 'down') {
    setSections((prev) => {
      const next = [...prev]
      const swap = direction === 'up' ? index - 1 : index + 1
      if (swap < 0 || swap >= next.length) return prev
      ;[next[index], next[swap]] = [next[swap], next[index]]
      return next
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeColor,
          featuredProductIds: featuredIds,
          sectionOrder: sections,
        }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setError(body.error ?? 'Failed to save')
        return
      }
      setSuccess(true)
      router.refresh()
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Appearance</h2>
        <p className="text-sm text-muted-foreground mt-1">Customize how your store looks to visitors.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {error && <ErrorAlert msg={error} />}
        {success && <SuccessAlert msg="Appearance saved successfully." />}

        {/* Theme Color */}
        <div className="rounded-xl bg-surface border border-border p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Store Theme Color</h3>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="w-12 h-10 rounded-lg border border-border bg-card cursor-pointer"
            />
            <div
              className="w-10 h-10 rounded-lg border border-border shrink-0"
              style={{ backgroundColor: themeColor }}
            />
            <input
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              maxLength={7}
              placeholder="#7c3aed"
              className="w-32 rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">Used as accent color on your store page.</p>
          </div>
        </div>

        {/* Featured Products */}
        <div className="rounded-xl bg-surface border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Featured Products</h3>
            <span className="text-xs text-muted-foreground">{featuredIds.length}/3 selected</span>
          </div>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products yet. Add products first.</p>
          ) : (
            <div className="space-y-2">
              {products.map((p) => {
                const checked = featuredIds.includes(p.id)
                const disabled = !checked && featuredIds.length >= 3
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-primary/10 border-primary/40'
                        : disabled
                        ? 'bg-card border-border opacity-50 cursor-not-allowed'
                        : 'bg-card border-border hover:border-border/80'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleFeatured(p.id)}
                      className="rounded border-border bg-card text-primary focus:ring-ring"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.type}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Select up to 3 products to feature on your store page.</p>
        </div>

        {/* Section Order */}
        <div className="rounded-xl bg-surface border border-border p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Store Sections</h3>
          <p className="text-xs text-muted-foreground">Drag to reorder — use arrows to change order, toggle to show/hide.</p>
          <div className="space-y-2">
            {sections.map((section, idx) => (
              <div
                key={section.name}
                className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
              >
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveSectionItem(idx, 'up')}
                    disabled={idx === 0}
                    className="w-5 h-5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 text-[10px] flex items-center justify-center bg-card border border-border transition-colors"
                  >▲</button>
                  <button
                    type="button"
                    onClick={() => moveSectionItem(idx, 'down')}
                    disabled={idx === sections.length - 1}
                    className="w-5 h-5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 text-[10px] flex items-center justify-center bg-card border border-border transition-colors"
                  >▼</button>
                </div>
                <span className="flex-1 text-sm font-medium text-foreground">{section.name}</span>
                <button
                  type="button"
                  onClick={() => toggleSectionVisible(section.name)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    section.visible
                      ? 'bg-secondary/15 border-secondary/30 text-secondary'
                      : 'bg-card border-border text-muted-foreground'
                  }`}
                >
                  {section.visible ? 'Visible' : 'Hidden'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Saving...' : 'Save Appearance'}
          </button>
        </div>
      </form>
    </div>
  )
}
