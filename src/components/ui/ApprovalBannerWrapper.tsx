'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ApprovalBanner } from './ApprovalBanner'

export function ApprovalBannerWrapper() {
  const { data: session } = useSession()
  const [isNewlyApproved, setIsNewlyApproved] = useState(false)

  useEffect(() => {
    if (!session?.user || (session.user as any).role !== 'CREATOR') return
    fetch('/api/creator/approval-status')
      .then((res) => res.json())
      .then((data: { isNewlyApproved: boolean }) => setIsNewlyApproved(data.isNewlyApproved))
      .catch(() => {})
  }, [session])

  if (!isNewlyApproved) return null
  return <ApprovalBanner />
}
