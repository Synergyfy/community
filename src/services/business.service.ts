import { api } from '@/lib/api'
import type { PostType } from '@/lib/constants'
import { demoBusinesses, demoCampaigns, demoOffers, demoPosts, demoUsers } from '@/data/demo-public'
import type { PublicBusiness, PublicCampaign, PublicOffer, PublicPost } from '@/types/community-public'

const DEMO_BUSINESS_ID = 'b1'

const daysFromNow = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString()

const demoStore = {
  business: { ...demoBusinesses[0] } as PublicBusiness,
  // Shared references (no clone) so admin moderation of these posts is
  // reflected on public surfaces too.
  posts: demoPosts.filter((p) => p.businessId === DEMO_BUSINESS_ID),
  offers: demoOffers.filter((o) => o.businessId === DEMO_BUSINESS_ID).map((o) => ({ ...o })),
  campaigns: [
    ...demoCampaigns.filter((c) => c.businessId === DEMO_BUSINESS_ID).map((c) => ({ ...c })),
    {
      id: 'camp-b1',
      title: 'Local Roasters Open Day',
      imageUrl: null,
      description:
        'Join us for a day of free tastings, a tour of our roastery and workshops with local growers. Everyone welcome.',
      creator: demoUsers.mcom!,
      businessId: DEMO_BUSINESS_ID,
      location: { cityName: 'Worcester', areaName: 'City Centre' },
      goalAmountPence: 250000,
      raisedAmountPence: 98500,
      currency: 'GBP' as const,
      supporterCount: 47,
      endDate: daysFromNow(18),
      status: 'active' as const,
      slug: 'local-roasters-open-day',
    },
  ] as PublicCampaign[],
}

export interface BusinessDashboardData {
  business: PublicBusiness
  posts: PublicPost[]
  offers: PublicOffer[]
  campaigns: PublicCampaign[]
}

export interface PostInput {
  /** Post type chosen in the composer (workflow B step 1) — persisted, never inferred. */
  postType?: PostType
  title?: string
  content: string
  mediaUrls?: string[]
  hashtags?: string[]
  visibility?: 'public' | 'business' | 'both'
  /**
   * Omit to keep the current status. On edits, omitted media/hashtags/visibility
   * are kept as well, so a status-only update (e.g. "Publish now") never
   * wipes the post's content.
   */
  status?: 'draft' | 'pending' | 'published'
}

export interface OfferInput {
  title: string
  description: string
  expiryDate?: string
}

export interface CampaignInput {
  title: string
  description: string
  endDate?: string
}

export interface BusinessProfileInput {
  name: string
  category: string
  description: string
  cityName: string
  areaName: string
}

async function tryApi<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch {
    return null
  }
}

function snapshot(): BusinessDashboardData {
  return {
    business: { ...demoStore.business },
    posts: demoStore.posts.map((p) => ({ ...p })),
    offers: demoStore.offers.map((o) => ({ ...o })),
    campaigns: demoStore.campaigns.map((c) => ({ ...c })),
  }
}

