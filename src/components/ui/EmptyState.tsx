import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {icon && (
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-[#1e1e2a] text-[#8888aa]">
          {icon}
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold text-[#f0f0f5]">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-[#8888aa]">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
