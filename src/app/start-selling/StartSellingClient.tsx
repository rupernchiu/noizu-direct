'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agreement {
  id: string
  type: string
  version: string
  title: string
  content: string
  summary: string
  changeLog: string | null
  effectiveDate: string
}

interface Props {
  agreements: Agreement[]
  userEmail: string
  userName: string
  hasRejectedApp?: boolean
  rejectionReason?: string | null
}

interface FormData {
  // Step 1
  displayName: string
  username: string
  bio: string
  tagline: string
  categoryTags: string[]
  // Step 2
  legalFullName: string
  dateOfBirth: string
  nationality: string
  country: string
  phone: string
  idType: 'IC' | 'PASSPORT'
  idNumber: string
  // Step 3
  idFrontFile: File | null
  idBackFile: File | null
  selfieFile: File | null
  idFrontPreview: string
  idBackPreview: string
  selfiePreview: string
  idFrontUrl: string
  idBackUrl: string
  selfieUrl: string
  // Step 4
  bankName: string
  bankAccountNumber: string
  bankAccountName: string
  bankCountry: string
  paypalEmail: string
  // Step 5
  signedName: string
  agreeAll: boolean
  agreeAge: boolean
  agreeContent: boolean
  readAgreements: Set<string>
}

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  'Digital Art',
  'Doujin',
  'Cosplay Print',
  'Physical Merch',
  'Stickers',
  'Illustration',
  'Photography',
  'POD',
  'Other',
]

const BANK_OPTIONS = [
  'Maybank',
  'CIMB',
  'Public Bank',
  'RHB',
  'Hong Leong',
  'AmBank',
  'Bank Islam',
  'BSN',
  'Affin Bank',
  'Alliance Bank',
  'Other',
]

const STEP_NAMES = [
  'Store Profile',
  'Personal Details',
  'Identity Verification',
  'Payout Setup',
  'Agreements',
]

const AGREEMENT_TAB_LABELS: Record<string, string> = {
  CREATOR_TOS: 'Creator ToS',
  IP_DECLARATION: 'IP Declaration',
  PAYMENT_TERMS: 'Payment Terms',
  PRIVACY_POLICY: 'Privacy Policy',
  COMMUNITY_GUIDELINES: 'Community Guidelines',
}

// ─── Shared style tokens ──────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary'
const btnPrimaryCls =
  'px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
const btnSecondaryCls =
  'px-6 py-2.5 bg-surface border border-border rounded-lg text-sm font-medium hover:bg-border/40 transition-colors'

