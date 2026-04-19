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
  nationality: string    // stores citizenship country CODE (e.g. 'MY')
  country: string        // stores residence country CODE (e.g. 'MY')
  phone: string          // local number only — dial code derived from country
  idType: IdType
  idNumber: string
  idOtherDescription: string
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
  bankCountryCode: string
  bankCurrency: string
  bankAccountName: string
  bankName: string
  bankCode: string
  bankAccountNumber: string
  bankRoutingCode: string
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

// ─── Country + ID types ───────────────────────────────────────────────────────

interface Country {
  code: string
  name: string
  dialCode: string
  flag: string
  idTier: 1 | 2   // 1 = has national ID, 2 = no national ID (passport/driver's/gov)
}

type IdType = 'NATIONAL_ID' | 'PASSPORT' | 'DRIVERS_LICENSE' | 'GOVERNMENT_ID' | 'OTHER'

const COUNTRIES: Country[] = [
  // Southeast Asia
  { code: 'MY', name: 'Malaysia',          dialCode: '+60',  flag: '🇲🇾', idTier: 1 },
  { code: 'SG', name: 'Singapore',         dialCode: '+65',  flag: '🇸🇬', idTier: 1 },
  { code: 'ID', name: 'Indonesia',         dialCode: '+62',  flag: '🇮🇩', idTier: 1 },
  { code: 'PH', name: 'Philippines',       dialCode: '+63',  flag: '🇵🇭', idTier: 1 },
  { code: 'TH', name: 'Thailand',          dialCode: '+66',  flag: '🇹🇭', idTier: 1 },
  { code: 'VN', name: 'Vietnam',           dialCode: '+84',  flag: '🇻🇳', idTier: 1 },
  { code: 'MM', name: 'Myanmar',           dialCode: '+95',  flag: '🇲🇲', idTier: 1 },
  { code: 'KH', name: 'Cambodia',          dialCode: '+855', flag: '🇰🇭', idTier: 1 },
  { code: 'LA', name: 'Laos',              dialCode: '+856', flag: '🇱🇦', idTier: 1 },
  { code: 'BN', name: 'Brunei',            dialCode: '+673', flag: '🇧🇳', idTier: 1 },
  // East Asia
  { code: 'HK', name: 'Hong Kong',         dialCode: '+852', flag: '🇭🇰', idTier: 1 },
  { code: 'CN', name: 'China',             dialCode: '+86',  flag: '🇨🇳', idTier: 1 },
  { code: 'TW', name: 'Taiwan',            dialCode: '+886', flag: '🇹🇼', idTier: 1 },
  { code: 'JP', name: 'Japan',             dialCode: '+81',  flag: '🇯🇵', idTier: 1 },
  { code: 'KR', name: 'South Korea',       dialCode: '+82',  flag: '🇰🇷', idTier: 1 },
  { code: 'MN', name: 'Mongolia',          dialCode: '+976', flag: '🇲🇳', idTier: 1 },
  // South Asia
  { code: 'IN', name: 'India',             dialCode: '+91',  flag: '🇮🇳', idTier: 1 },
  { code: 'BD', name: 'Bangladesh',        dialCode: '+880', flag: '🇧🇩', idTier: 1 },
  { code: 'PK', name: 'Pakistan',          dialCode: '+92',  flag: '🇵🇰', idTier: 1 },
  { code: 'LK', name: 'Sri Lanka',         dialCode: '+94',  flag: '🇱🇰', idTier: 1 },
  { code: 'NP', name: 'Nepal',             dialCode: '+977', flag: '🇳🇵', idTier: 1 },
  // Middle East
  { code: 'AE', name: 'UAE',               dialCode: '+971', flag: '🇦🇪', idTier: 1 },
  { code: 'SA', name: 'Saudi Arabia',      dialCode: '+966', flag: '🇸🇦', idTier: 1 },
  { code: 'QA', name: 'Qatar',             dialCode: '+974', flag: '🇶🇦', idTier: 1 },
  { code: 'KW', name: 'Kuwait',            dialCode: '+965', flag: '🇰🇼', idTier: 1 },
  // Oceania
  { code: 'AU', name: 'Australia',         dialCode: '+61',  flag: '🇦🇺', idTier: 2 },
  { code: 'NZ', name: 'New Zealand',       dialCode: '+64',  flag: '🇳🇿', idTier: 2 },
  // Europe
  { code: 'GB', name: 'United Kingdom',    dialCode: '+44',  flag: '🇬🇧', idTier: 2 },
  { code: 'IE', name: 'Ireland',           dialCode: '+353', flag: '🇮🇪', idTier: 2 },
  { code: 'DE', name: 'Germany',           dialCode: '+49',  flag: '🇩🇪', idTier: 1 },
  { code: 'FR', name: 'France',            dialCode: '+33',  flag: '🇫🇷', idTier: 1 },
  { code: 'NL', name: 'Netherlands',       dialCode: '+31',  flag: '🇳🇱', idTier: 1 },
  { code: 'IT', name: 'Italy',             dialCode: '+39',  flag: '🇮🇹', idTier: 1 },
  { code: 'ES', name: 'Spain',             dialCode: '+34',  flag: '🇪🇸', idTier: 1 },
  { code: 'PT', name: 'Portugal',          dialCode: '+351', flag: '🇵🇹', idTier: 1 },
  { code: 'SE', name: 'Sweden',            dialCode: '+46',  flag: '🇸🇪', idTier: 1 },
  { code: 'CH', name: 'Switzerland',       dialCode: '+41',  flag: '🇨🇭', idTier: 1 },
  { code: 'PL', name: 'Poland',            dialCode: '+48',  flag: '🇵🇱', idTier: 1 },
  { code: 'RU', name: 'Russia',            dialCode: '+7',   flag: '🇷🇺', idTier: 1 },
  // Americas
  { code: 'US', name: 'United States',     dialCode: '+1',   flag: '🇺🇸', idTier: 2 },
  { code: 'CA', name: 'Canada',            dialCode: '+1',   flag: '🇨🇦', idTier: 2 },
  { code: 'MX', name: 'Mexico',            dialCode: '+52',  flag: '🇲🇽', idTier: 1 },
  { code: 'BR', name: 'Brazil',            dialCode: '+55',  flag: '🇧🇷', idTier: 1 },
  // Africa
  { code: 'ZA', name: 'South Africa',      dialCode: '+27',  flag: '🇿🇦', idTier: 1 },
  { code: 'NG', name: 'Nigeria',           dialCode: '+234', flag: '🇳🇬', idTier: 1 },
  { code: 'GH', name: 'Ghana',             dialCode: '+233', flag: '🇬🇭', idTier: 1 },
]

