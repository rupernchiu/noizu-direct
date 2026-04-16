'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { SearchIcon } from 'lucide-react'

interface SearchBarProps {
  placeholder?: string
  paramName?: string
  className?: string
  debounceMs?: number
}

export function SearchBar({
  placeholder = 'Search...',
  paramName = 'q',
  className,
  debounceMs = 300,
}: SearchBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get(paramName) ?? '')
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(paramName, value)
      } else {
        params.delete(paramName)
      }
      params.delete('page')
      router.replace(`${pathname}?${params.toString()}`)
    }, debounceMs)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="relative">
      <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`pl-9 border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:border-primary ${className ?? ''}`}
      />
    </div>
  )
}
