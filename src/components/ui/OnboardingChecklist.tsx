'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Circle, X } from 'lucide-react'

interface OnboardingChecklistProps {
  steps: {
    id: string
    label: string
    completed: boolean
    href: string
  }[]
  onDismiss: () => void
}

export function OnboardingChecklist({ steps, onDismiss }: OnboardingChecklistProps) {
  const completed = steps.filter(s => s.completed).length
  const total = steps.length
  const pct = Math.round((completed / total) * 100)

  return (
    <div className="bg-card border border-primary/30 rounded-xl p-5 mb-6 relative">
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>

      <h3 className="font-semibold text-foreground mb-1">Complete your store setup</h3>
      <p className="text-sm text-muted-foreground mb-3">{completed} of {total} steps complete</p>

      {/* Progress bar */}
      <div className="w-full bg-border rounded-full h-2 mb-4">
        <div
          className="bg-primary rounded-full h-2 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-2">
        {steps.map(step => (
          <Link
            key={step.id}
            href={step.href}
            className={`flex items-center gap-3 text-sm rounded-lg px-3 py-2 transition-colors ${
              step.completed
                ? 'text-muted-foreground'
                : 'text-foreground hover:bg-primary/5 hover:text-primary'
            }`}
          >
            {step.completed ? (
              <CheckCircle size={16} className="text-success shrink-0" />
            ) : (
              <Circle size={16} className="text-muted-foreground shrink-0" />
            )}
            <span className={step.completed ? 'line-through opacity-60' : ''}>{step.label}</span>
            {!step.completed && <span className="ml-auto text-xs text-primary">Complete →</span>}
          </Link>
        ))}
      </div>
    </div>
  )
}
