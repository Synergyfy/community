import { demoExchanges } from '@/data/demo-public'
import type { ContentCategory } from '@/types/community-public'

/**
 * Admin-managed category store (spec §3.2, §5.2, §13).
 *
 * Community and #Exchange categories live here — as data, not hardcoded
 * frontend lists — so Discover, category pages and composers consume exactly
 * what Admin configures. Seeded from the categories the demo already uses.
 */

const CATEGORIES_KEY = 'community_categories'
const SEED_KEY = 'community_categories_seeded'

/** Seed mirrors the categories the experience shipped with (existing data, not new rules). */
const COMMUNITY_SEED: Array<{ id: string; name: string; icon: string }> = [
  { id: 'food-drink', name: 'Food & Drink', icon: 'UtensilsCrossed' },
  { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag' },
  { id: 'health', name: 'Health & Beauty', icon: 'HeartPulse' },
  { id: 'home', name: 'Home & Garden', icon: 'Home' },
  { id: 'services', name: 'Local Services', icon: 'Wrench' },
  { id: 'community', name: 'Community', icon: 'Users' },
  { id: 'events', name: 'Events', icon: 'CalendarDays' },
  { id: 'causes', name: 'Causes', icon: 'HandHeart' },
]

function humanize(id: string): string {
  return id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function buildSeed(): ContentCategory[] {
  const community: ContentCategory[] = COMMUNITY_SEED.map((c, i) => ({
    id: c.id,
    kind: 'community',
    name: c.name,
    icon: c.icon,
    active: true,
    sortOrder: i,
    contentType: 'post',
    placement: 'discover',
  }))
  // Exchange categories derived from the category ids demo exchanges actually
  // use — no invented categories (§17-2 decision pending).
  const exchangeIds = [...new Set(demoExchanges.map((e) => e.categoryId).filter((id): id is string => !!id))]
  const communityName = (id: string) => COMMUNITY_SEED.find((c) => c.id === id)?.name ?? humanize(id)
  const exchange: ContentCategory[] = exchangeIds.map((id, i) => ({
    id,
    kind: 'exchange',
    name: communityName(id),
    active: true,
    sortOrder: i,
    contentType: 'exchange',
    placement: 'exchange_form',
  }))
  return [...community, ...exchange]
}

function seedOnce(): void {
  try {
    if (localStorage.getItem(SEED_KEY)) return
    localStorage.setItem(SEED_KEY, '1')
    if (!localStorage.getItem(CATEGORIES_KEY)) {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(buildSeed()))
    }
  } catch {
    /* storage unavailable — in-memory fallback below */
  }
}

function read(): ContentCategory[] {
  seedOnce()
  let records: ContentCategory[] = []
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY)
    if (raw) records = JSON.parse(raw) as ContentCategory[]
  } catch {
    /* ignore */
  }
  // Heal stores seeded before later demo data existed: merge any exchange
  // category id that demo exchanges actually use (deduped by id, so stores
  // already containing it — or deliberately removed ones — are untouched).
  const used = [...new Set(demoExchanges.map((e) => e.categoryId).filter((id): id is string => !!id))]
  const missing = used.filter((id) => !records.some((c) => c.kind === 'exchange' && c.id === id))
  if (missing.length) {
    const base = records.filter((c) => c.kind === 'exchange').length
    records = [
      ...records,
      ...missing.map((id, i) => ({
        id,
        kind: 'exchange' as const,
        name: humanize(id),
        active: true,
        sortOrder: base + i,
        contentType: 'exchange',
        placement: 'exchange_form',
      })),
    ]
    write(records)
  }
  if (records.length) return records
  return buildSeed()
}

function write(records: ContentCategory[]): void {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(records))
  } catch {
    /* ignore */
  }
}

export const categoriesService = {
  /** All categories for a kind (admins see inactive ones too). */
  listCategories(kind: 'community' | 'exchange', opts?: { includeInactive?: boolean }): ContentCategory[] {
    const all = read()
      .filter((c) => c.kind === kind)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    return opts?.includeInactive === false ? all.filter((c) => c.active) : all
  },

  /** Active categories for public-facing pickers and Discover. */
  listActiveCategories(kind: 'community' | 'exchange'): ContentCategory[] {
    return categoriesService.listCategories(kind, { includeInactive: false })
  },

  getCategory(kind: 'community' | 'exchange', id: string): ContentCategory | undefined {
    return read().find((c) => c.kind === kind && c.id === id)
  },

  createCategory(input: { kind: 'community' | 'exchange'; name: string; description?: string; contentType?: string; placement?: string }): ContentCategory {
    const all = read()
    const baseId = input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category'
    let id = baseId
    let n = 2
    while (all.some((c) => c.kind === input.kind && c.id === id)) id = `${baseId}-${n++}`
    const category: ContentCategory = {
      id,
      kind: input.kind,
      name: input.name.trim(),
      description: input.description ?? null,
      contentType: input.contentType ?? null,
      placement: input.placement ?? null,
      active: true,
      sortOrder: all.filter((c) => c.kind === input.kind).length,
    }
    write([...all, category])
    return category
  },

  updateCategory(kind: 'community' | 'exchange', id: string, patch: Partial<Pick<ContentCategory, 'name' | 'description' | 'contentType' | 'placement' | 'active'>>): void {
    const all = read()
    const current = all.find((c) => c.kind === kind && c.id === id)
    if (!current) return
    all[all.indexOf(current)] = { ...current, ...patch }
    write(all)
  },

  setCategoryActive(kind: 'community' | 'exchange', id: string, active: boolean): void {
    categoriesService.updateCategory(kind, id, { active })
  },

  /** Move a category up/down in display order (§3.2). */
  moveCategory(kind: 'community' | 'exchange', id: string, direction: -1 | 1): void {
    const all = read()
    const kindList = all.filter((c) => c.kind === kind).sort((a, b) => a.sortOrder - b.sortOrder)
    const pos = kindList.findIndex((c) => c.id === id)
    const swapWith = pos + direction
    const a = pos >= 0 ? kindList[pos] : undefined
    const b = kindList[swapWith]
    if (!a || !b) return
    const tmp = a.sortOrder
    a.sortOrder = b.sortOrder
    b.sortOrder = tmp
    write(all)
  },
}