function getIdOptions(citizenshipCode: string): { value: IdType; label: string }[] {
  const country = COUNTRIES.find(c => c.code === citizenshipCode)
  if (!country || country.idTier === 1) {
    return [
      { value: 'NATIONAL_ID',   label: 'National ID Card' },
      { value: 'PASSPORT',      label: 'Passport' },
      { value: 'OTHER',         label: 'Other government document' },
    ]
  }
  return [
    { value: 'PASSPORT',        label: 'Passport' },
    { value: 'DRIVERS_LICENSE', label: "Driver's Licence" },
    { value: 'GOVERNMENT_ID',   label: 'State / Government ID' },
    { value: 'OTHER',           label: 'Other government document' },
  ]
}

function getIdNumberLabel(idType: IdType): string {
  switch (idType) {
    case 'NATIONAL_ID':       return 'National ID Number'
    case 'PASSPORT':          return 'Passport Number'
    case 'DRIVERS_LICENSE':   return "Driver's Licence Number"
    case 'GOVERNMENT_ID':     return 'Government ID Number'
    case 'OTHER':             return 'Document Reference Number (if any)'
  }
}

interface PayoutCountry {
  code: string
  name: string
  currency: string
  currencyCode: string
  routingLabel?: string  // e.g. "ABA Routing Number", "Sort Code", "BSB"
  supported: boolean
}

