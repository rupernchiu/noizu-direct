import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export function Logo({ className }: Props) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      <img
        src="/uploads/library/e17af218-5eb7-4281-9e75-eb7427fac949.webp"
        alt="NOIZU-DIRECT"
        width={130}
        height={33}
        style={{ objectFit: 'contain' }}
        className="dark:hidden"
      />
      <img
        src="/uploads/library/38cf460d-b641-4ded-918e-a190d438eb3d.webp"
        alt="NOIZU-DIRECT"
        width={130}
        height={33}
        style={{ objectFit: 'contain' }}
        className="hidden dark:block"
      />
    </span>
  )
}
