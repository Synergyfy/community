import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, EyeOff, MapPin, Users } from 'lucide-react'
import type { PublicPost } from '@/types/community-public'
import type { ShareTargetType } from '@/lib/constants'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useCommunityLocation } from '@/hooks/useCommunityLocation'
import { useEngagementStore } from '@/stores/engagement.store'
import { PostComposer } from '@/components/community/PostComposer'
import { FeedTabs, type FeedFilter } from '@/components/community/FeedTabs'
import { Feed } from '@/components/community/Feed'
import { ReportModal } from '@/components/community/ReportModal'
import { ShareModal } from '@/components/sharing/ShareModal'
import { Modal } from '@/components/ui/Modal'

function targetForPost(post: PublicPost): { type: ShareTargetType; id?: string; title?: string } {
  if (post.campaignId) return { type: 'campaign', id: post.campaignId, title: post.title || undefined }
  if (post.offerId) return { type: 'offer', id: post.offerId, title: post.title || undefined }
  if (post.rewardId) return { type: 'reward', id: post.rewardId, title: post.title || undefined }
  if (post.exchangeId) return { type: 'exchange', id: post.exchangeId, title: post.title || undefined }
  return { type: 'post', id: post.id, title: post.title || undefined }
}

export function CommunityHomePage() {
  const navigate = useNavigate()
  const { requireAuth } = useAuthGate()
  const location = useCommunityLocation()

  const [filter, setFilter] = useState<FeedFilter>('all')
  const likedIds = useEngagementStore((s) => s.likedPostIds)
  const savedIds = useEngagementStore((s) => s.savedPostIds)
  const hiddenIds = useEngagementStore((s) => s.hiddenPostIds)
  const toggleLikePost = useEngagementStore((s) => s.toggleLikePost)
  const toggleSavePost = useEngagementStore((s) => s.toggleSavePost)
  const hidePost = useEngagementStore((s) => s.hidePost)
  const reportPost = useEngagementStore((s) => s.reportPost)

  const [share, setShare] = useState<{ type: ShareTargetType; id?: string; title?: string } | null>(null)
  const [morePost, setMorePost] = useState<PublicPost | null>(null)
  const [reportPostTarget, setReportPostTarget] = useState<PublicPost | null>(null)

  const communityName = location?.cityName ? `${location.cityName} Community` : 'Your Community'

  const toggleLike = (post: PublicPost) => requireAuth(() => toggleLikePost(post.id))

  const toggleSave = (post: PublicPost) => requireAuth(() => toggleSavePost(post.id))

  const hide = (post: PublicPost) => {
    hidePost(post.id)
    setMorePost(null)
  }

  const onComment = (post: PublicPost) => navigate(`/community/post/${post.id}`)
  const onShare = (post: PublicPost) => {
    const t = targetForPost(post)
    requireAuth(() => setShare(t))
  }

  return (
    <div className='container-page max-w-2xl space-y-4 py-3 sm:py-4'>
      <button
        onClick={() => navigate('/community/discover')}
        className='card flex w-full items-center justify-between gap-2 p-3 text-left transition hover:shadow-md'
      >
        <div className='flex min-w-0 items-center gap-2'>
          <span className='flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600'>
            <Users className='h-4 w-4' />
          </span>
          <div className='min-w-0'>
            <p className='truncate text-sm font-semibold text-gray-900'>{communityName}</p>
            <p className='flex items-center gap-1 text-xs text-gray-500'>
              <MapPin className='h-3 w-3' /> {location?.cityName || 'Set your location'}
            </p>
          </div>
        </div>
        <span className='flex items-center gap-1 text-xs font-medium text-primary-600'>
          Switch <ChevronDown className='h-4 w-4' />
        </span>
      </button>

      <PostComposer />

      <FeedTabs active={filter} onChange={setFilter} />

      <Feed
        filter={filter}
        location={location?.cityName}
        likedIds={likedIds}
        savedIds={savedIds}
        hiddenIds={hiddenIds}
        onLike={toggleLike}
        onComment={onComment}
        onShare={onShare}
        onSave={toggleSave}
        onMore={setMorePost}
      />

      <ShareModal
        isOpen={!!share}
        onClose={() => setShare(null)}
        targetType={share?.type || 'post'}
        targetId={share?.id}
        title={share?.title}
      />

      <ReportModal
        isOpen={!!reportPostTarget}
        onClose={() => setReportPostTarget(null)}
        postId={reportPostTarget?.id || ''}
        onSubmitted={(id) => reportPost(id)}
      />

      <Modal isOpen={!!morePost} onClose={() => setMorePost(null)} title='More options'>
        <div className='space-y-1'>
          <button
            className='flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-50'
            onClick={() => morePost && hide(morePost)}
          >
            <EyeOff className='h-4 w-4 text-gray-500' /> Hide this post
          </button>
          <button
            className='w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50'
            onClick={() => {
              const p = morePost
              setMorePost(null)
              requireAuth(() => setReportPostTarget(p))
            }}
          >
            Report post
          </button>
        </div>
      </Modal>
    </div>
  )
}