const PAYOUT_COUNTRIES: PayoutCountry[] = [
  // SEA
  { code: 'MY', name: 'Malaysia', currency: 'Malaysian Ringgit', currencyCode: 'MYR', supported: true },
  { code: 'SG', name: 'Singapore', currency: 'Singapore Dollar', currencyCode: 'SGD', supported: true },
  { code: 'ID', name: 'Indonesia', currency: 'Indonesian Rupiah', currencyCode: 'IDR', supported: true },
  { code: 'PH', name: 'Philippines', currency: 'Philippine Peso', currencyCode: 'PHP', supported: true },
  { code: 'TH', name: 'Thailand', currency: 'Thai Baht', currencyCode: 'THB', supported: true },
  { code: 'VN', name: 'Vietnam', currency: 'Vietnamese Dong', currencyCode: 'VND', supported: true },
  { code: 'HK', name: 'Hong Kong', currency: 'Hong Kong Dollar', currencyCode: 'HKD', supported: true },
  // East Asia
  { code: 'JP', name: 'Japan', currency: 'Japanese Yen', currencyCode: 'JPY', supported: true },
  { code: 'KR', name: 'South Korea', currency: 'South Korean Won', currencyCode: 'KRW', supported: true },
  { code: 'TW', name: 'Taiwan', currency: 'New Taiwan Dollar', currencyCode: 'TWD', supported: true },
  // Oceania
  { code: 'AU', name: 'Australia', currency: 'Australian Dollar', currencyCode: 'AUD', routingLabel: 'BSB Number', supported: true },
  { code: 'NZ', name: 'New Zealand', currency: 'New Zealand Dollar', currencyCode: 'NZD', supported: true },
  // Europe
  { code: 'GB', name: 'United Kingdom', currency: 'British Pound', currencyCode: 'GBP', routingLabel: 'Sort Code', supported: true },
  { code: 'EU', name: 'Europe (SEPA)', currency: 'Euro', currencyCode: 'EUR', routingLabel: 'IBAN', supported: true },
  // Americas
  { code: 'US', name: 'United States', currency: 'US Dollar', currencyCode: 'USD', routingLabel: 'ABA Routing Number', supported: true },
  { code: 'CA', name: 'Canada', currency: 'Canadian Dollar', currencyCode: 'CAD', routingLabel: 'Transit + Institution No.', supported: true },
  { code: 'MX', name: 'Mexico', currency: 'Mexican Peso', currencyCode: 'MXN', supported: true },
  { code: 'BR', name: 'Brazil', currency: 'Brazilian Real', currencyCode: 'BRL', supported: true },
  // Middle East
  { code: 'AE', name: 'United Arab Emirates', currency: 'UAE Dirham', currencyCode: 'AED', supported: true },
  // Unsupported examples
  { code: 'MM', name: 'Myanmar', currency: 'Myanmar Kyat', currencyCode: 'MMK', supported: false },
  { code: 'KH', name: 'Cambodia', currency: 'Cambodian Riel', currencyCode: 'KHR', supported: false },
  { code: 'LA', name: 'Laos', currency: 'Lao Kip', currencyCode: 'LAK', supported: false },
  { code: 'OTHER', name: 'Other country', currency: '', currencyCode: '', supported: false },
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

// ─── Flag image component ─────────────────────────────────────────────────────

function CountryFlag({ code, size = 18 }: { code: string; size?: number }) {
  if (!code) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt={code}
      style={{ height: size, width: 'auto', display: 'inline-block' }}
      className="rounded-sm shrink-0"
    />
  )
}

// ─── Country select with flag prefix ─────────────────────────────────────────

