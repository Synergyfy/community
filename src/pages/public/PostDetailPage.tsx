import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { communityApi } from '@/services/community.service'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useEngagementStore } from '@/stores/engagement.store'
import type { ShareTargetType } from '@/lib/constants'
import { PostCard } from '@/components/community/PostCard'
import { CommentList } from '@/components/community/CommentList'
import { ReportModal } from '@/components/community/ReportModal'
import { ShareModal } from '@/components/sharing/ShareModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import type { PublicPost } from '@/types/community-public'

function targetForPost(post: PublicPost): { type: ShareTargetType; id?: string; title?: string } {
  if (post.campaignId) return { type: 'campaign', id: post.campaignId, title: post.title || undefined }
  if (post.offerId) return { type: 'offer', id: post.offerId, title: post.title || undefined }
  if (post.rewardId) return { type: 'reward', id: post.rewardId, title: post.title || undefined }
  if (post.exchangeId) return { type: 'exchange', id: post.exchangeId, title: post.title || undefined }
  return { type: 'post', id: post.id, title: post.title || undefined }
}

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { requireAuth } = useAuthGate()
  const likedIds = useEngagementStore((s) => s.likedPostIds)
  const savedIds = useEngagementStore((s) => s.savedPostIds)
  const toggleLikePost = useEngagementStore((s) => s.toggleLikePost)
  const toggleSavePost = useEngagementStore((s) => s.toggleSavePost)
  const reportPost = useEngagementStore((s) => s.reportPost)

  const [reportOpen, setReportOpen] = useState(false)
  const [share, setShare] = useState<{ type: ShareTargetType; id?: string; title?: string } | null>(null)

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['community', 'post', id],
    queryFn: () => communityApi.getPost(id as string),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className='container-page max-w-2xl py-4'>
        <Skeleton className='h-40 w-full rounded-xl' />
        <Skeleton className='mt-4 h-24 w-full rounded-lg' />
      </div>
    )
  }

  if (isError || !post) {
    return (
      <div className='container-page max-w-2xl py-10'>
        <EmptyState
          icon={<MessageSquare className='h-10 w-10' />}
          title='Post not available'
          description='This post may have been completed, removed or is not public.'
        />
      </div>
    )
  }

  return (
    <div className='container-page max-w-2xl py-3 sm:py-4'>
      <button onClick={() => navigate(-1)} className='mb-3 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900'>
        <ArrowLeft className='h-4 w-4' /> Back
      </button>

      <PostCard
        post={post}
        liked={likedIds.includes(post.id)}
        saved={savedIds.includes(post.id)}
        onLike={() => requireAuth(() => toggleLikePost(post.id))}
        onComment={() => undefined}
        onShare={() => requireAuth(() => setShare(targetForPost(post)))}
        onSave={() => requireAuth(() => toggleSavePost(post.id))}
        onMore={() => requireAuth(() => setReportOpen(true))}
      />

      <CommentList postId={post.id} className='mt-6' />

      <ShareModal
        isOpen={!!share}
        onClose={() => setShare(null)}
        targetType={share?.type || 'post'}
        targetId={share?.id}
        title={share?.title}
      />

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        postId={post.id}
        onSubmitted={() => reportPost(post.id)}
      />
    </div>
  )
}
