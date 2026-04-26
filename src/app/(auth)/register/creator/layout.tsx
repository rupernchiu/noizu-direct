import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Join as a Creator',
  robots: { index: false, follow: true },
}

export default function CreatorRegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
