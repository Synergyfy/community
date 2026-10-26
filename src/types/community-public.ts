import type { ContentVisibility, ExchangeType, PostStatus, PostType, ShareEventStatus, ShareEventType, ShareTargetType } from '@/lib/constants'

export interface LocationContext {
  citySlug?: string
  cityName?: string
  areaSlug?: string
  areaName?: string
  streetSlug?: string
  streetName?: string
  countryCode?: string
}

export interface PublicUser {
  id: string
  name: string
  avatarUrl?: string | null
  userType: 'business' | 'consumer' | 'admin' | 'public'
  businessId?: string | null
  businessName?: string | null
  isVerified?: boolean
  /** Admin-controlled account status (§5.5). Enforcement is server-side. */
  accountStatus?: 'active' | 'suspended'
}

export interface PublicPost {
  id: string
  authorId: string
  author: PublicUser
  postType: PostType
  status: PostStatus
  visibility: ContentVisibility
  title?: string | null
  content: string
  mediaUrls?: string[] | null
  hashtags?: string[] | null
  categoryId?: string | null
  campaignId?: string | null
  exchangeId?: string | null
  groupId?: string | null
  offerId?: string | null
  rewardId?: string | null
  businessId?: string | null
  location?: LocationContext | null
  isPinned?: boolean
  isFeatured?: boolean
  publishedAt?: string | Date | null
  scheduledAt?: string | Date | null
  createdAt: string | Date
  likeCount?: number
  commentCount?: number
  shareCount?: number
  /** Moderation feedback (spec §3.3, §5.2) — set when status is pending/rejected. */
  moderationReason?: string | null
  moderatedBy?: string | null
  moderatedAt?: string | Date | null
}

export interface PublicComment {
  id: string
  postId: string
  authorId: string
  author: PublicUser
  parentId?: string | null
  content: string
  likeCount?: number
  createdAt: string | Date
  updatedAt: string | Date
  /** Moderation state (§3.4) — absent means visible; server is authoritative. */
  status?: 'visible' | 'removed'
  moderationReason?: string | null
  moderatedAt?: string | Date | null
}

export interface PublicStory {
  id: string
  author: PublicUser
  imageUrl?: string | null
  videoUrl?: string | null
  label?: string | null
  expiresAt: string | Date
  createdAt: string | Date
  relatedType?: 'business' | 'campaign' | 'offer' | 'reward' | 'group' | null
  relatedId?: string | null
}

export interface PublicReel {
  id: string
  author: PublicUser
  videoUrl: string
  coverImageUrl?: string | null
  caption?: string | null
  hashtags?: string[] | null
  likeCount?: number
  commentCount?: number
  shareCount?: number
  relatedType?: 'business' | 'campaign' | 'offer' | 'reward' | 'group' | null
  relatedId?: string | null
  createdAt: string | Date
}

export interface PublicCommunity {
  id: string
  name: string
  slug: string
  location?: LocationContext | null
  description?: string | null
  coverImageUrl?: string | null
  memberCount?: number
}

export interface PublicBusiness {
  id: string
  name: string
  logoUrl?: string | null
  category?: string | null
  location?: LocationContext | null
  description?: string | null
  hasOffer?: boolean
  hasCampaign?: boolean
  followerCount?: number
}

export interface PublicCampaign {
  id: string
  title: string
  imageUrl?: string | null
  description?: string | null
  creator?: PublicUser
  businessId?: string | null
  location?: LocationContext | null
  goalAmountPence?: number
  raisedAmountPence?: number
  currency?: 'GBP'
  supporterCount?: number
  endDate?: string | Date | null
  status?: 'active' | 'ended' | 'upcoming'
  slug?: string
}

export interface PublicOffer {
  id: string
  title: string
  businessId: string
  business?: PublicBusiness
  imageUrl?: string | null
  description?: string | null
  expiryDate?: string | Date | null
  location?: LocationContext | null
}

