'use client'
import { useState } from 'react'
export function TrendingRecalcButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  async function run() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/cron/trending', { method: 'POST' })
      const data = await res.json()
      setResult(`${data.updated} products updated · algorithm v${data.version} · calculated at ${new Date(data.calculatedAt).toLocaleTimeString()}`)
    } catch {
      setResult('Error running recalculation')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button onClick={run} disabled={loading} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
        {loading ? 'Running…' : 'Recalculate Now'}
      </button>
      {result && <span className="text-xs text-muted-foreground">{result}</span>}
    </div>
  )
}
