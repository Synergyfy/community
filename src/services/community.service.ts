import { api } from '@/lib/api'
import type { PostType } from '@/lib/constants'
import type {
  LocationContext,
  PublicComment,
  PublicCommunity,
  PublicPost,
  PublicUser,
} from '@/types/community-public'
import { demoComments, demoCommunities, demoPosts } from '@/data/demo-public'

export interface FeedQuery {
  filter?: 'all' | 'businesses' | 'consumers' | 'groups'
  location?: string
  page?: number
  limit?: number
}

export interface CreatePostInput {
  type: PostType
  content: string
  title?: string
  mediaUrls?: string[]
  hashtags?: string[]
  location?: LocationContext | null
  author: PublicUser
}

const createdPosts: PublicPost[] = []

function inLocation(post: PublicPost, location?: string): boolean {
  if (!location) return true
  const city = post.location?.cityName
  if (!city) return true
  return city.toLowerCase() === location.toLowerCase()
}

function matchesFilter(post: PublicPost, filter: FeedQuery['filter']): boolean {
  if (filter === 'businesses') return post.author.userType === 'business'
  if (filter === 'consumers') return post.author.userType === 'consumer'
  return true
}

function sortNewest(posts: PublicPost[]): PublicPost[] {
  return [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export const communityApi = {
  async getFeed(query: FeedQuery = {}): Promise<PublicPost[]> {
    try {
      const res = await api.get('/community/feed', { params: query })
      const data = res.data?.data as PublicPost[] | undefined
      if (data) return data
      throw new Error('empty')
    } catch {
      const all = [...createdPosts, ...demoPosts]
      return sortNewest(all.filter((p) => inLocation(p, query.location) && matchesFilter(p, query.filter)))
    }
  },

  async createPost(input: CreatePostInput): Promise<PublicPost> {
    try {
      const res = await api.post('/community/posts', {
        postType: input.type,
        title: input.title,
        content: input.content,
        mediaUrls: input.mediaUrls,
        hashtags: input.hashtags,
      })
      const data = res.data?.data as PublicPost | undefined
      if (data) return data
      throw new Error('empty')
    } catch {
      const post: PublicPost = {
        id: `local-${Date.now()}`,
        authorId: input.author.id,
        author: input.author,
        postType: input.type,
        status: 'published',
        visibility: 'public',
        title: input.title ?? null,
        content: input.content,
        mediaUrls: input.mediaUrls ?? null,
        hashtags: input.hashtags ?? null,
        location: input.location ?? null,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
      }
      createdPosts.unshift(post)
      return post
    }
  },

  async getPost(id: string): Promise<PublicPost | null> {
    try {
      const res = await api.get(`/community/posts/${id}`)
      return (res.data?.data as PublicPost) || null
    } catch {
      return createdPosts.find((p) => p.id === id) || demoPosts.find((p) => p.id === id) || null
    }
  },

  async getPostsByIds(ids: string[]): Promise<PublicPost[]> {
    if (ids.length === 0) return []
    try {
      const res = await api.post('/community/posts/batch', { ids })
      const data = res.data?.data as PublicPost[] | undefined
      if (data) return data
      throw new Error('empty')
    } catch {
      const all = [...createdPosts, ...demoPosts]
      return ids.map((id) => all.find((p) => p.id === id)).filter((p): p is PublicPost => !!p)
    }
  },

  async getPostsByAuthor(authorId: string): Promise<PublicPost[]> {
    try {
      const res = await api.get('/community/posts', { params: { authorId } })
      const data = res.data?.data as PublicPost[] | undefined
      if (data) return data
      throw new Error('empty')
    } catch {
      return sortNewest([...createdPosts, ...demoPosts].filter((p) => p.authorId === authorId))
    }
  },

  async getComments(postId: string): Promise<PublicComment[]> {
    try {
      const res = await api.get(`/community/posts/${postId}/comments`)
      return (res.data?.data as PublicComment[]) || []
    } catch {
      return demoComments.filter((c) => c.postId === postId)
    }
  },

  async getCommunities(query?: string): Promise<PublicCommunity[]> {
    try {
      const res = await api.get('/community/communities', { params: { q: query } })
      const data = res.data?.data as PublicCommunity[] | undefined
      if (data && data.length) return data
      throw new Error('empty')
    } catch {
      const q = (query || '').trim().toLowerCase()
      if (!q) return demoCommunities
      return demoCommunities.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.location?.cityName || '').toLowerCase().includes(q),
      )
    }
  },

  async likePost(id: string, liked: boolean): Promise<void> {
    if (liked) await api.delete(`/community/posts/${id}/like`)
    else await api.post(`/community/posts/${id}/like`)
  },

  async bookmarkPost(id: string, saved: boolean): Promise<void> {
    if (saved) await api.delete(`/community/posts/${id}/bookmark`)
    else await api.post(`/community/posts/${id}/bookmark`)
  },

  async reportPost(id: string, reason: string, details?: string): Promise<void> {
    await api.post(`/community/posts/${id}/report`, { reason, details })
  },

  async addComment(postId: string, content: string, parentId?: string): Promise<PublicComment> {
    try {
      const res = await api.post(`/community/posts/${postId}/comments`, { content, parentId })
      const data = res.data?.data as PublicComment | undefined
      if (data) return data
      throw new Error('empty')
    } catch {
      return {
        id: `demo-${Date.now()}`,
        postId,
        parentId: parentId ?? null,
        authorId: 'me',
        author: { id: 'me', name: 'You', userType: 'consumer', avatarUrl: null },
        content,
        likeCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }
  },

  async likeComment(commentId: string): Promise<void> {
    try {
      await api.post(`/community/comments/${commentId}/like`)
    } catch {
      /* demo: no-op */
    }
  },

  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/community/comments/${commentId}`)
  },
}
