import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CreatorActions } from './CreatorActions'

export default async function AdminCreatorsPage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const creators = await prisma.creatorProfile.findMany({
    include: { user: { select: { email: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#f0f0f5]">Creators ({creators.length})</h2>
      </div>

      <div className="bg-[#1e1e2a] rounded-xl border border-[#2a2a3a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a3a]">
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Name</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Username</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Email</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Sales</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Joined</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {creators.map((creator) => (
                <tr key={creator.id} className="border-b border-[#2a2a3a] last:border-0 hover:bg-[#16161f]">
                  <td className="px-4 py-3 text-[#f0f0f5] font-medium">{creator.displayName}</td>
                  <td className="px-4 py-3 text-[#8888aa]">@{creator.username}</td>
                  <td className="px-4 py-3 text-[#8888aa]">{creator.user.email}</td>
                  <td className="px-4 py-3 text-[#f0f0f5]">{creator.totalSales}</td>
                  <td className="px-4 py-3 text-[#8888aa] text-xs">{new Date(creator.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <CreatorActions
                      creatorId={creator.id}
                      isVerified={creator.isVerified}
                      isTopCreator={creator.isTopCreator}
                    />
                  </td>
                </tr>
              ))}
              {creators.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-[#8888aa]">No creators yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
