import { cn } from '@/lib/utils'

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-block size-6 animate-spin rounded-full border-2 border-primary border-t-transparent',
        className
      )}
      role="status"
      aria-label="Loading"
    />
  )
}
