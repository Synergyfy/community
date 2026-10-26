import { useAuthStore } from '@/stores/auth.store'
import type { ManagerAreaDef, ManagerConfig, ManagerPermissions, ManagerRecord } from '@/types/community-public'

/**
 * Community Hub Managers — a staff-role overlay on CHS accounts.
 *
 * A manager appointment is a *separate record* attached to an existing CHS
 * account (or an invite pending CHS authentication). It is NOT a membership:
 * appointing, reassigning, suspending or removing the manager role never
 * creates, modifies or deletes the person's CHS account or memberships. If
 * the same person also uses CHS as a Business or Consumer, their membership
 * entitlements stay independent of these staff permissions.
 *
 * This store holds:
 * - the platform `ManagerConfig` (structure + areas an admin manages), and
 * - `ManagerRecord` appointments (scope, permissions, lifecycle).
 *
 * Which structure the platform uses and which permissions a manager receives
 * are admin configuration choices (independently switchable, spec §3). The
 * server remains authoritative; the front end mirrors the same rules for the
 * demo experience.
 */

const RECORDS_KEY = 'community_managers'
const CONFIG_KEY = 'community_manager_config'
const SEED_FLAG_KEY = 'community_managers_seeded'

/** Every manager permission starts OFF — an admin grants each switch on. */
export function emptyPermissions(): ManagerPermissions {
  return {
    viewReviewContent: false,
    approveRejectContent: false,
    publishPosts: false,
    publishAnnouncements: false,
    hideRemoveRestore: false,
    moderateReports: false,
    moderateExchange: false,
    escalateToAdmin: false,
  }
}

function readRecords(): Record<string, ManagerRecord> {
  try {
    const raw = localStorage.getItem(RECORDS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, ManagerRecord>) : {}
  } catch {
    return {}
  }
}

function writeRecords(map: Record<string, ManagerRecord>): void {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

function readConfigRaw(): ManagerConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? (JSON.parse(raw) as ManagerConfig) : null
  } catch {
    return null
  }
}

function writeConfig(config: ManagerConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch {
    /* ignore */
  }
}

function currentUserId(): string {
  return useAuthStore.getState().user?.id ?? 'system'
}

function currentUserName(): string {
  return useAuthStore.getState().user?.name ?? 'Central Hub'
}

function now(): string {
  return new Date().toISOString()
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString()
}

/**
 * Default configuration when nothing is stored. Areas are geographic scopes
 * (a null city means platform-wide / non-geographic); the structure is a
 * genuine admin choice — seeded here as 'hierarchy' for the demo so the
 * reporting-level and supervisor fields are exercised.
 */
function defaultConfig(): ManagerConfig {
  return {
    structure: 'hierarchy',
    areas: [
      { id: 'area-platform', name: 'Platform-wide', city: null },
      { id: 'area-worcester', name: 'Worcester city', city: 'Worcester' },
      { id: 'area-redditch', name: 'Redditch', city: 'Redditch' },
    ],
    updatedAt: now(),
    updatedBy: 'Central Hub',
    source: 'demo',
  }
}

/**
 * Seed two demo appointments (labelled `source: 'demo'`, spec §16) so the
 * manager dashboard, permission gating and lifecycle have a real exhibit:
 * - mgr1 Maya Patel — active, hierarchy level 2, content/reports powers.
 * - mgr2 Tom Fisher — suspended, level 1 reporting to Maya, exchange powers.
 */
function seedDemo(): void {
  try {
    if (localStorage.getItem(SEED_FLAG_KEY)) return
    localStorage.setItem(SEED_FLAG_KEY, '1')
  } catch {
    return
  }
  const all = readRecords()
  if (!all['mgr1']) {
    all['mgr1'] = {
      id: 'mgr1',
      userId: 'mgr1',
      name: 'Maya Patel',
      email: 'manager@demo.com',
      status: 'active',
      structure: 'hierarchy',
      areas: ['area-worcester'],
      locations: [],
      reportingLevel: 2,
      supervisorId: null,
      permissions: {
        ...emptyPermissions(),
        viewReviewContent: true,
        approveRejectContent: true,
        publishPosts: true,
        hideRemoveRestore: true,
        moderateReports: true,
        escalateToAdmin: true,
      },
      restrictions: {
        permittedContentTypes: null,
        announcementAudiences: null,
      },
      appointedBy: 'a1',
      appointedByName: 'Central Hub',
      appointedAt: daysAgo(14),
      source: 'demo',
    }
  }
  if (!all['mgr2']) {
    all['mgr2'] = {
      id: 'mgr2',
      userId: 'mgr2',
      name: 'Tom Fisher',
      email: 'tom.fisher@demo.com',
      status: 'suspended',
      structure: 'hierarchy',
      areas: ['area-worcester'],
      locations: [],
      reportingLevel: 1,
      supervisorId: 'mgr1',
      permissions: {
        ...emptyPermissions(),
        viewReviewContent: true,
        moderateExchange: true,
        escalateToAdmin: true,
      },
      restrictions: {
        permittedContentTypes: ['standard', 'business_info'],
        announcementAudiences: ['both'],
      },
      appointedBy: 'a1',
      appointedByName: 'Central Hub',
      appointedAt: daysAgo(40),
      updatedAt: daysAgo(3),
      updatedById: 'a1',
      source: 'demo',
    }
  }
  writeRecords(all)
}

