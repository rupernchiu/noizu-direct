'use client'
import { useState } from 'react'
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
  type: z.enum(['DIGITAL', 'PHYSICAL']),
  stock: z.number().int().min(0).optional(),
})

type FormData = z.infer<typeof schema>

const CATEGORIES = [
  { value: 'DIGITAL_ART', label: 'Digital Art' },
  { value: 'DOUJIN', label: 'Doujin' },
  { value: 'COSPLAY_PRINT', label: 'Cosplay Print' },
  { value: 'PHYSICAL_MERCH', label: 'Physical Merch' },
  { value: 'STICKERS', label: 'Stickers' },
]

interface Product {
  id: string
  title: string
  description: string
  price: number
  category: string
  type: string
  images: string
  digitalFiles: string | null
  stock: number | null
  isPreOrder: boolean
  preOrderMessage: string | null
  preOrderReleaseAt: string | null
}

export function EditListingForm({ product }: { product: Product }) {
  const router = useRouter()
  const [images, setImages] = useState<string[]>(() => {
    try { return JSON.parse(product.images) as string[] } catch { return [] }
  })
  const [digitalFiles, setDigitalFiles] = useState<DigitalFile[]>(() => {
    if (!product.digitalFiles) return []
    try { return JSON.parse(product.digitalFiles) as DigitalFile[] } catch { return [] }
  })
  const [error, setError] = useState<string | null>(null)
  const [isPreOrder, setIsPreOrder] = useState(product.isPreOrder)
  const [preOrderMessage, setPreOrderMessage] = useState(product.preOrderMessage ?? '')
  const [preOrderReleaseAt, setPreOrderReleaseAt] = useState(
    product.preOrderReleaseAt ? new Date(product.preOrderReleaseAt).toISOString().slice(0, 16) : ''
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: product.title,
      description: product.description,
      price: product.price / 100,
      category: product.category as FormData['category'],
      type: product.type as FormData['type'],
      stock: product.stock ?? undefined,
    },
  })

  const type = watch('type')


  async function onSubmit(data: FormData) {
    setError(null)
    if (data.type === 'DIGITAL' && digitalFiles.length === 0) {
      setError('Upload at least one digital file')
      return
    }
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          images,
          digitalFiles,
          isPreOrder,
          preOrderMessage: isPreOrder ? preOrderMessage : null,
          preOrderReleaseAt: isPreOrder && preOrderReleaseAt ? new Date(preOrderReleaseAt).toISOString() : null,
        }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setError(body.error ?? 'Failed to update product')
        return
      }
      router.push('/dashboard/listings')
    } catch {
      setError('Something went wrong')
    }
  }

  return (
    <>
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400 mb-5">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Title</label>
          <input
            {...register('title')}
            className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
          <textarea
            {...register('description')}
            rows={4}
            className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-400">{errors.description.message}</p>
          )}
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Price (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input
              {...register('price', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0.50"
              max="9999"
              className="w-full rounded-lg bg-card border border-border pl-7 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {errors.price && <p className="mt-1 text-xs text-red-400">{errors.price.message}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
          <select
            {...register('category')}
            className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-xs text-red-400">{errors.category.message}</p>
          )}
        </div>

        {/* Type toggle */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
          <div className="flex gap-2">
            {(['DIGITAL', 'PHYSICAL'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setValue('type', t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  type === t
                    ? 'bg-primary text-white'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Digital files */}
        {type === 'DIGITAL' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Digital files <span className="text-muted-foreground font-normal">(up to 10, 200MB each)</span>
            </label>
            <DigitalFilesUpload files={digitalFiles} onChange={setDigitalFiles} disabled={isSubmitting} />
          </div>
        )}

        {/* Stock */}
        {type === 'PHYSICAL' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Stock</label>
            <input
              {...register('stock', { valueAsNumber: true })}
              type="number"
              min="0"
              placeholder="0 = unlimited"
              className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.stock && <p className="mt-1 text-xs text-red-400">{errors.stock.message}</p>}
          </div>
        )}

        {/* Pre-order */}
        <div className="rounded-lg bg-card border border-border p-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPreOrder}
              onChange={e => setIsPreOrder(e.target.checked)}
              className="w-4 h-4 rounded border-border accent-primary"
            />
            <span className="text-sm font-medium text-foreground">Enable pre-order</span>
          </label>
          {isPreOrder && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Pre-order message</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Ships in March 2026"
                  value={preOrderMessage}
                  onChange={e => setPreOrderMessage(e.target.value)}
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Expected release date <span className="text-muted-foreground/60">(optional)</span></label>
                <input
                  type="datetime-local"
                  value={preOrderReleaseAt}
                  onChange={e => setPreOrderReleaseAt(e.target.value)}
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Images <span className="text-muted-foreground font-normal">(up to 6)</span>
          </label>
          <MultiImageUpload images={images} onChange={setImages} maxImages={6} disabled={isSubmitting} />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          <a
            href="/dashboard/listings"
            className="px-6 py-2.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </>
  )
}
