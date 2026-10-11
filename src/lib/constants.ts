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
