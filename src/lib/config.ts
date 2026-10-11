export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Community'
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'community_access_token',
  REFRESH_TOKEN: 'community_refresh_token',
  USER: 'community_user',
  LOCATION: 'community_location',
} as const
