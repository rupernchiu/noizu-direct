import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { User, Video, Printer, Zap, Tag, ShieldCheck, FileCheck2 } from 'lucide-react'

export const metadata = { title: 'Settings | noizu.direct' }

const links = [
  { href: '/dashboard/profile',             label: 'Profile',          icon: User,        desc: 'Public store info, socials, avatars, banner' },
  { href: '/dashboard/videos',              label: 'Videos',           icon: Video,       desc: 'Upload & manage creator videos' },
  { href: '/dashboard/pod-settings',        label: 'POD Settings',     icon: Printer,     desc: 'Print-on-demand providers & shipping times' },
  { href: '/dashboard/popup',               label: 'Popup',            icon: Zap,         desc: 'Visitor popup & campaign CTA' },
  { href: '/dashboard/discount-codes',      label: 'Discount Codes',   icon: Tag,         desc: 'Promo codes for your store' },
  { href: '/dashboard/verification',        label: 'Verification',     icon: ShieldCheck, desc: 'Identity & payout verification' },
  { href: '/dashboard/settings/kyc',         label: 'KYC Documents',    icon: FileCheck2,  desc: 'View or replace your identity documents (append-only)' },
]

export default async function SettingsIndex() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">Everything configurable about your store.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {links.map((l) => {
          const Icon = l.icon
          return (
            <Link key={l.href} href={l.href} className="bg-card border border-border rounded-xl p-4 flex gap-3 hover:border-primary/50 transition-colors">
              <Icon className="size-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">{l.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{l.desc}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
