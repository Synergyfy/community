import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, EyeOff, MessageSquare } from 'lucide-react'
import { communityApi } from '@/services/community.service'
import { usePostActions } from '@/hooks/usePostActions'
import { useEngagementStore } from '@/stores/engagement.store'
import { PostCard } from '@/components/community/PostCard'
import { CommentList } from '@/components/community/CommentList'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const actions = usePostActions()
  const unhidePost = useEngagementStore((s) => s.unhidePost)

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

  const hidden = actions.hiddenIds.includes(post.id)

  return (
    <div className='container-page max-w-2xl py-3 sm:py-4'>
      <button onClick={() => navigate(-1)} className='mb-3 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900'>
        <ArrowLeft className='h-4 w-4' /> Back
      </button>

      {hidden ? (
        <EmptyState
          icon={<EyeOff className='h-10 w-10' />}
          title='You hid this post'
          description='This post is hidden from your feeds. Show it again to keep reading and commenting.'
          action={<Button onClick={() => unhidePost(post.id)}>Show this post</Button>}
        />
      ) : (
        <>
          <PostCard
            post={post}
            liked={actions.isLiked(post.id)}
            saved={actions.isSaved(post.id)}
            onLike={actions.onLike}
            onComment={() => undefined}
            onShare={actions.onShare}
            onSave={actions.onSave}
            onMore={actions.onMore}
          />

          <CommentList postId={post.id} className='mt-6' />
        </>
      )}

      {actions.modals}
    </div>
  )
}
