'use client'

import { useState } from 'react'
import { AdminPopup, type AdminPopupData } from '@/components/ui/AdminPopup'

interface PopupManagerProps {
  initialPopup: (AdminPopupData & {
    isActive: boolean
    startsAt: string | null
    endsAt: string | null
    updatedAt: string
  }) | null
}

const inputCls = 'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors'

export function PopupManager({ initialPopup }: PopupManagerProps) {
  const [popup, setPopup]       = useState(initialPopup)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [preview, setPreview]   = useState(false)

  const [form, setForm] = useState({
    title:       initialPopup?.title       ?? '',
    description: initialPopup?.description ?? '',
    imageUrl:    initialPopup?.imageUrl    ?? '',
    ctaText:     initialPopup?.ctaText     ?? '',
    ctaLink:     initialPopup?.ctaLink     ?? '',
    isActive:    initialPopup?.isActive    ?? false,
    startsAt:    initialPopup?.startsAt    ?? '',
    endsAt:      initialPopup?.endsAt      ?? '',
  })

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function save() {
    if (!form.title.trim() || !form.ctaText.trim() || !form.ctaLink.trim()) {
      setError('Title, CTA text and CTA link are required')
      return
    }
    setSaving(true); setError(''); setSuccess('')
    try {
      const method = popup ? 'PATCH' : 'POST'
      const body   = popup ? { id: popup.id, ...form } : form
      const res    = await fetch('/api/admin/popup', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed') }
      const data = await res.json()
      setPopup(data)
      setSuccess('Saved!')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive() {
    if (!popup) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/popup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: popup.id, isActive: !popup.isActive }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setPopup(data)
      setForm(f => ({ ...f, isActive: data.isActive }))
    } finally { setSaving(false) }
  }

  async function deletePopup() {
    if (!popup || !confirm('Delete this popup?')) return
    setSaving(true)
    try {
      await fetch('/api/admin/popup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: popup.id }),
      })
      setPopup(null)
      setForm({ title: '', description: '', imageUrl: '', ctaText: '', ctaLink: '', isActive: false, startsAt: '', endsAt: '' })
    } finally { setSaving(false) }
  }

  const previewData: AdminPopupData = {
    id: popup?.id ?? 'preview',
    title: form.title || 'Popup Title',
    description: form.description || null,
    imageUrl: form.imageUrl || null,
    ctaText: form.ctaText || 'Learn More',
    ctaLink: form.ctaLink || '#',
  }

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {popup && (
        <div className={[
          'flex items-center justify-between rounded-xl border px-4 py-3',
          popup.isActive
            ? 'border-success/30 bg-success/5 text-success'
            : 'border-border bg-surface text-muted-foreground',
        ].join(' ')}>
          <div className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${popup.isActive ? 'bg-success' : 'bg-muted-foreground'}`} />
            <span className="text-sm font-medium">{popup.isActive ? 'Active — showing on homepage' : 'Inactive — hidden from homepage'}</span>
          </div>
          <button
            onClick={toggleActive}
            disabled={saving}
            className="rounded-lg bg-card border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40 transition-colors disabled:opacity-50"
          >
            {popup.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      )}

      {error   && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {success && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{success}</p>}

      {/* Form */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Popup Content</h2>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Title *</label>
          <input value={form.title} onChange={field('title')} className={inputCls} placeholder="e.g. WCS Malaysia 2026 is Coming!" maxLength={100} />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Description</label>
          <textarea value={form.description} onChange={field('description')} rows={3} className={`${inputCls} resize-none`} placeholder="Short description shown under the title" maxLength={300} />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Image URL (optional)</label>
          <input value={form.imageUrl} onChange={field('imageUrl')} className={inputCls} placeholder="https://..." />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Button Text *</label>
            <input value={form.ctaText} onChange={field('ctaText')} className={inputCls} placeholder="e.g. Register Now" maxLength={40} />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Button Link *</label>
            <input value={form.ctaLink} onChange={field('ctaLink')} className={inputCls} placeholder="/about or https://..." />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Starts At (optional)</label>
            <input type="datetime-local" value={form.startsAt} onChange={field('startsAt')} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Ends At (optional)</label>
            <input type="datetime-local" value={form.endsAt} onChange={field('endsAt')} className={inputCls} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : (popup ? 'Update Popup' : 'Create Popup')}
          </button>
          <button
            onClick={() => setPreview(p => !p)}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {preview ? 'Hide Preview' : 'Preview'}
          </button>
          {popup && (
            <button
              onClick={deletePopup}
              disabled={saving}
              className="ml-auto rounded-xl border border-destructive/30 px-5 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-surface px-4 py-2">
            <p className="text-xs font-medium text-muted-foreground">Preview — as fans will see it</p>
          </div>
          <div className="relative flex items-center justify-center p-10" style={{ background: 'rgba(0,0,0,0.5)', minHeight: '320px' }}>
            <div className="relative w-full max-w-[480px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              {previewData.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewData.imageUrl} alt="" role="presentation" className="h-48 w-full object-cover" />
              )}
              <div className="p-6">
                <h2 className="text-xl font-bold text-foreground">{previewData.title}</h2>
                {previewData.description && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{previewData.description}</p>
                )}
                <div className="mt-5 block w-full rounded-xl bg-primary py-3 text-center text-sm font-semibold text-white">
                  {previewData.ctaText}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
