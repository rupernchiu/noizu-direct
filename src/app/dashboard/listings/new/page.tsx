'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { MultiImageUpload } from '@/components/ui/MultiImageUpload'
import { DigitalFilesUpload, type DigitalFile } from '@/components/ui/DigitalFilesUpload'

const schema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  price: z.number().min(0.5).max(9999),
  category: z.enum(['DIGITAL_ART', 'DOUJIN', 'COSPLAY_PRINT', 'PHYSICAL_MERCH', 'STICKERS']),
  type: z.enum(['DIGITAL', 'PHYSICAL', 'POD', 'COMMISSION']),
  stock: z.number().int().min(0).optional(),
  baseCost: z.number().min(0).max(9999).optional(),
  productionDays: z.number().int().min(0).max(60).optional(),
  shippingMY: z.number().int().min(0).max(60).optional(),
  shippingSG: z.number().int().min(0).max(60).optional(),
  shippingPH: z.number().int().min(0).max(60).optional(),
  shippingIntl: z.number().int().min(0).max(90).optional(),
  podExternalUrl: z.string().url().optional().or(z.literal('')),
  commissionDepositPercent: z.number().int().min(0).max(100).optional(),
  commissionRevisionsIncluded: z.number().int().min(0).max(10).optional(),
  commissionTurnaroundDays: z.number().int().min(1).max(180).optional(),
})

type FormData = z.infer<typeof schema>

const CATEGORIES = [
  { value: 'DIGITAL_ART', label: 'Digital Art' },
  { value: 'DOUJIN', label: 'Doujin' },
  { value: 'COSPLAY_PRINT', label: 'Cosplay Print' },
  { value: 'PHYSICAL_MERCH', label: 'Physical Merch' },
  { value: 'STICKERS', label: 'Stickers' },
]

const TYPES: { value: FormData['type']; label: string }[] = [
  { value: 'DIGITAL', label: 'Digital' },
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'POD', label: 'Print-on-Demand' },
  { value: 'COMMISSION', label: 'Commission' },
]

interface PodProvider {
  id: string
  name: string
  customName: string | null
  defaultProductionDays: number
  shippingMY: number
  shippingSG: number
  shippingPH: number
  shippingIntl: number
}

