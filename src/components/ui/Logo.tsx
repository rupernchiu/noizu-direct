import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export function Logo({ className }: Props) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      <img
        src="https://pub-7c92c7b3ba5f4f38a598ddc8e89ba361.r2.dev/logos/logo-light.webp"
        alt="noizu.direct"
        width={130}
        height={33}
        style={{ objectFit: 'contain' }}
        className="dark:hidden"
      />
      <img
        src="https://pub-7c92c7b3ba5f4f38a598ddc8e89ba361.r2.dev/logos/logo-dark.webp"
        alt="noizu.direct"
        width={130}
        height={33}
        style={{ objectFit: 'contain' }}
        className="hidden dark:block"
      />
    </span>
  )
}
