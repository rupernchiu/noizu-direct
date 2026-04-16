import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import { MediaUploadZone } from './MediaUploadZone'
import { MediaGrid } from './MediaGrid'
import { SearchBar } from '@/components/ui/SearchBar'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Pagination } from '@/components/ui/Pagination'

const PER_PAGE = 20

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'])

function getExt(filename: string) {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

function isImage(filename: string) {
  return IMAGE_EXTS.has(getExt(filename))
}

const TYPE_OPTIONS = [
  { value: 'IMAGE', label: 'Images' },
  { value: 'OTHER', label: 'Other files' },
]

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; type?: string }>
}) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const typeFilter = params.type ?? ''

  const where: any = {}
  if (q) where.filename = { contains: q }

  const [total, media] = await Promise.all([
    prisma.media.count({ where }),
    prisma.media.findMany({
      where,
      include: { uploader: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])

  // Apply type filter in-memory after fetch (SQLite doesn't support suffix matching)
  const filtered = typeFilter === 'IMAGE'
    ? media.filter((m) => isImage(m.filename))
    : typeFilter === 'OTHER'
    ? media.filter((m) => !isImage(m.filename))
    : media

  // Serialize dates for client component
  const items = filtered.map((m) => ({
    id: m.id,
    filename: m.filename,
    url: m.url,
    fileSize: m.fileSize,
    width: m.width,
    height: m.height,
    mimeType: m.mimeType,
    createdAt: m.createdAt.toISOString(),
    uploader: m.uploader,
  }))

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-foreground">Media Library</h2>

      <MediaUploadZone />

      <div className="flex flex-wrap gap-3">
        <Suspense fallback={null}>
          <SearchBar placeholder="Search by filename..." className="min-w-52 flex-1" />
          <FilterSelect paramName="type" options={TYPE_OPTIONS} allLabel="All Types" className="w-36" />
        </Suspense>
      </div>

      {items.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          {q || typeFilter ? 'No media matches your filters.' : 'No media uploaded yet.'}
        </div>
      ) : (
        <MediaGrid items={items} />
      )}

      <Suspense fallback={null}>
        <Pagination total={total} page={page} perPage={PER_PAGE} />
      </Suspense>
    </div>
  )
}
