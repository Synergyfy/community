import { api } from '@/lib/api'
import { PostStatus } from '@/lib/constants'
import { demoUsers, demoBusinesses, demoCampaigns, demoHashtags, demoRewards, demoGroups } from '@/data/demo-public'
import { getAllDemoPosts, deleteDemoPostEverywhere, getAllDemoComments } from '@/services/community.service'
import { getAllDemoExchanges, deleteDemoExchangeEverywhere } from '@/services/discover.service'
import { getAllBusinessPosts, deleteBusinessDemoPost } from '@/services/business.service'
import { attributionApi } from '@/services/attribution.service'
import { sharingApi } from '@/services/sharing.service'
import { reportsService } from '@/services/reports.service'
import { adminConfigService } from '@/services/admin-config.service'
import { campaignConfigService } from '@/services/campaign-config.service'
import { announcementsService, type AnnouncementInput } from '@/services/announcements.service'
import { categoriesService } from '@/services/categories.service'
import { managersService, MANAGER_PERMISSION_LABELS } from '@/services/managers.service'
import { membershipService } from '@/services/membership.service'
import { notificationConfigService } from '@/services/notification-config.service'
import { useEngagementStore } from '@/stores/engagement.store'
import { useAuthStore } from '@/stores/auth.store'
import {
  ADMIN_ACTIONS,
  DEFAULT_GRANTS,
  getRoleGrants,
  writeRoleGrants,
  type AdminAction,
  type Viewer,
} from '@/lib/permissions'
import type {
  Announcement,
  AuditEntry,
  CampaignShareConfig,
  CommunityAdminConfig,
  ContentCategory,
  ExchangeTypeConfig,
  ManagerConfig,
  ManagerPermissions,
  ManagerRecord,
  MembershipConfig,
  NotificationEventDef,
  NotificationEventTemplate,
  PublicCampaign,
  PublicComment,
  PublicExchange,
  PublicGroup,
  PublicHashtag,
  PublicPost,
  PublicReward,
  PublicUser,
  ReferralRecord,
  ReportReason,
  ReportRecord,
  ReportTargetType,
  ShareCreateResult,
  ShareRecord,
} from '@/types/community-public'

/**
 * Admin control-centre service (spec §5). Mutations operate on the same demo
 * store objects the public/business surfaces read, so moderation is reflected
 * immediately. Every mutation is written to the audit log with the acting
 * administrator, action, target, timestamp and previous → resulting status
 * (§5.2, §14). In production these calls map to server endpoints; the server
 * remains the permission boundary.
 */

const AUDIT_KEY = 'community_audit'

/** Fire a real API call when a backend exists; demo fallback always applies. */
async function attempt(call: () => Promise<unknown>): Promise<void> {
  try {
    await call()
  } catch {
    /* no backend — demo store handles it */
  }
}

// ---------------------------------------------------------------------------
// Audit log (§14)
// ---------------------------------------------------------------------------

function readAudit(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY)
    return raw ? (JSON.parse(raw) as AuditEntry[]) : []
  } catch {
    return []
  }
}

function writeAudit(entries: AuditEntry[]): void {
  try {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(entries))
  } catch {
    /* ignore */
  }
}

function currentAdmin(): { id: string; name: string } {
  const user = useAuthStore.getState().user
  return { id: user?.id ?? 'a1', name: user?.name ?? 'Central Hub' }
}

interface AuditDetails {
  targetId?: string
  targetLabel?: string
  details?: string
  /** Status before the action (§14). */
  previousStatus?: string | null
  /** Status after the action (§14). */
  resultingStatus?: string | null
  /** Reason/note where the action requires one (§14). */
  reason?: string | null
}

function audit(action: string, targetType: AuditEntry['targetType'], opts: AuditDetails = {}): void {
  const admin = currentAdmin()
  const entry: AuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    adminId: admin.id,
    adminName: admin.name,
    action,
    targetType,
    targetId: opts.targetId,
    targetLabel: opts.targetLabel,
    details: opts.details,
    previousStatus: opts.previousStatus ?? null,
    resultingStatus: opts.resultingStatus ?? null,
    reason: opts.reason ?? null,
  }
  writeAudit([entry, ...readAudit()])
}

// ---------------------------------------------------------------------------
// Posts (§5.2 Content Management + Feed Controls)
// ---------------------------------------------------------------------------

export type PostModerationAction =
  | 'approve'
  | 'reject'
  | 'hide'
  | 'restore'
  | 'pin'
  | 'unpin'
  | 'feature'
  | 'unfeature'
  | 'remove'

function findPost(id: string): PublicPost | undefined {
  return getAllDemoPosts().find((p) => p.id === id) ?? getAllBusinessPosts().find((p) => p.id === id)
}

/** Display label for any reportable target (queue and reports center). */
function targetLabelFor(targetType: ReportTargetType, targetId: string): string {
  switch (targetType) {
    case 'post': {
      const post = findPost(targetId)
      return post?.title ?? post?.content.slice(0, 60) ?? targetId
    }
    case 'comment':
      return getAllDemoComments().find((c) => c.id === targetId)?.content.slice(0, 60) ?? targetId
    case 'exchange':
      return getAllDemoExchanges().find((e) => e.id === targetId)?.title ?? targetId
    case 'user':
      return demoUsers[targetId]?.name ?? targetId
    default:
      return targetId
  }
}

/** Current status of a reportable target — drives "still visible?" display (§3.5). */
function targetStatusFor(targetType: ReportTargetType, targetId: string): string | null {
  switch (targetType) {
    case 'post':
      return findPost(targetId)?.status ?? null
    case 'comment':
      return getAllDemoComments().find((c) => c.id === targetId)?.status ?? 'visible'
    case 'exchange':
      return getAllDemoExchanges().find((e) => e.id === targetId)?.status ?? null
    case 'user':
      return demoUsers[targetId]?.accountStatus ?? 'active'
    default:
      return null
  }
}

