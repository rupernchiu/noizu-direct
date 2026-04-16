'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const FEE_RATE = 0.04

export default function PayoutRequestPage() {
  const router = useRouter()
  const [available, setAvailable] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [payoutMethod, setPayoutMethod] = useState<'bank_transfer'>('bank_transfer')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
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
    if (numAmount < 50) { setError('Minimum payout is RM 50'); return }
    if (available !== null && numAmount > available) { setError('Exceeds available balance'); return }
    if (!bankName.trim()) { setError('Bank name is required'); return }
    if (!accountNumber.trim()) { setError('Account number is required'); return }
    if (!accountName.trim()) { setError('Account holder name is required'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          payoutMethod: 'bank_transfer',
          accountDetails: JSON.stringify({ bankName, accountNumber, accountName }),
        }),
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
        <h1 className="text-2xl font-bold text-foreground">Request Payout</h1>
        <p className="text-sm text-muted-foreground mt-1">Withdraw your available balance</p>
      </div>

      <div className="rounded-xl bg-secondary/10 border border-secondary/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">Available Balance</p>
        <p className="text-2xl font-bold text-secondary">
          {available === null ? '...' : `RM ${available.toFixed(2)}`}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Amount (MYR)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">RM</span>
            <input
              type="number"
              step="0.01"
              min="50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg bg-card border border-border pl-10 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Minimum payout: RM 50</p>
        </div>

        {numAmount > 0 && (
          <div className="rounded-lg bg-card border border-border p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="text-foreground">RM {numAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Withdrawal fee (4%)</span>
              <span className="text-red-400">-RM {fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-medium">
              <span className="text-foreground">You receive</span>
              <span className="text-secondary">RM {net.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Payout Method</label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="payoutMethod"
                value="bank_transfer"
                checked={payoutMethod === 'bank_transfer'}
                onChange={() => setPayoutMethod('bank_transfer')}
                className="text-primary"
              />
              <span className="text-sm text-foreground">Bank Transfer</span>
            </label>
            <label className="flex items-center gap-3 cursor-not-allowed opacity-50">
              <input
                type="radio"
                name="payoutMethod"
                value="airwallex"
                disabled
                className="text-primary"
              />
              <span className="text-sm text-foreground">Airwallex</span>
              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-border text-muted-foreground">
                Coming soon
              </span>
            </label>
          </div>
        </div>

        {payoutMethod === 'bank_transfer' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Bank Name</label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Maybank"
                className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Account Number</label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 1234567890"
                className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Account Holder Name</label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Full name as on bank account"
                className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || numAmount <= 0}
            className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
          <a
            href="/dashboard/earnings"
            className="px-6 py-2.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
