'use client'

import { useState, useEffect } from 'react'
import { OnboardingChecklist } from './OnboardingChecklist'

interface Props {
  steps: { id: string; label: string; completed: boolean; href: string }[]
  allComplete: boolean
}

export function OnboardingChecklistWrapper({ steps, allComplete }: Props) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const v = localStorage.getItem('nd_onboarding_dismissed')
    if (v === 'true') setDismissed(true)
  }, [])

  if (dismissed || allComplete) return null

  return (
    <OnboardingChecklist
      steps={steps}
      onDismiss={() => {
        localStorage.setItem('nd_onboarding_dismissed', 'true')
        setDismissed(true)
      }}
    />
  )
}
