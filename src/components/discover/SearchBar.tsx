import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  onSubmit?: () => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

export function SearchBar({ value, onChange, onFocus, onSubmit, placeholder = 'Search your Community…', autoFocus, className }: SearchBarProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
      }}
      className={cn('relative flex items-center', className)}
    >
      <Search className='pointer-events-none absolute left-3 h-4 w-4 text-gray-400' />
      <input
        type='search'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className='w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-9 text-sm outline-none focus:border-primary-400 focus:bg-white focus:ring-1 focus:ring-primary-400'
      />
      {value && (
        <button type='button' onClick={() => onChange('')} className='absolute right-3 text-gray-400 hover:text-gray-600' aria-label='Clear search'>
          <X className='h-4 w-4' />
        </button>
      )}
    </form>
  )
}
