'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

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

export default function NewListingPage() {
  const router = useRouter()
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'DIGITAL' },
  })

  const type = watch('type')

  async function uploadImage(file: File) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('subdir', 'products')
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error('Upload failed')
    const data = await res.json() as { url: string }
    return data.url
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length + images.length > 5) {
      setError('Maximum 5 images allowed')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const urls = await Promise.all(files.map(uploadImage))
      setImages((prev) => [...prev, ...urls])
    } catch {
      setError('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx))
  }

  async function onSubmit(data: FormData) {
    setError(null)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, images }),
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
        <h1 className="text-2xl font-bold text-[#f0f0f5]">New Listing</h1>
        <p className="text-sm text-[#8888aa] mt-1">Add a new product to your store</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Title</label>
          <input
            {...register('title')}
            placeholder="Product title"
            className="w-full rounded-lg bg-[#1e1e2a] border border-[#2a2a3a] px-3 py-2 text-sm text-[#f0f0f5] placeholder-[#8888aa] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
          />
          {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Description</label>
          <textarea
            {...register('description')}
            rows={4}
            placeholder="Describe your product..."
            className="w-full rounded-lg bg-[#1e1e2a] border border-[#2a2a3a] px-3 py-2 text-sm text-[#f0f0f5] placeholder-[#8888aa] focus:outline-none focus:ring-2 focus:ring-[#7c3aed] resize-none"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-400">{errors.description.message}</p>
          )}
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Price (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8888aa] text-sm">$</span>
            <input
              {...register('price', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0.50"
              max="9999"
              placeholder="9.99"
              className="w-full rounded-lg bg-[#1e1e2a] border border-[#2a2a3a] pl-7 pr-3 py-2 text-sm text-[#f0f0f5] placeholder-[#8888aa] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
            />
          </div>
          {errors.price && <p className="mt-1 text-xs text-red-400">{errors.price.message}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Category</label>
          <select
            {...register('category')}
            className="w-full rounded-lg bg-[#1e1e2a] border border-[#2a2a3a] px-3 py-2 text-sm text-[#f0f0f5] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
          >
            <option value="">Select a category</option>
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
          <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Type</label>
          <div className="flex gap-2">
            {(['DIGITAL', 'PHYSICAL'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setValue('type', t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  type === t
                    ? 'bg-[#7c3aed] text-white'
                    : 'bg-[#1e1e2a] border border-[#2a2a3a] text-[#8888aa] hover:text-[#f0f0f5]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Stock (only for PHYSICAL) */}
        {type === 'PHYSICAL' && (
          <div>
            <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Stock</label>
            <input
              {...register('stock', { valueAsNumber: true })}
              type="number"
              min="0"
              placeholder="0 = unlimited"
              className="w-full rounded-lg bg-[#1e1e2a] border border-[#2a2a3a] px-3 py-2 text-sm text-[#f0f0f5] placeholder-[#8888aa] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
            />
            {errors.stock && <p className="mt-1 text-xs text-red-400">{errors.stock.message}</p>}
          </div>
        )}

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">
            Images <span className="text-[#8888aa] font-normal">(up to 5)</span>
          </label>
          <div className="flex flex-wrap gap-3 mb-3">
            {images.map((url, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden bg-[#1e1e2a] border border-[#2a2a3a]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {images.length < 5 && (
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1e1e2a] border border-[#2a2a3a] text-sm text-[#8888aa] hover:text-[#f0f0f5] cursor-pointer transition-colors">
              {uploading ? 'Uploading...' : '+ Add image'}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || uploading}
            className="px-6 py-2.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Product'}
          </button>
          <a
            href="/dashboard/listings"
            className="px-6 py-2.5 rounded-lg bg-[#1e1e2a] border border-[#2a2a3a] text-[#8888aa] hover:text-[#f0f0f5] text-sm font-medium transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
