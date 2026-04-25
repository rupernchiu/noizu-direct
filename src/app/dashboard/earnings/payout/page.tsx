'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const FEE_RATE = 0.04

const COUNTRY_OPTIONS = [
  { value: 'MY', label: 'Malaysia', currency: 'MYR' },
  { value: 'SG', label: 'Singapore', currency: 'SGD' },
  { value: 'PH', label: 'Philippines', currency: 'PHP' },
  { value: 'ID', label: 'Indonesia', currency: 'IDR' },
  { value: 'US', label: 'United States', currency: 'USD' },
  { value: 'EU', label: 'European Union', currency: 'EUR' },
]

const MY_BANKS = ['Maybank', 'CIMB', 'Public Bank', 'RHB', 'Hong Leong', 'AmBank', 'UOB', 'OCBC', 'HSBC']
const SG_BANKS = ['DBS', 'OCBC', 'UOB', 'Standard Chartered', 'Citibank', 'HSBC']
const PH_BANKS = ['BDO', 'BPI', 'Metrobank', 'PNB', 'UnionBank', 'Security Bank', 'GCash']
const ID_BANKS = ['BCA', 'BRI', 'BNI', 'Mandiri', 'CIMB Niaga', 'Danamon']

function getBanks(country: string): string[] | null {
  if (country === 'MY') return MY_BANKS
  if (country === 'SG') return SG_BANKS
  if (country === 'PH') return PH_BANKS
  if (country === 'ID') return ID_BANKS
  return null
}