export interface PublicReward {
  id: string
  title: string
  valueText?: string | null
  imageUrl?: string | null
  campaignId?: string | null
  description?: string | null
  howToQualify?: string | null
  status?: 'available' | 'ended'
  /** Records the backend lacks are labelled `demo` (§16) — never presented as real outcomes. */
  source?: 'demo' | 'user'
}

/**
 * Notification event inventory entry (spec §10) — a factual record of one
 * notification event: where it is emitted in Community today, the in-app bell
 * type it uses and where it sends the member. An inventory, not a trigger
 * rule: which events *should* notify is an open decision (§9-8).
 */
export interface NotificationEventDef {
  /** Stable event key. */
  id: string
  label: string
  /** In-app bell type the notification uses (`notifications.store`). */
  inAppType: 'comment' | 'follow' | 'group' | 'exchange' | 'campaign' | 'system'
  /** Where the event is emitted today — a component, or the backend when Community waits on it. */
  emittedAt: string
  /** Destination path pattern the notification links to; `null` = no destination configured. */
  destination: string | null
  /** Is the emission wired in this front end today? */
  frontendWired: boolean
  /** Where the event appears today when the front end does not emit it. */
  demoSeedOnly?: boolean
}

/**
 * Per-event notification template configuration (spec §10) — configured
 * message text and channel toggles stored as data and audited (§13, §14).
 * Which events trigger a notification and whether in-app/email delivery
 * applies is an open decision (§9-8); this config is recorded and displayed,
 * never silently enforced by emitters (§16).
 */
export interface NotificationEventTemplate {
  eventId: string
  inAppEnabled: boolean
  /** Delivery requires a backend mailer — the toggle stores configuration only. */
  emailEnabled: boolean
  /** Message title with {placeholders}; shown as configured, never interpreted. */
  titleTemplate: string
  /** Message body with {placeholders}; shown as configured, never interpreted. */
  bodyTemplate: string
  updatedAt: string
  updatedBy?: string | null
  source: 'demo' | 'user'
}

export interface PublicGroup {
  id: string
  name: string
  imageUrl?: string | null
  coverImageUrl?: string | null
  description?: string | null
  memberCount?: number
  location?: LocationContext | null
  isPublic?: boolean
}

export interface PublicExchange {
  id: string
  creatorId: string
  creator: PublicUser
  exchangeType: ExchangeType
  title: string
  description: string
  offering: string
  seeking: string
  categoryId?: string | null
  location?: LocationContext | null
  images?: string[] | null
  status: 'active' | 'completed' | 'expired' | 'cancelled'
  /** Audience rule (spec §4.5). Absent means public; enforced by lib/permissions.ts. */
  visibility?: ContentVisibility
  expiresAt?: string | Date | null
  createdAt: string | Date
  /** Moderation feedback (spec §5.3). */
  moderationReason?: string | null
}

export interface PublicHashtag {
  tag: string
  slug: string
  usageCount: number
  /** Admin flags (spec §3.3) — featured and restricted are distinguishable. */
  featured?: boolean
  restricted?: boolean
  status?: 'active' | 'restricted'
}

export interface ShareCreateResult {
  shareId: string
  trackingCode: string
  shareUrl: string
  qrCodeUrl?: string | null
}

/**
 * A share created by a business or consumer against a shareable target
 * (spec §3.5, §4.4, Workflow C). Aggregates are maintained by the
 * attribution service, never declared by the front end.
 */
/** A share created by a business or consumer against a shareable target
 * (spec §3.5, §4.4, Workflow C). Aggregates are maintained by the
 * attribution service, never declared by the front end.
 */
export interface ShareRecord {
  id: string
  sharerId: string
  sharerType: 'business' | 'consumer' | 'admin'
  targetType: ShareTargetType
  targetId?: string | null
  targetTitle?: string | null
  shareType?: string | null
  trackingCode: string
  shareUrl: string
  createdAt: string
  visitCount: number
  qualifiedCount: number
  /** Related campaign/product carried by the share (spec §6.6). */
  campaignId?: string | null
  campaignTitle?: string | null
  productId?: string | null
  productTitle?: string | null
  /** QR record created for this share link, when one exists. */
  qrCodeUrl?: string | null
  /** Backend-supplied unique click count — null when not supplied. The
   *  front end never computes unique clicks client-side (spec §6.6, §17-3). */
  uniqueVisitCount?: number | null
  /** Demo-seeded record — never presented as a real outcome (spec §16). */
  source?: 'demo' | 'user'
}

