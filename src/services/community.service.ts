import { api } from '@/lib/api'
import type { ContentVisibility, PostType } from '@/lib/constants'
import { canViewPost, viewerFromUser } from '@/lib/permissions'
import type {
  LocationContext,
  PublicComment,
  PublicCommunity,
  PublicPost,
  PublicUser,
} from '@/types/community-public'
import { demoComments, demoCommunities, demoPosts } from '@/data/demo-public'
import { useAuthStore } from '@/stores/auth.store'
import { reportsService } from '@/services/reports.service'

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
  /** Audience the author chose in the composer (spec §2.4/§3.2 parity). */
  visibility?: ContentVisibility
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

/** Signed-in viewer (or public visitor) used for demo-mode permission checks. */
function currentViewer() {
  return viewerFromUser(useAuthStore.getState().user)
}

function viewablePosts(posts: PublicPost[]): PublicPost[] {
  const viewer = currentViewer()
  return posts.filter((p) => canViewPost(viewer, p))
}

/**
 * Every post known to the demo store — same object references as the source
 * arrays, so admin mutations made on these objects are reflected everywhere.
 */
export function getAllDemoPosts(): PublicPost[] {
  return [...createdPosts, ...demoPosts]
}

/** Hard-delete a demo post from every source array (admin removal, §5.2). */
export function deleteDemoPostEverywhere(id: string): void {
  const ci = createdPosts.findIndex((p) => p.id === id)
  if (ci >= 0) createdPosts.splice(ci, 1)
  const di = demoPosts.findIndex((p) => p.id === id)
  if (di >= 0) demoPosts.splice(di, 1)
}

/**
 * Every comment known to the demo store — same object references as the
 * source array, so admin moderation of comments is reflected on public
 * surfaces too (§3.4).
 */
export function getAllDemoComments(): PublicComment[] {
  return [...demoComments]
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
      return sortNewest(
        viewablePosts(all).filter((p) => inLocation(p, query.location) && matchesFilter(p, query.filter)),
      )
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
        visibility: input.visibility,
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
        visibility: input.visibility ?? 'public',
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
      const post = (res.data?.data as PublicPost) || null
      return post && canViewPost(currentViewer(), post) ? post : null
    } catch {
      const post = createdPosts.find((p) => p.id === id) || demoPosts.find((p) => p.id === id) || null
      return post && canViewPost(currentViewer(), post) ? post : null
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
      const all = [...createdPosts, ...demoPosts].filter((p) => p.authorId === authorId)
      // Authors manage their own posts in every state (draft/pending/rejected);
      // everyone else only sees what is published and permitted for them.
      const viewer = currentViewer()
      const own = viewer?.id === authorId
      return sortNewest(own ? all : viewablePosts(all))
    }
  },

  async getComments(postId: string): Promise<PublicComment[]> {
    try {
      const res = await api.get(`/community/posts/${postId}/comments`)
      return (res.data?.data as PublicComment[]) || []
    } catch {
      // Comments removed by moderation are not shown publicly (§3.4); admins
      // read the full list through adminApi.listComments().
      return demoComments.filter((c) => c.postId === postId && (c.status ?? 'visible') === 'visible')
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
    const post = [...createdPosts, ...demoPosts].find((p) => p.id === id)
    await reportsService.submitReport({
      targetType: 'post',
      targetId: id,
      targetLabel: post?.title ?? post?.content.slice(0, 80) ?? null,
      reasonCode: reason,
      details: details ?? null,
    })
  },

  async addComment(postId: string, content: string, parentId?: string): Promise<PublicComment> {
    try {
      const res = await api.post(`/community/posts/${postId}/comments`, { content, parentId })
      const data = res.data?.data as PublicComment | undefined
      if (data) return data
      throw new Error('empty')
    } catch {
      // The demo fallback authors the comment as the signed-in account, so the
      // author sees (and can delete) their own comments exactly like the backend would.
      const authUser = useAuthStore.getState().user
      const author: PublicUser = authUser
        ? {
            id: authUser.id,
            name: authUser.name,
            userType: authUser.userType,
            avatarUrl: authUser.avatarUrl ?? null,
            businessId: authUser.businessId ?? null,
            businessName: authUser.businessName ?? null,
            isVerified: authUser.isVerified,
          }
        : { id: 'guest', name: 'Guest', userType: 'public', avatarUrl: null }
      return {
        id: `demo-${Date.now()}`,
        postId,
        parentId: parentId ?? null,
        authorId: author.id,
        author,
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
