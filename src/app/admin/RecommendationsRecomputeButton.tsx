'use client'
import { useState } from 'react'

export function RecommendationsRecomputeButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/cron/recommendations', { method: 'POST' })
      const data = await res.json() as { pairs?: number; productsProcessed?: number; computedAt?: string; error?: string }
      if (data.error) { setResult(`Error: ${data.error}`); return }
      setResult(`${data.pairs} pairs computed · ${data.productsProcessed} products · at ${new Date(data.computedAt!).toLocaleTimeString()}`)
    } catch {
      setResult('Error running recomputation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button onClick={run} disabled={loading} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
        {loading ? 'Computing…' : 'Recompute Now'}
      </button>
      {result && <span className="text-xs text-muted-foreground">{result}</span>}
    </div>
  )
}
