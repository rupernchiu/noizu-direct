'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { AccountSection } from './AccountSection'
import { StoreSection } from './StoreSection'
import { PortfolioSection } from './PortfolioSection'
import { AppearanceSection } from './AppearanceSection'
import { NotificationsSection } from './NotificationsSection'
import { DangerSection } from './DangerSection'

type Section = 'account' | 'store' | 'portfolio' | 'appearance' | 'notifications' | 'danger'

const NAV_ITEMS: { id: Section; label: string }[] = [
  { id: 'account', label: 'Account Settings' },
  { id: 'store', label: 'Store Profile' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'danger', label: 'Danger Zone' },
]

interface Product {
  id: string
  title: string
  type: string
}

interface PageData {
  user: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
  profile: {
    username: string
    displayName: string | null
    bio: string | null
    avatar: string | null
    bannerImage: string | null
    logoImage: string | null
    commissionStatus: string
    commissionDescription: string | null
    announcementText: string | null
    announcementActive: boolean
    absorbProcessingFee: boolean
    categoryTags: string | null
    socialLinks: string | null
    isVerified: boolean
    isTopCreator: boolean
    portfolioItems: string | null
  }
  products: Product[]
}

export function ProfileClient({ data }: { data: PageData }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeSection = (searchParams.get('section') ?? 'account') as Section

  function setSection(id: Section) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('section', id)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex gap-8">
      {/* Sticky side nav */}
      <aside className="w-52 shrink-0 sticky top-6 self-start space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              activeSection === item.id
                ? 'bg-primary/15 text-primary font-medium'
                : item.id === 'danger'
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-card'
            }`}
          >
            {item.label}
          </button>
        ))}
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {activeSection === 'account' && (
          <AccountSection user={data.user} />
        )}
        {activeSection === 'store' && (
          <StoreSection profile={data.profile} />
        )}
        {activeSection === 'portfolio' && (
          <PortfolioSection profile={data.profile} />
        )}
        {activeSection === 'appearance' && (
          <AppearanceSection
            profile={{ themeColor: null, featuredProductIds: null, sectionOrder: null }}
            products={data.products}
          />
        )}
        {activeSection === 'notifications' && (
          <NotificationsSection profile={{ notifPrefs: null }} />
        )}
        {activeSection === 'danger' && (
          <DangerSection userEmail={data.user.email} />
        )}
      </div>
    </div>
  )
}
