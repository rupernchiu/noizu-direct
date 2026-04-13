'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const FEE_RATE = 0.04

export default function PayoutRequestPage() {
  const router = useRouter()
  const [available, setAvailable] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/payout')
      .then((r) => r.json())
      .then((d: { available?: number }) => setAvailable(d.available ?? 0))
      .catch(() => setAvailable(0))
  }, [])

  const numAmount = parseFloat(amount) || 0
  const fee = numAmount * FEE_RATE
  const net = numAmount - fee

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (numAmount <= 0) { setError('Enter a valid amount'); return }
    if (available !== null && numAmount > available) { setError('Exceeds available balance'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numAmount }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setError(body.error ?? 'Failed to submit payout request')
        return
      }
      router.push('/dashboard/earnings')
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Request Payout</h1>
        <p className="text-sm text-[#8888aa] mt-1">Withdraw your available balance</p>
      </div>

      <div className="rounded-xl bg-[#00d4aa]/10 border border-[#00d4aa]/30 px-4 py-3">
        <p className="text-xs text-[#8888aa]">Available Balance</p>
        <p className="text-2xl font-bold text-[#00d4aa]">
          {available === null ? '...' : `$${available.toFixed(2)}`}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Amount (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8888aa] text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg bg-[#1e1e2a] border border-[#2a2a3a] pl-7 pr-3 py-2 text-sm text-[#f0f0f5] placeholder-[#8888aa] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
            />
          </div>
        </div>

        {numAmount > 0 && (
          <div className="rounded-lg bg-[#1e1e2a] border border-[#2a2a3a] p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#8888aa]">Amount</span>
              <span className="text-[#f0f0f5]">${numAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8888aa]">Withdrawal fee (4%)</span>
              <span className="text-red-400">-${fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-[#2a2a3a] pt-2 font-medium">
              <span className="text-[#f0f0f5]">You receive</span>
              <span className="text-[#00d4aa]">${net.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || numAmount <= 0}
            className="px-6 py-2.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
          <a
            href="/dashboard/earnings"
            className="px-6 py-2.5 rounded-lg bg-[#1e1e2a] border border-[#2a2a3a] text-[#8888aa] hover:text-[#f0f0f5] text-sm font-medium transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