/**
 * Per-campaign sharing/referral/leaderboard configuration (spec §5 item 6,
 * §7.4, §13). Stored as actual configured values — the frontend never
 * hardcodes qualification rules or ranking logic; it displays and applies
 * whatever is configured here (§17-3/§17-4 pending formal sign-off).
 */
export type LeaderboardMetric = 'qualified' | 'registrations' | 'clicks'

export interface CampaignShareConfig {
  campaignId: string
  sharingEnabled: boolean
  referralEnabled: boolean
  /** The actual configured criteria, stored as data — never hardcoded rules (§17-4). */
  referralCriteria?: string | null
  /** Configured attribution window shown as configured; enforcement is the backend's (§17-3). */
  referralWindowDays?: number | null
  leaderboardEnabled: boolean
  /** Which recorded measure the leaderboard ranks by — configuration, not a fixed rule. */
  leaderboardMetric: LeaderboardMetric
  updatedAt: string
  updatedBy?: string | null
  /** Demo-seeded configuration — never presented as an agreed rule (§16). */
  source?: 'demo' | 'user'
}

/** A single tracked event behind a share link (spec §5.4). */
export interface AttributionEvent {
  id: string
  shareId: string
  trackingCode: string
  targetType: ShareTargetType
  targetId?: string | null
  campaignId?: string | null
  eventType: ShareEventType
  status: ShareEventStatus
  occurredAt: string
  /** Account credited for the share (Workflow C step 7). */
  attributedToUserId?: string | null
  attributedToAccountType?: 'business' | 'consumer' | 'admin' | null
  /** Coarse source/channel info permitted by the privacy rules (§5.4). */
  source?: string | null
  meta?: Record<string, unknown> | null
  /** Demo-seeded record (distinguished from events recorded by user flows). */
  isDemo?: boolean
}

/**
 * Referral candidate derived from a registration event (spec §6.6, §17-4).
 * One row per registration recorded against a share; the qualification
 * status is the backend's decision, never the front end's.
 */
export interface ReferralRecord {
  id: string
  trackingCode: string
  sharerId: string
  sharerType: 'business' | 'consumer' | 'admin'
  campaignId?: string | null
  campaignTitle?: string | null
  /** Referred person as recorded by the backend (never fabricated). */
  referredLabel?: string | null
  /** pending = unconfirmed, attributed = credited, qualified = confirmed,
   *  rejected = declined. */
  status: ShareEventStatus
  occurredAt: string
  /** Backend-supplied attribution window info, when present. */
  attributionWindowDays?: number | null
  /** Demo-seeded record — never presented as a real referral (spec §16). */
  source?: 'demo' | 'user'
}

/** Immutable record of an administrative action (spec §5.2, §5.3, §14). */
export interface AuditEntry {
  id: string
  at: string
  adminId: string
  adminName: string
  action: string
  targetType: 'post' | 'comment' | 'exchange' | 'user' | 'config' | 'campaign' | 'report' | 'hashtag' | 'category' | 'announcement' | 'manager' | 'membership'
  targetId?: string
  targetLabel?: string
  details?: string
  /** Status before the action (§14 — previous and resulting status). */
  previousStatus?: string | null
  /** Status after the action (§14). */
  resultingStatus?: string | null
  /** Reason/note recorded where the action requires one (§14). */
  reason?: string | null
}

/** Admin configuration for an `#Exchange` item type (spec §5.3). */
export interface ExchangeTypeConfig {
  enabled: boolean
  whoCanCreate: 'business' | 'consumer' | 'both' | 'admin'
  requiresApproval: boolean
}

/** A configurable report reason (spec §3.6 — reasons are data, not hardcoded). */
export interface ReportReason {
  id: string
  label: string
}

