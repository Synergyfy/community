import { managersService } from '@/services/managers.service'
import { useAuthStore } from '@/stores/auth.store'
import type { ManagerAreaDef, ManagerRecord } from '@/types/community-public'

/**
 * Manager scope resolution (Community Hub Manager spec §8): a manager only
 * acts within their assigned areas.
 *
 * Scope is derived from the assigned `ManagerAreaDef` entries — an area with
 * a null city is platform-wide and covers everything; an area with a city
 * covers content located in that city (plus the manager's extra `locations`).
 * Content with no location at all is only covered by a platform-wide area.
 */
export interface ManagerScope {
  /** True when a platform-wide area covers everything. */
  all: boolean
  cities: string[]
}

export function managerScope(record: ManagerRecord, areas: ManagerAreaDef[]): ManagerScope {
  const resolved = areas.filter((a) => record.areas.includes(a.id))
  const all = resolved.some((a) => !a.city)
  const cities = new Set<string>()
  for (const a of resolved) if (a.city) cities.add(a.city)
  for (const c of record.locations) cities.add(c)
  return { all, cities: [...cities] }
}

/** Is a piece of content (with an optional city) inside this manager's scope? */
export function inScope(scope: ManagerScope, city?: string | null): boolean {
  if (scope.all) return true
  if (!city) return false
  return scope.cities.includes(city)
}

/** The manager record for the signed-in user — any status (for badges/guards). */
export function currentManagerRecord(): ManagerRecord | null {
  const user = useAuthStore.getState().user
  return managersService.getAnyForUser(user?.id)
}