export const businessApi = {
  async getDashboard(): Promise<BusinessDashboardData> {
    const remote = await tryApi(async () => {
      const res = await api.get('/business/dashboard')
      const data = res.data?.data as BusinessDashboardData | undefined
      if (data?.business) return data
      throw new Error('empty')
    })
    return remote ?? snapshot()
  },

  async createPost(input: PostInput): Promise<void> {
    const done = await tryApi(async () => {
      await api.post('/business/posts', input)
    })
    if (done !== null) return
    demoStore.posts.unshift({
      id: `p-${Date.now()}`,
      authorId: demoStore.business.id,
      author: demoUsers.mcom!,
      postType: input.postType ?? (input.hashtags?.includes('Offer') ? 'offer' : 'business_info'),
      status: input.status ?? 'published',
      visibility: input.visibility ?? 'public',
      title: input.title ?? null,
      content: input.content,
      mediaUrls: input.mediaUrls?.length ? input.mediaUrls : null,
      hashtags: input.hashtags?.length ? input.hashtags : null,
      businessId: demoStore.business.id,
      location: demoStore.business.location ?? null,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
    })
  },

  async updatePost(id: string, input: PostInput): Promise<void> {
    const done = await tryApi(async () => {
      await api.patch(`/business/posts/${id}`, input)
    })
    if (done !== null) return
    const post = demoStore.posts.find((p) => p.id === id)
    if (post) {
      post.title = input.title ?? post.title
      post.content = input.content
      // Omitted fields keep their current value — a status-only update (e.g.
      // "Publish now" on a draft) must never wipe media or hashtags.
      if (input.postType) post.postType = input.postType
      if (input.mediaUrls !== undefined) post.mediaUrls = input.mediaUrls.length ? input.mediaUrls : null
      if (input.hashtags !== undefined) post.hashtags = input.hashtags.length ? input.hashtags : null
      if (input.visibility) post.visibility = input.visibility
      if (input.status) {
        const wasRejected = post.status === 'rejected'
        post.status = input.status
        // Resubmission (rejected → pending) and republishing clear the previous
        // moderation decision (spec §3.3); edits to a pending post keep their
        // place in the review queue instead of publishing themselves.
        if (input.status === 'published' || (input.status === 'pending' && wasRejected)) {
          post.moderationReason = null
          post.moderatedBy = null
          post.moderatedAt = null
        }
      }
    }
  },

  async archivePost(id: string): Promise<void> {
    const done = await tryApi(async () => {
      await api.post(`/business/posts/${id}/archive`)
    })
    if (done !== null) return
    const post = demoStore.posts.find((p) => p.id === id)
    if (post && post.status === 'published') post.status = 'archived'
  },

  async restorePost(id: string): Promise<void> {
    const done = await tryApi(async () => {
      await api.post(`/business/posts/${id}/restore`)
    })
    if (done !== null) return
    const post = demoStore.posts.find((p) => p.id === id)
    if (post && post.status === 'archived') post.status = 'published'
  },

  async deletePost(id: string): Promise<void> {
    const done = await tryApi(async () => {
      await api.delete(`/business/posts/${id}`)
    })
    if (done !== null) return
    demoStore.posts = demoStore.posts.filter((p) => p.id !== id)
  },

  async createOffer(input: OfferInput): Promise<void> {
    const done = await tryApi(async () => {
      await api.post('/business/offers', input)
    })
    if (done !== null) return
    demoStore.offers.unshift({
      id: `o-${Date.now()}`,
      title: input.title,
      businessId: demoStore.business.id,
      business: { ...demoStore.business },
      imageUrl: null,
      description: input.description,
      expiryDate: input.expiryDate || null,
      location: demoStore.business.location ?? null,
    })
  },

  async updateOffer(id: string, input: OfferInput): Promise<void> {
    const done = await tryApi(async () => {
      await api.patch(`/business/offers/${id}`, input)
    })
    if (done !== null) return
    const offer = demoStore.offers.find((o) => o.id === id)
    if (offer) {
      offer.title = input.title
      offer.description = input.description
      offer.expiryDate = input.expiryDate || null
    }
  },

  async deleteOffer(id: string): Promise<void> {
    const done = await tryApi(async () => {
      await api.delete(`/business/offers/${id}`)
    })
    if (done !== null) return
    demoStore.offers = demoStore.offers.filter((o) => o.id !== id)
  },

  async createCampaign(input: CampaignInput): Promise<void> {
    const done = await tryApi(async () => {
      await api.post('/business/campaigns', input)
    })
    if (done !== null) return
    demoStore.campaigns.unshift({
      id: `camp-${Date.now()}`,
      title: input.title,
      imageUrl: null,
      description: input.description,
      creator: demoUsers.mcom!,
      businessId: demoStore.business.id,
      location: demoStore.business.location ?? null,
      goalAmountPence: 0,
      raisedAmountPence: 0,
      currency: 'GBP',
      supporterCount: 0,
      endDate: input.endDate || null,
      status: 'active',
    })
  },

  async updateCampaign(id: string, input: CampaignInput): Promise<void> {
    const done = await tryApi(async () => {
      await api.patch(`/business/campaigns/${id}`, input)
    })
    if (done !== null) return
    const campaign = demoStore.campaigns.find((c) => c.id === id)
    if (campaign) {
      campaign.title = input.title
      campaign.description = input.description
      campaign.endDate = input.endDate || null
    }
  },

  async deleteCampaign(id: string): Promise<void> {
    const done = await tryApi(async () => {
      await api.delete(`/business/campaigns/${id}`)
    })
    if (done !== null) return
    demoStore.campaigns = demoStore.campaigns.filter((c) => c.id !== id)
  },

  async updateBusiness(input: BusinessProfileInput): Promise<void> {
    const done = await tryApi(async () => {
      await api.patch('/business/profile', input)
    })
    if (done !== null) return
    demoStore.business = {
      ...demoStore.business,
      name: input.name,
      category: input.category,
      description: input.description,
      location: {
        ...demoStore.business.location,
        cityName: input.cityName,
        areaName: input.areaName,
      },
    }
  },
}

/** All business-owned posts in the demo store (shared references, §5.2). */
export function getAllBusinessPosts(): PublicPost[] {
  return [...demoStore.posts]
}

/** Hard-delete a business post from the demo store (admin removal). */
export function deleteBusinessDemoPost(id: string): void {
  demoStore.posts = demoStore.posts.filter((p) => p.id !== id)
}
