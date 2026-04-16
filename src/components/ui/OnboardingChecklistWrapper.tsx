'use client'

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { OnboardingChecklist } from './OnboardingChecklist'

interface Props {
  steps: { id: string; label: string; completed: boolean; href: string }[]
  allComplete: boolean
  dismissed: boolean
}

export function OnboardingChecklistWrapper({ steps, allComplete, dismissed }: Props) {
  const [localDismissed, setLocalDismissed] = useState(false)
  const completedCalledRef = useRef(false)

  useEffect(() => {
    if (allComplete && !completedCalledRef.current) {
      completedCalledRef.current = true
      fetch('/api/dashboard/onboarding/complete', { method: 'PATCH' })
    }
  }, [allComplete])

  if (dismissed || localDismissed) return null

  async function handleDismiss() {
    await fetch('/api/dashboard/onboarding/dismiss', { method: 'PATCH' })
    setLocalDismissed(true)
  }

  if (allComplete) {
    return (
      <div className="bg-card border border-green-500/30 rounded-xl p-5 mb-6 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
        <p className="text-lg font-bold text-foreground">🎉 Your store is ready!</p>
        <p className="text-sm text-muted-foreground mt-1">All setup steps complete. Your store is live and looking great.</p>
      </div>
    )
  }

  return (
    <OnboardingChecklist
      steps={steps}
      onDismiss={handleDismiss}
    />
  )
}
