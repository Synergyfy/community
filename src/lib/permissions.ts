import type { ContentVisibility, PostStatus } from '@/lib/constants'
import type { PublicExchange, PublicPost } from '@/types/community-public'

/**
 * Shared permission rules for Community content (spec §4.1, §4.5, §5.2).
 * These helpers enforce the audience model consistently across the public
 * feed, search, exchange and profile surfaces. They mirror what the server
 * must enforce; the front end applies the same rules to demo data and as a
 * defence-in-depth filter for remote responses.
 */

export interface Viewer {
  userType: 'public' | 'business' | 'consumer' | 'admin'
  id?: string
}

export interface ViewContext {
  /** Group ids the viewer is a member of, for `group`-visibility content. */
  memberGroupIds?: string[]
  /**
   * True when the request is made from inside a group context (e.g. the group
   * wall), where group posts are readable by members and requested members.
   */
  groupContext?: boolean
}

const PUBLISHED: PostStatus = 'published'

function isAdmin(viewer: Viewer | null | undefined): boolean {
  return viewer?.userType === 'admin'
}

function isAuthor(viewer: Viewer | null | undefined, authorId: string): boolean {
  return !!viewer?.id && viewer.id === authorId
}

/** Audience check only — does not consider publication status. */
export function canViewVisibility(
  viewer: Viewer | null | undefined,
  visibility: ContentVisibility | undefined | null,
  ctx: ViewContext = {},
): boolean {
  // Absent visibility on remote/demo records means public (backwards compatible).
  if (!visibility || visibility === 'public') return true
  if (isAdmin(viewer)) return true

  switch (visibility) {
    case 'business':
      return viewer?.userType === 'business'
    case 'consumer':
      return viewer?.userType === 'consumer'
    case 'both':
      return viewer?.userType === 'business' || viewer?.userType === 'consumer'
    case 'group':
      if (!viewer?.id) return false
      if (ctx.groupContext) return true
      return !!ctx.memberGroupIds?.length
    case 'private':
      return false
    default:
      return false
  }
}

/**
 * Full content check: audience visibility + publication status.
 * Non-published items are only visible to their author (every state, so the
 * author can manage drafts/pending/rejected items) and to Admins.
 */
export function canViewPost(
  viewer: Viewer | null | undefined,
  post: PublicPost,
  ctx: ViewContext = {},
): boolean {
  const status = post.status || PUBLISHED
  if (status !== PUBLISHED) return isAdmin(viewer) || isAuthor(viewer, post.authorId)
  if (isAuthor(viewer, post.authorId)) return true
  return canViewVisibility(viewer, post.visibility, ctx)
}

/** Exchange audience check (spec §4.5 — permissions come from config, not hidden buttons). */
export function canViewExchange(
  viewer: Viewer | null | undefined,
  exchange: PublicExchange,
  ctx: ViewContext = {},
): boolean {
  // Lifecycle/moderation states mirror canViewPost: only `active` items are
  // part of the public browse. Rejected (cancelled), completed and expired
  // items stay visible to their author and admins — this enforces what
  // moderation already decided, it does not transition any item (§5.3:
  // status vocabulary is display-only; transition rules pending §17-2).
  if (exchange.status !== 'active') return isAdmin(viewer) || isAuthor(viewer, exchange.creatorId)
  if (isAdmin(viewer) || isAuthor(viewer, exchange.creatorId)) return true
  return canViewVisibility(viewer, exchange.visibility, ctx)
}

/** Viewer built from the auth store's user (null → signed-out public visitor). */
export function viewerFromUser(user: { id: string; userType: Viewer['userType'] } | null | undefined): Viewer | null {
  if (!user) return null
  return { id: user.id, userType: user.userType }
}

// ---------------------------------------------------------------------------
// Admin action matrix (spec §14 — permission-based administrative access)
// ---------------------------------------------------------------------------

/**
 * Administrative action groups within Community Admin. The matrix structure
 * exists now so every control can be permission-gated from day one; which
 * admin roles hold which actions is a pending product decision (§17-6). The
 * front-end gate is a UX affordance only — the server is the authority
 * (§5.5, §16).
 */
export type AdminAction =
  | 'moderate_content'
  | 'manage_reports'
  | 'manage_users'
  | 'manage_exchange'
  | 'manage_announcements'
  | 'view_messages_context'
  | 'view_group_context'
  | 'configure_platform'
  | 'view_attribution'
  | 'view_analytics'
  | 'configure_campaigns'
  | 'manage_rewards'
  | 'configure_notifications'
  | 'manage_managers'
  | 'configure_membership'
  | 'view_audit'

export interface AdminActionInfo {
  id: AdminAction
  label: string
  group: 'moderation' | 'configuration' | 'oversight'
  description: string
  /** Nav route gated by this action, where applicable. */
  route?: string
}

