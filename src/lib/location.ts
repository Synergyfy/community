import type { LocationContext } from '@/types/community-public'

export const LOCATION_STORAGE_KEY = 'community_location'
export const LOCATION_CHANGED_EVENT = 'community-location-changed'

export function readLocation(): LocationContext | null {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LocationContext) : null
  } catch {
    return null
  }
}

export function saveLocation(location: LocationContext): void {
  localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location))
  window.dispatchEvent(new Event(LOCATION_CHANGED_EVENT))
}
