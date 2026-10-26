import { api } from '@/lib/api'
import { canViewPost, viewerFromUser } from '@/lib/permissions'
import {
  demoBusinesses,
  demoCampaigns,
  demoGroups,
  demoOffers,
  demoPosts,
  demoRewards,
} from '@/data/demo-public'
import type {
  PublicBusiness,
  PublicCampaign,
  PublicGroup,
  PublicOffer,
  PublicPost,
  PublicReward,
} from '@/types/community-public'
import { useAuthStore } from '@/stores/auth.store'

export interface BusinessProfile {
  business: PublicBusiness
  posts: PublicPost[]
  offers: PublicOffer[]
  campaigns: PublicCampaign[]
}

export interface CampaignDetail {
  campaign: PublicCampaign
  updates: PublicPost[]
  rewards: PublicReward[]
}

export interface GroupDetail {
  group: PublicGroup
  posts: PublicPost[]
}

async function getData<T>(path: string): Promise<T | null> {
  try {
    const res = await api.get(path)
    return (res.data?.data as T) ?? null
  } catch {
    return null
  }
}

function viewablePosts(posts: PublicPost[]): PublicPost[] {
  const viewer = viewerFromUser(useAuthStore.getState().user)
  return posts.filter((p) => canViewPost(viewer, p))
}

export const entitiesApi = {
  async getGroups(location?: string): Promise<PublicGroup[]> {
    try {
      const res = await api.get('/community/groups', { params: { location } })
      const data = res.data?.data as PublicGroup[] | undefined
      if (data && data.length) return data
      throw new Error('empty')
    } catch {
      if (!location) return demoGroups
      return demoGroups.filter(
        (g) => !g.location?.cityName || g.location.cityName.toLowerCase() === location.toLowerCase(),
      )
    }
  },

  async getBusiness(id: string): Promise<BusinessProfile | null> {
    const profile = await getData<BusinessProfile>(`/community/businesses/${id}`)
    if (profile?.business) return profile

    const business = demoBusinesses.find((b) => b.id === id)
    if (!business) return null
    return {
      business,
      posts: viewablePosts(demoPosts.filter((p) => p.businessId === id)),
      offers: demoOffers.filter((o) => o.businessId === id),
      campaigns: demoCampaigns.filter((c) => c.businessId === id),
    }
  },

  async getCampaign(id: string): Promise<CampaignDetail | null> {
    const detail = await getData<CampaignDetail>(`/community/campaigns/${id}`)
    if (detail?.campaign) return detail

    const campaign = demoCampaigns.find((c) => c.id === id)
    if (!campaign) return null
    return {
      campaign,
      updates: viewablePosts(demoPosts.filter((p) => p.campaignId === id)),
      rewards: demoRewards.filter((r) => r.campaignId === id),
    }
  },

  async getOffer(id: string): Promise<PublicOffer | null> {
    const offer = await getData<PublicOffer>(`/community/offers/${id}`)
    return offer ?? demoOffers.find((o) => o.id === id) ?? null
  },

  async getReward(id: string): Promise<PublicReward | null> {
    const reward = await getData<PublicReward>(`/community/rewards/${id}`)
    return reward ?? demoRewards.find((r) => r.id === id) ?? null
  },

  async getGroup(id: string): Promise<GroupDetail | null> {
    const detail = await getData<GroupDetail>(`/community/groups/${id}`)
    if (detail?.group) return detail

    const group = demoGroups.find((g) => g.id === id)
    if (!group) return null
    return {
      group,
      posts: demoPosts.filter((p) => p.groupId === id),
    }
  },

  async follow(targetType: 'business' | 'group' | 'campaign', targetId: string): Promise<void> {
    try {
      await api.post(`/community/${targetType === 'business' ? 'businesses' : targetType === 'group' ? 'groups' : 'campaigns'}/${targetId}/follow`)
    } catch {
      /* demo: optimistic only */
    }
  },

  async joinGroup(groupId: string): Promise<void> {
    try {
      await api.post(`/community/groups/${groupId}/join`)
    } catch {
      /* demo: optimistic only */
    }
  },
}
