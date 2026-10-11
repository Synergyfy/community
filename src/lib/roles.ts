export const ROLES = {
  PUBLIC: 'public',
  BUSINESS: 'business',
  CONSUMER: 'consumer',
  ADMIN: 'admin',
} as const
export type UserType = (typeof ROLES)[keyof typeof ROLES]
