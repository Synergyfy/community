import { api } from '@/lib/api'
import { adminConfigService } from '@/services/admin-config.service'
import { useAuthStore } from '@/stores/auth.store'
import { useEngagementStore } from '@/stores/engagement.store'
import type { ReportRecord, ReportStatus, ReportTargetType } from '@/types/community-public'

/**
 * First-class report store (spec §3.5, §3.6).
 *
 * Reports capture reason, context and resolution so the moderation queue can
 * show why something was flagged and what happened to it — replacing bare
 * "reported" id lists. Persisted client-side for the demo; the server owns
 * the authoritative report ledger in production.
 */

const REPORTS_KEY = 'community_reports'

function read(): ReportRecord[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY)
    return raw ? (JSON.parse(raw) as ReportRecord[]) : []
  } catch {
    return []
  }
}

function write(records: ReportRecord[]): void {
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(records))
  } catch {
    /* storage unavailable — ignore */
  }
}

/**
 * Demo seed — clearly marked `source: 'demo'` so it is never mistaken for
 * real user input: a reported post, exchange and comment so every queue is
 * exercisable from first run. Stable ids + id-based merge, so stores created
 * by earlier versions pick up new seed records without duplicating.
 */
function seedOnce(): void {
  const now = Date.now()
  const seeds: ReportRecord[] = [
    {
      id: 'rep-demo-post',
      targetType: 'post',
      targetId: 'p7',
      targetLabel: 'We hit 70% of our goal!',
      reasonCode: 'spam',
      reasonLabel: 'Spam or misleading',
      details: 'Looks like the same promotional message posted repeatedly.',
      reporterId: 'c1',
      reporterName: 'Priya (demo)',
      status: 'pending',
      createdAt: new Date(now - 36e5).toISOString(),
      source: 'demo',
    },
    {
      id: 'rep-demo-exchange',
      targetType: 'exchange',
      targetId: 'e1',
      targetLabel: 'Bike for books swap',
      reasonCode: 'other',
      reasonLabel: 'Something else',
      details: 'Item description does not match the photos.',
      reporterId: 'c2',
      reporterName: 'Jordan (demo)',
      status: 'pending',
      createdAt: new Date(now - 72e5).toISOString(),
      source: 'demo',
    },
    {
      id: 'rep-demo-comment',
      targetType: 'comment',
      targetId: 'cm3',
      targetLabel: 'Just donated. Wishing you a great campaign!',
      reasonCode: 'spam',
      reasonLabel: 'Spam or misleading',
      details: 'Same comment posted across several campaigns.',
      reporterId: 'c2',
      reporterName: 'Jordan (demo)',
      status: 'pending',
      createdAt: new Date(now - 108e5).toISOString(),
      source: 'demo',
    },
    {
      // Reported *group-origin* content (Phase G, §9): a report on a post
      // created inside the Worcester Volunteers group, so the moderation
      // queue and reports ledger must identify the group origin.
      id: 'rep-demo-grouppost',
      targetType: 'post',
      targetId: 'p8',
      targetLabel: 'Litter pick this Sunday',
      reasonCode: 'misinformation',
      reasonLabel: 'False information',
      details: 'The meeting point is wrong — the park entrance changed last month.',
      reporterId: 'c2',
      reporterName: 'Jordan (demo)',
      status: 'pending',
      createdAt: new Date(now - 54e5).toISOString(),
      source: 'demo',
    },
  ]
  const existing = read()
  const known = new Set(existing.map((r) => r.id))
  // Also dedupe by content: stores seeded by earlier versions used timestamped
  // ids for the same demo records (§15 — one record, never two copies).
  const knownContent = new Set(
    existing
      .filter((r) => r.source === 'demo')
      .map((r) => `${r.targetType}:${r.targetId}:${r.reasonCode}`),
  )
  const missing = seeds.filter(
    (s) => !known.has(s.id) && !knownContent.has(`${s.targetType}:${s.targetId}:${s.reasonCode}`),
  )
  if (missing.length) write([...missing, ...read()])
}