function CountrySelect({
  value,
  onChange,
  placeholder = 'Select country…',
}: {
  value: string
  onChange: (code: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex items-stretch border border-border rounded-lg overflow-hidden focus-within:border-primary transition-colors bg-background">
      <div className="flex items-center justify-center px-3 bg-background border-r border-border min-w-[48px]">
        {value ? (
          <CountryFlag code={value} size={18} />
        ) : (
          <span className="text-muted-foreground text-xs">🌐</span>
        )}
      </div>
      <select
        suppressHydrationWarning
        className="flex-1 px-3 py-2 bg-background text-foreground text-sm focus:outline-none appearance-none cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {COUNTRIES.map(c => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>
    </div>
  )
}

function ProgressBar({ step, onGoTo }: { step: number; onGoTo: (idx: number) => void }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-1">
        {STEP_NAMES.map((name, i) => {
          const idx = i + 1
          const isCompleted = step > idx
          const isCurrent = step === idx
          const isClickable = isCompleted
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
                <button
                  suppressHydrationWarning
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onGoTo(idx)}
                  className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors ${
                    isCompleted
                      ? 'bg-primary border-primary text-white cursor-pointer hover:opacity-80'
                      : isCurrent
                      ? 'border-primary text-primary bg-background cursor-default'
                      : 'border-border text-muted-foreground bg-background cursor-default'
                  }`}
                >
                  {isCompleted ? '✓' : idx}
                </button>
                {i < STEP_NAMES.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      isCompleted ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>
              <span
                onClick={() => isClickable && onGoTo(idx)}
                className={`mt-1.5 text-xs text-center leading-tight hidden sm:block ${
                  isCurrent
                    ? 'text-primary font-semibold'
                    : isCompleted
                    ? 'text-foreground cursor-pointer hover:text-primary hover:underline'
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
  const [kycSkipped, setKycSkipped] = useState(false)
  const [showKycSkipWarning, setShowKycSkipWarning] = useState(false)

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
    idType: 'NATIONAL_ID',
    idNumber: '',
    idOtherDescription: '',
    idFrontFile: null,
    idBackFile: null,
    selfieFile: null,
    idFrontPreview: '',
    idBackPreview: '',
    selfiePreview: '',
    idFrontUrl: '',
    idBackUrl: '',
    selfieUrl: '',
    bankCountryCode: '',
    bankCurrency: '',
    bankAccountName: '',
    bankName: '',
    bankCode: '',
    bankAccountNumber: '',
    bankRoutingCode: '',
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

  // Bank search state
  const [bankSearchQuery, setBankSearchQuery] = useState('')
  const [bankSearchResults, setBankSearchResults] = useState<{ label: string; value: string }[]>([])
  const [bankSearchLoading, setBankSearchLoading] = useState(false)
  const [showBankDropdown, setShowBankDropdown] = useState(false)
  const [bankApiAvailable, setBankApiAvailable] = useState<boolean | null>(null)
  const bankSearchRef = useRef<HTMLDivElement>(null)
  const bankDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // ── Reset idType when citizenship changes ───────────────────────────────────

  useEffect(() => {
    if (!formData.nationality) return
    const validValues = getIdOptions(formData.nationality).map(o => o.value)
    if (!validValues.includes(formData.idType)) {
      setField('idType', validValues[0])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.nationality])

  // ── Bank search ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!formData.bankCountryCode || !formData.bankCurrency || bankSearchQuery.length < 1) {
      setBankSearchResults([])
      setShowBankDropdown(false)
      return
    }
    if (bankDebounceRef.current) clearTimeout(bankDebounceRef.current)
    setBankSearchLoading(true)
    bankDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/airwallex/banks?country=${formData.bankCountryCode}&currency=${formData.bankCurrency}&keyword=${encodeURIComponent(bankSearchQuery)}`,
        )
        if (res.ok) {
          const data = await res.json() as { banks: { label: string; value: string }[]; apiAvailable: boolean }
          setBankSearchResults(data.banks)
          setBankApiAvailable(data.apiAvailable || data.banks.length > 0)
          setShowBankDropdown(data.banks.length > 0)
        }
      } catch { /* ignore */ } finally {
        setBankSearchLoading(false)
      }
    }, 300)
    return () => { if (bankDebounceRef.current) clearTimeout(bankDebounceRef.current) }
  }, [bankSearchQuery, formData.bankCountryCode, formData.bankCurrency])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bankSearchRef.current && !bankSearchRef.current.contains(e.target as Node)) {
        setShowBankDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    if (!formData.nationality) e.nationality = 'Citizenship is required'
    if (!formData.country) e.country = 'Country of residence is required'
    if (!formData.phone.trim()) e.phone = 'Phone number is required'
    if (!formData.idNumber.trim() && formData.idType !== 'OTHER') e.idNumber = 'ID number is required'
    if (formData.idType === 'OTHER' && !formData.idOtherDescription.trim()) {
      e.idOtherDescription = 'Please describe your document'
    }
    return e
  }

  function validateStep3(): Record<string, string> {
    const e: Record<string, string> = {}
    if (kycSkipped) return e
    if (uploadStatuses.idFront === 'uploading' || uploadStatuses.idBack === 'uploading' || uploadStatuses.selfie === 'uploading') {
      e.general = 'Please wait for uploads to complete'
    }
    return e
  }

  function validateStep4(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!formData.bankCountryCode) {
      e.bankCountryCode = 'Please select your country'
      return e
    }
    const selectedCountry = PAYOUT_COUNTRIES.find(c => c.code === formData.bankCountryCode)
    if (selectedCountry?.supported) {
      if (!formData.bankAccountNumber.trim()) e.bankAccountNumber = 'Account number is required'
      if (!formData.bankAccountName.trim()) e.bankAccountName = 'Account holder name is required'
      if (!formData.bankName.trim()) e.bankName = 'Bank name is required'
    } else {
      // Unsupported country — PayPal required
      if (!formData.paypalEmail.trim()) e.paypalEmail = 'PayPal email is required for your country'
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
          nationality: COUNTRIES.find(c => c.code === formData.nationality)?.name ?? formData.nationality,
          country: COUNTRIES.find(c => c.code === formData.country)?.name ?? formData.country,
          phone: (COUNTRIES.find(c => c.code === formData.country)?.dialCode ?? '') + formData.phone,
          idType: formData.idType,
          idNumber: formData.idNumber,
          idOtherDescription: formData.idOtherDescription,
          idFrontImage: formData.idFrontUrl,
          idBackImage: formData.idBackUrl,
          selfieImage: formData.selfieUrl,
          kycCompleted: !kycSkipped && !!(formData.idFrontUrl && formData.selfieUrl),
          bankCountryCode: formData.bankCountryCode,
          bankCurrency: formData.bankCurrency,
          bankAccountName: formData.bankAccountName,
          bankName: formData.bankName,
          bankCode: formData.bankCode,
          bankAccountNumber: formData.bankAccountNumber,
          bankRoutingCode: formData.bankRoutingCode,
          paypalEmail: formData.paypalEmail,
        }),
      })

      if (!applyRes.ok) {
        const body = await applyRes.json() as { error?: string }
        throw new Error(body.error ?? 'Failed to submit application')
      }

      const applyData = await applyRes.json() as { ok: boolean; applicationId: string }
      setSubmittedRefId(applyData.applicationId)

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
          {step <= 5 && (
            <ProgressBar
              step={step}
              onGoTo={(idx) => {
                setErrors({})
                setStep(idx)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          )}

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
          {step === 2 && (() => {
            const citizenshipCountry = COUNTRIES.find(c => c.code === formData.nationality)
            const residenceCountry   = COUNTRIES.find(c => c.code === formData.country)
            const dialCode           = residenceCountry?.dialCode ?? ''
            const idOptions          = getIdOptions(formData.nationality)
            return (
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

              {/* Citizenship + Country of Residence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    Citizenship <span className="text-red-400">*</span>
                  </label>
                  <CountrySelect
                    value={formData.nationality}
                    onChange={(code) => {
                      setField('nationality', code)
                      setField('idOtherDescription', '')
                    }}
                  />
                  {errors.nationality && (
                    <p className="text-xs text-red-400">{errors.nationality}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    Country of Residence <span className="text-red-400">*</span>
                  </label>
                  <CountrySelect
                    value={formData.country}
                    onChange={(code) => setField('country', code)}
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
                <div className="flex gap-2">
                  {dialCode && (
                    <div className="shrink-0 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground font-medium select-none whitespace-nowrap flex items-center gap-2">
                      <CountryFlag code={formData.country} size={16} />
                      <span className="text-muted-foreground">{dialCode}</span>
                    </div>
                  )}
                  <input
                    suppressHydrationWarning
                    type="tel"
                    className={inputCls}
                    value={formData.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    placeholder={dialCode ? 'Local number e.g. 16-123 4567' : 'Select country of residence first'}
                    disabled={!dialCode}
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
              </div>

              {/* ID Document Type — driven by citizenship */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Identity Document <span className="text-red-400">*</span>
                </label>
                {!formData.nationality && (
                  <p className="text-xs text-muted-foreground">Select your citizenship above to see available ID options.</p>
                )}
                <div className="flex flex-wrap gap-4">
                  {idOptions.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        suppressHydrationWarning
                        type="radio"
                        name="idType"
                        value={opt.value}
                        checked={formData.idType === opt.value}
                        onChange={() => {
                          setField('idType', opt.value)
                          setField('idOtherDescription', '')
                          setField('idNumber', '')
                        }}
                        className="accent-primary"
                      />
                      <span className="text-sm text-foreground">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ID Description — only for OTHER */}
              {formData.idType === 'OTHER' && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    Document Description <span className="text-red-400">*</span>
                  </label>
                  <input
                    suppressHydrationWarning
                    type="text"
                    className={inputCls}
                    value={formData.idOtherDescription}
                    onChange={(e) => setField('idOtherDescription', e.target.value)}
                    placeholder="e.g. Refugee travel document, Birth certificate"
                  />
                  <p className="text-xs text-muted-foreground">Our admin will review and confirm if this is acceptable.</p>
                  {errors.idOtherDescription && <p className="text-xs text-red-400">{errors.idOtherDescription}</p>}
                </div>
              )}

              {/* ID Number */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  {formData.idType ? getIdNumberLabel(formData.idType) : 'ID Number'}{' '}
                  {formData.idType !== 'OTHER' && <span className="text-red-400">*</span>}
                  {formData.idType === 'OTHER' && <span className="text-muted-foreground font-normal">(optional)</span>}
                </label>
                <input
                  suppressHydrationWarning
                  type="text"
                  className={inputCls}
                  value={formData.idNumber}
                  onChange={(e) => setField('idNumber', e.target.value)}
                  placeholder="Reference number on the document"
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
            )
          })()}

          {/* ── STEP 3: Identity Verification ── */}
          {step === 3 && (
            <div className="space-y-6">
              {/* KYC Skip Warning Modal */}
              {showKycSkipWarning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                  <div className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
                    <div className="text-2xl text-center">⚠️</div>
                    <h2 className="text-lg font-bold text-foreground text-center">Skip identity verification?</h2>
                    <p className="text-sm text-muted-foreground text-center leading-relaxed">
                      Your store can still be <span className="font-semibold text-foreground">approved and sell</span> without KYC documents, but you will <span className="font-semibold text-foreground">not receive a Verified badge</span>. Buyers will see your store as unverified.
                    </p>
                    <p className="text-sm text-muted-foreground text-center">
                      You can complete verification anytime from your creator dashboard.
                    </p>
                    <div className="flex gap-3 pt-2">
                      <button
                        suppressHydrationWarning
                        type="button"
                        className={btnSecondaryCls + ' flex-1'}
                        onClick={() => setShowKycSkipWarning(false)}
                      >
                        Go back
                      </button>
                      <button
                        suppressHydrationWarning
                        type="button"
                        className="flex-1 px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-lg text-sm font-semibold transition-colors"
                        onClick={() => {
                          setKycSkipped(true)
                          setShowKycSkipWarning(false)
                          setErrors({})
                          setStep((s) => s + 1)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      >
                        Skip for now
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h1 className="text-2xl font-bold text-foreground">Verify your identity</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Documents are encrypted and admin-only. <span className="text-amber-400 font-medium">Optional — you can skip and complete later.</span>
                </p>
              </div>

              {kycSkipped && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-400">
                  ⚠️ KYC skipped. Your store can be approved but will show as <span className="font-semibold">Unverified</span> to buyers. Complete verification from your dashboard to get the Verified badge.
                </div>
              )}

              {!kycSkipped && (
                <>
                  <UploadZone
                    label="ID Front Photo"
                    required={false}
                    preview={formData.idFrontPreview}
                    uploadStatus={uploadStatuses.idFront}
                    onFile={(f) => handleFileUpload(f, 'idFront')}
                  />
                  {errors.idFront && <p className="text-xs text-red-400 -mt-4">{errors.idFront}</p>}

                  <UploadZone
                    label={`ID Back Photo${formData.idType === 'PASSPORT' ? ' (not required for Passport)' : ''}`}
                    required={false}
                    preview={formData.idBackPreview}
                    uploadStatus={uploadStatuses.idBack}
                    onFile={(f) => handleFileUpload(f, 'idBack')}
                  />
                  {errors.idBack && <p className="text-xs text-red-400 -mt-4">{errors.idBack}</p>}

                  <UploadZone
                    label="Selfie Holding Your ID"
                    required={false}
                    preview={formData.selfiePreview}
                    uploadStatus={uploadStatuses.selfie}
                    onFile={(f) => handleFileUpload(f, 'selfie')}
                  />
                  {errors.selfie && <p className="text-xs text-red-400 -mt-4">{errors.selfie}</p>}

                  <div className="rounded-lg bg-background border border-border px-4 py-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Note:</span> Your documents are reviewed securely by our team within 24–48 hours. You'll receive an email update.
                  </div>
                </>
              )}

              {errors.general && (
                <p className="text-xs text-red-400">{errors.general}</p>
              )}

              <div className="flex justify-between pt-2">
                <button suppressHydrationWarning type="button" className={btnSecondaryCls} onClick={goBack}>
                  ← Back
                </button>
                <div className="flex gap-3">
                  {!kycSkipped && (
                    <button
                      suppressHydrationWarning
                      type="button"
                      className="px-6 py-2.5 border border-amber-500 text-amber-600 dark:text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-500/10 transition-colors"
                      onClick={() => setShowKycSkipWarning(true)}
                    >
                      Skip for now
                    </button>
                  )}
                  <button suppressHydrationWarning type="button" className={btnPrimaryCls} onClick={goNext}>
                    Continue →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Payout Setup ── */}
          {step === 4 && (() => {
            const selectedCountry = PAYOUT_COUNTRIES.find(c => c.code === formData.bankCountryCode)
            const isSupported = selectedCountry?.supported ?? false
            const isUnsupported = !!selectedCountry && !selectedCountry.supported
            return (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Set up your payouts</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose how you want to receive your earnings. Powered by Airwallex.
                  </p>
                </div>

                {/* Country selector */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    Country of Bank Account <span className="text-red-400">*</span>
                  </label>
                  <select
                    suppressHydrationWarning
                    className={inputCls}
                    value={formData.bankCountryCode}
                    onChange={(e) => {
                      const country = PAYOUT_COUNTRIES.find(c => c.code === e.target.value)
                      setField('bankCountryCode', e.target.value)
                      setField('bankCurrency', country?.currencyCode ?? '')
                      setField('bankName', '')
                      setField('bankCode', '')
                      setBankApiAvailable(null)
                      setBankSearchQuery('')
                      setBankSearchResults([])
                    }}
                  >
                    <option value="">Select country...</option>
                    {PAYOUT_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  {errors.bankCountryCode && <p className="text-xs text-red-400">{errors.bankCountryCode}</p>}
                </div>

                {/* Currency display */}
                {formData.bankCurrency && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Payout currency:</span>
                    <span className="font-semibold text-foreground">{formData.bankCurrency} — {selectedCountry?.currency}</span>
                  </div>
                )}

                {/* Unsupported country */}
                {isUnsupported && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-400">
                    ⚠️ Bank transfer is not yet available for your country. Please use PayPal to receive your earnings.
                  </div>
                )}

                {/* Local bank fields — supported countries */}
                {isSupported && (
                  <div className="rounded-xl border border-border p-5 space-y-4">
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Bank Transfer</h2>

                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-foreground">
                        Account Holder Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        suppressHydrationWarning
                        type="text"
                        className={inputCls}
                        value={formData.bankAccountName}
                        onChange={(e) => setField('bankAccountName', e.target.value)}
                        placeholder="As shown on bank account"
                      />
                      {errors.bankAccountName && <p className="text-xs text-red-400">{errors.bankAccountName}</p>}
                    </div>

                    <div className="space-y-1.5 relative" ref={bankSearchRef}>
                      <label className="block text-sm font-medium text-foreground">
                        Bank Name <span className="text-red-400">*</span>
                      </label>
                      {/* Free-text fallback: API unavailable or returned nothing after a search */}
                      {bankApiAvailable === false ? (
                        <input
                          suppressHydrationWarning
                          type="text"
                          className={inputCls}
                          value={formData.bankName}
                          onChange={(e) => {
                            setField('bankName', e.target.value)
                            setField('bankCode', e.target.value)
                          }}
                          placeholder="e.g. Maybank, CIMB, Public Bank"
                        />
                      ) : formData.bankCode ? (
                        /* Selected from API dropdown */
                        <div className="flex items-center gap-2">
                          <div className={`${inputCls} flex-1 bg-primary/5 border-primary/30`}>
                            {formData.bankName}
                          </div>
                          <button
                            suppressHydrationWarning
                            type="button"
                            className="shrink-0 px-3 py-2 text-xs text-muted-foreground border border-border rounded-lg hover:bg-border/40 transition-colors"
                            onClick={() => {
                              setField('bankName', '')
                              setField('bankCode', '')
                              setBankSearchQuery('')
                              setBankSearchResults([])
                              setBankApiAvailable(null)
                            }}
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        /* Search input */
                        <div className="relative">
                          <input
                            suppressHydrationWarning
                            type="text"
                            className={inputCls}
                            value={bankSearchQuery}
                            onChange={(e) => setBankSearchQuery(e.target.value)}
                            onFocus={() => bankSearchResults.length > 0 && setShowBankDropdown(true)}
                            placeholder={formData.bankCountryCode ? 'Type to search your bank…' : 'Select a country first'}
                            disabled={!formData.bankCountryCode}
                            autoComplete="off"
                          />
                          {bankSearchLoading && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Searching…</span>
                          )}
                          {showBankDropdown && bankSearchResults.length > 0 && (
                            <div className="absolute z-20 w-full mt-1 bg-surface border border-border rounded-lg shadow-xl max-h-52 overflow-y-auto">
                              {bankSearchResults.map((bank) => (
                                <button
                                  suppressHydrationWarning
                                  key={bank.value}
                                  type="button"
                                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 text-foreground transition-colors"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setField('bankName', bank.label)
                                    setField('bankCode', bank.value)
                                    setBankSearchQuery('')
                                    setShowBankDropdown(false)
                                    setBankSearchResults([])
                                  }}
                                >
                                  {bank.label}
                                </button>
                              ))}
                            </div>
                          )}
                          {bankSearchQuery.length >= 1 && !bankSearchLoading && bankSearchResults.length === 0 && !showBankDropdown && (
                            <p className="text-xs text-muted-foreground mt-1">
                              No results — enter bank name manually below
                              <button
                                suppressHydrationWarning
                                type="button"
                                className="ml-2 underline text-primary"
                                onClick={() => setBankApiAvailable(false)}
                              >
                                Type manually
                              </button>
                            </p>
                          )}
                        </div>
                      )}
                      {errors.bankName && <p className="text-xs text-red-400">{errors.bankName}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-foreground">
                        Account Number <span className="text-red-400">*</span>
                      </label>
                      <input
                        suppressHydrationWarning
                        type="text"
                        className={inputCls}
                        value={formData.bankAccountNumber}
                        onChange={(e) => setField('bankAccountNumber', e.target.value)}
                        placeholder="Your bank account number"
                      />
                      {errors.bankAccountNumber && <p className="text-xs text-red-400">{errors.bankAccountNumber}</p>}
                    </div>

                    {/* Routing code — only for countries that need it */}
                    {selectedCountry?.routingLabel && (
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-foreground">
                          {selectedCountry.routingLabel}
                        </label>
                        <input
                          suppressHydrationWarning
                          type="text"
                          className={inputCls}
                          value={formData.bankRoutingCode}
                          onChange={(e) => setField('bankRoutingCode', e.target.value)}
                          placeholder={selectedCountry.routingLabel}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Divider — only if supported (bank OR PayPal) */}
                {isSupported && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-medium">OR</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                {/* PayPal — always shown, disabled if not set up */}
                {(isSupported || isUnsupported) && (
                  <div className="rounded-xl border border-border p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">PayPal</h2>
                      {isSupported && (
                        <span className="text-xs bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30 rounded-full px-2 py-0.5">Coming soon</span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-foreground">
                        PayPal Email
                        {isSupported && <span className="text-muted-foreground font-normal ml-1">(optional)</span>}
                        {isUnsupported && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <input
                        suppressHydrationWarning
                        type="email"
                        className={`${inputCls} ${isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                        value={formData.paypalEmail}
                        onChange={(e) => setField('paypalEmail', e.target.value)}
                        placeholder="paypal@example.com"
                        disabled={isSupported}
                      />
                      {isSupported && (
                        <p className="text-xs text-muted-foreground">PayPal payouts are coming soon. Enter your email now and we'll activate it when ready.</p>
                      )}
                      {errors.paypalEmail && <p className="text-xs text-red-400">{errors.paypalEmail}</p>}
                    </div>
                  </div>
                )}

                {!formData.bankCountryCode && (
                  <div className="rounded-lg bg-background border border-border px-4 py-3 text-xs text-muted-foreground">
                    Select your country above to see available payout options.
                  </div>
                )}

                <div className="rounded-lg bg-background border border-border px-4 py-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Note:</span> Your payout details are reviewed during verification. You can update them anytime from your dashboard.
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
            )
          })()}

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
              <div className="relative">
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
                {/* Fade + scroll hint — hidden once all tabs read */}
                {!allAgreementsRead && (
                  <>
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface to-transparent" />
                    <p className="text-xs text-muted-foreground mt-1 text-right pr-1">← scroll tabs to see all</p>
                  </>
                )}
              </div>

              {/* Read counter */}
              <p className="text-xs text-muted-foreground">
                Read{' '}
                <span className={`font-semibold ${allAgreementsRead ? 'text-green-400' : 'text-foreground'}`}>
                  {formData.readAgreements.size}
                </span>{' '}
                of {agreements.length}
                {!allAgreementsRead && (
                  <span className="text-amber-600 dark:text-amber-400 ml-2">
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