export const ADMIN_ACTIONS: AdminActionInfo[] = [
  { id: 'moderate_content', label: 'Moderate content', group: 'moderation', description: 'Approve, reject, hide, remove, pin and restore content.', route: '/admin/content' },
  { id: 'manage_reports', label: 'Review reports', group: 'moderation', description: 'Inspect and resolve user reports on posts, comments, exchanges and accounts.' },
  { id: 'manage_users', label: 'Manage users', group: 'moderation', description: 'Inspect accounts and apply status restrictions.', route: '/admin/users' },
  { id: 'manage_exchange', label: 'Manage #Exchange', group: 'configuration', description: 'Moderate exchange items and control their visibility.', route: '/admin/exchange' },
  { id: 'manage_announcements', label: 'Manage announcements', group: 'configuration', description: 'Create, schedule, pin and retire announcements.', route: '/admin/announcements' },
  { id: 'view_messages_context', label: 'View messages context', group: 'moderation', description: 'Inspect request/message context on exchange items — privacy scope pending §17-7.' },
  { id: 'view_group_context', label: 'View group context', group: 'moderation', description: 'Inspect group-origin context on reported content — privacy scope pending §17-7; group administration stays with the Groups & Circles product.' },
  { id: 'configure_platform', label: 'Configure Community', group: 'configuration', description: 'Categories, hashtags, report reasons and exchange type rules.', route: '/admin/config' },
  { id: 'view_attribution', label: 'Inspect sharing & attribution', group: 'oversight', description: 'View shares, tracked events and attribution records.', route: '/admin/sharing' },
  { id: 'view_analytics', label: 'View analytics & reports', group: 'oversight', description: 'Community/Exchange/Sharing report suites with filters, metric definitions and record export — export policy pending §17-8.', route: '/admin/analytics' },
  { id: 'configure_campaigns', label: 'Configure campaigns', group: 'oversight', description: 'Campaign sharing, referral and QR configuration.', route: '/admin/campaigns' },
  { id: 'manage_rewards', label: 'Manage rewards', group: 'oversight', description: 'Inspect reward lifecycle records (central Rewards system) and the notification event inventory.', route: '/admin/rewards' },
  { id: 'configure_notifications', label: 'Configure notification templates', group: 'configuration', description: 'Edit notification message templates and channel settings — trigger and delivery rules pending §9-8.', route: '/admin/rewards' },
  { id: 'manage_managers', label: 'Manage Community Hub Managers', group: 'oversight', description: 'Appoint, reassign, suspend and remove Community Hub Manager staff roles.', route: '/admin/managers' },
  { id: 'configure_membership', label: 'Membership & Feature Access', group: 'configuration', description: 'Configure plan entitlements, usage limits, expiry and suspension rules.', route: '/admin/membership' },
  { id: 'view_audit', label: 'View audit log', group: 'oversight', description: 'Read administrative history.', route: '/admin/audit' },
]

/**
 * Default grant: every admin action is available to the `admin` role until
 * role assignments are agreed (§17-6). Structure first, rules later — the UI
 * reads this matrix rather than hardcoding which buttons exist.
 */
export const DEFAULT_GRANTS: Record<AdminAction, Viewer['userType'][]> = {
  moderate_content: ['admin'],
  manage_reports: ['admin'],
  manage_users: ['admin'],
  manage_exchange: ['admin'],
  manage_announcements: ['admin'],
  view_messages_context: ['admin'],
  view_group_context: ['admin'],
  configure_platform: ['admin'],
  view_attribution: ['admin'],
  view_analytics: ['admin'],
  configure_campaigns: ['admin'],
  manage_rewards: ['admin'],
  configure_notifications: ['admin'],
  manage_managers: ['admin'],
  configure_membership: ['admin'],
  view_audit: ['admin'],
}

const ROLE_GRANTS_KEY = 'community_admin_role_grants'

/**
 * Effective grants: the persisted matrix seeded from DEFAULT_GRANTS (§17-6).
 * Role assignments are an open product decision — the store ships admin-only
 * and every change is audited (§14); the configuration surface renders and
 * edits exactly this data, and the server remains the authority (§5.5).
 */
export function getRoleGrants(): Record<AdminAction, Viewer['userType'][]> {
  try {
    const raw = localStorage.getItem(ROLE_GRANTS_KEY)
    if (raw) {
      const stored = JSON.parse(raw) as Partial<Record<AdminAction, Viewer['userType'][]>>
      const grants: Record<AdminAction, Viewer['userType'][]> = { ...DEFAULT_GRANTS }
      for (const action of Object.keys(DEFAULT_GRANTS) as AdminAction[]) {
        if (Array.isArray(stored[action])) grants[action] = stored[action] as Viewer['userType'][]
      }
      return grants
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_GRANTS }
}

/** Raw store write — callers go through adminApi so changes are audited (§14). */
export function writeRoleGrants(grants: Record<AdminAction, Viewer['userType'][]>): void {
  try {
    localStorage.setItem(ROLE_GRANTS_KEY, JSON.stringify(grants))
  } catch {
    /* ignore */
  }
}

/** Does this viewer hold an administrative action? (Server remains authoritative.) */
export function canAdmin(
  user: { userType: Viewer['userType'] } | null | undefined,
  action: AdminAction,
): boolean {
  if (!user) return false
  return getRoleGrants()[action].includes(user.userType)
}
