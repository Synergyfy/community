import { useAuthStore } from '@/stores/auth.store'
import type { Announcement, LocationContext } from '@/types/community-public'

/**
 * Announcement store (spec §4). Admin publishes one announcement record and
 * it fans out to whichever surfaces its audience, location and group scope
 * allow — the same record is never recreated per dashboard (§15). The
 * composer, lifecycle actions and surface strips are built in Phase C; this
 * module owns the record lifecycle and targeting rules.
 *
 * Lifecycle is computed on read (sweep), so scheduling works without a
 * timer: `scheduled` becomes `published` once `publishAt` passes, and
 * `published` becomes `expired` once `expiresAt` passes.
 */

const KEY = 'community_announcements'

function readRaw(): Announcement[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Announcement[]) : []
  } catch {
    return []
  }
}

function write(records: Announcement[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(records))
  } catch {
    /* ignore */
  }
}

/**
 * Demo seed — clearly marked `source: 'demo'` so it is never mistaken for
 * admin input. Gives every surface an announcement to render from first run.
 * Merged by id/title so existing stores pick it up without duplicating.
 */
const SEED: Announcement = {
  id: 'ann-demo-market-closure',
  title: 'Market street road closure this weekend',
  content:
    'High Street closes to traffic on Saturday from 10am to 4pm for the monthly market. Plan your visit ahead — pedestrian access stays open all day.',
  imageUrl: null,
  categoryId: null,
  audience: 'both',
  location: null,
  groupId: null,
  status: 'published',
  publishAt: null,
  expiresAt: null,
  isPinned: true,
  authorId: 'a1',
  createdAt: '',
  source: 'demo',
}

/** Load with demo seeding + lifecycle sweep (scheduled → published → expired). */
function load(): Announcement[] {
  let records = readRaw()

  const missing =
    records.some((r) => r.id === SEED.id || (r.source === 'demo' && r.title === SEED.title)) ? []
    : [{ ...SEED, createdAt: new Date(Date.now() - 36e5).toISOString() }]
  if (missing.length) {
    records = [...missing, ...records]
    write(records)
  }

  const now = Date.now()
  let changed = false
  for (const a of records) {
    if (a.status === 'scheduled' && a.publishAt && new Date(a.publishAt).getTime() <= now) {
      a.status = 'published'
      changed = true
    }
    if (a.status === 'published' && a.expiresAt && new Date(a.expiresAt).getTime() < now) {
      a.status = 'expired'
      changed = true
    }
  }
  if (changed) write(records)
  return records
}

export type AnnouncementInput = Omit<Announcement, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>

export type AnnouncementViewer = {
  userType: 'public' | 'business' | 'consumer' | 'admin'
  location?: LocationContext | null
}

export const announcementsService = {
  listAnnouncements(filter?: { status?: Announcement['status'] }): Announcement[] {
    let records = load().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    if (filter?.status) records = records.filter((a) => a.status === filter.status)
    return records
  },

  getAnnouncement(id: string): Announcement | undefined {
    return load().find((a) => a.id === id)
  },

  createAnnouncement(input: AnnouncementInput): Announcement {
    const authorId = useAuthStore.getState().user?.id ?? 'a1'
    const now = new Date().toISOString()
    const record: Announcement = {
      ...input,
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      authorId,
      createdAt: now,
      updatedAt: now,
    }
    write([record, ...load()])
    return record
  },

  updateAnnouncement(id: string, patch: Partial<AnnouncementInput>): Announcement | undefined {
    const records = load()
    const current = records.find((a) => a.id === id)
    if (!current) return undefined
    const next: Announcement = { ...current, ...patch, updatedAt: new Date().toISOString() }
    records[records.indexOf(current)] = next
    write(records)
    return next
  },

  setStatus(id: string, status: Announcement['status']): Announcement | undefined {
    return announcementsService.updateAnnouncement(id, { status })
  },

  deleteAnnouncement(id: string): void {
    write(load().filter((a) => a.id !== id))
  },

  /**
   * Should an announcement be visible on a given surface? Centralises
   * status/timing/audience/location/group rules in one place so every
   * surface shows the same record the same way (§15).
   */
  isTargetedAt(
    announcement: Announcement,
    viewer: AnnouncementViewer,
    context?: { groupId?: string | null },
  ): boolean {
    if (announcement.status !== 'published') return false
    const now = Date.now()
    if (announcement.publishAt && new Date(announcement.publishAt).getTime() > now) return false
    if (announcement.expiresAt && new Date(announcement.expiresAt).getTime() < now) return false
    // Group-scoped announcements render only on their group's surface;
    // unscoped announcements broadcast everywhere (field semantics, §4).
    if (announcement.groupId && announcement.groupId !== (context?.groupId ?? null)) return false
    if (announcement.audience !== 'both' && viewer.userType !== 'admin') {
      if (viewer.userType !== announcement.audience) return false
    }
    // Location narrowing follows the platform's actual structures; absent
    // scope means the whole Community.
    if (announcement.location?.cityName && viewer.location?.cityName) {
      if (announcement.location.cityName !== viewer.location.cityName) return false
    }
    return true
  },

  /** Announcements visible on a surface for this viewer (sweep applied). */
  listVisibleFor(viewer: AnnouncementViewer, context?: { groupId?: string | null }): Announcement[] {
    return load()
      .filter((a) => announcementsService.isTargetedAt(a, viewer, context))
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },
}