// ─── Helper: today's date as YYYY-MM-DD ───────────────────────────────────────

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium' }).format(new Date(iso))
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-1">
        {STEP_NAMES.map((name, i) => {
          const idx = i + 1
          const isCompleted = step > idx
          const isCurrent = step === idx
          return (
            <div key={name} className="flex flex-col items-center flex-1 min-w-0">
              <div className="flex items-center w-full">
                {i > 0 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      isCompleted || isCurrent ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
                <div
                  className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors ${
                    isCompleted
                      ? 'bg-primary border-primary text-white'
                      : isCurrent
                      ? 'border-primary text-primary bg-background'
                      : 'border-border text-muted-foreground bg-background'
                  }`}
                >
                  {isCompleted ? '✓' : idx}
                </div>
                {i < STEP_NAMES.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      isCompleted ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>
              <span
                className={`mt-1.5 text-xs text-center leading-tight hidden sm:block ${
                  isCurrent
                    ? 'text-primary font-semibold'
                    : isCompleted
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── File upload zone ─────────────────────────────────────────────────────────

interface UploadZoneProps {
  label: string
  required: boolean
  preview: string
  uploadStatus: UploadStatus
  onFile: (file: File) => void
  accept?: string
}

function UploadZone({ label, required, preview, uploadStatus, onFile, accept }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFile(file)
      // reset input so re-selecting same file still triggers onChange
      e.target.value = ''
    },
    [onFile],
  )

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-primary bg-primary/5'
            : preview
            ? 'border-border'
            : 'border-border hover:border-primary/50'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={label}
              className="max-h-36 mx-auto rounded-lg object-contain"
            />
            <p className="text-xs text-muted-foreground">
              {uploadStatus === 'uploading' && (
                <span className="text-yellow-400">Uploading...</span>
              )}
              {uploadStatus === 'done' && (
                <span className="text-green-400">Uploaded ✅</span>
              )}
              {uploadStatus === 'error' && (
                <span className="text-red-400">Upload failed ❌</span>
              )}
            </p>
            <button
              suppressHydrationWarning
              type="button"
              className="text-xs text-primary underline"
              onClick={(e) => {
                e.stopPropagation()
                inputRef.current?.click()
              }}
            >
              Replace
            </button>
          </div>
        ) : (
          <div className="py-4 space-y-1">
            <div className="text-3xl text-muted-foreground">📎</div>
            <p className="text-sm text-foreground font-medium">
              Drag & drop or click to upload
            </p>
            <p className="text-xs text-muted-foreground">JPEG or PNG, max 5 MB</p>
          </div>
        )}
        <input
          suppressHydrationWarning
          ref={inputRef}
          type="file"
          accept={accept ?? 'image/jpeg,image/png'}
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StartSellingClient({
  agreements,
  userEmail,
  userName,
  hasRejectedApp,
  rejectionReason,
}: Props) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submittedRefId, setSubmittedRefId] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    displayName: userName || '',
    username: '',
    bio: '',
    tagline: '',
    categoryTags: [],
    legalFullName: '',
    dateOfBirth: '',
    nationality: '',
    country: '',
    phone: '',
    idType: 'IC',
    idNumber: '',
    idFrontFile: null,
    idBackFile: null,
    selfieFile: null,
    idFrontPreview: '',
    idBackPreview: '',
    selfiePreview: '',
    idFrontUrl: '',
    idBackUrl: '',
    selfieUrl: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    bankCountry: '',
    paypalEmail: '',
    signedName: '',
    agreeAll: false,
    agreeAge: false,
    agreeContent: false,
    readAgreements: new Set(),
  })

  // Username check state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Upload statuses
  const [uploadStatuses, setUploadStatuses] = useState<{
    idFront: UploadStatus
    idBack: UploadStatus
    selfie: UploadStatus
  }>({ idFront: 'idle', idBack: 'idle', selfie: 'idle' })

  // Agreement tab state
  const [activeAgreementTab, setActiveAgreementTab] = useState<string>(agreements[0]?.id ?? '')

  // ── Field helpers ───────────────────────────────────────────────────────────

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  // ── Username debounce check ─────────────────────────────────────────────────

  useEffect(() => {
    const username = formData.username
    if (!username) {
      setUsernameStatus('idle')
      return
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      setUsernameStatus('invalid')
      return
    }
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current)
    setUsernameStatus('checking')
    usernameDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/creator/check-username?username=${encodeURIComponent(username)}`,
        )
        const data = await res.json() as { available: boolean }
        setUsernameStatus(data.available ? 'available' : 'taken')
      } catch {
        setUsernameStatus('idle')
      }
    }, 500)
    return () => {
      if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current)
    }
  }, [formData.username])

  // ── File upload ─────────────────────────────────────────────────────────────

  const handleFileUpload = useCallback(
    async (
      file: File,
      field: 'idFront' | 'idBack' | 'selfie',
    ) => {
      // Identity documents: 10 MB limit (PDFs and hi-res photos)
      const MAX_SIZE = 10 * 1024 * 1024
      if (file.size > MAX_SIZE) {
        setErrors((prev) => ({ ...prev, [field]: 'File must be under 10 MB' }))
        return
      }

      // Client-side preview
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        if (field === 'idFront') setField('idFrontPreview', dataUrl)
        if (field === 'idBack') setField('idBackPreview', dataUrl)
        if (field === 'selfie') setField('selfiePreview', dataUrl)
      }
      reader.readAsDataURL(file)

      // Store file reference
      if (field === 'idFront') setField('idFrontFile', file)
      if (field === 'idBack') setField('idBackFile', file)
      if (field === 'selfie') setField('selfieFile', file)

      // Upload to private storage via category: 'identity'
      // Files are saved to private-uploads/identity/ and served via /api/files/
      setUploadStatuses((prev) => ({ ...prev, [field]: 'uploading' }))
      try {
        const fd = new globalThis.FormData()
        fd.append('file', file)
        fd.append('category', 'identity')
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(data.error ?? 'Upload failed')
        }
        const { url } = await res.json() as { url: string }
        if (field === 'idFront') setField('idFrontUrl', url)
        if (field === 'idBack') setField('idBackUrl', url)
        if (field === 'selfie') setField('selfieUrl', url)
        setUploadStatuses((prev) => ({ ...prev, [field]: 'done' }))
      } catch (err) {
        setUploadStatuses((prev) => ({ ...prev, [field]: 'error' }))
        const msg = err instanceof Error ? err.message : 'Upload failed'
        setErrors((prev) => ({ ...prev, [field]: `Upload failed: ${msg}` }))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // ── Validation ──────────────────────────────────────────────────────────────

  function validateStep1(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!formData.displayName.trim()) e.displayName = 'Store name is required'
    if (formData.displayName.trim().length > 50) e.displayName = 'Max 50 characters'
    if (!formData.username.trim()) e.username = 'Username is required'
    if (formData.username.trim().length > 30) e.username = 'Max 30 characters'
    if (!/^[a-z0-9_]+$/.test(formData.username)) e.username = 'Only lowercase letters, numbers and underscores'
    if (usernameStatus === 'taken') e.username = 'This username is already taken'
    if (usernameStatus === 'checking') e.username = 'Still checking availability...'
    if (!formData.bio.trim()) e.bio = 'Bio is required'
    if (formData.bio.trim().length > 500) e.bio = 'Max 500 characters'
    return e
  }

  function validateStep2(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!formData.legalFullName.trim()) e.legalFullName = 'Full legal name is required'
    if (!formData.dateOfBirth) {
      e.dateOfBirth = 'Date of birth is required'
    } else {
      const dob = new Date(formData.dateOfBirth)
      const today = new Date()
      const age = today.getFullYear() - dob.getFullYear() -
        (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0)
      if (age < 18) e.dateOfBirth = 'You must be 18 or older to become a creator on noizu.direct.'
    }
    if (!formData.nationality.trim()) e.nationality = 'Nationality is required'
    if (!formData.country.trim()) e.country = 'Country is required'
    if (!formData.phone.trim()) e.phone = 'Phone is required'
    if (!formData.idNumber.trim()) e.idNumber = 'ID number is required'
    return e
  }

  function validateStep3(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!formData.idFrontUrl && uploadStatuses.idFront !== 'done') {
      e.idFront = 'ID front photo is required'
    }
    if (formData.idType === 'IC' && !formData.idBackUrl && uploadStatuses.idBack !== 'done') {
      e.idBack = 'ID back photo is required for IC'
    }
    if (!formData.selfieUrl && uploadStatuses.selfie !== 'done') {
      e.selfie = 'Selfie with ID is required'
    }
    if (uploadStatuses.idFront === 'uploading' || uploadStatuses.idBack === 'uploading' || uploadStatuses.selfie === 'uploading') {
      e.general = 'Please wait for uploads to complete'
    }
    return e
  }

  function validateStep4(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!formData.bankAccountNumber.trim() && !formData.paypalEmail.trim()) {
      e.bankAccountNumber = 'Please provide at least one payout method'
    }
    if (formData.bankAccountNumber.trim()) {
      if (!formData.bankName) e.bankName = 'Please select a bank'
      if (!formData.bankAccountName.trim()) e.bankAccountName = 'Account holder name is required'
    }
    return e
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  function goNext() {
    let errs: Record<string, string> = {}
    if (step === 1) errs = validateStep1()
    if (step === 2) errs = validateStep2()
    if (step === 3) errs = validateStep3()
    if (step === 4) errs = validateStep4()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setStep((s) => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    setErrors({})
    setStep((s) => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setIsSubmitting(true)
    setErrors({})
    try {
      // POST application
      const applyRes = await fetch('/api/creator/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: formData.displayName,
          username: formData.username,
          bio: formData.bio,
          tagline: formData.tagline,
          categoryTags: formData.categoryTags,
          legalFullName: formData.legalFullName,
          dateOfBirth: formData.dateOfBirth,
          nationality: formData.nationality,
          country: formData.country,
          phone: formData.phone,
          idType: formData.idType,
          idNumber: formData.idNumber,
          idFrontImage: formData.idFrontUrl,
          idBackImage: formData.idBackUrl,
          selfieImage: formData.selfieUrl,
          bankName: formData.bankName,
          bankAccountNumber: formData.bankAccountNumber,
          bankAccountName: formData.bankAccountName,
          paypalEmail: formData.paypalEmail,
        }),
      })

      if (!applyRes.ok) {
        const body = await applyRes.json() as { error?: string }
        throw new Error(body.error ?? 'Failed to submit application')
      }

      const applyData = await applyRes.json() as { id: string }
      setSubmittedRefId(applyData.id)

      // POST agreement signatures
      // Route expects: { signatures: [{templateId, signedName}], agreedToAll: true }
      const sigRes = await fetch('/api/agreements/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatures: agreements.map((a) => ({
            templateId: a.id,
            signedName: formData.signedName,
          })),
          agreedToAll: true,
        }),
      })

      if (!sigRes.ok) {
        // Non-fatal: application is submitted, log the actual error
        const errData = await sigRes.json().catch(() => ({})) as { error?: string }
        console.error('Agreement signing failed:', sigRes.status, errData)
      }

      setStep(6)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Something went wrong. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Agreement tab: mark as read ─────────────────────────────────────────────

  function openAgreementTab(id: string) {
    setActiveAgreementTab(id)
    setFormData((prev) => ({
      ...prev,
      readAgreements: new Set([...prev.readAgreements, id]),
    }))
  }

  const allAgreementsRead =
    agreements.length > 0 && agreements.every((a) => formData.readAgreements.has(a.id))

  const canSubmit =
    allAgreementsRead &&
    formData.agreeAll &&
    formData.agreeAge &&
    formData.agreeContent &&
    formData.signedName.trim().toLowerCase() === formData.legalFullName.trim().toLowerCase() &&
    formData.signedName.trim() !== ''

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Rejected application banner */}
        {hasRejectedApp && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/50 dark:bg-amber-900/20 dark:text-amber-200">
            <span className="font-semibold">Your previous application was not approved</span>
            {rejectionReason && (
              <span>: {rejectionReason}</span>
            )}
            <span className="block mt-1 text-amber-700 dark:text-amber-300">You may reapply below.</span>
          </div>
        )}

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-8">
          {/* Progress bar (steps 1–5 only) */}
          {step <= 5 && <ProgressBar step={step} />}

          {/* ── STEP 1: Store Profile ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Set up your creator store</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  This is what fans will see on your store page.
                </p>
              </div>

              {/* Display name */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Store / Display Name <span className="text-red-400">*</span>
                </label>
                <input
                  suppressHydrationWarning
                  type="text"
                  maxLength={50}
                  className={inputCls}
                  value={formData.displayName}
                  onChange={(e) => setField('displayName', e.target.value)}
                  placeholder="e.g. MikoArt Studio"
                />
                {errors.displayName && (
                  <p className="text-xs text-red-400">{errors.displayName}</p>
                )}
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Username <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    @
                  </span>
                  <input
                    suppressHydrationWarning
                    type="text"
                    maxLength={30}
                    className={`${inputCls} pl-7`}
                    value={formData.username}
                    onChange={(e) => setField('username', e.target.value.toLowerCase())}
                    placeholder="yourhandle"
                  />
                </div>
                {formData.username && (
                  <p className={`text-xs ${
                    usernameStatus === 'available' ? 'text-green-400'
                    : usernameStatus === 'taken' ? 'text-red-400'
                    : usernameStatus === 'invalid' ? 'text-red-400'
                    : usernameStatus === 'checking' ? 'text-muted-foreground'
                    : 'text-muted-foreground'
                  }`}>
                    {usernameStatus === 'available' && '✅ Username is available'}
                    {usernameStatus === 'taken' && '❌ Username is already taken'}
                    {usernameStatus === 'invalid' && '❌ Only lowercase letters, numbers and underscores allowed'}
                    {usernameStatus === 'checking' && 'Checking availability...'}
                  </p>
                )}
                {errors.username && (
                  <p className="text-xs text-red-400">{errors.username}</p>
                )}
              </div>

              {/* Category tags */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Category Tags
                </label>
                <p className="text-xs text-muted-foreground">Select all that apply</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {CATEGORY_OPTIONS.map((tag) => {
                    const selected = formData.categoryTags.includes(tag)
                    return (
                      <button
                        suppressHydrationWarning
                        key={tag}
                        type="button"
                        onClick={() => {
                          setField(
                            'categoryTags',
                            selected
                              ? formData.categoryTags.filter((t) => t !== tag)
                              : [...formData.categoryTags, tag],
                          )
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          selected
                            ? 'bg-primary text-white border-primary'
                            : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Bio <span className="text-red-400">*</span>
                </label>
                <textarea
                  suppressHydrationWarning
                  rows={4}
                  maxLength={500}
                  className={`${inputCls} resize-none`}
                  value={formData.bio}
                  onChange={(e) => setField('bio', e.target.value)}
                  placeholder="Tell fans about yourself and what you create..."
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.bio.length} / 500
                </p>
                {errors.bio && <p className="text-xs text-red-400">{errors.bio}</p>}
              </div>

              {/* Tagline */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Store Tagline{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  suppressHydrationWarning
                  type="text"
                  maxLength={100}
                  className={inputCls}
                  value={formData.tagline}
                  onChange={(e) => setField('tagline', e.target.value)}
                  placeholder="A short catchy line about your store"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button suppressHydrationWarning type="button" className={btnPrimaryCls} onClick={goNext}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Personal Details ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Personal details</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Kept private. Used only for identity verification and payouts.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2.5 text-sm text-primary">
                <span>🔒</span>
                <span>This information is encrypted and never shown publicly.</span>
              </div>

              {/* Full legal name */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Full Legal Name <span className="text-red-400">*</span>
                </label>
                <input
                  suppressHydrationWarning
                  type="text"
                  className={inputCls}
                  value={formData.legalFullName}
                  onChange={(e) => setField('legalFullName', e.target.value)}
                  placeholder="As shown on your ID"
                />
                {errors.legalFullName && (
                  <p className="text-xs text-red-400">{errors.legalFullName}</p>
                )}
              </div>

              {/* Date of birth */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Date of Birth <span className="text-red-400">*</span>
                </label>
                <input
                  suppressHydrationWarning
                  type="date"
                  className={inputCls}
                  value={formData.dateOfBirth}
                  max={todayIso()}
                  onChange={(e) => setField('dateOfBirth', e.target.value)}
                />
                {errors.dateOfBirth && (
                  <p className="text-xs text-red-400">{errors.dateOfBirth}</p>
                )}
              </div>

              {/* Nationality + Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    Nationality <span className="text-red-400">*</span>
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    className={inputCls}
                    value={formData.nationality}
                    onChange={(e) => setField('nationality', e.target.value)}
                    placeholder="e.g. Malaysian"
                  />
                  {errors.nationality && (
                    <p className="text-xs text-red-400">{errors.nationality}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    Country of Residence <span className="text-red-400">*</span>
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    className={inputCls}
                    value={formData.country}
                    onChange={(e) => setField('country', e.target.value)}
                    placeholder="e.g. Malaysia"
                  />
                  {errors.country && (
                    <p className="text-xs text-red-400">{errors.country}</p>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <input
                  suppressHydrationWarning
                  type="tel"
                  className={inputCls}
                  value={formData.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  placeholder="+60 12-345 6789"
                />
                {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
              </div>

              {/* ID Type */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  ID Type <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-6">
                  {(['IC', 'PASSPORT'] as const).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        suppressHydrationWarning
                        type="radio"
                        name="idType"
                        value={type}
                        checked={formData.idType === type}
                        onChange={() => setField('idType', type)}
                        className="accent-primary"
                      />
                      <span className="text-sm text-foreground">
                        {type === 'IC' ? 'MyKad / IC' : 'Passport'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ID Number */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  {formData.idType === 'IC' ? 'IC Number' : 'Passport Number'}{' '}
                  <span className="text-red-400">*</span>
                </label>
                <input
                  suppressHydrationWarning
                  type="text"
                  className={inputCls}
                  value={formData.idNumber}
                  onChange={(e) => setField('idNumber', e.target.value)}
                  placeholder={formData.idType === 'IC' ? 'e.g. 900101-01-1234' : 'e.g. A12345678'}
                />
                {errors.idNumber && <p className="text-xs text-red-400">{errors.idNumber}</p>}
              </div>

              <div className="flex justify-between pt-2">
                <button suppressHydrationWarning type="button" className={btnSecondaryCls} onClick={goBack}>
                  ← Back
                </button>
                <button suppressHydrationWarning type="button" className={btnPrimaryCls} onClick={goNext}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Identity Verification ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Verify your identity</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Documents are encrypted and admin-only.
                </p>
              </div>

              <UploadZone
                label="ID Front Photo"
                required
                preview={formData.idFrontPreview}
                uploadStatus={uploadStatuses.idFront}
                onFile={(f) => handleFileUpload(f, 'idFront')}
              />
              {errors.idFront && <p className="text-xs text-red-400 -mt-4">{errors.idFront}</p>}

              <UploadZone
                label={`ID Back Photo${formData.idType === 'PASSPORT' ? ' (not required for Passport)' : ''}`}
                required={formData.idType === 'IC'}
                preview={formData.idBackPreview}
                uploadStatus={uploadStatuses.idBack}
                onFile={(f) => handleFileUpload(f, 'idBack')}
              />
              {errors.idBack && <p className="text-xs text-red-400 -mt-4">{errors.idBack}</p>}

              <UploadZone
                label="Selfie Holding Your ID"
                required
                preview={formData.selfiePreview}
                uploadStatus={uploadStatuses.selfie}
                onFile={(f) => handleFileUpload(f, 'selfie')}
              />
              {errors.selfie && <p className="text-xs text-red-400 -mt-4">{errors.selfie}</p>}

              <div className="rounded-lg bg-background border border-border px-4 py-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Note:</span> Your documents are reviewed securely by our team within 24–48 hours. You'll receive an email update.
              </div>

              {errors.general && (
                <p className="text-xs text-red-400">{errors.general}</p>
              )}

              <div className="flex justify-between pt-2">
                <button suppressHydrationWarning type="button" className={btnSecondaryCls} onClick={goBack}>
                  ← Back
                </button>
                <button suppressHydrationWarning type="button" className={btnPrimaryCls} onClick={goNext}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Payout Setup ── */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Set up your payouts</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose how you want to receive your earnings.
                </p>
              </div>

              {/* Bank section */}
              <div className="rounded-xl border border-border p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Bank Transfer
                </h2>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Bank</label>
                  <select
                    suppressHydrationWarning
                    className={inputCls}
                    value={formData.bankName}
                    onChange={(e) => setField('bankName', e.target.value)}
                  >
                    <option value="">Select bank...</option>
                    {BANK_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  {errors.bankName && (
                    <p className="text-xs text-red-400">{errors.bankName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    Account Number
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    className={inputCls}
                    value={formData.bankAccountNumber}
                    onChange={(e) => setField('bankAccountNumber', e.target.value)}
                    placeholder="e.g. 1234567890"
                  />
                  {errors.bankAccountNumber && (
                    <p className="text-xs text-red-400">{errors.bankAccountNumber}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    Account Holder Name
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    className={inputCls}
                    value={formData.bankAccountName}
                    onChange={(e) => setField('bankAccountName', e.target.value)}
                    placeholder="As shown on bank account"
                  />
                  {errors.bankAccountName && (
                    <p className="text-xs text-red-400">{errors.bankAccountName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    Bank Country
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    className={inputCls}
                    value={formData.bankCountry}
                    onChange={(e) => setField('bankCountry', e.target.value)}
                    placeholder="e.g. Malaysia"
                  />
                </div>
              </div>

              {/* OR separator */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">OR</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* PayPal */}
              <div className="rounded-xl border border-border p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  PayPal
                </h2>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    PayPal Email{' '}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    suppressHydrationWarning
                    type="email"
                    className={inputCls}
                    value={formData.paypalEmail}
                    onChange={(e) => setField('paypalEmail', e.target.value)}
                    placeholder="paypal@example.com"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-background border border-border px-4 py-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Note:</span> Your payout method is
                reviewed during verification. You can update it later from your dashboard.
              </div>

              <div className="flex justify-between pt-2">
                <button suppressHydrationWarning type="button" className={btnSecondaryCls} onClick={goBack}>
                  ← Back
                </button>
                <button suppressHydrationWarning type="button" className={btnPrimaryCls} onClick={goNext}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 5: Agreements ── */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Review and sign agreements</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Please read all agreements before signing.
                </p>
              </div>

              {/* Tabs */}
              <div className="border-b border-border overflow-x-auto">
                <div className="flex gap-0 min-w-max">
                  {agreements.map((ag) => {
                    const isRead = formData.readAgreements.has(ag.id)
                    const isActive = activeAgreementTab === ag.id
                    return (
                      <button
                        suppressHydrationWarning
                        key={ag.id}
                        type="button"
                        onClick={() => openAgreementTab(ag.id)}
                        className={`px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                          isActive
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                        }`}
                      >
                        {isRead ? '✓ ' : ''}{AGREEMENT_TAB_LABELS[ag.type] ?? ag.type}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Read counter */}
              <p className="text-xs text-muted-foreground">
                Read{' '}
                <span className={`font-semibold ${allAgreementsRead ? 'text-green-400' : 'text-foreground'}`}>
                  {formData.readAgreements.size}
                </span>{' '}
                of {agreements.length}
                {!allAgreementsRead && (
                  <span className="text-yellow-400/80 ml-2">
                    — click each tab to mark as read
                  </span>
                )}
              </p>

              {/* Active agreement content */}
              {agreements.map((ag) =>
                ag.id === activeAgreementTab ? (
                  <div key={ag.id} className="space-y-3">
                    <div className="flex flex-wrap items-baseline gap-3">
                      <h2 className="text-base font-semibold text-foreground">{ag.title}</h2>
                      <span className="text-xs text-muted-foreground">
                        v{ag.version} · Effective {formatDate(ag.effectiveDate)}
                      </span>
                    </div>
                    {ag.summary && (
                      <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 text-sm text-foreground/80">
                        <span className="font-medium text-primary">Summary: </span>
                        {ag.summary}
                      </div>
                    )}
                    <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {ag.content}
                    </div>
                  </div>
                ) : null,
              )}

              {/* Signature section — only shown after all tabs opened */}
              {allAgreementsRead && (
                <div className="rounded-xl border border-border bg-background p-5 space-y-4">
                  <p className="text-sm text-foreground font-medium">
                    By signing below you confirm you have read and agree to all{' '}
                    {agreements.length} agreements listed above.
                  </p>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-foreground">
                      Full Legal Name (signature){' '}
                      <span className="text-red-400">*</span>
                    </label>
                    <input
                      suppressHydrationWarning
                      type="text"
                      className={inputCls}
                      value={formData.signedName}
                      onChange={(e) => setField('signedName', e.target.value)}
                      placeholder={`Type your full name: ${formData.legalFullName}`}
                    />
                    {formData.signedName &&
                      formData.signedName.trim().toLowerCase() !==
                        formData.legalFullName.trim().toLowerCase() && (
                        <p className="text-xs text-red-400">
                          Name must match your legal name: &ldquo;{formData.legalFullName}&rdquo;
                        </p>
                      )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-foreground">Date</label>
                    <input
                      suppressHydrationWarning
                      type="text"
                      className={`${inputCls} cursor-not-allowed opacity-60`}
                      value={formatDate(new Date().toISOString())}
                      readOnly
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        suppressHydrationWarning
                        type="checkbox"
                        className="mt-0.5 accent-primary shrink-0"
                        checked={formData.agreeAge}
                        onChange={(e) => setField('agreeAge', e.target.checked)}
                      />
                      <span className="text-sm text-foreground">
                        I confirm I am 18 or older
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        suppressHydrationWarning
                        type="checkbox"
                        className="mt-0.5 accent-primary shrink-0"
                        checked={formData.agreeAll}
                        onChange={(e) => setField('agreeAll', e.target.checked)}
                      />
                      <span className="text-sm text-foreground">
                        I have read and agree to all {agreements.length} agreements
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        suppressHydrationWarning
                        type="checkbox"
                        className="mt-0.5 accent-primary shrink-0"
                        checked={formData.agreeContent}
                        onChange={(e) => setField('agreeContent', e.target.checked)}
                      />
                      <span className="text-sm text-foreground">
                        I declare all content I sell will be original or properly licensed
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {errors.general && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                  {errors.general}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button suppressHydrationWarning type="button" className={btnSecondaryCls} onClick={goBack}>
                  ← Back
                </button>
                <button
                  suppressHydrationWarning
                  type="button"
                  className={btnPrimaryCls}
                  disabled={!canSubmit || isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application →'}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 6: Submitted ── */}
          {step === 6 && (
            <div className="text-center space-y-6 py-4">
              <div className="text-5xl">🎉</div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Application submitted!</h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  Thank you <span className="font-semibold text-foreground">{formData.displayName}</span>!
                  Your creator application has been submitted successfully. Our team will review
                  your application within 24–48 hours. You will receive an email at{' '}
                  <span className="font-semibold text-foreground">{userEmail}</span> with the outcome.
                </p>
              </div>

              {/* Checklist */}
              <div className="rounded-xl border border-border bg-background p-5 text-left space-y-2.5 max-w-sm mx-auto">
                {[
                  'Your agreements have been saved',
                  'Your store profile has been reserved',
                  `Your username @${formData.username} is reserved`,
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="text-green-400 font-bold shrink-0">✓</span>
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>

              {/* Reference number */}
              {submittedRefId && (
                <p className="text-xs text-muted-foreground">
                  Application reference:{' '}
                  <span className="font-mono text-foreground">{submittedRefId}</span>
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link
                  href="/marketplace"
                  className={btnSecondaryCls}
                >
                  Browse Marketplace →
                </Link>
                <Link
                  href="/"
                  className={btnPrimaryCls}
                >
                  Back to Home →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
