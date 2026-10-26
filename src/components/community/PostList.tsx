import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EyeOff } from 'lucide-react'
import type { PublicPost } from '@/types/community-public'
import type { ShareTargetType } from '@/lib/constants'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useEngagementStore } from '@/stores/engagement.store'
import { PostCard } from './PostCard'
import { ShareModal } from '@/components/sharing/ShareModal'
import { ReportModal } from '@/components/community/ReportModal'
import { Modal } from '@/components/ui/Modal'

function targetForPost(post: PublicPost): { type: ShareTargetType; id?: string; title?: string } {
  if (post.campaignId) return { type: 'campaign', id: post.campaignId, title: post.title || undefined }
  if (post.offerId) return { type: 'offer', id: post.offerId, title: post.title || undefined }
  if (post.rewardId) return { type: 'reward', id: post.rewardId, title: post.title || undefined }
  if (post.exchangeId) return { type: 'exchange', id: post.exchangeId, title: post.title || undefined }
  return { type: 'post', id: post.id, title: post.title || undefined }
}

export function PostList({ posts }: { posts: PublicPost[] }) {
  const navigate = useNavigate()
  const { requireAuth } = useAuthGate()
  const likedPostIds = useEngagementStore((s) => s.likedPostIds)
  const savedPostIds = useEngagementStore((s) => s.savedPostIds)
  const hiddenPostIds = useEngagementStore((s) => s.hiddenPostIds)
  const toggleLikePost = useEngagementStore((s) => s.toggleLikePost)
  const toggleSavePost = useEngagementStore((s) => s.toggleSavePost)
  const hidePost = useEngagementStore((s) => s.hidePost)
  const reportPost = useEngagementStore((s) => s.reportPost)

  const [share, setShare] = useState<{ type: ShareTargetType; id?: string; title?: string } | null>(null)
  const [morePost, setMorePost] = useState<PublicPost | null>(null)
  const [reportPostTarget, setReportPostTarget] = useState<PublicPost | null>(null)

  const visible = posts.filter((p) => !hiddenPostIds.includes(p.id))

  return (
    <>
      <div className='space-y-3'>
        {visible.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            liked={likedPostIds.includes(post.id)}
            saved={savedPostIds.includes(post.id)}
            onLike={() => requireAuth(() => toggleLikePost(post.id))}
            onComment={() => navigate(`/community/post/${post.id}`)}
            onShare={() => requireAuth(() => setShare(targetForPost(post)))}
            onSave={() => requireAuth(() => toggleSavePost(post.id))}
            onMore={setMorePost}
          />
        ))}
      </div>

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
        targetLabel={reportPostTarget ? (reportPostTarget.title ?? reportPostTarget.content.slice(0, 60)) : null}
        onSubmitted={reportPost}
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
              requireAuth(() => setReportPostTarget(p))
            }}
          >
            Report post
          </button>
        </div>
      </Modal>
    </>
  )
}
