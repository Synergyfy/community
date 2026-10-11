import { useEffect, useState } from 'react'
import type { LocationContext } from '@/types/community-public'
import { readLocation, LOCATION_CHANGED_EVENT } from '@/lib/location'

export function useCommunityLocation(): LocationContext | null {
  const [location, setLocation] = useState<LocationContext | null>(() => readLocation())

  useEffect(() => {
    const handler = () => setLocation(readLocation())
    window.addEventListener('storage', handler)
    window.addEventListener(LOCATION_CHANGED_EVENT, handler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener(LOCATION_CHANGED_EVENT, handler)
    }
  }, [])

  return location
}