export interface CommunityAdminConfig {
  exchangeTypes: Record<string, ExchangeTypeConfig>
  reportReasons: ReportReason[]
  /**
   * Persisted hashtag admin flags by slug (§3.3). Stored alongside the rest of
   * the platform configuration so a feature/restrict action survives reloads —
   * the audit record and the hashtag record must never disagree (§15, §16).
   */
  hashtagFlags?: Record<string, { featured: boolean; restricted: boolean }>
}

// ---------------------------------------------------------------------------
// Admin foundations (spec §3, §4 — Phase A records)
// ---------------------------------------------------------------------------

/** What a report targets (spec §3.5, §3.6). */
export type ReportTargetType = 'post' | 'comment' | 'exchange' | 'user'

export type ReportStatus = 'pending' | 'under_review' | 'escalated' | 'resolved'

/**
 * A first-class user report (spec §3.5, §3.6). Replaces bare "reported" ids so
 * the moderation queue can show reason, history and resolution.
 */
export interface ReportRecord {
  id: string
  targetType: ReportTargetType
  targetId: string
  /** Preview/label of the reported content at the time of the report. */
  targetLabel?: string | null
  reasonCode: string
  reasonLabel?: string | null
  details?: string | null
  reporterId: string
  reporterName?: string | null
  status: ReportStatus
  /** Set when the report is resolved (spec §3.6 — record a decision). */
  decision?: 'uphold' | 'dismiss' | null
  resolutionNote?: string | null
  resolvedBy?: string | null
  resolvedAt?: string | null
  /** Assigned reviewer, where assignment is supported (§3.5). */
  assignedTo?: string | null
  assignedToName?: string | null
  createdAt: string
  /** Demo-seeded reports are labelled so they are never mistaken for real input. */
  source?: 'user' | 'demo'
}

/** Admin-managed category used by Community content and #Exchange (spec §3.2, §5.2). */
export interface ContentCategory {
  id: string
  kind: 'community' | 'exchange'
  name: string
  /** Icon key used by the Discover grid (presentation only). */
  icon?: string | null
  description?: string | null
  /** Content type the category is assigned to, where relevant (§3.2). */
  contentType?: string | null
  /** Where the category appears (§3.2 — placement follows backend config). */
  placement?: string | null
  active: boolean
  sortOrder: number
}

/**
 * An admin-published announcement (spec §4). One record fans out to every
 * permitted surface — it is never recreated per dashboard (§15).
 */
export interface Announcement {
  id: string
  title: string
  content: string
  imageUrl?: string | null
  categoryId?: string | null
  /** Target audiences (§4). */
  audience: 'business' | 'consumer' | 'both'
  /** Location scope — follows the platform's actual structures (§4). */
  location?: LocationContext | null
  /** Optional group scope; null = not group-targeted. */
  groupId?: string | null
  status: 'draft' | 'scheduled' | 'published' | 'expired' | 'archived'
  publishAt?: string | null
  expiresAt?: string | null
  isPinned: boolean
  authorId: string
  createdAt: string
  updatedAt?: string | null
  /** Demo-seeded announcements are labelled so they are never mistaken for admin input. */
  source?: 'user' | 'demo'
}

// ---------------------------------------------------------------------------
// Community Hub Managers — a staff role overlay on CHS accounts
// ---------------------------------------------------------------------------

/**
 * Platform-level management structure for Community Hub Managers. Which one
 * the platform uses is an admin configuration choice; the appointment flow
 * adapts to it (one manager per area / multiple per area / hierarchy with
 * reporting levels and supervisors).
 */
export type ManagerStructure = 'single' | 'multiple' | 'hierarchy'

/** A named management area an admin can assign to managers. */
export interface ManagerAreaDef {
  id: string
  name: string
  /** Geographic scope; null = platform-wide / non-geographic area. */
  city?: string | null
}

/**
 * Independently configurable manager permissions. Each capability is a
 * separate switch — approving posts does NOT imply publishing announcements
 * or changing platform settings (Community Hub Manager spec §3).
 */
