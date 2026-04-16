'use client'

import { useState, useRef, useCallback } from 'react'
import { CreatorPopup, type CreatorPopupData } from '@/components/ui/CreatorPopup'
import { Upload, Image as ImageIcon, X } from 'lucide-react'

interface MediaItem { id: string; url: string; filename: string }

interface PopupSettingsProps {
  username: string
  displayName: string
  avatar: string | null
  mediaLibrary: MediaItem[]
  initialData: {
    popupEnabled:     boolean
    popupTitle:       string | null
    popupDescription: string | null
    popupCtaText:     string | null
    popupCtaLink:     string | null
    popupBadgeText:   string | null
    popupImageUrl:    string | null
  }
}

const inputCls   = 'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors'
const MAX_TITLE  = 60
const MAX_DESC   = 200
const MAX_CTA    = 30
const MAX_BADGE  = 40
const MAX_BYTES  = 2 * 1024 * 1024 // 2MB

export function PopupSettings({ username, displayName, avatar, mediaLibrary, initialData }: PopupSettingsProps) {
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [preview, setPreview] = useState(false)

  const [form, setForm] = useState({
    popupEnabled:     initialData.popupEnabled,
    popupTitle:       initialData.popupTitle       ?? '',
    popupDescription: initialData.popupDescription ?? '',
    popupCtaText:     initialData.popupCtaText     ?? '',
    popupCtaLink:     initialData.popupCtaLink     ?? '',
    popupBadgeText:   initialData.popupBadgeText   ?? '',
    popupImageUrl:    initialData.popupImageUrl     ?? '',
  })

  // ── Image upload state ────────────────────────────────────────────────────
  const [imgTab,      setImgTab]      = useState<'upload' | 'library'>('upload')
  const [imgUploading, setImgUploading] = useState(false)
  const [imgError,    setImgError]    = useState('')
  const [dragOver,    setDragOver]    = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function uploadFile(file: File) {
    setImgError('')
    if (file.size > MAX_BYTES) { setImgError('Image must be under 2MB'); return }
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
      setImgError('Accepted formats: JPG, PNG, WebP'); return
    }
    setImgUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('subdir', 'popup')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Upload failed')
      setForm(f => ({ ...f, popupImageUrl: data.url! }))
    } catch (e: any) {
      setImgError(e.message)
    } finally {
      setImgUploading(false)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void uploadFile(file)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (form.popupEnabled) {
      if (!form.popupTitle.trim())   { setError('Popup title is required when popup is enabled'); return }
      if (!form.popupCtaText.trim()) { setError('Button text is required'); return }
      if (!form.popupCtaLink.trim()) { setError('Button link is required'); return }
    }
    setSaving(true); setError(''); setSuccess('')
    try {
      const body: Record<string, unknown> = { ...form, popupImageUrl: form.popupImageUrl || null }
      const res = await fetch('/api/dashboard/popup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed') }
      setSuccess('Saved!')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const previewData: CreatorPopupData = {
    username,
    displayName,
    avatar,
    popupTitle:       form.popupTitle       || 'Popup Title',
    popupDescription: form.popupDescription || null,
    popupCtaText:     form.popupCtaText     || 'View Offer',
    popupCtaLink:     form.popupCtaLink     || '#',
    popupBadgeText:   form.popupBadgeText   || null,
    popupImageUrl:    form.popupImageUrl    || null,
  }

  return (
    <div className="space-y-6">
      {error   && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {success && <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-400">{success}</p>}

      {/* Enable toggle */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Enable creator popup</p>
          <p className="text-xs text-muted-foreground mt-0.5">Show a popup to fans on your page (fires at every 8th unique visit, after 10 seconds)</p>
        </div>
        <button
          suppressHydrationWarning
          role="switch"
          aria-checked={form.popupEnabled}
          onClick={() => setForm(f => ({ ...f, popupEnabled: !f.popupEnabled }))}
          className={[
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
            form.popupEnabled ? 'bg-primary' : 'bg-muted-foreground/30',
          ].join(' ')}
        >
          <span className={[
            'pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            form.popupEnabled ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')} />
        </button>
      </div>

      {/* ── Image upload ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Popup Image <span className="font-normal text-muted-foreground">(optional)</span></p>
          <p className="text-xs text-muted-foreground mt-0.5">Shown at the top of your popup. Recommended: 520×280px</p>
        </div>

        {/* Current image preview */}
        {form.popupImageUrl ? (
          <div style={{ position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.popupImageUrl}
              alt="Popup image"
              style={{
                width: '100%', height: '160px', objectFit: 'cover',
                borderRadius: '12px', border: '1px solid var(--border)', display: 'block',
              }}
            />
            <button
              suppressHydrationWarning
              type="button"
              onClick={() => setForm(f => ({ ...f, popupImageUrl: '' }))}
              style={{
                position: 'absolute', top: '8px', right: '8px',
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '4px 10px',
                background: 'rgba(0,0,0,0.65)',
                border: 'none', borderRadius: '20px',
                color: '#fff', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', backdropFilter: 'blur(4px)',
              }}
            >
              <X size={12} />
              Remove
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)' }}>
              {(['upload', 'library'] as const).map(tab => (
                <button
                  suppressHydrationWarning
                  key={tab}
                  type="button"
                  onClick={() => setImgTab(tab)}
                  style={{
                    padding: '7px 16px',
                    fontSize: '13px', fontWeight: 500,
                    background: 'transparent', border: 'none',
                    borderBottom: imgTab === tab ? '2px solid #7c3aed' : '2px solid transparent',
                    color: imgTab === tab ? '#7c3aed' : 'var(--muted-foreground)',
                    cursor: 'pointer', transition: 'color 0.15s',
                    marginBottom: '-1px',
                  }}
                >
                  {tab === 'upload' ? <><Upload size={13} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />Upload Image</> : <><ImageIcon size={13} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />Media Library</>}
                </button>
              ))}
            </div>

            {/* Upload tab */}
            {imgTab === 'upload' && (
              <div>
                <input
                  suppressHydrationWarning
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) void uploadFile(f) }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  style={{
                    border: `2px dashed ${dragOver ? '#7c3aed' : 'var(--border)'}`,
                    borderRadius: '12px',
                    padding: '32px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragOver ? 'rgba(124,58,237,0.04)' : 'transparent',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  {imgUploading ? (
                    <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Uploading…</p>
                  ) : (
                    <>
                      <Upload size={24} style={{ color: 'var(--muted-foreground)', margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--foreground)' }}>
                        Click or drag to upload
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted-foreground)' }}>
                        JPG, PNG, WebP · max 2MB
                      </p>
                    </>
                  )}
                </div>
                {imgError && <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--destructive)' }}>{imgError}</p>}
              </div>
            )}

            {/* Library tab */}
            {imgTab === 'library' && (
              <div>
                {mediaLibrary.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', textAlign: 'center', padding: '24px 0' }}>
                    No images uploaded yet. Use the Upload tab to add images.
                  </p>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                    gap: '8px',
                    maxHeight: '260px',
                    overflowY: 'auto',
                  }}>
                    {mediaLibrary.map(m => (
                      <button
                        suppressHydrationWarning
                        key={m.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, popupImageUrl: m.url }))}
                        style={{
                          padding: 0, border: '2px solid var(--border)',
                          borderRadius: '8px', overflow: 'hidden',
                          cursor: 'pointer', background: 'none',
                          transition: 'border-color 0.15s',
                          aspectRatio: '1',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#7c3aed' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}
                        title={m.filename}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.url}
                          alt={m.filename}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Fields */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Popup Content</h2>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Popup Title *</label>
            <span className="text-xs text-muted-foreground">{form.popupTitle.length}/{MAX_TITLE}</span>
          </div>
          <input value={form.popupTitle} onChange={field('popupTitle')} className={inputCls} placeholder="e.g. Commission Slots Closing This Friday!" maxLength={MAX_TITLE} />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Description</label>
            <span className="text-xs text-muted-foreground">{form.popupDescription.length}/{MAX_DESC}</span>
          </div>
          <textarea value={form.popupDescription} onChange={field('popupDescription')} rows={3} className={`${inputCls} resize-none`} placeholder="Brief message shown to fans" maxLength={MAX_DESC} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Button Text *</label>
              <span className="text-xs text-muted-foreground">{form.popupCtaText.length}/{MAX_CTA}</span>
            </div>
            <input value={form.popupCtaText} onChange={field('popupCtaText')} className={inputCls} placeholder="e.g. Message Me" maxLength={MAX_CTA} />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Button Link *</label>
            <input value={form.popupCtaLink} onChange={field('popupCtaLink')} className={inputCls} placeholder="/creator/yourname or https://..." />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Floating Badge Text</label>
            <span className="text-xs text-muted-foreground">{form.popupBadgeText.length}/{MAX_BADGE}</span>
          </div>
          <input value={form.popupBadgeText} onChange={field('popupBadgeText')} className={inputCls} placeholder="e.g. 🎉 Commission slots open!" maxLength={MAX_BADGE} />
          <p className="mt-1 text-xs text-muted-foreground">Short text shown on the pill badge — always visible on your page</p>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            suppressHydrationWarning
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Popup Settings'}
          </button>
          <button
            suppressHydrationWarning
            onClick={() => setPreview(p => !p)}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {preview ? 'Hide Preview' : 'Preview'}
          </button>
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
              {/* Top section — image or gradient */}
              <div style={{ position: 'relative', height: '160px', overflow: 'hidden' }}>
                {previewData.popupImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewData.popupImageUrl}
                    alt={previewData.popupTitle}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' }} />
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 55%)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt={displayName} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.5)' }} />
                    ) : (
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff' }}>
                        {displayName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: 600 }}>{displayName}</span>
                  </div>
                  <p style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: 700, lineHeight: 1.25 }}>{previewData.popupTitle}</p>
                </div>
              </div>
              <div className="p-4">
                {previewData.popupDescription && (
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{previewData.popupDescription}</p>
                )}
                <div className="w-full rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-white">
                  {previewData.popupCtaText}
                </div>
              </div>
            </div>
          </div>
          {/* Badge preview */}
          <div className="border-t border-border bg-surface px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Floating badge preview:</p>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/30">
              <span>{previewData.popupBadgeText ?? displayName}</span>
              <span>→</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