const inputClass = 'w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function PayoutRequestPage() {
  const router = useRouter()

  // Settings state
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [savedMethod, setSavedMethod] = useState<{
    payoutMethod: string; payoutCountry: string | null; payoutCurrency: string | null;
    hasBeneficiary: boolean; maskedAccount: string | null
  } | null>(null)
  const [editMethod, setEditMethod] = useState<'bank_transfer' | 'paypal'>('bank_transfer')
  const [editCountry, setEditCountry] = useState('MY')
  const [editAccountName, setEditAccountName] = useState('')
  const [editBankName, setEditBankName] = useState('')
  const [editAccountNumber, setEditAccountNumber] = useState('')
  const [editRoutingCode, setEditRoutingCode] = useState('')
  const [editIban, setEditIban] = useState('')
  const [editSwift, setEditSwift] = useState('')
  const [editPaypalEmail, setEditPaypalEmail] = useState('')
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [settingsSuccess, setSettingsSuccess] = useState(false)

  // Request state
  const [available, setAvailable] = useState<number | null>(null)
  const [rail, setRail] = useState<'LOCAL' | 'SWIFT'>('LOCAL')
  const [minPayoutUsd, setMinPayoutUsd] = useState<number>(1000)
  const [swiftFeeUsd, setSwiftFeeUsd] = useState<number>(0)
  const [amount, setAmount] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/payout/settings')
      .then(r => r.json())
      .then((d: any) => { setSavedMethod(d); setSettingsLoading(false) })
      .catch(() => setSettingsLoading(false))

    fetch('/api/dashboard/payout')
      .then(r => r.json())
      .then((d: {
        available?: number
        rail?: 'LOCAL' | 'SWIFT'
        minPayoutUsd?: number
        swiftFeeUsd?: number
      }) => {
        setAvailable(d.available ?? 0)
        if (d.rail) setRail(d.rail)
        if (typeof d.minPayoutUsd === 'number') setMinPayoutUsd(d.minPayoutUsd)
        if (typeof d.swiftFeeUsd === 'number') setSwiftFeeUsd(d.swiftFeeUsd)
      })
      .catch(() => setAvailable(0))
  }, [])

  const editCurrency = COUNTRY_OPTIONS.find(c => c.value === editCountry)?.currency ?? 'MYR'
  const editBanks = getBanks(editCountry)

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault()
    setSettingsError(null)
    setSettingsSuccess(false)
    setSettingsSaving(true)
    try {
      const body: Record<string, string> = { payoutMethod: editMethod }
      if (editMethod === 'bank_transfer') {
        body.payoutCountry = editCountry
        body.payoutCurrency = editCurrency
        body.accountName = editAccountName
        body.bankName = editBankName
        body.accountNumber = editAccountNumber
        if (editCountry === 'US') body.routingCode = editRoutingCode
        if (editCountry === 'EU') { body.swiftCode = editSwift; body.accountNumber = editIban }
      } else {
        body.paypalEmail = editPaypalEmail
      }
      const res = await fetch('/api/dashboard/payout/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) { setSettingsError(data.error ?? 'Failed to save'); return }
      setSettingsSuccess(true)
      // Refresh saved method display
      const updated = await fetch('/api/dashboard/payout/settings').then(r => r.json())
      setSavedMethod(updated)
    } catch {
      setSettingsError('Something went wrong')
    } finally {
      setSettingsSaving(false)
    }
  }

  const numAmount = parseFloat(amount) || 0
  // Phase 1.5 — SWIFT corridor charges a per-transfer intermediary bank fee
  // passed through to the creator. LOCAL rails (PHP/SGD/IDR/MYR/THB) use the
  // existing 4% withdrawal fee model.
  const fee = rail === 'SWIFT' ? swiftFeeUsd / 100 : numAmount * FEE_RATE
  const net = Math.max(0, numAmount - fee)
  const minUsdDisplay = (minPayoutUsd / 100).toFixed(2)

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    setRequestError(null)
    if (numAmount * 100 < minPayoutUsd) {
      setRequestError(`Minimum payout is USD ${minUsdDisplay}`)
      return
    }
    if (available !== null && numAmount * 100 > available) { setRequestError('Exceeds available balance'); return }
    setRequestLoading(true)
    try {
      const res = await fetch('/api/dashboard/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(numAmount * 100) }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setRequestError(body.error ?? 'Failed to submit payout request')
        return
      }
      router.push('/dashboard/earnings')
    } catch {
      setRequestError('Something went wrong')
    } finally {
      setRequestLoading(false)
    }
  }

  return (
    <div className="max-w-md space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payout</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your payout method and withdraw earnings</p>
      </div>

      {/* ── Payout Method Section ── */}
      <div className="rounded-xl bg-card border border-border p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Payout Method</h2>
          {!settingsLoading && savedMethod?.maskedAccount && (
            <span className="text-xs text-muted-foreground bg-surface px-2 py-1 rounded-lg">
              Saved: {savedMethod.maskedAccount}
            </span>
          )}
        </div>

        <form onSubmit={saveSettings} className="space-y-4">
          {/* Method toggle */}
          <div className="flex gap-2">
            {(['bank_transfer', 'paypal'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setEditMethod(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  editMethod === m
                    ? 'bg-primary text-white'
                    : 'bg-surface border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'bank_transfer' ? 'Bank Transfer' : 'PayPal'}
              </button>
            ))}
          </div>

          {editMethod === 'bank_transfer' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Country</label>
                <select
                  value={editCountry}
                  onChange={e => { setEditCountry(e.target.value); setEditBankName('') }}
                  className={inputClass}
                >
                  {COUNTRY_OPTIONS.map(c => (
                    <option key={c.value} value={c.value}>{c.label} ({c.currency})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Account Holder Name</label>
                <input type="text" value={editAccountName} onChange={e => setEditAccountName(e.target.value)}
                  placeholder="Full name as on bank account" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Bank Name</label>
                {editBanks ? (
                  <select value={editBankName} onChange={e => setEditBankName(e.target.value)} className={inputClass}>
                    <option value="">Select bank...</option>
                    {editBanks.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                ) : (
                  <input type="text" value={editBankName} onChange={e => setEditBankName(e.target.value)}
                    placeholder="Bank name" className={inputClass} />
                )}
              </div>
              {editCountry === 'EU' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">IBAN</label>
                    <input type="text" value={editIban} onChange={e => setEditIban(e.target.value)}
                      placeholder="e.g. DE89370400440532013000" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">SWIFT / BIC</label>
                    <input type="text" value={editSwift} onChange={e => setEditSwift(e.target.value)}
                      placeholder="e.g. DEUTDEDB" className={inputClass} />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Account Number</label>
                  <input type="text" value={editAccountNumber} onChange={e => setEditAccountNumber(e.target.value)}
                    placeholder="e.g. 1234567890" className={inputClass} />
                </div>
              )}
              {editCountry === 'US' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Routing Number (ACH)</label>
                  <input type="text" value={editRoutingCode} onChange={e => setEditRoutingCode(e.target.value)}
                    placeholder="e.g. 021000021" className={inputClass} />
                </div>
              )}
            </div>
          )}

          {editMethod === 'paypal' && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">PayPal Email</label>
              <input type="email" value={editPaypalEmail} onChange={e => setEditPaypalEmail(e.target.value)}
                placeholder="your@paypal.com" className={inputClass} />
            </div>
          )}

          {settingsError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{settingsError}</p>
          )}
          {settingsSuccess && (
            <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">Payout details saved successfully.</p>
          )}

          <button
            type="submit"
            disabled={settingsSaving}
            className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {settingsSaving ? 'Saving...' : 'Save Payout Details'}
          </button>
        </form>
      </div>

      {/* ── Request Payout Section ── */}
      <div className="space-y-5">
        <h2 className="text-lg font-semibold text-foreground">Request Payout</h2>

        <div className="rounded-xl bg-secondary/10 border border-secondary/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">Available Balance</p>
          <p className="text-2xl font-bold text-secondary">
            {available === null ? '...' : `USD ${(available / 100).toFixed(2)}`}
          </p>
        </div>

        {requestError && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
            {requestError}
          </div>
        )}

        {rail === 'SWIFT' && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs text-amber-300 leading-relaxed">
            <strong className="block text-amber-200 mb-1">SWIFT corridor</strong>
            Your payout country uses SWIFT routing rather than a local rail.
            Intermediary bank fees (≈ USD {(swiftFeeUsd / 100).toFixed(2)}) are
            passed through to you and deducted from each transfer. Minimum payout
            is USD {minUsdDisplay} to keep the fee-to-payout ratio sensible.
          </div>
        )}

        <form onSubmit={submitRequest} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Amount (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">USD</span>
              <input
                type="number" step="0.01" min={minUsdDisplay}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg bg-card border border-border pl-12 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Minimum payout: USD {minUsdDisplay}</p>
          </div>

          {numAmount > 0 && (
            <div className="rounded-lg bg-card border border-border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-foreground">USD {numAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {rail === 'SWIFT' ? 'SWIFT intermediary fee' : 'Withdrawal fee (4%)'}
                </span>
                <span className="text-red-400">-USD {fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-medium">
                <span className="text-foreground">You receive</span>
                <span className="text-secondary">USD {net.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={requestLoading || numAmount <= 0}
              className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {requestLoading ? 'Submitting...' : 'Submit Request'}
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
    </div>
  )
}
