import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Join as a Creator | noizu.direct',
  robots: { index: false, follow: true },
}

export default function CreatorRegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