export interface ManagerPermissions {
  /** View and review posts and comments. */
  viewReviewContent: boolean
  /** Approve or reject content. */
  approveRejectContent: boolean
  /** Publish approved posts directly. */
  publishPosts: boolean
  /** Publish announcements — independently configurable from post approval. */
  publishAnnouncements: boolean
  /** Hide, remove or restore content. */
  hideRemoveRestore: boolean
  /** Moderate reports. */
  moderateReports: boolean
  /** Moderate #Exchange activity. */
  moderateExchange: boolean
  /** Escalate sensitive or disputed cases to the central Admin. */
  escalateToAdmin: boolean
}

export type ManagerStatus = 'invited' | 'active' | 'suspended' | 'removed'

/**
 * A Community Hub Manager appointment — a staff record attached to a CHS
 * account. It is NOT a membership: appointing or removing the role never
 * creates, changes or deletes the person's CHS account or memberships.
 */
export interface ManagerRecord {
  id: string
  /** Linked CHS account; null while an invite is pending CHS authentication. */
  userId: string | null
  name: string
  email: string
  status: ManagerStatus
  /** Structure in force at appointment time (mirrors the platform config). */
  structure: ManagerStructure
  /** Assigned area ids (ManagerAreaDef). */
  areas: string[]
  /** Additional city scopes beyond the assigned areas. */
  locations: string[]
  /** Hierarchy: reporting level (present when structure is 'hierarchy'). */
  reportingLevel?: number | null
  /** Hierarchy: supervisor's ManagerRecord id, where applicable. */
  supervisorId?: string | null
  permissions: ManagerPermissions
  restrictions: {
    /** Post types this manager may act on; null = all types permitted. */
    permittedContentTypes?: string[] | null
    /** Announcement audiences they may publish to; null = all audiences. */
    announcementAudiences?: ('business' | 'consumer' | 'both')[] | null
  }
  appointedBy: string
  appointedByName: string
  appointedAt: string
  updatedAt?: string | null
  updatedById?: string | null
  /** Demo-seeded appointment records are labelled (spec §16). */
  source?: 'demo' | 'user'
}

export interface ManagerConfig {
  structure: ManagerStructure
  areas: ManagerAreaDef[]
  updatedAt: string
  updatedBy?: string | null
  source?: 'demo' | 'user'
}

// ---------------------------------------------------------------------------
// Membership & Feature Access — member-facing plan entitlements only
// ---------------------------------------------------------------------------

export type MembershipPlanKind = 'business' | 'consumer'

export interface MembershipPlan {
  id: string
  label: string
  kind: MembershipPlanKind
  priceText?: string | null
}

/** What happens to a feature when the member's membership expires. */
export type FeatureExpiryRule = 'keep' | 'downgrade_to_free' | 'revoke' | 'read_only'
/** Which features stay usable while a membership is suspended. */
export type FeatureSuspensionRule = 'block' | 'read_only' | 'allow'

/** An authorised, auditable exception to a feature rule. */
export interface MembershipException {
  id: string
  subjectLabel: string
  note?: string | null
  grantedBy: string
  grantedByName: string
  grantedAt: string
  source?: 'demo' | 'user'
}

/**
 * A member-facing feature governed by Membership & Feature Access. Membership
 * rules grant member features only — they never grant administrative or
 * moderation permissions (those live in the admin action matrix and manager
 * appointments).
 */
export interface MembershipFeature {
  id: string
  label: string
  description?: string | null
  /** Membership plan ids allowed to use this feature. */
  allowedPlanIds: string[]
  /** Usage limit per membership period; null = unlimited. */
  usageLimit?: number | null
  expiryRule: FeatureExpiryRule
  suspensionRule: FeatureSuspensionRule
  onboardingRequired: boolean
  accessMessage: { message: string; nextStep: string }
  exceptions?: MembershipException[]
}

export interface MembershipConfig {
  plans: MembershipPlan[]
  features: MembershipFeature[]
  updatedAt: string
  updatedBy?: string | null
  /** Demo-seeded configuration is labelled until an admin saves real rules. */
  source?: 'demo' | 'user'
}
