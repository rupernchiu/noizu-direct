'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { HardDrive, Trash2, ChevronDown, ChevronUp, AlertTriangle, X } from 'lucide-react'
import type { StorageFile, StorageBreakdown } from '@/app/api/creator/storage/route'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtCents(cents: number): string {
  return `USD ${(cents / 100).toFixed(2)}`
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return `${months} month${months > 1 ? 's' : ''} ago`
}

function barColor(pct: number): string {
  if (pct >= 100) return '#ef4444'
  if (pct >= 95)  return '#f97316'
  if (pct >= 80)  return '#eab308'
  return '#22c55e'
}

// ── types ─────────────────────────────────────────────────────────────────────

type Tab = 'all' | 'product_image' | 'portfolio' | 'message' | 'pdf' | 'profile' | 'orphaned'

interface Config {
  freePlanMb: number
  creatorPlanGb: number; creatorPlanPriceCents: number
  proPlanGb: number; proPlanPriceCents: number
  overageCentsPerGb: number; overageGracePercent: number
  gracePeriodDays: number; warningThreshold1: number; warningThreshold2: number
}

interface Props {
  initialFiles: StorageFile[]
  breakdown: StorageBreakdown
  totalBytes: number
  quotaBytes: number
  usagePercent: number
  plan: 'FREE' | 'CREATOR' | 'PRO'
  bonusBytes: number
  config: Config
  userEmail?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  product_image: 'Product image', portfolio: 'Portfolio', message: 'Message',
  pdf: 'PDF', profile: 'Profile', orphaned: 'Orphaned',
}
const CATEGORY_ICONS: Record<string, string> = {
  product_image: '📷', portfolio: '🖼️', message: '💬',
  pdf: '📄', profile: '👤', orphaned: '🗑️',
}

