'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'

type Props = {
  orderId: string
  productTitle: string
  productType: string
  creatorName: string
  amountUsd: number
  orderDate: string
  thumbnail: string | null
}

const REASONS = [
  { value: 'NEVER_ARRIVED', label: 'Item never arrived', sub: "I haven't received my order" },
  { value: 'WRONG_ITEM', label: 'Wrong item received', sub: 'I got something different' },
  { value: 'PRINT_QUALITY', label: 'Print quality issue', sub: 'Blurry, wrong color, faded', podOnly: true },
  { value: 'WRONG_SIZE', label: 'Wrong size received', sub: null },
  { value: 'DAMAGED', label: 'Item arrived damaged', sub: null },
  { value: 'OTHER', label: 'Other', sub: null },
]

const REASON_LABELS: Record<string, string> = {
  NEVER_ARRIVED: 'Item never arrived',
  WRONG_ITEM: 'Wrong item received',
  PRINT_QUALITY: 'Print quality issue',
  WRONG_SIZE: 'Wrong size received',
  DAMAGED: 'Item arrived damaged',
  OTHER: 'Other',
}

const STEPS = ['Reason', 'Description', 'Evidence', 'Review']
const P = '#7c3aed'
const RED = '#ef4444'

export default function DisputeFormClient({
  orderId, productTitle, productType, creatorName, amountUsd, orderDate, thumbnail,
}: Props) {
  const [step, setStep] = useState(1)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [evidence, setEvidence] = useState<{ url: string; name: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const availableReasons = REASONS.filter(r => !r.podOnly || productType === 'POD')

  async function uploadFile(file: File) {
    if (evidence.length >= 5) { setUploadError('Maximum 5 images reached'); return }
    if (file.size > 5 * 1024 * 1024) { setUploadError('File exceeds 5MB limit'); return }
    setUploadError('')
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('subdir', 'disputes')
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json() as { url: string }
        setEvidence(prev => [...prev, { url: data.url, name: file.name }])
      } else {
        setUploadError('Upload failed — please try again')
      }
    } catch {
      setUploadError('Upload failed — please try again')
    }
    setUploading(false)
  }

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return
    for (const f of Array.from(files).slice(0, 5)) {
      await uploadFile(f)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidence.length])

  async function handleSubmit() {
    setSubmitError('')
    setSubmitting(true)
    const res = await fetch('/api/disputes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, reason, description, evidence: evidence.map(e => e.url) }),
    })
    const data = await res.json() as { ok?: boolean; disputeId?: string; error?: string }
    if (res.ok) {
      setSubmitted(true)
    } else {
      setSubmitError(data.error ?? 'Failed to submit dispute')
    }
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <div style={{ width: 56, height: 56, background: 'rgba(34,197,94,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Dispute submitted</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          Your dispute has been submitted. Our team will review it within 2 business days and notify you of any updates.
        </p>
        <Link
          href="/account/disputes"
          style={{ display: 'inline-block', background: P, color: '#fff', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}
        >
          View My Disputes
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <Link href={`/account/orders/${orderId}`} className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block">
        ← Back to order
      </Link>
      <h1 className="text-2xl font-bold text-foreground mb-1">Raise a Dispute</h1>
      <p className="text-sm text-muted-foreground mb-7 truncate">{productTitle}</p>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px' }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: i + 1 < step ? P : i + 1 === step ? P : 'var(--border)',
                border: i + 1 === step ? `3px solid rgba(124,58,237,0.25)` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: i + 1 <= step ? '#fff' : 'var(--muted-foreground)',
                fontSize: '11px', fontWeight: 700, flexShrink: 0,
              }}>
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '10px', marginTop: '4px', color: i + 1 <= step ? P : 'var(--muted-foreground)', fontWeight: i + 1 === step ? 600 : 400 }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ height: '2px', width: '100%', maxWidth: '32px', background: i + 1 < step ? P : 'var(--border)', marginBottom: '16px', flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Reason ── */}
      {step === 1 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground mb-1">What went wrong?</p>
          {availableReasons.map(r => (
            <button
              suppressHydrationWarning
              key={r.value}
              onClick={() => setReason(r.value)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                background: reason === r.value ? 'rgba(124,58,237,0.08)' : 'var(--surface)',
                border: reason === r.value ? `2px solid ${P}` : '1px solid var(--border)',
                textAlign: 'left', width: '100%',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: '2px',
                border: reason === r.value ? `5px solid ${P}` : '2px solid var(--muted-foreground)',
                background: reason === r.value ? '#fff' : 'transparent',
                transition: 'border 0.1s',
              }} />
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.3 }}>{r.label}</p>
                {r.sub && <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '2px' }}>{r.sub}</p>}
                {r.podOnly && <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '2px', fontStyle: 'italic' }}>POD orders only</p>}
              </div>
            </button>
          ))}
          <div className="flex justify-end mt-2">
            <button
             suppressHydrationWarning
              onClick={() => setStep(2)}
              disabled={!reason}
              style={{ background: P, color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: 600, cursor: reason ? 'pointer' : 'not-allowed', opacity: reason ? 1 : 0.45 }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Description ── */}
      {step === 2 && (
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1">Describe the issue</label>
            <p className="text-xs text-muted-foreground mb-3">Include what you expected vs what you received</p>
            <textarea
             suppressHydrationWarning
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 1000))}
              rows={6}
              placeholder="Please describe what happened in detail..."
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                border: `1px solid ${description.length >= 50 ? '#22c55e' : 'var(--border)'}`,
                background: 'var(--surface)', color: 'var(--foreground)', fontSize: '14px',
                outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', color: description.length < 50 ? RED : '#22c55e' }}>
                {description.length < 50 ? `${50 - description.length} more characters needed` : 'Minimum reached'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{description.length}/1000</span>
            </div>
          </div>
          <div className="flex justify-between">
            <button suppressHydrationWarning onClick={() => setStep(1)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer', color: 'var(--foreground)' }}>← Back</button>
            <button
             suppressHydrationWarning
              onClick={() => setStep(3)}
              disabled={description.length < 50}
              style={{ background: P, color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: 600, cursor: description.length >= 50 ? 'pointer' : 'not-allowed', opacity: description.length >= 50 ? 1 : 0.45 }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Evidence ── */}
      {step === 3 && (
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4">
          <div>
            <h3 className="font-semibold text-foreground mb-0.5">
              Add Evidence <span className="font-normal text-sm text-muted-foreground">(optional but recommended)</span>
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Photos help us resolve your case faster. E.g. photo of wrong item, damaged packaging, print quality.
            </p>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); void handleFiles(e.dataTransfer.files) }}
              onClick={() => evidence.length < 5 && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? P : 'var(--border)'}`,
                borderRadius: '10px', padding: '28px 20px', textAlign: 'center',
                cursor: evidence.length >= 5 ? 'not-allowed' : 'pointer',
                background: dragOver ? 'rgba(124,58,237,0.05)' : 'transparent',
                opacity: evidence.length >= 5 ? 0.5 : 1,
              }}
            >
              <svg style={{ margin: '0 auto 8px', display: 'block', color: 'var(--muted-foreground)' }} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
                {evidence.length >= 5 ? 'Maximum 5 images reached' : 'Drop images here or click to upload'}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
                JPG, PNG, WebP · Max 5MB each · {evidence.length}/5
              </p>
            </div>
            <input
              suppressHydrationWarning
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              style={{ display: 'none' }}
              onChange={e => void handleFiles(e.target.files)}
            />

            {/* Previews */}
            {evidence.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                {evidence.map((ev, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ev.url} alt={ev.name} style={{ width: 72, height: 72, borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)', display: 'block' }} />
                    <button
                     suppressHydrationWarning
                      onClick={e => { e.stopPropagation(); setEvidence(prev => prev.filter((_, j) => j !== i)) }}
                      style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: RED, border: 'none', color: '#fff', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
            {uploading && <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '8px' }}>Uploading…</p>}
            {uploadError && <p style={{ fontSize: '12px', color: RED, marginTop: '8px' }}>{uploadError}</p>}
          </div>

          <div className="flex justify-between">
            <button suppressHydrationWarning onClick={() => setStep(2)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer', color: 'var(--foreground)' }}>← Back</button>
            <button
             suppressHydrationWarning
              onClick={() => setStep(4)}
              style={{ background: P, color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Review →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Review ── */}
      {step === 4 && (
        <div className="flex flex-col gap-4">
          {/* Order summary */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Order Summary</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              {thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnail} alt={productTitle} style={{ width: 52, height: 52, borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: '8px', background: 'var(--background)', flexShrink: 0 }} />
              )}
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>{productTitle}</p>
                <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '2px' }}>by {creatorName}</p>
                <p style={{ fontSize: '13px', color: P, fontWeight: 600, marginTop: '4px' }}>USD {(amountUsd / 100).toFixed(2)}</p>
                <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                  Ordered {new Date(orderDate).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                </p>
              </div>
            </div>
          </div>

          {/* Dispute summary */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Your Dispute</p>
            <div className="flex flex-col gap-3">
              <div>
                <p style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>Reason</p>
                <p style={{ fontSize: '14px', color: 'var(--foreground)', fontWeight: 500, marginTop: '2px' }}>{REASON_LABELS[reason]}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>Description</p>
                <p style={{ fontSize: '13px', color: 'var(--foreground)', marginTop: '2px', lineHeight: 1.6 }}>
                  {description.slice(0, 160)}{description.length > 160 ? '…' : ''}
                </p>
              </div>
              {evidence.length > 0 && (
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>Evidence</p>
                  <p style={{ fontSize: '13px', color: 'var(--foreground)', marginTop: '2px' }}>
                    {evidence.length} image{evidence.length !== 1 ? 's' : ''} attached
                  </p>
                </div>
              )}
            </div>
          </div>

          {submitError && <p className="text-sm text-red-400">{submitError}</p>}

          <button
           suppressHydrationWarning
            onClick={() => void handleSubmit()}
            disabled={submitting}
            style={{ background: RED, color: '#fff', border: 'none', borderRadius: '10px', padding: '13px 24px', fontSize: '15px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'Submitting…' : 'Submit Dispute'}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
             suppressHydrationWarning
              onClick={() => setStep(3)}
              style={{ background: 'transparent', border: 'none', fontSize: '14px', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 0 }}
            >
              ← Back
            </button>
            <Link href="/account/orders" style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
              Cancel — go back to orders
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
