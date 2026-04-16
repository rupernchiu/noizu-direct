'use client'

import { useState } from 'react'
import { ReviewForm } from './ReviewForm'

interface OrderReviewButtonProps {
  orderId: string
  productId: string
  productTitle: string
}

export function OrderReviewButton({ orderId, productId, productTitle }: OrderReviewButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1 rounded-lg border border-primary text-primary text-xs font-medium hover:bg-primary hover:text-white transition-colors"
      >
        Leave a Review
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground truncate pr-4">
                Review: {productTitle}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none shrink-0"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <ReviewForm
              orderId={orderId}
              productId={productId}
              productTitle={productTitle}
              onSuccess={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
