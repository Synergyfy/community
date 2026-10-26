import { useState, type ReactNode } from 'react'
import { EyeOff } from 'lucide-react'
import { communityApi } from '@/services/community.service'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useEngagementStore } from '@/stores/engagement.store'
import type { ShareTargetType } from '@/lib/constants'
import type { PublicPost } from '@/types/community-public'
import { Modal } from '@/components/ui/Modal'
import { ReportModal } from '@/components/community/ReportModal'
import { ShareModal } from '@/components/sharing/ShareModal'

export interface ShareTarget {
  type: ShareTargetType
  id?: string
  title?: string
}

/**
 * A post shares its linked record when it has one (campaign/offer/reward/
 * exchange) and itself otherwise — one target, one share record (spec §4.4).
 */
export function targetForPost(post: PublicPost): ShareTarget {
  if (post.campaignId) return { type: 'campaign', id: post.campaignId, title: post.title || undefined }
  if (post.offerId) return { type: 'offer', id: post.offerId, title: post.title || undefined }
  if (post.rewardId) return { type: 'reward', id: post.rewardId, title: post.title || undefined }
  if (post.exchangeId) return { type: 'exchange', id: post.exchangeId, title: post.title || undefined }
  return { type: 'post', id: post.id, title: post.title || undefined }
}

export interface PostActions {
  likedIds: string[]
  savedIds: string[]
  hiddenIds: string[]
  isLiked: (postId: string) => boolean
  isSaved: (postId: string) => boolean
  /** Drops posts this account hid — the same record the home feed uses. */
  visiblePosts: (posts: PublicPost[]) => PublicPost[]
  onLike: (post: PublicPost) => void
  onSave: (post: PublicPost) => void
  onShare: (post: PublicPost) => void
  onMore: (post: PublicPost) => void
  /** Share / report / more menus for posts — render once at the end of the page. */
  modals: ReactNode
}

/**
 * The single wiring for react / save / share / more on any PostCard surface
 * (spec §1 workflow D: act → record → see it in your own activity/saved).
 *
 * Every surface gets the same behaviour: likes and saves write to the
 * engagement store AND fire the backend call (fire-and-forget in demo mode),
 * share opens the modal for the post's linked target, and More offers hide /
 * report. Auth-required actions go through the sign-in handoff with return-to-
 * action (state.from).
 */
export function usePostActions(): PostActions {
  const { requireAuth } = useAuthGate()
  const likedIds = useEngagementStore((s) => s.likedPostIds)
  const savedIds = useEngagementStore((s) => s.savedPostIds)
  const hiddenIds = useEngagementStore((s) => s.hiddenPostIds)
  const toggleLikePost = useEngagementStore((s) => s.toggleLikePost)
  const toggleSavePost = useEngagementStore((s) => s.toggleSavePost)
  const hidePost = useEngagementStore((s) => s.hidePost)
  const reportPost = useEngagementStore((s) => s.reportPost)

  const [share, setShare] = useState<ShareTarget | null>(null)
  const [morePost, setMorePost] = useState<PublicPost | null>(null)
  const [reportTarget, setReportTarget] = useState<PublicPost | null>(null)

  const onLike = (post: PublicPost) =>
    requireAuth(() => {
      const wasLiked = likedIds.includes(post.id)
      toggleLikePost(post.id)
      // Backend call mirrors the store; demo mode has no API so failures are ignored.
      void communityApi.likePost(post.id, wasLiked).catch(() => undefined)
    })

  const onSave = (post: PublicPost) =>
    requireAuth(() => {
      const wasSaved = savedIds.includes(post.id)
      toggleSavePost(post.id)
      void communityApi.bookmarkPost(post.id, wasSaved).catch(() => undefined)
    })

  const onShare = (post: PublicPost) => requireAuth(() => setShare(targetForPost(post)))

  // Hide is a local preference and works signed out; reporting creates a
  // record, so it goes through the sign-in handoff.
  const onMore = (post: PublicPost) => setMorePost(post)

  const modals = (
    <>
      <ShareModal
        isOpen={!!share}
        onClose={() => setShare(null)}
        targetType={share?.type || 'post'}
        targetId={share?.id}
        title={share?.title}
      />

      <ReportModal
        isOpen={!!reportTarget}
        onClose={() => setReportTarget(null)}
        postId={reportTarget?.id || ''}
        targetLabel={reportTarget ? (reportTarget.title ?? reportTarget.content.slice(0, 60)) : null}
        onSubmitted={(id) => reportPost(id)}
      />

      <Modal isOpen={!!morePost} onClose={() => setMorePost(null)} title='More options'>
        <div className='space-y-1'>
          <button
            className='flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-50'
            onClick={() => {
              if (morePost) hidePost(morePost.id)
              setMorePost(null)
            }}
          >
            <EyeOff className='h-4 w-4 text-gray-500' /> Hide this post
          </button>
          <button
            className='w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50'
            onClick={() => {
              const p = morePost
              setMorePost(null)
              requireAuth(() => setReportTarget(p))
            }}
          >
            Report post
          </button>
        </div>
      </Modal>
    </>
  )

  return {
    likedIds,
    savedIds,
    hiddenIds,
    isLiked: (postId) => likedIds.includes(postId),
    isSaved: (postId) => savedIds.includes(postId),
    visiblePosts: (posts) => posts.filter((p) => !hiddenIds.includes(p.id)),
    onLike,
    onSave,
    onShare,
    onMore,
    modals,
  }
}
