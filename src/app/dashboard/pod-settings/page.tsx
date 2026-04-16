'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Star, Lock } from 'lucide-react'

const POD_PROVIDERS = [
  { value: 'PRINTIFY', label: 'Printify' },
  { value: 'PRINTFUL', label: 'Printful' },
  { value: 'MERCHIZE', label: 'Merchize' },
  { value: 'CJ_DROPSHIPPING', label: 'CJ Dropshipping' },
  { value: 'GOOTEN', label: 'Gooten' },
  { value: 'LOCAL_PRINT_SHOP', label: 'Local Print Shop' },
  { value: 'SELF_FULFILLED', label: 'Self Fulfilled' },
  { value: 'OTHER', label: 'Other' },
]

interface Provider {
  id: string; creatorId: string; name: string; customName: string | null
  storeUrl: string | null; notes: string | null; isDefault: boolean
  defaultProductionDays: number; shippingMY: number; shippingSG: number
  shippingPH: number; shippingIntl: number
}

type FormData = Omit<Provider, 'id' | 'creatorId'>

const defaultForm: FormData = {
  name: 'PRINTIFY', customName: null, storeUrl: null, notes: null,
  isDefault: false, defaultProductionDays: 5,
  shippingMY: 5, shippingSG: 7, shippingPH: 10, shippingIntl: 14,
}

const P = '#7c3aed'

export default function PodSettingsPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(defaultForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/dashboard/pod-providers')
    if (res.ok) setProviders(await res.json() as Provider[])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  function openAdd() { setEditId(null); setForm(defaultForm); setShowModal(true) }
  function openEdit(p: Provider) {
    setEditId(p.id)
    setForm({ name: p.name, customName: p.customName, storeUrl: p.storeUrl, notes: p.notes, isDefault: p.isDefault, defaultProductionDays: p.defaultProductionDays, shippingMY: p.shippingMY, shippingSG: p.shippingSG, shippingPH: p.shippingPH, shippingIntl: p.shippingIntl })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const method = editId ? 'PATCH' : 'POST'
    const url = editId ? `/api/dashboard/pod-providers/${editId}` : '/api/dashboard/pod-providers'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { setShowModal(false); void load() }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this provider?')) return
    await fetch(`/api/dashboard/pod-providers/${id}`, { method: 'DELETE' })
    void load()
  }

  async function setDefault(id: string) {
    await fetch(`/api/dashboard/pod-providers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isDefault: true }) })
    void load()
  }

  function f(key: keyof FormData, val: unknown) { setForm(prev => ({ ...prev, [key]: val })) }

  const provLabel = (name: string, custom: string | null) => {
    if (name === 'OTHER' && custom) return custom
    return POD_PROVIDERS.find(p => p.value === name)?.label ?? name
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">POD Provider Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your print-on-demand providers. Settings auto-fill when creating POD listings.</p>
        </div>
        <button suppressHydrationWarning onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: P, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Add Provider
        </button>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!loading && providers.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground text-sm">No providers yet. Add your first POD provider to start selling print-on-demand products.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {providers.map(p => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground">{provLabel(p.name, p.customName)}</span>
                  {p.isDefault && <span style={{ background: 'rgba(124,58,237,0.1)', color: P, fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', border: `1px solid ${P}` }}>DEFAULT</span>}
                </div>
                {p.storeUrl && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <Lock size={10} /> <span className="truncate max-w-[200px]">{p.storeUrl}</span> <span className="text-[10px]">(private)</span>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  <div className="text-xs"><p className="text-muted-foreground">Production</p><p className="font-medium text-foreground">{p.defaultProductionDays}d</p></div>
                  <div className="text-xs"><p className="text-muted-foreground">🇲🇾 MY</p><p className="font-medium text-foreground">{p.shippingMY}d</p></div>
                  <div className="text-xs"><p className="text-muted-foreground">🇸🇬 SG</p><p className="font-medium text-foreground">{p.shippingSG}d</p></div>
                  <div className="text-xs"><p className="text-muted-foreground">🌍 Intl</p><p className="font-medium text-foreground">{p.shippingIntl}d</p></div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!p.isDefault && (
                  <button suppressHydrationWarning onClick={() => void setDefault(p.id)} title="Set as default" style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--muted-foreground)' }}>
                    <Star size={12} /> Default
                  </button>
                )}
                <button suppressHydrationWarning onClick={() => openEdit(p)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: 'var(--foreground)' }}>
                  <Pencil size={14} />
                </button>
                <button suppressHydrationWarning onClick={() => void handleDelete(p.id)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#ef4444' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700, color: 'var(--foreground)' }}>{editId ? 'Edit Provider' : 'Add Provider'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Provider */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground)', display: 'block', marginBottom: '6px' }}>Provider</label>
                <select suppressHydrationWarning value={form.name} onChange={e => f('name', e.target.value)} style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', fontSize: '14px', outline: 'none' }}>
                  {POD_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              {form.name === 'OTHER' && (
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground)', display: 'block', marginBottom: '6px' }}>Custom Name</label>
                  <input suppressHydrationWarning type="text" value={form.customName ?? ''} onChange={e => f('customName', e.target.value)} placeholder="e.g. Ahmad Print, KL" style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', fontSize: '14px', outline: 'none' }} />
                </div>
              )}
              {/* Store URL */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground)', display: 'block', marginBottom: '6px' }}>Store / Account URL <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>🔒 private</span></label>
                <input suppressHydrationWarning type="url" value={form.storeUrl ?? ''} onChange={e => f('storeUrl', e.target.value || null)} placeholder="https://printify.com/app/store/..." style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', fontSize: '14px', outline: 'none' }} />
              </div>
              {/* Production days */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground)', display: 'block', marginBottom: '6px' }}>Production Time (days)</label>
                <input suppressHydrationWarning type="number" min={1} max={30} value={form.defaultProductionDays} onChange={e => f('defaultProductionDays', parseInt(e.target.value))} style={{ width: '100px', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', fontSize: '14px', outline: 'none' }} />
              </div>
              {/* Shipping times */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground)', display: 'block', marginBottom: '8px' }}>Shipping Times (days)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    { key: 'shippingMY' as const, label: '🇲🇾 MY' },
                    { key: 'shippingSG' as const, label: '🇸🇬 SG' },
                    { key: 'shippingPH' as const, label: '🇵🇭 PH' },
                    { key: 'shippingIntl' as const, label: '🌍 Intl' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--muted-foreground)' }}>{label}</p>
                      <input suppressHydrationWarning type="number" min={1} max={60} value={form[key]} onChange={e => f(key, parseInt(e.target.value))} style={{ width: '100%', height: '36px', padding: '0 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', fontSize: '14px', outline: 'none', textAlign: 'center' }} />
                    </div>
                  ))}
                </div>
              </div>
              {/* Notes */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground)', display: 'block', marginBottom: '6px' }}>Notes <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>🔒 private</span></label>
                <textarea suppressHydrationWarning value={form.notes ?? ''} onChange={e => f('notes', e.target.value || null)} rows={2} placeholder="Any private notes about this provider..." style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', fontSize: '14px', outline: 'none', resize: 'none' }} />
              </div>
              {/* Default */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input suppressHydrationWarning type="checkbox" checked={form.isDefault} onChange={e => f('isDefault', e.target.checked)} />
                <span style={{ fontSize: '13px', color: 'var(--foreground)' }}>Set as default provider</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button suppressHydrationWarning onClick={() => setShowModal(false)} style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button suppressHydrationWarning onClick={() => void handleSave()} disabled={saving} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: P, color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