export const managersService = {
  ensureSeeded(): void {
    seedDemo()
  },

  getConfig(): ManagerConfig {
    seedDemo()
    return readConfigRaw() ?? defaultConfig()
  },

  saveConfig(patch: Partial<Pick<ManagerConfig, 'structure' | 'areas'>>): ManagerConfig {
    seedDemo()
    const base = readConfigRaw() ?? defaultConfig()
    const next: ManagerConfig = {
      ...base,
      ...patch,
      updatedAt: now(),
      updatedBy: currentUserName(),
      source: 'user',
    }
    writeConfig(next)
    return next
  },

  listManagers(): ManagerRecord[] {
    seedDemo()
    return Object.values(readRecords()).sort((a, b) => b.appointedAt.localeCompare(a.appointedAt))
  },

  getManager(id: string): ManagerRecord | null {
    seedDemo()
    return readRecords()[id] ?? null
  },

  /** The active appointment held by a CHS account, if any. */
  getActiveForUser(userId: string | null | undefined): ManagerRecord | null {
    if (!userId) return null
    seedDemo()
    return Object.values(readRecords()).find((m) => m.userId === userId && m.status === 'active') ?? null
  },

  /** Any appointment (any status) held by a CHS account — for status badges. */
  getAnyForUser(userId: string | null | undefined): ManagerRecord | null {
    if (!userId) return null
    seedDemo()
    return Object.values(readRecords()).find((m) => m.userId === userId) ?? null
  },

  create(input: Omit<ManagerRecord, 'id' | 'appointedBy' | 'appointedByName' | 'appointedAt' | 'source'>): ManagerRecord {
    seedDemo()
    const all = readRecords()
    const id = `mgr-${Date.now().toString(36)}`
    const record: ManagerRecord = {
      ...input,
      id,
      appointedBy: currentUserId(),
      appointedByName: currentUserName(),
      appointedAt: now(),
      source: 'user',
    }
    all[id] = record
    writeRecords(all)
    return record
  },

  update(id: string, patch: Partial<ManagerRecord>): ManagerRecord | null {
    seedDemo()
    const all = readRecords()
    const existing = all[id]
    if (!existing) return null
    const next: ManagerRecord = {
      ...existing,
      ...patch,
      id,
      updatedAt: now(),
      updatedById: currentUserId(),
    }
    all[id] = next
    writeRecords(all)
    return next
  },
}

/** Human labels for the independently configurable manager permissions. */
export const MANAGER_PERMISSION_LABELS: Array<{ key: keyof ManagerPermissions; label: string; description: string }> = [
  { key: 'viewReviewContent', label: 'View & review content', description: 'See posts and comments within their assigned scope and review them.' },
  { key: 'approveRejectContent', label: 'Approve or reject content', description: 'Approve pending posts or reject them with a reason.' },
  { key: 'publishPosts', label: 'Publish approved posts', description: 'Publish approved posts directly to the community.' },
  { key: 'publishAnnouncements', label: 'Publish announcements', description: 'Compose and publish announcements — independent from post approval.' },
  { key: 'hideRemoveRestore', label: 'Hide, remove or restore content', description: 'Take content down, hide it, or restore something previously hidden.' },
  { key: 'moderateReports', label: 'Moderate reports', description: 'Work through the reports queue and mark cases under review.' },
  { key: 'moderateExchange', label: 'Moderate #Exchange', description: 'Review and moderate exchange items within their scope.' },
  { key: 'escalateToAdmin', label: 'Escalate to central Admin', description: 'Escalate sensitive or disputed cases to the central Admin team.' },
]

/** Resolve an area id list to their definitions (unknown ids dropped). */
export function resolveAreas(ids: string[], all: ManagerAreaDef[]): ManagerAreaDef[] {
  const byId = new Map(all.map((a) => [a.id, a]))
  return ids.map((id) => byId.get(id)).filter((a): a is ManagerAreaDef => !!a)
}