/** Apply an announcement change and record it (§4 lifecycle → §14 audit). */
async function changeAnnouncement(
  id: string,
  patch: Partial<AnnouncementInput>,
  action: string,
): Promise<boolean> {
  const before = announcementsService.getAnnouncement(id)
  if (!before) return false
  await attempt(() => api.patch(`/admin/announcements/${id}`, patch))
  announcementsService.updateAnnouncement(id, patch)
  const details = [
    patch.publishAt
      ? `publishes ${new Date(patch.publishAt).toISOString()}`
      : patch.publishAt === null
        ? 'publish time cleared'
        : null,
    patch.expiresAt
      ? `expires ${new Date(patch.expiresAt).toISOString()}`
      : patch.expiresAt === null
        ? 'expiry cleared'
        : null,
    patch.isPinned !== undefined ? (patch.isPinned ? 'pinned' : 'unpinned') : null,
    patch.audience ? `audience ${patch.audience}` : null,
    patch.location?.cityName
      ? `location ${patch.location.cityName}`
      : patch.location === null
        ? 'all locations'
        : null,
    patch.groupId ? `group ${patch.groupId}` : patch.groupId === null ? 'no group scope' : null,
  ]
    .filter(Boolean)
    .join(' · ')
  audit(action, 'announcement', {
    targetId: id,
    targetLabel: patch.title ?? before.title,
    previousStatus: before.status,
    resultingStatus: patch.status ?? before.status,
    details: details || undefined,
  })
  return true
}

/** One account's participation roll-up (spec §8) — read-only, one row per underlying record (§15). */
export interface AccountParticipation {
  posts: PublicPost[]
  /** Posts authored inside a group — group-origin identification (§9). */
  groupPosts: PublicPost[]
  comments: PublicComment[]
  exchanges: PublicExchange[]
  shares: ShareRecord[]
  referrals: ReferralRecord[]
  reportsFiled: ReportRecord[]
  /** Reports on this account's content (or the account itself). */
  reportsAgainst: ReportRecord[]
  /** Audit entries targeting this account's content. */
  auditEntries: AuditEntry[]
}