export const reportsService = {
  createReport(input: {
    targetType: ReportTargetType
    targetId: string
    targetLabel?: string | null
    reasonCode: string
    reasonLabel?: string | null
    details?: string | null
    reporterId: string
    reporterName?: string | null
  }): ReportRecord {
    seedOnce()
    const record: ReportRecord = {
      id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      targetType: input.targetType,
      targetId: input.targetId,
      targetLabel: input.targetLabel ?? null,
      reasonCode: input.reasonCode,
      reasonLabel: input.reasonLabel ?? null,
      details: input.details ?? null,
      reporterId: input.reporterId,
      reporterName: input.reporterName ?? null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      source: 'user',
    }
    write([record, ...read()])
    return record
  },

  /**
   * Submit a report for any reportable target (post, comment, exchange, user).
   * Tries the server first; falls back to the demo store and keeps the legacy
   * post-reported marker in sync for existing UI.
   */
  async submitReport(input: {
    targetType: ReportTargetType
    targetId: string
    targetLabel?: string | null
    reasonCode: string
    details?: string | null
  }): Promise<void> {
    try {
      await api.post(`/community/${input.targetType}s/${input.targetId}/report`, {
        reason: input.reasonCode,
        details: input.details,
      })
      return
    } catch {
      /* no backend — record the report in the demo store instead (§3.6) */
    }
    const reporter = useAuthStore.getState().user
    const reasonLabel =
      adminConfigService.listReportReasons().find((r) => r.id === input.reasonCode)?.label ?? input.reasonCode
    reportsService.createReport({
      targetType: input.targetType,
      targetId: input.targetId,
      targetLabel: input.targetLabel ?? null,
      reasonCode: input.reasonCode,
      reasonLabel,
      details: input.details ?? null,
      reporterId: reporter?.id ?? 'guest',
      reporterName: reporter?.name ?? null,
    })
    if (input.targetType === 'post') {
      // Legacy reported-id marker used by older UI paths.
      useEngagementStore.getState().reportPost(input.targetId)
    }
  },

  listReports(filter?: { targetType?: ReportTargetType; status?: ReportStatus }): ReportRecord[] {
    seedOnce()
    let records = read()
    if (filter?.targetType) records = records.filter((r) => r.targetType === filter.targetType)
    if (filter?.status) records = records.filter((r) => r.status === filter.status)
    return records
  },

  /** Targets that have at least one unresolved report (queue badges, §3.5). */
  listOpenTargetIds(targetType: ReportTargetType): string[] {
    const ids = new Set<string>()
    for (const r of reportsService.listReports({ targetType })) {
      if (r.status !== 'resolved') ids.add(r.targetId)
    }
    return [...ids]
  },

  /** Resolve every open report against one target (admin decision recorded, §3.6). */
  resolveForTarget(
    targetType: ReportTargetType,
    targetId: string,
    outcome: 'uphold' | 'dismiss',
    resolvedBy: string,
    note?: string,
  ): number {
    const records = read()
    let touched = 0
    const now = new Date().toISOString()
    for (const r of records) {
      if (r.targetType === targetType && r.targetId === targetId && r.status !== 'resolved') {
        r.status = 'resolved'
        r.decision = outcome
        r.resolvedBy = resolvedBy
        r.resolvedAt = now
        r.resolutionNote = note ?? null
        touched++
      }
    }
    if (touched) write(records)
    return touched
  },

  /** Move a report into a workflow state (§3.5: under review, escalated). */
  setStatus(id: string, status: ReportStatus): boolean {
    const records = read()
    const record = records.find((r) => r.id === id)
    if (!record || record.status === 'resolved') return false
    record.status = status
    write(records)
    return true
  },

  /** Assign an open report to a reviewer (§3.5 — where assignment is supported). */
  assign(id: string, adminId: string, adminName: string): boolean {
    const records = read()
    const record = records.find((r) => r.id === id)
    if (!record || record.status === 'resolved') return false
    record.assignedTo = adminId
    record.assignedToName = adminName
    write(records)
    return true
  },
}
