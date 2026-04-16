'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Option {
  value: string
  label: string
}

interface FilterSelectProps {
  paramName: string
  options: Option[]
  allLabel?: string
  placeholder?: string
  className?: string
}

export function FilterSelect({
  paramName,
  options,
  allLabel = 'All',
  placeholder,
  className,
}: FilterSelectProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get(paramName) ?? 'ALL'

  function handleChange(value: string | null) {
    if (value === null) return
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'ALL') {
      params.delete(paramName)
    } else {
      params.set(paramName, value)
    }
    params.delete('page')
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger
        className={`border-border bg-card text-foreground ${className ?? ''}`}
      >
        <SelectValue placeholder={placeholder ?? allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">{allLabel}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