// ── modal helpers ─────────────────────────────────────────────────────────────

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export function StorageClient({ initialFiles, breakdown, totalBytes, quotaBytes, usagePercent, plan, bonusBytes, config }: Props) {
  void totalBytes; void usagePercent

  const [files, setFiles]           = useState<StorageFile[]>(initialFiles)
  const [activeTab, setActiveTab]   = useState<Tab>('all')
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [policyOpen, setPolicyOpen] = useState(false)

  // Modals
  const [deleteTarget, setDeleteTarget]   = useState<StorageFile | null>(null)
  const [bulkConfirm, setBulkConfirm]     = useState(false)
  const [orphanConfirm, setOrphanConfirm] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  // Live totals (update optimistically after deletes)
  const liveTotal   = useMemo(() => files.reduce((s, f) => s + f.fileSize, 0), [files])
  const livePct     = quotaBytes > 0 ? Math.min(100, Math.round((liveTotal / quotaBytes) * 100)) : 0
  const liveBreakdown = useMemo(() => {
    const cats = ['product_image', 'portfolio', 'message', 'pdf', 'profile', 'orphaned'] as const
    return cats.reduce((acc, cat) => {
      const cf = files.filter(f => f.category === cat)
      acc[cat] = { bytes: cf.reduce((s, f) => s + f.fileSize, 0), count: cf.length }
      return acc
    }, {} as StorageBreakdown)
  }, [files])

  const tabFiles = useMemo(() =>
    activeTab === 'all' ? files : files.filter(f => f.category === activeTab),
    [files, activeTab]
  )
  const orphanFiles  = useMemo(() => files.filter(f => f.category === 'orphaned'), [files])
  const selectedSize = useMemo(() =>
    files.filter(f => selected.has(f.id)).reduce((s, f) => s + f.fileSize, 0),
    [files, selected]
  )

  // ── actions ──────────────────────────────────────────────────────────────

  async function deleteFile(file: StorageFile) {
    setDeleting(true)
    try {
      await fetch(`/api/creator/storage/${file.id}`, { method: 'DELETE' })
      setFiles(prev => prev.filter(f => f.id !== file.id))
      setSelected(prev => { const n = new Set(prev); n.delete(file.id); return n })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  async function bulkDelete(ids: string[]) {
    setDeleting(true)
    try {
      await fetch('/api/creator/storage/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: ids }),
      })
      const idSet = new Set(ids)
      setFiles(prev => prev.filter(f => !idSet.has(f.id)))
      setSelected(new Set())
    } finally {
      setDeleting(false)
      setBulkConfirm(false)
      setOrphanConfirm(false)
    }
  }

  function toggleSelectAll() {
    if (selected.size === tabFiles.length && tabFiles.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(tabFiles.map(f => f.id)))
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ── render ────────────────────────────────────────────────────────────────

  const color = barColor(livePct)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <HardDrive className="size-6" /> Storage Manager
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your uploaded files and storage quota.</p>
      </div>

      {/* Warning banners */}
      {livePct >= 100 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3">
          <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-destructive">Storage full. Uploads are currently blocked.</p>
            <p className="text-xs text-muted-foreground mt-0.5">Delete files or upgrade your plan to continue uploading.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setActiveTab('orphaned')} className="text-xs px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-card">Manage Files</button>
            <Link href="/dashboard/storage/subscribe" className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90">Upgrade Plan</Link>
          </div>
        </div>
      )}
      {livePct >= 95 && livePct < 100 && (
        <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="size-5 text-orange-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-orange-500">Storage almost full. New uploads will be blocked at 100%.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setActiveTab('orphaned')} className="text-xs px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-card">Manage Files</button>
            <Link href="/dashboard/storage/subscribe" className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90">Upgrade Plan</Link>
          </div>
        </div>
      )}
      {livePct >= config.warningThreshold1 && livePct < 95 && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="size-5 text-yellow-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">You are using {livePct}% of your storage.</p>
            <p className="text-xs text-muted-foreground mt-0.5">Consider freeing space or upgrading your plan.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setActiveTab('orphaned')} className="text-xs px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-card">Manage Files</button>
            <Link href="/dashboard/storage/subscribe" className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90">Upgrade Plan</Link>
          </div>
        </div>
      )}

      {/* Storage overview card */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-base font-semibold text-foreground">Storage Overview</h3>
          <span className="text-xs px-2.5 py-1 rounded-full border border-border font-medium text-muted-foreground">
            {plan} PLAN
          </span>
        </div>

        {/* Usage bar */}
        <div className="space-y-2">
          <div className="w-full h-3 bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${livePct}%`, backgroundColor: color }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span style={{ color }}>{livePct}% used</span>
            <span>{fmtBytes(liveTotal)} of {fmtBytes(quotaBytes)}</span>
          </div>
        </div>

        {/* Breakdown table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {(Object.keys(liveBreakdown) as (keyof StorageBreakdown)[]).map(cat => {
                const { bytes, count } = liveBreakdown[cat]
                const pct = liveTotal > 0 ? Math.round((bytes / liveTotal) * 100) : 0
                return (
                  <tr key={cat} className="hover:bg-border/20">
                    <td className="px-4 py-2.5">
                      <span className="mr-2">{CATEGORY_ICONS[cat]}</span>
                      <span className="text-foreground capitalize">{CATEGORY_LABELS[cat]}</span>
                      <span className="ml-2 text-xs text-muted-foreground">({count} file{count !== 1 ? 's' : ''})</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtBytes(bytes)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground w-12">{pct}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade plans */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h3 className="text-base font-semibold text-foreground">Plans</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`rounded-xl p-4 space-y-1 ${plan === 'FREE' ? 'border-2 border-primary bg-primary/5' : 'border border-border bg-card'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-bold ${plan === 'FREE' ? 'text-primary' : 'text-foreground'}`}>FREE</span>
              {plan === 'FREE' && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Current</span>}
            </div>
            <p className="text-2xl font-bold text-foreground">{config.freePlanMb} MB</p>
            <p className="text-xs text-muted-foreground">No monthly fee</p>
          </div>

          <div className={`rounded-xl p-4 space-y-1 ${plan === 'CREATOR' ? 'border-2 border-primary bg-primary/5' : 'border border-border bg-card hover:border-primary/50 transition-colors'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-bold ${plan === 'CREATOR' ? 'text-primary' : 'text-foreground'}`}>CREATOR</span>
              {plan === 'CREATOR' && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Current</span>}
            </div>
            <p className="text-2xl font-bold text-foreground">{config.creatorPlanGb} GB</p>
            <p className="text-xs text-muted-foreground">{fmtCents(config.creatorPlanPriceCents)}/month</p>
            {plan !== 'CREATOR' && (
              <Link href="/dashboard/storage/subscribe" className="mt-2 block w-full text-center text-xs bg-primary text-white py-1.5 rounded-lg hover:bg-primary/90 font-medium">
                {plan === 'FREE' ? 'Upgrade →' : 'Switch plan →'}
              </Link>
            )}
          </div>

          <div className={`rounded-xl p-4 space-y-1 ${plan === 'PRO' ? 'border-2 border-primary bg-primary/5' : 'border border-border bg-card hover:border-primary/50 transition-colors'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-bold ${plan === 'PRO' ? 'text-primary' : 'text-foreground'}`}>PRO</span>
              {plan === 'PRO' && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Current</span>}
            </div>
            <p className="text-2xl font-bold text-foreground">{config.proPlanGb} GB</p>
            <p className="text-xs text-muted-foreground">{fmtCents(config.proPlanPriceCents)}/month</p>
            {plan !== 'PRO' && (
              <Link href="/dashboard/storage/subscribe" className="mt-2 block w-full text-center text-xs bg-primary text-white py-1.5 rounded-lg hover:bg-primary/90 font-medium">
                {plan === 'FREE' ? 'Upgrade →' : 'Switch plan →'}
              </Link>
            )}
          </div>
        </div>

        {bonusBytes > 0 && (
          <p className="text-xs text-muted-foreground">
            Bonus quota applied: {fmtBytes(bonusBytes)} (admin-granted — stays active regardless of plan).
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Soft overage up to {config.overageGracePercent}% above your plan ({fmtCents(config.overageCentsPerGb)}/GB over) — new uploads beyond the hard limit are blocked.
        </p>
      </div>

      {/* File manager */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 pt-5 pb-0">
          <h3 className="text-base font-semibold text-foreground mb-4">File Manager</h3>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-0 -mx-1 px-1">
            {([
              { key: 'all',           label: 'All Files' },
              { key: 'product_image', label: 'Product Images' },
              { key: 'portfolio',     label: 'Portfolio' },
              { key: 'message',       label: 'Messages' },
              { key: 'pdf',           label: 'PDFs' },
              { key: 'profile',       label: 'Profile' },
              { key: 'orphaned',      label: 'Orphaned' },
            ] as { key: Tab; label: string }[]).map(({ key, label }) => {
              const count = key === 'all' ? files.length : liveBreakdown[key as keyof StorageBreakdown]?.count ?? 0
              const isActive = activeTab === key
              return (
                <button
                  key={key}
                  onClick={() => { setActiveTab(key); setSelected(new Set()) }}
                  className={`shrink-0 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  {label}
                  {key === 'orphaned' && count > 0
                    ? <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-[10px] font-bold">{count}</span>
                    : count > 0
                    ? <span className="ml-1.5 text-muted-foreground">({count})</span>
                    : null}
                </button>
              )
            })}
          </div>
          <div className="border-b border-border -mx-5" />
        </div>

        {/* Orphaned banner */}
        {activeTab === 'orphaned' && orphanFiles.length > 0 && (
          <div className="mx-5 mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 flex items-center justify-between gap-4">
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              These files are not attached to any active product, portfolio, or profile. Safe to delete to free up space.
            </p>
            <button
              onClick={() => setOrphanConfirm(true)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-destructive text-white hover:bg-destructive/90 font-medium"
            >
              Delete All Orphaned ({orphanFiles.length} files, {fmtBytes(orphanFiles.reduce((s, f) => s + f.fileSize, 0))})
            </button>
          </div>
        )}

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2.5">
            <span className="text-xs text-primary font-medium">{selected.size} file{selected.size !== 1 ? 's' : ''} selected ({fmtBytes(selectedSize)})</span>
            <button
              onClick={() => setBulkConfirm(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-destructive text-white hover:bg-destructive/90 font-medium"
            >
              Delete Selected ({selected.size} files, {fmtBytes(selectedSize)})
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          {tabFiles.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">No files in this category.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="px-5 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === tabFiles.length && tabFiles.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="px-5 py-3 text-left w-12" />
                  <th className="px-5 py-3 text-left">Filename</th>
                  <th className="px-5 py-3 text-left">Size</th>
                  <th className="px-5 py-3 text-left">Category</th>
                  <th className="px-5 py-3 text-left">Attached to</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tabFiles.map(file => {
                  const isOrphan = file.category === 'orphaned'
                  const isImg = file.mimeType?.startsWith('image/')
                  return (
                    <tr key={file.id} className={`hover:bg-border/20 ${isOrphan ? 'bg-yellow-500/5' : ''}`}>
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(file.id)}
                          onChange={() => toggleSelect(file.id)}
                          className="rounded border-border"
                        />
                      </td>
                      <td className="px-2 py-3">
                        {isImg
                          ? <img src={file.url} alt="" className="size-10 object-cover rounded border border-border" />
                          : <div className="size-10 rounded border border-border bg-border/40 flex items-center justify-center text-lg">{CATEGORY_ICONS[file.category]}</div>
                        }
                      </td>
                      <td className="px-5 py-3 max-w-[180px]">
                        <span title={file.filename} className="block truncate text-foreground">{file.filename}</span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{fmtBytes(file.fileSize)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${isOrphan ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' : 'bg-border/60 text-muted-foreground'}`}>
                          {CATEGORY_LABELS[file.category] ?? file.category}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs max-w-[160px]">
                        {isOrphan
                          ? <span className="text-yellow-600 dark:text-yellow-400">⚠️ Not attached (orphaned)</span>
                          : <span title={file.attachedTo ?? ''}  className="block truncate">{file.attachedTo}</span>
                        }
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap text-xs">{relativeTime(file.createdAt)}</td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setDeleteTarget(file)}
                          className="text-xs px-2 py-1 rounded border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Storage policy */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <button
          onClick={() => setPolicyOpen(p => !p)}
          className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-foreground hover:bg-border/20 transition-colors"
        >
          <span>Storage Policy</span>
          {policyOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </button>
        {policyOpen && (
          <div className="px-6 pb-6 space-y-2 text-sm text-muted-foreground border-t border-border pt-4">
            <p>• Free plan: {config.freePlanMb} MB</p>
            <p>• Creator plan: {config.creatorPlanGb} GB at {fmtCents(config.creatorPlanPriceCents)}/month</p>
            <p>• Pro plan: {config.proPlanGb} GB at {fmtCents(config.proPlanPriceCents)}/month</p>
            <p>• Soft overage band: {config.overageGracePercent}% above quota before new uploads are blocked</p>
            <p>• Files are never deleted without a {config.gracePeriodDays}-day warning</p>
            <p>• Orphaned files auto-deleted after {config.gracePeriodDays}-day grace period</p>
            <Link href="/storage-policy" className="text-primary hover:text-primary/80 transition-colors text-xs">
              View full storage policy →
            </Link>
          </div>
        )}
      </div>

      {/* ── Modals ── */}

      {/* Single delete confirm */}
      {deleteTarget && (
        <Modal title="Delete file?" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-muted-foreground">
            {deleteTarget.category !== 'orphaned' && deleteTarget.attachedTo
              ? `This file is used in "${deleteTarget.attachedTo}". Deleting removes it from that listing.`
              : `Delete "${deleteTarget.filename}"? This cannot be undone.`}
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeleteTarget(null)} className="text-sm px-4 py-2 rounded-lg border border-border text-foreground hover:bg-card">Cancel</button>
            <button
              onClick={() => deleteFile(deleteTarget)}
              disabled={deleting}
              className="text-sm px-4 py-2 rounded-lg bg-destructive text-white hover:bg-destructive/90 disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}

      {/* Bulk delete confirm */}
      {bulkConfirm && (
        <Modal title={`Delete ${selected.size} files?`} onClose={() => setBulkConfirm(false)}>
          <p className="text-sm text-muted-foreground">Delete {selected.size} files ({fmtBytes(selectedSize)})? This cannot be undone.</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setBulkConfirm(false)} className="text-sm px-4 py-2 rounded-lg border border-border text-foreground hover:bg-card">Cancel</button>
            <button onClick={() => bulkDelete([...selected])} disabled={deleting} className="text-sm px-4 py-2 rounded-lg bg-destructive text-white hover:bg-destructive/90 disabled:opacity-60">
              {deleting ? 'Deleting…' : 'Delete All'}
            </button>
          </div>
        </Modal>
      )}

      {/* Orphan delete confirm */}
      {orphanConfirm && (
        <Modal title={`Delete ${orphanFiles.length} orphaned files?`} onClose={() => setOrphanConfirm(false)}>
          <p className="text-sm text-muted-foreground">
            Delete {orphanFiles.length} orphaned files ({fmtBytes(orphanFiles.reduce((s, f) => s + f.fileSize, 0))})? This cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setOrphanConfirm(false)} className="text-sm px-4 py-2 rounded-lg border border-border text-foreground hover:bg-card">Cancel</button>
            <button onClick={() => bulkDelete(orphanFiles.map(f => f.id))} disabled={deleting} className="text-sm px-4 py-2 rounded-lg bg-destructive text-white hover:bg-destructive/90 disabled:opacity-60">
              {deleting ? 'Deleting…' : 'Delete All'}
            </button>
          </div>
        </Modal>
      )}

    </div>
  )
}
