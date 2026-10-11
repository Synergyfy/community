import { MapPin } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useCommunityLocation } from '@/hooks/useCommunityLocation'
import { LocationSelector } from './LocationSelector'

export function CommunityContextBadge() {
  const [open, setOpen] = useState(false)
  const location = useCommunityLocation()
  const city = location?.cityName || 'Your Community'
  return (
    <>
      <button onClick={() => setOpen(true)} className={cn('flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900')}>
        <MapPin className='h-4 w-4' />
        <span className='truncate max-w-[120px] sm:max-w-none'>{city}</span>
        <svg className='h-4 w-4' viewBox='0 0 20 20' fill='currentColor'>
          <path fillRule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clipRule='evenodd' />
        </svg>
      </button>
      <LocationSelector isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
