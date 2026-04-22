'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NavItemData {
  id: string
  label: string
  url: string
  navType: string
  position: string
  order: number
  dropdownType: string
  dropdownContent: string
  openInNewTab: boolean
  isActive: boolean
}

// Updated types to match renderer
interface SimpleItem { label: string; url: string }
interface SimpleGroup { heading?: string; items: SimpleItem[] }
interface SimpleListContent { groups: SimpleGroup[] }

interface MegaMenuItem { label: string; url: string; icon?: string }
interface MegaMenuColumn { heading: string; items: MegaMenuItem[] }
interface MegaMenuFeatured { image?: string; headline: string; subtext: string; ctaText: string; ctaUrl: string }
interface MegaMenuContent { columns: MegaMenuColumn[]; featured?: MegaMenuFeatured; bottomBarText?: string; bottomBarUrl?: string }

interface FeatureCardStat { value: string; label: string }
interface FeatureCardContent {
  image?: string
  heading: string
  description: string
  stats?: FeatureCardStat[]
  ctaText: string
  ctaUrl: string
  items?: Array<{ label: string; url: string }>
}

export function NavItemEditor({
  item,
  onSave,
  onClose,
}: {
  item: NavItemData | null
  onSave: () => void
  onClose: () => void
}) {
  const isNew = !item

  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('#')
  const [navType, setNavType] = useState('SECONDARY')
  const [position, setPosition] = useState('LEFT')
  const [dropdownType, setDropdownType] = useState('NONE')
  const [openInNewTab, setOpenInNewTab] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Content state
  const [simpleGroups, setSimpleGroups] = useState<SimpleGroup[]>([{ items: [] }])
  const [megaColumns, setMegaColumns] = useState<MegaMenuColumn[]>([])
  const [megaFeatured, setMegaFeatured] = useState<MegaMenuFeatured>({ headline: '', subtext: '', ctaText: 'Shop Now', ctaUrl: '' })
  const [megaBottomText, setMegaBottomText] = useState('')
  const [megaBottomUrl, setMegaBottomUrl] = useState('')
  const [featureCard, setFeatureCard] = useState<FeatureCardContent>({ heading: '', description: '', ctaText: '', ctaUrl: '' })

  useEffect(() => {
    if (!item) return
    setLabel(item.label)
    setUrl(item.url)
    setNavType(item.navType)
    setPosition(item.position)
    setDropdownType(item.dropdownType)
    setOpenInNewTab(item.openInNewTab)
    setIsActive(item.isActive)
    try {
      const p = JSON.parse(item.dropdownContent) as Record<string, unknown>
      if (item.dropdownType === 'SIMPLE_LIST') {
        const c = p as { groups?: SimpleGroup[]; items?: SimpleItem[] }
        if (c.groups) setSimpleGroups(c.groups)
        else if (c.items) setSimpleGroups([{ items: c.items }]) // legacy flat
      }
      if (item.dropdownType === 'MEGA_MENU') {
        const c = p as unknown as MegaMenuContent
        if (c.columns) setMegaColumns(c.columns)
        if (c.featured) setMegaFeatured(c.featured)
        if (c.bottomBarText) setMegaBottomText(c.bottomBarText)
        if (c.bottomBarUrl) setMegaBottomUrl(c.bottomBarUrl)
      }
      if (item.dropdownType === 'FEATURE_CARD') setFeatureCard(p as unknown as FeatureCardContent)
    } catch { /* ignore */ }
  }, [item])

  function buildDropdownContent(): unknown {
    if (dropdownType === 'SIMPLE_LIST') return { groups: simpleGroups } satisfies SimpleListContent
    if (dropdownType === 'MEGA_MENU') return {
      columns: megaColumns,
      featured: megaFeatured,
      bottomBarText: megaBottomText,
      bottomBarUrl: megaBottomUrl,
    } satisfies MegaMenuContent
    if (dropdownType === 'FEATURE_CARD') return featureCard
    return {}
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      const body = { label, url, navType, position, dropdownType, openInNewTab, isActive, dropdownContent: buildDropdownContent() }
      const res = await fetch(
        isNew ? '/api/admin/nav' : `/api/admin/nav/${item!.id}`,
        { method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      )
      if (!res.ok) throw new Error('Save failed')
      onSave()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-card border-l border-border shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-bold">{isNew ? 'New Nav Item' : 'Edit Nav Item'}</h2>
        <button suppressHydrationWarning type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
          <X className="size-5" />
        </button>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Basic fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Label</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} aria-invalid={!!error || undefined} aria-describedby={error ? 'nav-item-error' : undefined} placeholder="e.g. All Categories" className="mt-1" />
          </div>
          <div>
            <Label>URL</Label>
            <Input value={url} onChange={e => setUrl(e.target.value)} aria-invalid={!!error || undefined} aria-describedby={error ? 'nav-item-error' : undefined} placeholder="/marketplace" className="mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Nav Type</Label>
            <select value={navType} onChange={e => setNavType(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground">
              <option value="SECONDARY">Secondary</option>
              <option value="PRIMARY">Primary</option>
            </select>
          </div>
          <div>
            <Label>Position</Label>
            <select value={position} onChange={e => setPosition(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground">
              <option value="LEFT">Left</option>
              <option value="CENTER">Center</option>
              <option value="RIGHT">Right</option>
            </select>
          </div>
          <div>
            <Label>Dropdown</Label>
            <select value={dropdownType} onChange={e => setDropdownType(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground">
              <option value="NONE">None</option>
              <option value="SIMPLE_LIST">Simple List</option>
              <option value="MEGA_MENU">Mega Menu</option>
              <option value="FEATURE_CARD">Feature Card</option>
            </select>
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={openInNewTab} onChange={e => setOpenInNewTab(e.target.checked)} className="accent-primary" />
            Open in new tab
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="accent-primary" />
            Active
          </label>
        </div>

        {/* Content builders */}
        {dropdownType === 'SIMPLE_LIST' && (
          <SimpleListBuilder groups={simpleGroups} onChange={setSimpleGroups} />
        )}
        {dropdownType === 'MEGA_MENU' && (
          <MegaMenuBuilder
            columns={megaColumns} onColumnsChange={setMegaColumns}
            featured={megaFeatured} onFeaturedChange={setMegaFeatured}
            bottomText={megaBottomText} onBottomTextChange={setMegaBottomText}
            bottomUrl={megaBottomUrl} onBottomUrlChange={setMegaBottomUrl}
          />
        )}
        {dropdownType === 'FEATURE_CARD' && (
          <FeatureCardBuilder value={featureCard} onChange={setFeatureCard} />
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between">
        {error && <p id="nav-item-error" role="alert" className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2 ml-auto">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Simple List Builder (groups) ───────────────────────────────────────────────

function SimpleListBuilder({ groups, onChange }: { groups: SimpleGroup[]; onChange: (v: SimpleGroup[]) => void }) {
  function addGroup() { onChange([...groups, { heading: '', items: [] }]) }
  function removeGroup(gi: number) { onChange(groups.filter((_, i) => i !== gi)) }
  function updateHeading(gi: number, val: string) {
    onChange(groups.map((g, i) => i === gi ? { ...g, heading: val } : g))
  }
  function addItem(gi: number) {
    onChange(groups.map((g, i) => i === gi ? { ...g, items: [...g.items, { label: '', url: '' }] } : g))
  }
  function removeItem(gi: number, ii: number) {
    onChange(groups.map((g, i) => i === gi ? { ...g, items: g.items.filter((_, j) => j !== ii) } : g))
  }
  function updateItem(gi: number, ii: number, key: 'label' | 'url', val: string) {
    onChange(groups.map((g, i) => i === gi ? { ...g, items: g.items.map((it, j) => j === ii ? { ...it, [key]: val } : it) } : g))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Groups &amp; Items</Label>
        <button suppressHydrationWarning type="button" onClick={addGroup} className="flex items-center gap-1 text-xs text-primary hover:underline">
          <Plus className="size-3" /> Add Group
        </button>
      </div>
      {groups.map((group, gi) => (
        <div key={gi} className="p-3 rounded-lg border border-border bg-surface space-y-2">
          <div className="flex gap-2 items-center">
            <Input value={group.heading ?? ''} onChange={e => updateHeading(gi, e.target.value)} placeholder="Group heading (e.g. DISCOVER)" className="flex-1 uppercase text-xs font-semibold" />
            {groups.length > 1 && (
              <button suppressHydrationWarning type="button" onClick={() => removeGroup(gi)} className="p-1 text-muted-foreground hover:text-red-400">
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
          {group.items.map((item, ii) => (
            <div key={ii} className="flex gap-2 items-center pl-2">
              <Input value={item.label} onChange={e => updateItem(gi, ii, 'label', e.target.value)} placeholder="Label" className="flex-1" />
              <Input value={item.url} onChange={e => updateItem(gi, ii, 'url', e.target.value)} placeholder="URL" className="w-32" />
              <button suppressHydrationWarning type="button" onClick={() => removeItem(gi, ii)} className="p-1 text-muted-foreground hover:text-red-400">
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          <button suppressHydrationWarning type="button" onClick={() => addItem(gi)} className="flex items-center gap-1 text-xs text-primary hover:underline pl-2">
            <Plus className="size-3" /> Add item
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Mega Menu Builder ──────────────────────────────────────────────────────────

function MegaMenuBuilder({
  columns, onColumnsChange,
  featured, onFeaturedChange,
  bottomText, onBottomTextChange,
  bottomUrl, onBottomUrlChange,
}: {
  columns: MegaMenuColumn[]
  onColumnsChange: (v: MegaMenuColumn[]) => void
  featured: MegaMenuFeatured
  onFeaturedChange: (v: MegaMenuFeatured) => void
  bottomText: string
  onBottomTextChange: (v: string) => void
  bottomUrl: string
  onBottomUrlChange: (v: string) => void
}) {
  function addColumn() { onColumnsChange([...columns, { heading: '', items: [] }]) }
  function removeColumn(ci: number) { onColumnsChange(columns.filter((_, i) => i !== ci)) }
  function updateHeading(ci: number, val: string) {
    onColumnsChange(columns.map((col, i) => i === ci ? { ...col, heading: val } : col))
  }
  function addItem(ci: number) {
    onColumnsChange(columns.map((col, i) => i === ci ? { ...col, items: [...col.items, { label: '', url: '' }] } : col))
  }
  function removeItem(ci: number, ii: number) {
    onColumnsChange(columns.map((col, i) => i === ci ? { ...col, items: col.items.filter((_, j) => j !== ii) } : col))
  }
  function updateItem(ci: number, ii: number, key: 'label' | 'url' | 'icon', val: string) {
    onColumnsChange(columns.map((col, i) => i === ci ? { ...col, items: col.items.map((it, j) => j === ii ? { ...it, [key]: val } : it) } : col))
  }

  return (
    <div className="space-y-4">
      {/* Columns */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Columns</Label>
          <button suppressHydrationWarning type="button" onClick={addColumn} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Plus className="size-3" /> Add Column
          </button>
        </div>
        {columns.map((col, ci) => (
          <div key={ci} className="p-3 rounded-lg border border-border bg-surface space-y-2">
            <div className="flex gap-2 items-center">
              <Input value={col.heading} onChange={e => updateHeading(ci, e.target.value)} placeholder="Column heading (e.g. 🎨 Digital)" className="flex-1" />
              <button suppressHydrationWarning type="button" onClick={() => removeColumn(ci)} className="p-1 text-muted-foreground hover:text-red-400">
                <Trash2 className="size-4" />
              </button>
            </div>
            {col.items.map((item, ii) => (
              <div key={ii} className="flex gap-2 items-center pl-2">
                <Input value={item.icon ?? ''} onChange={e => updateItem(ci, ii, 'icon', e.target.value)} placeholder="Icon" className="w-12" />
                <Input value={item.label} onChange={e => updateItem(ci, ii, 'label', e.target.value)} placeholder="Label" className="flex-1" />
                <Input value={item.url} onChange={e => updateItem(ci, ii, 'url', e.target.value)} placeholder="URL" className="w-28" />
                <button suppressHydrationWarning type="button" onClick={() => removeItem(ci, ii)} className="p-1 text-muted-foreground hover:text-red-400">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            <button suppressHydrationWarning type="button" onClick={() => addItem(ci)} className="flex items-center gap-1 text-xs text-primary hover:underline pl-2">
              <Plus className="size-3" /> Add item
            </button>
          </div>
        ))}
      </div>

      {/* Featured banner */}
      <div className="p-3 rounded-lg border border-border bg-surface space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Featured Banner (right side)</Label>
        <Input value={featured.image ?? ''} onChange={e => onFeaturedChange({ ...featured, image: e.target.value })} placeholder="Image URL (optional)" />
        <Input value={featured.headline} onChange={e => onFeaturedChange({ ...featured, headline: e.target.value })} placeholder="Headline" />
        <Input value={featured.subtext} onChange={e => onFeaturedChange({ ...featured, subtext: e.target.value })} placeholder="Subtext" />
        <div className="grid grid-cols-2 gap-2">
          <Input value={featured.ctaText} onChange={e => onFeaturedChange({ ...featured, ctaText: e.target.value })} placeholder="CTA text" />
          <Input value={featured.ctaUrl} onChange={e => onFeaturedChange({ ...featured, ctaUrl: e.target.value })} placeholder="CTA URL" />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="grid grid-cols-2 gap-2">
        <Input value={bottomText} onChange={e => onBottomTextChange(e.target.value)} placeholder="Bottom bar text (e.g. View all →)" />
        <Input value={bottomUrl} onChange={e => onBottomUrlChange(e.target.value)} placeholder="Bottom bar URL" />
      </div>
    </div>
  )
}

// ── Feature Card Builder ───────────────────────────────────────────────────────

function FeatureCardBuilder({ value, onChange }: { value: FeatureCardContent; onChange: (v: FeatureCardContent) => void }) {
  const stats = value.stats ?? []

  function addStat() { onChange({ ...value, stats: [...stats, { value: '', label: '' }] }) }
  function removeStat(i: number) { onChange({ ...value, stats: stats.filter((_, idx) => idx !== i) }) }
  function updateStat(i: number, key: 'value' | 'label', val: string) {
    onChange({ ...value, stats: stats.map((s, idx) => idx === i ? { ...s, [key]: val } : s) })
  }
  function addItem() { onChange({ ...value, items: [...(value.items ?? []), { label: '', url: '' }] }) }
  function removeItem(i: number) { onChange({ ...value, items: (value.items ?? []).filter((_, idx) => idx !== i) }) }
  function updateItem(i: number, key: 'label' | 'url', val: string) {
    onChange({ ...value, items: (value.items ?? []).map((it, idx) => idx === i ? { ...it, [key]: val } : it) })
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Feature Card</Label>
      <Input value={value.image ?? ''} onChange={e => onChange({ ...value, image: e.target.value })} placeholder="Image URL (optional)" />
      <Input value={value.heading} onChange={e => onChange({ ...value, heading: e.target.value })} placeholder="Heading" />
      <Input value={value.description} onChange={e => onChange({ ...value, description: e.target.value })} placeholder="Description" />
      <div className="grid grid-cols-2 gap-2">
        <Input value={value.ctaText} onChange={e => onChange({ ...value, ctaText: e.target.value })} placeholder="CTA button text" />
        <Input value={value.ctaUrl} onChange={e => onChange({ ...value, ctaUrl: e.target.value })} placeholder="CTA URL" />
      </div>

      {/* Stats */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Stats (value / label)</Label>
          <button suppressHydrationWarning type="button" onClick={addStat} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Plus className="size-3" /> Add stat
          </button>
        </div>
        {stats.map((stat, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input value={stat.value} onChange={e => updateStat(i, 'value', e.target.value)} placeholder="500+" className="w-20" />
            <Input value={stat.label} onChange={e => updateStat(i, 'label', e.target.value)} placeholder="Creators" className="flex-1" />
            <button suppressHydrationWarning type="button" onClick={() => removeStat(i)} className="p-1 text-muted-foreground hover:text-red-400">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Links */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Quick links</Label>
          <button suppressHydrationWarning type="button" onClick={addItem} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Plus className="size-3" /> Add link
          </button>
        </div>
        {(value.items ?? []).map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input value={item.label} onChange={e => updateItem(i, 'label', e.target.value)} placeholder="Label" className="flex-1" />
            <Input value={item.url} onChange={e => updateItem(i, 'url', e.target.value)} placeholder="URL" className="w-32" />
            <button suppressHydrationWarning type="button" onClick={() => removeItem(i)} className="p-1 text-muted-foreground hover:text-red-400">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
