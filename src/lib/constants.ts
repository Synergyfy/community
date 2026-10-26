export const PostType = {
  STANDARD: 'standard',
  BUSINESS_INFO: 'business_info',
  CONSUMER: 'consumer',
  CAMPAIGN: 'campaign',
  CAMPAIGN_UPDATE: 'campaign_update',
  EXCHANGE: 'exchange',
  EXCHANGE_UPDATE: 'exchange_update',
  GROUP: 'group',
  OFFER: 'offer',
  REWARD: 'reward',
  ANNOUNCEMENT: 'announcement',
  LOCAL_INFO: 'local_info',
  ADMIN_ANNOUNCEMENT: 'admin_announcement',
  SHARED: 'shared',
  SYSTEM_ACTIVITY: 'system_activity',
} as const
export type PostType = (typeof PostType)[keyof typeof PostType]

/**
 * Publication lifecycle for posts and exchange items (spec §3.2, §3.3, §5.2, §7).
 * Only PUBLISHED content may appear on public surfaces; authors always see
 * their own items in every state; Admins see everything.
 */
export const PostStatus = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
} as const
export type PostStatus = (typeof PostStatus)[keyof typeof PostStatus]

/** Audience/visibility rules (spec §4.1, §5.2). Enforced by lib/permissions.ts. */
export type ContentVisibility = 'public' | 'business' | 'consumer' | 'both' | 'group' | 'private'

/** Lifecycle of a tracked sharing/attribution event (spec §5.4). */
export const ShareEventStatus = {
  PENDING: 'pending',
  ATTRIBUTED: 'attributed',
  QUALIFIED: 'qualified',
  REJECTED: 'rejected',
} as const
export type ShareEventStatus = (typeof ShareEventStatus)[keyof typeof ShareEventStatus]

/** Events the attribution engine may record (spec §5.4 — final set pending §9 decision). */
export const ShareEventType = {
  VISIT: 'visit',
  SIGNUP: 'signup',
  CAMPAIGN_JOIN: 'campaign_join',
  CONTRIBUTION: 'contribution',
  OTHER: 'other',
} as const
export type ShareEventType = (typeof ShareEventType)[keyof typeof ShareEventType]

export const ExchangeType = {
  OFFER_REQUEST: 'offer_request',
  SWAP: 'swap',
  TRADE: 'trade',
  SERVICE: 'service',
  OTHER: 'other',
} as const
export type ExchangeType = (typeof ExchangeType)[keyof typeof ExchangeType]

export const ShareType = {
  LINK: 'link',
  QR: 'qr',
  SOCIAL: 'social',
  DIRECT: 'direct',
  EMAIL: 'email',
  SMS: 'sms',
  NATIVE: 'native',
  OTHER: 'other',
} as const
export type ShareType = (typeof ShareType)[keyof typeof ShareType]

export const ShareTargetType = {
  CAMPAIGN: 'campaign',
  BUSINESS: 'business',
  PRODUCT: 'product',
  OFFER: 'offer',
  REWARD: 'reward',
  POST: 'post',
  EXCHANGE: 'exchange',
  GROUP: 'group',
} as const
export type ShareTargetType = (typeof ShareTargetType)[keyof typeof ShareTargetType]

export const SESSION_EXPIRED_EVENT = 'fd:session-expired'
export const OPEN_COMPOSER_EVENT = 'community:open-composer'