export default function NewListingPage() {
  const router = useRouter()
  const [images, setImages] = useState<string[]>([])
  const [digitalFiles, setDigitalFiles] = useState<DigitalFile[]>([])
  const [podProviders, setPodProviders] = useState<PodProvider[]>([])
  const [podProviderId, setPodProviderId] = useState<string>('')
  const [showProviderPublic, setShowProviderPublic] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'DIGITAL',
      commissionDepositPercent: 50,
      commissionRevisionsIncluded: 2,
      commissionTurnaroundDays: 14,
    },
  })

  const type = watch('type')

  useEffect(() => {
    if (type !== 'POD') return
    void fetch('/api/dashboard/pod-providers')
      .then(r => r.ok ? r.json() as Promise<PodProvider[]> : [])
      .then(list => {
        setPodProviders(list)
        if (list.length > 0 && !podProviderId) setPodProviderId(list[0].id)
      })
      .catch(() => setPodProviders([]))
  }, [type, podProviderId])

  async function onSubmit(data: FormData) {
    setError(null)
    if (data.type === 'DIGITAL' && digitalFiles.length === 0) {
      setError('Upload at least one digital file')
      return
    }
    if (data.type === 'POD' && !podProviderId) {
      setError('Select a POD provider (set one up in POD Settings first)')
      return
    }
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          images,
          digitalFiles,
          podProviderId: data.type === 'POD' ? podProviderId : null,
          showProviderPublic: data.type === 'POD' ? showProviderPublic : false,
        }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setError(body.error ?? 'Failed to create product')
        return
      }
      router.push('/dashboard/listings')
    } catch {
      setError('Something went wrong')
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Listing</h1>
        <p className="text-sm text-muted-foreground mt-1">Add a new product to your store</p>
      </div>

      {error && (
        <div id="listing-error" role="alert" className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Title</label>
          <input
            {...register('title')}
            placeholder="Product title"
            aria-invalid={!!errors.title || undefined}
            aria-describedby={errors.title ? 'title-error' : undefined}
            className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.title && <p id="title-error" role="alert" className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
          <textarea
            {...register('description')}
            rows={4}
            placeholder="Describe your product..."
            aria-invalid={!!errors.description || undefined}
            aria-describedby={errors.description ? 'description-error' : undefined}
            className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          {errors.description && (
            <p id="description-error" role="alert" className="mt-1 text-xs text-red-400">{errors.description.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {type === 'COMMISSION' ? 'Price (USD) — commission total' : 'Price (USD)'}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input
              {...register('price', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0.50"
              max="9999"
              placeholder="9.99"
              aria-invalid={!!errors.price || undefined}
              aria-describedby={errors.price ? 'price-error' : undefined}
              className="w-full rounded-lg bg-card border border-border pl-7 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {errors.price && <p id="price-error" role="alert" className="mt-1 text-xs text-red-400">{errors.price.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
          <select
            {...register('category')}
            aria-invalid={!!errors.category || undefined}
            aria-describedby={errors.category ? 'category-error' : undefined}
            className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {errors.category && (
            <p id="category-error" role="alert" className="mt-1 text-xs text-red-400">{errors.category.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setValue('type', t.value)}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  type === t.value
                    ? 'bg-primary text-white'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {type === 'DIGITAL' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Digital files <span className="text-muted-foreground font-normal">(up to 10, 200MB each)</span>
            </label>
            <DigitalFilesUpload files={digitalFiles} onChange={setDigitalFiles} disabled={isSubmitting} />
          </div>
        )}

        {type === 'PHYSICAL' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Stock</label>
            <input
              {...register('stock', { valueAsNumber: true })}
              type="number"
              min="0"
              placeholder="0 = unlimited"
              aria-invalid={!!errors.stock || undefined}
              aria-describedby={errors.stock ? 'stock-error' : undefined}
              className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.stock && <p id="stock-error" role="alert" className="mt-1 text-xs text-red-400">{errors.stock.message}</p>}
          </div>
        )}

        {type === 'POD' && (
          <div className="space-y-4 rounded-lg bg-card border border-border p-4">
            <p className="text-sm font-medium text-foreground">POD Details</p>

            {podProviders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No POD providers set up yet.{' '}
                <a href="/dashboard/pod-settings" className="text-primary hover:underline">
                  Add a provider
                </a>{' '}first.
              </p>
            ) : (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Provider</label>
                <select
                  value={podProviderId}
                  onChange={e => setPodProviderId(e.target.value)}
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {podProviders.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.customName ?? p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Base cost (USD)</label>
                <input
                  {...register('baseCost', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Your cost to print"
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Production days</label>
                <input
                  {...register('productionDays', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  max="60"
                  placeholder="Overrides provider default"
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Shipping days <span className="text-muted-foreground/60">(overrides per region, optional)</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['MY', 'SG', 'PH', 'Intl'] as const).map(region => (
                  <div key={region}>
                    <input
                      {...register(`shipping${region}` as keyof FormData, { valueAsNumber: true })}
                      type="number"
                      min="0"
                      placeholder={region}
                      className="w-full rounded-lg bg-background border border-border px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground text-center">{region}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                External product URL <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <input
                {...register('podExternalUrl')}
                type="url"
                placeholder="https://printify.com/..."
                aria-invalid={!!errors.podExternalUrl || undefined}
                aria-describedby={errors.podExternalUrl ? 'podExternalUrl-error' : undefined}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.podExternalUrl && <p id="podExternalUrl-error" role="alert" className="mt-1 text-xs text-red-400">Must be a valid URL</p>}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showProviderPublic}
                onChange={e => setShowProviderPublic(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground">Show provider name publicly on product page</span>
            </label>
          </div>
        )}

        {type === 'COMMISSION' && (
          <div className="space-y-4 rounded-lg bg-card border border-border p-4">
            <p className="text-sm font-medium text-foreground">Commission Details</p>
            <p className="text-xs text-muted-foreground">
              Buyers pay the full amount upfront into escrow. You have 48h to accept or the order auto-cancels and they're refunded.
              The deposit portion releases to you shortly after you accept; the balance releases after delivery.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Deposit %</label>
                <input
                  {...register('commissionDepositPercent', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  max="100"
                  placeholder="50"
                  aria-invalid={!!errors.commissionDepositPercent || undefined}
                  aria-describedby={errors.commissionDepositPercent ? 'commissionDepositPercent-error' : undefined}
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {errors.commissionDepositPercent && <p id="commissionDepositPercent-error" role="alert" className="mt-1 text-[11px] text-red-400">0–100</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Revisions</label>
                <input
                  {...register('commissionRevisionsIncluded', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  max="10"
                  placeholder="2"
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Turnaround days</label>
                <input
                  {...register('commissionTurnaroundDays', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  max="180"
                  placeholder="14"
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Images <span className="text-muted-foreground font-normal">(up to 6)</span>
          </label>
          <MultiImageUpload images={images} onChange={setImages} maxImages={6} disabled={isSubmitting} />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Product'}
          </button>
          <a
            href="/dashboard/listings"
            className="px-6 py-2.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
