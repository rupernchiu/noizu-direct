'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'

interface Props {
  staffUsers: { id: string; name: string }[]
  entityTypes: string[]
  currentFilters: {
    actor: string
    action: string
    entityType: string
    from: string
    to: string
  }
}

export function AuditFilters({ staffUsers, entityTypes, currentFilters }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [filters, setFilters] = useState(currentFilters)

  function set(field: keyof typeof filters, value: string) {
    setFilters((f) => ({ ...f, [field]: value }))
  }

  function apply() {
    const params = new URLSearchParams()
    if (filters.actor) params.set('actor', filters.actor)
    if (filters.action) params.set('action', filters.action)
    if (filters.entityType) params.set('entityType', filters.entityType)
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    router.push(`${pathname}?${params.toString()}`)
  }

  function clear() {
    setFilters({ actor: '', action: '', entityType: '', from: '', to: '' })
    router.push(pathname)
  }

  const selectClass = 'px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground outline-none focus-visible:border-primary transition-colors'
  const inputClass = selectClass

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filters</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <select value={filters.actor} onChange={(e) => set('actor', e.target.value)} className={selectClass}>
          <option value="">All actors</option>
          {staffUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <input
          type="text"
          value={filters.action}
          onChange={(e) => set('action', e.target.value)}
          placeholder="Action (e.g. creators.suspend)"
          className={inputClass}
        />

        <select value={filters.entityType} onChange={(e) => set('entityType', e.target.value)} className={selectClass}>
          <option value="">All entity types</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground shrink-0">From</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => set('from', e.target.value)}
            className={inputClass + ' flex-1'}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground shrink-0">To</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => set('to', e.target.value)}
            className={inputClass + ' flex-1'}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={apply}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={clear}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
