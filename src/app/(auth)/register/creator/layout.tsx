import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Join as a Creator | NOIZU-DIRECT',
  robots: { index: false, follow: true },
}

export default function CreatorRegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
