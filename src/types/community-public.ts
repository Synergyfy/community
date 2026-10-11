import type { PostType, ExchangeType } from '@/lib/constants'

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
}

export interface PublicPost {
  id: string
  authorId: string
  author: PublicUser
  postType: PostType
  status: 'published'
  visibility: 'public' | 'business' | 'consumer' | 'both' | 'group' | 'private'
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
  createdAt: string | Date
  likeCount?: number
  commentCount?: number
  shareCount?: number
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
  expiresAt?: string | Date | null
  createdAt: string | Date
}

export interface PublicHashtag {
  tag: string
  slug: string
  usageCount: number
}

export interface ShareCreateResult {
  shareId: string
  trackingCode: string
  shareUrl: string
  qrCodeUrl?: string | null
}
