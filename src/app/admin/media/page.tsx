import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { MediaDeleteButton } from './MediaDeleteButton'
import Image from 'next/image'

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif']

function isImage(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_EXTS.includes(ext)
}

export default async function AdminMediaPage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const media = await prisma.media.findMany({
    include: { uploader: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[#f0f0f5]">Media Library ({media.length})</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {media.map((item) => (
          <div key={item.id} className="bg-[#1e1e2a] rounded-xl border border-[#2a2a3a] overflow-hidden group">
            <div className="aspect-square bg-[#0d0d12] flex items-center justify-center relative">
              {isImage(item.filename) ? (
                <Image
                  src={item.url}
                  alt={item.filename}
                  fill
                  className="object-cover"
                  sizes="200px"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-[#8888aa]">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-xs uppercase">{item.filename.split('.').pop()}</span>
                </div>
              )}
            </div>
            <div className="p-2 space-y-1">
              <p className="text-[#f0f0f5] text-xs font-medium truncate" title={item.filename}>{item.filename}</p>
              <p className="text-[#8888aa] text-xs">{item.uploader.name}</p>
              <p className="text-[#8888aa] text-xs">{new Date(item.createdAt).toLocaleDateString()}</p>
              <MediaDeleteButton mediaId={item.id} />
            </div>
          </div>
        ))}
        {media.length === 0 && (
          <div className="col-span-full bg-[#1e1e2a] rounded-xl border border-[#2a2a3a] p-6 text-center text-[#8888aa]">
            No media uploaded yet
          </div>
        )}
      </div>
    </div>
  )
}
