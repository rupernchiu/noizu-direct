'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const faqs = [
  {
    q: 'What is escrow and why does it matter?',
    a: 'Escrow means your payment is held securely by a neutral party — us — until the transaction is complete. Buyers are protected because funds only release on delivery. Creators are protected because money is secured before they ship. Everyone wins.',
  },
  {
    q: 'How long does escrow hold my payment?',
    a: 'For digital products, funds typically release within hours of purchase confirmation. For physical items, funds release once the buyer confirms receipt. There is a short holding period after confirmation before withdrawal is available.',
  },
  {
    q: "What happens if my order doesn't arrive?",
    a: 'Either party can raise a dispute through the order page. Our team reviews evidence from both sides and makes a fair decision. Because funds are held in escrow, we can resolve the outcome for either party.',
  },
  {
    q: 'How do I withdraw my earnings as a creator?',
    a: 'Withdrawals are processed via Airwallex directly to your local bank account. We support MYR, SGD, PHP, IDR, THB and USD. Minimum withdrawal amounts and processing times vary by currency.',
  },
  {
    q: 'Is noizu.direct only for Malaysian creators?',
    a: 'No. noizu.direct is built for the entire SEA creator community. We welcome creators from Malaysia, Singapore, Philippines, Indonesia, Thailand and beyond. Buyers from all over SEA can browse and purchase.',
  },
  {
    q: 'What types of products can I sell?',
    a: 'You can sell digital downloads (art, prints, doujin PDFs, sticker sheets), physical merchandise (prints, zines, plush, figurines), commission slots, and print-on-demand products. Fan art is welcome under creator-responsibility guidelines.',
  },
]

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <div
          key={i}
          className={cn(
            'bg-card rounded-2xl border transition-colors duration-150',
            open === i ? 'border-primary/30' : 'border-border',
          )}
        >
          <button
            className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer min-h-[44px]"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            <span className="font-semibold text-foreground text-sm sm:text-base leading-snug">
              {faq.q}
            </span>
            <ChevronDown
              size={18}
              className="flex-shrink-0 text-muted-foreground transition-transform duration-200"
              style={{ transform: open === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
              aria-hidden="true"
            />
          </button>

          <div
            className="overflow-hidden"
            style={{
              display: 'grid',
              gridTemplateRows: open === i ? '1fr' : '0fr',
              transition: 'grid-template-rows 200ms ease',
            }}
          >
            <div className="overflow-hidden min-h-0">
              <p className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
