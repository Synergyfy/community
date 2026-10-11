import { api } from '@/lib/api'
import type { ExchangeType } from '@/lib/constants'
import {
  demoBusinesses,
  demoCampaigns,
  demoCommunities,
  demoHashtags,
  demoPosts,
  demoExchanges,
} from '@/data/demo-public'
import type {
  LocationContext,
  PublicBusiness,
  PublicCampaign,
  PublicCommunity,
  PublicHashtag,
  PublicPost,
  PublicExchange,
  PublicUser,
} from '@/types/community-public'

const createdExchanges: PublicExchange[] = []


export interface DiscoverCategory {
  id: string
  label: string
  icon: string
  count?: number
}

export const DISCOVER_CATEGORIES: DiscoverCategory[] = [
  { id: 'food-drink', label: 'Food & Drink', icon: 'UtensilsCrossed' },
  { id: 'shopping', label: 'Shopping', icon: 'ShoppingBag' },
  { id: 'health', label: 'Health & Beauty', icon: 'HeartPulse' },
  { id: 'home', label: 'Home & Garden', icon: 'Home' },
  { id: 'services', label: 'Local Services', icon: 'Wrench' },
  { id: 'community', label: 'Community', icon: 'Users' },
  { id: 'events', label: 'Events', icon: 'CalendarDays' },
  { id: 'causes', label: 'Causes', icon: 'HandHeart' },
]

export interface SearchResults {
  posts: PublicPost[]
  businesses: PublicBusiness[]
  campaigns: PublicCampaign[]
  exchanges: PublicExchange[]
  hashtags: PublicHashtag[]
  communities: PublicCommunity[]
}

function matches(text: string | null | undefined, q: string) {
  return (text || '').toLowerCase().includes(q)
}

export const discoverApi = {
  async getTrendingHashtags(): Promise<PublicHashtag[]> {
    try {
      const res = await api.get('/community/discover/hashtags')
      const data = res.data?.data as PublicHashtag[] | undefined
      if (data && data.length) return data
      throw new Error('empty')
    } catch {
      return [...demoHashtags].sort((a, b) => b.usageCount - a.usageCount)
    }
  },

  async getLocalBusinesses(location?: string): Promise<PublicBusiness[]> {
    try {
      const res = await api.get('/community/discover/businesses', { params: { location } })
      const data = res.data?.data as PublicBusiness[] | undefined
      if (data && data.length) return data
      throw new Error('empty')
    } catch {
      return demoBusinesses
    }
  },

  async getFeaturedCampaigns(location?: string): Promise<PublicCampaign[]> {
    try {
      const res = await api.get('/community/discover/campaigns', { params: { location } })
      const data = res.data?.data as PublicCampaign[] | undefined
      if (data && data.length) return data
      throw new Error('empty')
    } catch {
      return demoCampaigns
    }
  },

  async search(query: string, location?: string): Promise<SearchResults> {
    const q = query.trim().toLowerCase()
    if (!q) return { posts: [], businesses: [], campaigns: [], exchanges: [], hashtags: [], communities: [] }

    try {
      const res = await api.get('/community/search', { params: { q, location } })
      const data = res.data?.data as SearchResults | undefined
      if (data) return data
      throw new Error('empty')
    } catch {
      return {
        posts: demoPosts.filter((p) => matches(p.content, q) || matches(p.title, q) || (p.hashtags || []).some((h) => matches(h, q))),
        businesses: demoBusinesses.filter((b) => matches(b.name, q) || matches(b.category, q)),
        campaigns: demoCampaigns.filter((c) => matches(c.title, q)),
        exchanges: demoExchanges.filter((e) => matches(e.title, q) || matches(e.description, q)),
        hashtags: demoHashtags.filter((h) => matches(h.tag, q)),
        communities: demoCommunities.filter(
          (c) => matches(c.name, q) || matches(c.location?.cityName, q) || matches(c.description, q),
        ),
      }
    }
  },

  async getHashtagPosts(tag: string): Promise<PublicPost[]> {
    const t = tag.replace(/^#/, '').toLowerCase()
    try {
      const res = await api.get(`/community/hashtags/${t}/posts`)
      const data = res.data?.data as PublicPost[] | undefined
      if (data && data.length) return data
      throw new Error('empty')
    } catch {
      return demoPosts.filter((p) => (p.hashtags || []).some((h) => h.replace(/^#/, '').toLowerCase() === t))
    }
  },

  async getCategoryBusinesses(category: string): Promise<PublicBusiness[]> {
    const c = category.toLowerCase().replace(/-/g, ' ')
    try {
      const res = await api.get(`/community/categories/${category}/businesses`)
      const data = res.data?.data as PublicBusiness[] | undefined
      if (data && data.length) return data
      throw new Error('empty')
    } catch {
      return demoBusinesses.filter(
        (b) => matches(b.category, c) || matches(c, b.category || '') || c.includes((b.category || '').toLowerCase()),
      )
    }
  },

  async getExchanges(location?: string): Promise<PublicExchange[]> {
    try {
      const res = await api.get('/community/exchanges', { params: { location } })
      const data = res.data?.data as PublicExchange[] | undefined
      if (data && data.length) return data
      throw new Error('empty')
    } catch {
      const all = [...createdExchanges, ...demoExchanges]
      if (!location) return all
      return all.filter((e) => !e.location?.cityName || e.location.cityName.toLowerCase() === location.toLowerCase())
    }
  },

  async getExchange(id: string): Promise<PublicExchange | null> {
    try {
      const res = await api.get(`/community/exchanges/${id}`)
      return (res.data?.data as PublicExchange) || null
    } catch {
      return createdExchanges.find((e) => e.id === id) || demoExchanges.find((e) => e.id === id) || null
    }
  },

  async createExchange(input: {
    exchangeType: ExchangeType
    title: string
    description: string
    offering: string
    seeking: string
    categoryId?: string
    location?: LocationContext | null
    author: PublicUser
  }): Promise<PublicExchange> {
    try {
      const res = await api.post('/community/exchanges', input)
      const data = res.data?.data as PublicExchange | undefined
      if (data) return data
      throw new Error('empty')
    } catch {
      const exchange: PublicExchange = {
        id: `local-${Date.now()}`,
        creatorId: input.author.id,
        creator: input.author,
        exchangeType: input.exchangeType,
        title: input.title,
        description: input.description,
        offering: input.offering,
        seeking: input.seeking,
        categoryId: input.categoryId ?? null,
        location: input.location ?? null,
        images: null,
        status: 'active',
        expiresAt: null,
        createdAt: new Date().toISOString(),
      }
      createdExchanges.unshift(exchange)
      return exchange
    }
  },

  async requestExchange(exchangeId: string, message?: string): Promise<void> {
    try {
      await api.post(`/community/exchanges/${exchangeId}/requests`, { message })
    } catch {
      /* demo: request is persisted client-side */
    }
  },
}
