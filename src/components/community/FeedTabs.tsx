import { cn } from '@/lib/utils'

export const FEED_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'businesses', label: 'Businesses' },
  { id: 'consumers', label: 'Consumers' },
  { id: 'groups', label: 'Groups' },
] as const

export type FeedFilter = (typeof FEED_FILTERS)[number]['id']

interface FeedTabsProps {
  active: FeedFilter
  onChange: (filter: FeedFilter) => void
}

export function FeedTabs({ active, onChange }: FeedTabsProps) {
  return (
    <div className='flex gap-1 border-b border-gray-200 overflow-x-auto scrollbar-hide'>
      {FEED_FILTERS.map((f) => {
        const isActive = active === f.id
        return (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className={cn(
              'whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              isActive ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-800',
            )}
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
}