export const adminApi = {
  async listPosts(): Promise<PublicPost[]> {
    await attempt(() => api.get('/admin/posts'))
    // Demo: dedupe by id, newest first. Same object references as the public
    // and business stores, so in-place moderation is reflected everywhere.
    const seen = new Set<string>()
    return [...getAllDemoPosts(), ...getAllBusinessPosts()]
      .filter((p) => (seen.has(p.id) ? false : seen.add(p.id)))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  async listExchanges(): Promise<PublicExchange[]> {
    await attempt(() => api.get('/admin/exchanges'))
    return [...getAllDemoExchanges()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  },

  async listUsers(): Promise<PublicUser[]> {
    return Object.values(demoUsers).filter((u): u is PublicUser => !!u)
  },

  async listCampaigns(): Promise<PublicCampaign[]> {
    return [...demoCampaigns]
  },

  // -------------------------------------------------------------------------
  // People & Groups (spec §5.5, §8, §9)
  // -------------------------------------------------------------------------

  /** Groups visible in Community — read-only; group administration is the Groups & Circles product's (§9). */
  listGroups(): PublicGroup[] {
    return [...demoGroups]
  },

  getGroup(id: string): PublicGroup | null {
    return demoGroups.find((g) => g.id === id) ?? null
  },

  /**
   * One account's participation across Community (§8): content, exchange
   * items, sharing, reports and moderation history — a read-only drill-down
   * assembled from the same stores the other admin screens use (§15, one
   * set of records). Group-origin posts are identified (§9); group
   * membership records live in the Groups & Circles product, not here.
   */
  getAccountParticipation(userId: string): AccountParticipation {
    const seen = new Set<string>()
    const allPosts = [...getAllDemoPosts(), ...getAllBusinessPosts()].filter((p) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
    const posts = allPosts.filter((p) => p.authorId === userId)
    const comments = getAllDemoComments().filter((c) => c.authorId === userId)
    const exchanges = getAllDemoExchanges().filter((e) => e.creatorId === userId)
    const shares = attributionApi.listAllShares().filter((s) => s.sharerId === userId)
    const referrals = attributionApi.listReferrals().filter((r) => r.sharerId === userId)

    const contentIds = new Set<string>([
      userId,
      ...posts.map((p) => p.id),
      ...comments.map((c) => c.id),
      ...exchanges.map((e) => e.id),
    ])
    const reports = reportsService.listReports()
    const reportsFiled = reports.filter((r) => r.reporterId === userId)
    const reportsAgainst = reports.filter((r) => r.targetType !== 'user' && contentIds.has(r.targetId) && r.targetId !== userId)
    // Reports filed directly against the account itself.
    const accountReports = reports.filter((r) => r.targetType === 'user' && r.targetId === userId)
    const auditEntries = readAudit().filter((a) => a.targetId != null && contentIds.has(a.targetId))

    return {
      posts,
      groupPosts: posts.filter((p) => p.groupId != null),
      comments,
      exchanges,
      shares,
      referrals,
      reportsFiled,
      reportsAgainst: [...accountReports, ...reportsAgainst],
      auditEntries,
    }
  },

  // -------------------------------------------------------------------------
  // Per-campaign configuration & attribution (spec §5 item 6, §7.4)
  // -------------------------------------------------------------------------

  /** Campaign sharing/referral/leaderboard configuration (actual configured values, §17-3/4). */
  getCampaignConfig(campaignId: string): CampaignShareConfig {
    return campaignConfigService.getConfig(campaignId)
  },

  /** Save campaign configuration; audited as a config change (§14). */
  async saveCampaignConfig(
    campaignId: string,
    patch: Partial<Omit<CampaignShareConfig, 'campaignId'>>,
  ): Promise<CampaignShareConfig> {
    const before = campaignConfigService.getConfig(campaignId)
    const next = campaignConfigService.saveConfig(campaignId, patch)
    const changed = Object.keys(patch).filter(
      (k) => JSON.stringify(before[k as keyof CampaignShareConfig]) !== JSON.stringify(next[k as keyof CampaignShareConfig]),
    )
    audit('update campaign config', 'campaign', {
      targetId: campaignId,
      targetLabel: next.campaignId,
      previousStatus: before.sharingEnabled ? 'sharing-on' : 'sharing-off',
      resultingStatus: next.sharingEnabled ? 'sharing-on' : 'sharing-off',
      details: changed.length ? `changed: ${changed.join(', ')}` : 'no field changes',
    })
    return next
  },

  /** Campaign-scoped attribution view (spec §7.4) — scoped, never duplicated (§15). */
  listCampaignAttribution(campaignId: string) {
    return attributionApi.listForCampaign(campaignId)
  },

  /**
   * Create a QR record for a campaign: a tracked share of type `qr` against
   * the campaign, recorded to the attribution store (spec §5 item 6). The QR
   * is a share like any other — one record, visible in Sharing & Attribution
   * (§15), never a separate duplicate ledger.
   */
  async createCampaignQr(campaignId: string): Promise<ShareCreateResult> {
    const campaign = demoCampaigns.find((c) => c.id === campaignId)
    const res = await sharingApi.createShare({
      targetType: 'campaign',
      targetId: campaignId,
      shareType: 'qr',
      source: 'admin',
    })
    const admin = currentAdmin()
    await attributionApi.recordShareCreated({
      sharerId: admin.id,
      sharerType: 'admin',
      targetType: 'campaign',
      targetId: campaignId,
      targetTitle: campaign?.title ?? null,
      trackingCode: res.trackingCode,
      shareUrl: res.shareUrl,
      shareType: 'qr',
      qrCodeUrl: res.qrCodeUrl ?? null,
    })
    audit('create campaign qr', 'campaign', {
      targetId: campaignId,
      targetLabel: campaign?.title ?? campaignId,
      resultingStatus: 'active',
      details: `qr code ${res.trackingCode}`,
    })
    return res
  },

  /** Rewards linked to a campaign (spec §5 item 6) — links only, triggers are backend's (§17-5). */
  listCampaignRewards(campaignId: string): PublicReward[] {
    return demoRewards.filter((r) => r.campaignId === campaignId)
  },

  // -------------------------------------------------------------------------
  // Rewards & notifications oversight (spec §11, §10 — Phase H)
  // -------------------------------------------------------------------------

  /**
   * Reward records across every campaign (spec §11) — read-only oversight of
   * the central Rewards system. Community runs no reward engine: there are no
   * lifecycle transitions, claims or qualification checks here (§17-5 pending).
   */
  listRewards(): PublicReward[] {
    return demoRewards
  },

  /** Content promoting a reward (cross-link through `rewardId`, §15 single record). */
  listPostsForReward(rewardId: string): PublicPost[] {
    return [...getAllDemoPosts(), ...getAllBusinessPosts()].filter((p) => p.rewardId === rewardId)
  },

  /** Notification event inventory (spec §10) — emission points and destinations as facts. */
  listNotificationEvents(): NotificationEventDef[] {
    return notificationConfigService.listEvents()
  },

  /** Per-event notification template configuration — stored records, not trigger rules (§13). */
  listNotificationTemplates(): NotificationEventTemplate[] {
    return notificationConfigService.getTemplates()
  },

  /** Save one event's template configuration; audited as a config change (§14). */
  saveNotificationTemplate(
    eventId: string,
    patch: Partial<Pick<NotificationEventTemplate, 'inAppEnabled' | 'emailEnabled' | 'titleTemplate' | 'bodyTemplate'>>,
  ): NotificationEventTemplate {
    const before = notificationConfigService.getTemplate(eventId)
    const next = notificationConfigService.saveTemplate(eventId, patch)
    const label = notificationConfigService.listEvents().find((e) => e.id === eventId)?.label ?? eventId
    const changed = (Object.keys(patch) as Array<keyof typeof patch>).filter(
      (k) => JSON.stringify(before[k]) !== JSON.stringify(next[k]),
    )
    audit('update notification template', 'config', {
      targetId: eventId,
      targetLabel: label,
      previousStatus: before.inAppEnabled ? 'in-app on' : 'in-app off',
      resultingStatus: next.inAppEnabled ? 'in-app on' : 'in-app off',
      details: changed.length
        ? `changed: ${changed.join(', ')} (email ${next.emailEnabled ? 'on' : 'off'})`
        : 'no field changes',
    })
    return next
  },

  async moderatePost(id: string, action: PostModerationAction, reason?: string): Promise<void> {
    await attempt(() => api.post(`/admin/posts/${id}/moderate`, { action, reason }))
    const post = findPost(id)
    if (!post) return
    const admin = currentAdmin()
    const targetLabel = post.title ?? post.content.slice(0, 60)
    const previousStatus = post.status
    switch (action) {
      case 'approve':
        post.status = PostStatus.PUBLISHED
        post.moderationReason = null
        post.moderatedBy = admin.id
        post.moderatedAt = new Date().toISOString()
        break
      case 'reject':
        post.status = PostStatus.REJECTED
        post.moderationReason = reason || 'Does not meet the community guidelines.'
        post.moderatedBy = admin.id
        post.moderatedAt = new Date().toISOString()
        break
      case 'hide':
        post.status = PostStatus.ARCHIVED
        break
      case 'restore':
        post.status = PostStatus.PUBLISHED
        post.moderationReason = null
        break
      case 'pin':
        post.isPinned = true
        break
      case 'unpin':
        post.isPinned = false
        break
      case 'feature':
        post.isFeatured = true
        break
      case 'unfeature':
        post.isFeatured = false
        break
      case 'remove':
        deleteDemoPostEverywhere(id)
        deleteBusinessDemoPost(id)
        break
    }
    audit(action, 'post', {
      targetId: id,
      targetLabel,
      previousStatus,
      resultingStatus: action === 'remove' ? 'removed' : post.status,
      reason: action === 'reject' ? reason ?? null : null,
    })
    // Upheld content reports follow the moderation decision (§3.6).
    if (action === 'remove' || action === 'reject') {
      reportsService.resolveForTarget('post', id, 'uphold', admin.id, reason)
    }
  },

  async setPostVisibility(id: string, visibility: PublicPost['visibility']): Promise<void> {
    const post = findPost(id)
    if (!post) return
    const previousStatus = post.visibility
    post.visibility = visibility
    audit('set visibility', 'post', {
      targetId: id,
      targetLabel: post.title ?? post.content.slice(0, 60),
      previousStatus,
      resultingStatus: visibility,
    })
  },

  async removePost(id: string): Promise<void> {
    const post = findPost(id)
    await attempt(() => api.delete(`/admin/posts/${id}`))
    audit('remove', 'post', {
      targetId: id,
      targetLabel: post?.title ?? post?.content.slice(0, 60),
      previousStatus: post?.status,
      resultingStatus: 'removed',
    })
    reportsService.resolveForTarget('post', id, 'uphold', currentAdmin().id, 'Content removed by an administrator.')
    deleteDemoPostEverywhere(id)
    deleteBusinessDemoPost(id)
  },

  // -------------------------------------------------------------------------
  // #Exchange management (§5.3)
  // -------------------------------------------------------------------------

  async moderateExchange(id: string, action: 'approve' | 'reject' | 'archive' | 'remove', reason?: string): Promise<void> {
    await attempt(() => api.post(`/admin/exchanges/${id}/moderate`, { action, reason }))
    const exchange = getAllDemoExchanges().find((e) => e.id === id)
    if (!exchange) return
    const previousStatus = exchange.status
    switch (action) {
      case 'approve':
        exchange.status = 'active'
        exchange.moderationReason = null
        break
      case 'reject':
        exchange.status = 'cancelled'
        exchange.moderationReason = reason || 'Does not meet the exchange guidelines.'
        break
      case 'archive':
        exchange.status = 'expired'
        break
      case 'remove':
        deleteDemoExchangeEverywhere(id)
        break
    }
    audit(action, 'exchange', {
      targetId: id,
      targetLabel: exchange.title,
      previousStatus,
      resultingStatus: action === 'remove' ? 'removed' : exchange.status,
      reason: action === 'reject' ? reason ?? null : null,
    })
    if (action === 'reject' || action === 'remove') {
      reportsService.resolveForTarget('exchange', id, 'uphold', currentAdmin().id, reason)
    }
  },

  async setExchangeVisibility(id: string, visibility: NonNullable<PublicExchange['visibility']>): Promise<void> {
    const exchange = getAllDemoExchanges().find((e) => e.id === id)
    if (!exchange) return
    const previousStatus = exchange.visibility ?? 'public'
    exchange.visibility = visibility
    audit('set visibility', 'exchange', {
      targetId: id,
      targetLabel: exchange.title,
      previousStatus,
      resultingStatus: visibility,
    })
  },

  // -------------------------------------------------------------------------
  // Users & access (§5.5)
  // -------------------------------------------------------------------------

  async setUserStatus(id: string, status: 'active' | 'suspended'): Promise<void> {
    await attempt(() => api.post(`/admin/users/${id}/status`, { status }))
    const user = demoUsers[id]
    if (!user) return
    const previousStatus = user.accountStatus ?? 'active'
    user.accountStatus = status
    audit(status === 'suspended' ? 'suspend account' : 'reactivate account', 'user', {
      targetId: id,
      targetLabel: user.name,
      previousStatus,
      resultingStatus: status,
    })
  },

  // -------------------------------------------------------------------------
  // Sharing & attribution (§5.4)
  // -------------------------------------------------------------------------

  listAllShares() {
    return attributionApi.listAllShares()
  },

  listAllEvents() {
    return attributionApi.listDemoEvents()
  },

  /** Referral candidates derived from registration events (spec §6.6, §17-4). */
  listReferrals() {
    return attributionApi.listReferrals()
  },

  // -------------------------------------------------------------------------
  // Reports (§3.5, §3.6)
  // -------------------------------------------------------------------------

  listReports(filter?: { targetType?: ReportRecord['targetType']; status?: ReportRecord['status'] }): ReportRecord[] {
    return reportsService.listReports(filter)
  },

  /** Post ids with at least one unresolved report — union of report records and the legacy marker. */
  listReportedPostIds(): string[] {
    const fromReports = reportsService.listOpenTargetIds('post')
    const legacy = useEngagementStore.getState().reportedPostIds
    return [...new Set([...fromReports, ...legacy])]
  },

  // -------------------------------------------------------------------------
  // Moderation queue workflow (§3.5): under review, escalate, assignment
  // -------------------------------------------------------------------------

  async setReportStatus(reportId: string, status: 'under_review' | 'escalated'): Promise<void> {
    const report = reportsService.listReports().find((r) => r.id === reportId)
    if (!report || report.status === 'resolved') return
    if (!reportsService.setStatus(reportId, status)) return
    audit(status === 'escalated' ? 'escalate report' : 'start review', 'report', {
      targetId: report.targetId,
      targetLabel: report.targetLabel ?? report.targetId,
      previousStatus: report.status,
      resultingStatus: status,
      details: `report ${reportId} · ${report.targetType}`,
    })
  },

  async assignReport(reportId: string): Promise<void> {
    const admin = currentAdmin()
    const report = reportsService.listReports().find((r) => r.id === reportId)
    if (!report || report.status === 'resolved') return
    reportsService.assign(reportId, admin.id, admin.name)
    audit('assign report', 'report', {
      targetId: report.targetId,
      targetLabel: report.targetLabel ?? report.targetId,
      previousStatus: report.assignedToName ?? 'unassigned',
      resultingStatus: admin.name,
      details: `report ${reportId} · ${report.targetType}`,
    })
  },

  /**
   * Resolve every open report against a target and apply the outcome (§3.6).
   * Uphold enforces the moderation consequence for that target type; dismiss
   * records the decision and leaves the content untouched. Reports against a
   * moderated target are closed with it.
   */
  async resolveReports(targetType: ReportTargetType, targetId: string, outcome: 'uphold' | 'dismiss'): Promise<void> {
    const admin = currentAdmin()
    await attempt(() => api.post('/admin/reports/resolve', { targetType, targetId, outcome }))

    const openCount = reportsService
      .listReports({ targetType })
      .filter((r) => r.targetId === targetId && r.status !== 'resolved').length
    const label = targetLabelFor(targetType, targetId)
    const previousStatus = targetStatusFor(targetType, targetId)
    let resultingStatus = outcome === 'uphold' ? 'upheld' : 'dismissed'

    if (outcome === 'uphold') {
      switch (targetType) {
        case 'post': {
          const post = findPost(targetId)
          if (post) {
            post.status = PostStatus.REJECTED
            post.moderationReason = 'Removed after reviewing a user report.'
            post.moderatedBy = admin.id
            post.moderatedAt = new Date().toISOString()
            resultingStatus = `${previousStatus ?? 'post'} → rejected`
          }
          break
        }
        case 'comment': {
          const comment = getAllDemoComments().find((c) => c.id === targetId)
          if (comment) {
            comment.status = 'removed'
            comment.moderationReason = 'Removed after reviewing a user report.'
            comment.moderatedAt = new Date().toISOString()
            resultingStatus = 'removed'
          }
          break
        }
        case 'exchange': {
          const exchange = getAllDemoExchanges().find((e) => e.id === targetId)
          if (exchange) {
            exchange.status = 'cancelled'
            exchange.moderationReason = 'Removed after reviewing a user report.'
            resultingStatus = 'cancelled'
          }
          break
        }
        case 'user': {
          const user = demoUsers[targetId]
          if (user) {
            user.accountStatus = 'suspended'
            resultingStatus = 'suspended'
          }
          break
        }
      }
    }

    reportsService.resolveForTarget(targetType, targetId, outcome, admin.id)
    if (targetType === 'post') {
      // Legacy marker cleanup for older UI paths.
      useEngagementStore.setState((s) => ({
        reportedPostIds: s.reportedPostIds.filter((id) => id !== targetId),
      }))
    }

    audit(outcome === 'uphold' ? 'report upheld' : 'report dismissed', 'report', {
      targetId,
      targetLabel: label,
      previousStatus,
      resultingStatus,
      reason: outcome === 'uphold' ? 'Breach confirmed after review.' : 'No breach found.',
      details: `${targetType} · ${openCount} report(s) resolved`,
    })
  },

  /** Back-compat wrapper used by the content page (post targets only). */
  async reviewReport(postId: string, outcome: 'uphold' | 'dismiss'): Promise<void> {
    await adminApi.resolveReports('post', postId, outcome)
  },

  // -------------------------------------------------------------------------
  // Comments & engagement (§3.4) — oversight of reported/removed comments,
  // not manual management of ordinary likes and comments
  // -------------------------------------------------------------------------

  listComments(): PublicComment[] {
    return getAllDemoComments().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  },

  async moderateComment(id: string, action: 'remove' | 'restore', reason?: string): Promise<void> {
    await attempt(() => api.post(`/admin/comments/${id}/moderate`, { action, reason }))
    const comment = getAllDemoComments().find((c) => c.id === id)
    if (!comment) return
    const admin = currentAdmin()
    const previousStatus = comment.status ?? 'visible'
    if (action === 'remove') {
      comment.status = 'removed'
      comment.moderationReason = reason || 'Removed under the moderation policy.'
      comment.moderatedAt = new Date().toISOString()
      reportsService.resolveForTarget('comment', id, 'uphold', admin.id, reason)
    } else {
      comment.status = 'visible'
      comment.moderationReason = null
    }
    audit(action === 'remove' ? 'remove comment' : 'restore comment', 'comment', {
      targetId: id,
      targetLabel: comment.content.slice(0, 60),
      previousStatus,
      resultingStatus: comment.status,
      reason: action === 'remove' ? (reason ?? null) : null,
      details: `post ${comment.postId}`,
    })
  },

  // -------------------------------------------------------------------------
  // Scheduling shell (§3.1 — "schedule or expire content where supported")
  // -------------------------------------------------------------------------

  /**
   * Stores a requested publish time. Which content types may be scheduled,
   * and auto-publication itself, await the §17-1 approval — the server
   * scheduler applies the approved rule.
   */
  async schedulePost(id: string, scheduledAt: string | null): Promise<void> {
    const post = findPost(id)
    if (!post) return
    const previousStatus = post.scheduledAt ? new Date(post.scheduledAt).toISOString() : null
    post.scheduledAt = scheduledAt
    audit(scheduledAt ? 'schedule post' : 'clear schedule', 'post', {
      targetId: id,
      targetLabel: post.title ?? post.content.slice(0, 60),
      previousStatus,
      resultingStatus: scheduledAt,
      details: 'Scheduling rules pending approval (§17-1); auto-publication applies once the server scheduler is connected.',
    })
  },

  // -------------------------------------------------------------------------
  // Announcements (§4) — one record fans out to every permitted surface (§15)
  // -------------------------------------------------------------------------

  listAnnouncements(): Announcement[] {
    return announcementsService.listAnnouncements()
  },

  async createAnnouncement(input: AnnouncementInput): Promise<Announcement> {
    await attempt(() => api.post('/admin/announcements', input))
    const record = announcementsService.createAnnouncement(input)
    audit('create announcement', 'announcement', {
      targetId: record.id,
      targetLabel: record.title,
      resultingStatus: record.status,
      details: [
        `audience ${record.audience}`,
        record.location?.cityName ? `location ${record.location.cityName}` : 'all locations',
        record.groupId ? `group ${record.groupId}` : null,
        record.publishAt ? `publishes ${new Date(record.publishAt).toISOString()}` : null,
        record.expiresAt ? `expires ${new Date(record.expiresAt).toISOString()}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    })
    return record
  },

  async updateAnnouncement(id: string, patch: Partial<AnnouncementInput>): Promise<void> {
    await changeAnnouncement(id, patch, 'edit announcement')
  },

  async publishAnnouncement(id: string): Promise<void> {
    await changeAnnouncement(id, { status: 'published', publishAt: new Date().toISOString() }, 'publish announcement')
  },

  async scheduleAnnouncement(id: string, publishAt: string): Promise<void> {
    await changeAnnouncement(id, { status: 'scheduled', publishAt }, 'schedule announcement')
  },

  async expireAnnouncement(id: string): Promise<void> {
    await changeAnnouncement(id, { status: 'expired', expiresAt: new Date().toISOString() }, 'expire announcement')
  },

  async archiveAnnouncement(id: string): Promise<void> {
    await changeAnnouncement(id, { status: 'archived' }, 'archive announcement')
  },

  async toggleAnnouncementPin(id: string): Promise<void> {
    const current = announcementsService.getAnnouncement(id)
    if (!current) return
    await changeAnnouncement(
      id,
      { isPinned: !current.isPinned },
      current.isPinned ? 'unpin announcement' : 'pin announcement',
    )
  },

  async deleteAnnouncement(id: string): Promise<void> {
    const before = announcementsService.getAnnouncement(id)
    if (!before) return
    await attempt(() => api.delete(`/admin/announcements/${id}`))
    announcementsService.deleteAnnouncement(id)
    audit('delete announcement', 'announcement', {
      targetId: id,
      targetLabel: before.title,
      previousStatus: before.status,
      resultingStatus: 'deleted',
    })
  },

  /** Audit entries touching one record — per-record moderation history (§3.1, §3.5). */
  listAuditFor(targetId: string): AuditEntry[] {
    return readAudit().filter((e) => e.targetId === targetId)
  },

  // -------------------------------------------------------------------------
  // Hashtags (§3.3)
  // -------------------------------------------------------------------------

  listHashtags(): PublicHashtag[] {
    adminConfigService.applyHashtagFlags(demoHashtags)
    return [...demoHashtags].sort((a, b) => b.usageCount - a.usageCount)
  },

  /** Feature/restrict a hashtag; flags are visible and distinguishable (§3.3). */
  async updateHashtag(tag: string, patch: Partial<Pick<PublicHashtag, 'featured' | 'restricted' | 'status'>>): Promise<void> {
    const hashtag = demoHashtags.find((h) => h.tag === tag || h.slug === tag)
    if (!hashtag) return
    const previousStatus = hashtag.status ?? 'active'
    // Persist alongside the in-memory record so flags survive reloads (§15).
    adminConfigService.setHashtagFlags(hashtag.slug, patch)
    if (patch.featured !== undefined) hashtag.featured = patch.featured
    if (patch.restricted !== undefined) hashtag.restricted = patch.restricted
    if (patch.status !== undefined) hashtag.status = patch.status
    if (patch.restricted === true) hashtag.status = 'restricted'
    if (patch.restricted === false) hashtag.status = 'active'
    audit(patch.featured !== undefined ? (patch.featured ? 'feature hashtag' : 'unfeature hashtag') : 'update hashtag', 'hashtag', {
      targetId: hashtag.slug,
      targetLabel: `#${hashtag.tag}`,
      previousStatus,
      resultingStatus: hashtag.status ?? 'active',
    })
  },

  // -------------------------------------------------------------------------
  // Categories (§3.2, §5.2) — audited wrappers over the shared store
  // -------------------------------------------------------------------------

  listCategories(kind: 'community' | 'exchange', opts?: { includeInactive?: boolean }): ContentCategory[] {
    return categoriesService.listCategories(kind, opts)
  },

  async createCategory(input: { kind: 'community' | 'exchange'; name: string; description?: string }): Promise<ContentCategory> {
    const category = categoriesService.createCategory(input)
    audit('create category', 'category', { targetId: category.id, targetLabel: category.name, resultingStatus: 'active', details: input.kind })
    return category
  },

  async updateCategory(kind: 'community' | 'exchange', id: string, patch: Partial<Pick<ContentCategory, 'name' | 'description' | 'active'>>): Promise<void> {
    const before = categoriesService.getCategory(kind, id)
    categoriesService.updateCategory(kind, id, patch)
    audit('update category', 'category', {
      targetId: id,
      targetLabel: patch.name ?? before?.name ?? id,
      previousStatus: before ? (before.active ? 'active' : 'inactive') : null,
      resultingStatus: patch.active !== undefined ? (patch.active ? 'active' : 'inactive') : before ? (before.active ? 'active' : 'inactive') : null,
      details: kind,
    })
  },

  async moveCategory(kind: 'community' | 'exchange', id: string, direction: -1 | 1): Promise<void> {
    const before = categoriesService.getCategory(kind, id)
    categoriesService.moveCategory(kind, id, direction)
    const after = categoriesService.getCategory(kind, id)
    audit('reorder category', 'category', {
      targetId: id,
      targetLabel: before?.name ?? id,
      previousStatus: before ? `position ${before.sortOrder}` : null,
      resultingStatus: after ? `position ${after.sortOrder}` : null,
      details: kind,
    })
  },

  // -------------------------------------------------------------------------
  // Admin role matrix (§14, §17-6)
  // -------------------------------------------------------------------------

  getRoleGrants,

  /**
   * Grant/revoke one administrative action for one account type. Which roles
   * hold which actions is an open product decision (§17-6) — the store ships
   * seeded admin-only and every change is recorded so the matrix itself is
   * auditable (§14). Grants shape dashboard visibility; routes are guarded
   * separately and the server remains the authority (§5.5).
   */
  async setRoleGrant(action: AdminAction, userType: Viewer['userType'], granted: boolean): Promise<void> {
    const grants = getRoleGrants()
    const before = grants[action]
    const next = granted
      ? [...new Set([...before, userType])]
      : before.filter((r) => r !== userType)
    writeRoleGrants({ ...grants, [action]: next })
    audit('update role grant', 'config', {
      targetId: action,
      targetLabel: ADMIN_ACTIONS.find((a) => a.id === action)?.label ?? action,
      previousStatus: before.length ? before.join(', ') : 'no role',
      resultingStatus: next.length ? next.join(', ') : 'no role',
      details: `${granted ? 'grant' : 'revoke'} ${userType}`,
    })
  },

  /** Restore the seeded admin-only defaults; audited like any matrix change (§14). */
  async resetRoleGrants(): Promise<void> {
    const before = getRoleGrants()
    const changed = (Object.keys(DEFAULT_GRANTS) as AdminAction[]).filter(
      (a) => before[a].join(',') !== DEFAULT_GRANTS[a].join(','),
    )
    writeRoleGrants({ ...DEFAULT_GRANTS })
    audit('reset role grants', 'config', {
      targetId: 'role_grants',
      targetLabel: 'Admin role matrix',
      previousStatus: changed.length ? `${changed.length} action(s) differed from defaults` : 'already default',
      resultingStatus: 'default admin-only grants',
    })
  },

  // -------------------------------------------------------------------------
  // Configuration (§5.3, §3.6, §13)
  // -------------------------------------------------------------------------

  getConfig(): CommunityAdminConfig {
    return adminConfigService.getConfig()
  },

  async setExchangeTypeConfig(type: string, config: ExchangeTypeConfig): Promise<void> {
    const before = adminConfigService.getConfig().exchangeTypes[type]
    adminConfigService.setExchangeTypeConfig(type, config)
    audit('update exchange type config', 'config', {
      targetId: type,
      targetLabel: type,
      previousStatus: before ? JSON.stringify(before) : null,
      resultingStatus: JSON.stringify(config),
    })
  },

  listReportReasons(): ReportReason[] {
    return adminConfigService.listReportReasons()
  },

  /** Report reasons are configurable data — the report modal consumes this list (§3.6). */
  async setReportReasons(reasons: ReportReason[]): Promise<void> {
    const before = adminConfigService.listReportReasons()
    adminConfigService.setReportReasons(reasons)
    audit('update report reasons', 'config', {
      targetId: 'report-reasons',
      targetLabel: 'Report reasons',
      previousStatus: `${before.length} reasons`,
      resultingStatus: `${reasons.length} reasons`,
      details: reasons.map((r) => r.id).join(', '),
    })
  },

  listAudit(): AuditEntry[] {
    return readAudit()
  },

  // -------------------------------------------------------------------------
  // Community Hub Managers — Admin-only staff-role lifecycle (spec §8, §14)
  // -------------------------------------------------------------------------

  getManagerConfig() {
    return managersService.getConfig()
  },

  async saveManagerConfig(patch: Partial<Pick<ManagerConfig, 'structure' | 'areas'>>): Promise<void> {
    const before = managersService.getConfig()
    const after = managersService.saveConfig(patch)
    audit('update manager config', 'config', {
      targetId: 'manager-config',
      targetLabel: 'Community Hub Manager configuration',
      previousStatus: before.structure,
      resultingStatus: after.structure,
      details: `Areas: ${after.areas.map((a) => a.name).join(', ')}`,
    })
  },

  listManagers(): ManagerRecord[] {
    return managersService.listManagers()
  },

  getManager(id: string): ManagerRecord | null {
    return managersService.getManager(id)
  },

  async appointManager(input: Omit<ManagerRecord, 'id' | 'appointedBy' | 'appointedByName' | 'appointedAt' | 'source'>): Promise<ManagerRecord> {
    const record = managersService.create(input)
    audit('appoint manager', 'manager', {
      targetId: record.id,
      targetLabel: `${record.name} — Community Hub Manager`,
      resultingStatus: record.status,
      details: `Areas: ${record.areas.join(', ')} · Permissions: ${grantedPermissionLabels(record).join(', ') || 'none'}`,
    })
    return record
  },

  async updateManagerAssignment(id: string, patch: Pick<ManagerRecord, 'areas' | 'locations' | 'reportingLevel' | 'supervisorId'>): Promise<void> {
    const before = managersService.getManager(id)
    const after = managersService.update(id, patch)
    audit('reassign manager', 'manager', {
      targetId: id,
      targetLabel: after?.name ?? id,
      previousStatus: before?.areas.join(', ') ?? null,
      resultingStatus: after?.areas.join(', ') ?? null,
    })
  },

  async updateManagerPermissions(id: string, permissions: ManagerPermissions): Promise<void> {
    const before = managersService.getManager(id)
    const after = managersService.update(id, { permissions })
    audit('update manager permissions', 'manager', {
      targetId: id,
      targetLabel: after?.name ?? id,
      previousStatus: before ? grantedPermissionLabels(before).join(', ') || 'none' : null,
      resultingStatus: after ? grantedPermissionLabels(after).join(', ') || 'none' : null,
    })
  },

  async updateManagerRestrictions(id: string, restrictions: ManagerRecord['restrictions']): Promise<void> {
    const after = managersService.update(id, { restrictions })
    audit('update manager restrictions', 'manager', {
      targetId: id,
      targetLabel: after?.name ?? id,
      details: `Content types: ${restrictions.permittedContentTypes?.join(', ') || 'all'} · Announcement audiences: ${restrictions.announcementAudiences?.join(', ') || 'all'}`,
    })
  },

  async setManagerStatus(id: string, status: ManagerRecord['status']): Promise<void> {
    const before = managersService.getManager(id)
    const after = managersService.update(id, { status })
    const action = status === 'suspended' ? 'suspend manager' : status === 'active' ? 'reactivate manager' : 'update manager status'
    audit(action, 'manager', {
      targetId: id,
      targetLabel: after?.name ?? id,
      previousStatus: before?.status ?? null,
      resultingStatus: status,
    })
  },

  async removeManagerRole(id: string): Promise<void> {
    const before = managersService.getManager(id)
    const after = managersService.update(id, { status: 'removed' })
    audit('remove manager role', 'manager', {
      targetId: id,
      targetLabel: after?.name ?? id,
      previousStatus: before?.status ?? null,
      resultingStatus: 'removed',
      details: 'CHS account untouched — removing the staff role never deletes the account or its memberships.',
    })
  },

  listManagerActivity(userId: string | null): AuditEntry[] {
    if (!userId) return []
    return readAudit().filter((e) => e.adminId === userId)
  },

  /**
   * Escalate a case to the central Admin (Community Hub Manager spec §3):
   * records an audited escalation entry addressed to the central Admin. It
   * does NOT change the target's state — the Admin decides the outcome.
   */
  async escalateToAdmin(
    targetType: AuditEntry['targetType'],
    targetId: string,
    targetLabel: string,
    note: string,
  ): Promise<void> {
    audit('escalate to central admin', targetType, {
      targetId,
      targetLabel,
      details: note,
      resultingStatus: 'escalated',
    })
  },

  // -------------------------------------------------------------------------
  // Membership & Feature Access (spec §5 item 5 — member-facing rules only)
  // -------------------------------------------------------------------------

  getMembershipConfig() {
    return membershipService.getConfig()
  },

  async saveMembershipConfig(patch: Partial<Pick<MembershipConfig, 'plans' | 'features'>>): Promise<void> {
    const before = membershipService.getConfig()
    const after = membershipService.saveConfig(patch)
    const changed = changedFeatureSummaries(before, after)
    audit('update membership config', 'membership', {
      targetId: 'membership-config',
      targetLabel: 'Membership & Feature Access',
      previousStatus: `${before.features.length} features`,
      resultingStatus: `${after.features.length} features`,
      details: changed.length ? changed.join('; ') : 'Plan list updated',
    })
  },
}

/** Business lookup for the users view (§5.5 business association). */
export function businessNameFor(businessId?: string | null): string | null {
  if (!businessId) return null
  return demoBusinesses.find((b) => b.id === businessId)?.name ?? null
}

/** Campaigns available through Community, for the connections view (§5 item 6). */
export function listCampaignConnections(): PublicCampaign[] {
  return [...demoCampaigns]
}

/** Human-readable labels of the granted switches on a manager appointment. */
function grantedPermissionLabels(record: ManagerRecord): string[] {
  return MANAGER_PERMISSION_LABELS.filter((p) => record.permissions[p.key]).map((p) => p.label)
}

/** Summarise which membership features changed between two configs. */
function changedFeatureSummaries(before: MembershipConfig, after: MembershipConfig): string[] {
  const beforeById = new Map(before.features.map((f) => [f.id, f]))
  const out: string[] = []
  for (const f of after.features) {
    const b = beforeById.get(f.id)
    if (!b) {
      out.push(`+ ${f.label}`)
      continue
    }
    const changes: string[] = []
    if (b.allowedPlanIds.join() !== f.allowedPlanIds.join()) changes.push('plans')
    if ((b.usageLimit ?? null) !== (f.usageLimit ?? null)) changes.push('usage limit')
    if (b.expiryRule !== f.expiryRule) changes.push('expiry')
    if (b.suspensionRule !== f.suspensionRule) changes.push('suspension')
    if (b.onboardingRequired !== f.onboardingRequired) changes.push('onboarding')
    if (b.accessMessage.message !== f.accessMessage.message || b.accessMessage.nextStep !== f.accessMessage.nextStep) changes.push('access message')
    if (changes.length) out.push(`${f.label}: ${changes.join(', ')}`)
  }
  return out
}
