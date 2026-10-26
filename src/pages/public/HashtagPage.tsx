import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Hash } from 'lucide-react'
import { discoverApi } from '@/services/discover.service'
import { usePostActions } from '@/hooks/usePostActions'
import type { PublicPost } from '@/types/community-public'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PostSkeleton } from '@/components/community/PostSkeleton'
import { PostCard } from '@/components/community/PostCard'

export function HashtagPage() {
  const { tag } = useParams<{ tag: string }>()
  const navigate = useNavigate()
  const actions = usePostActions()

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['hashtag', tag],
    queryFn: () => discoverApi.getHashtagPosts(tag as string),
    enabled: !!tag,
  })

  // Admin flags (§3.3) — same record the Configuration surface edits (§15).
  const hashtag = tag ? discoverApi.getHashtag(tag) : undefined

  const onComment = (post: PublicPost) => navigate(`/community/post/${post.id}`)
  const visible = actions.visiblePosts(posts)

  return (
    <div className='container-page max-w-2xl py-3 sm:py-4'>
      <button onClick={() => navigate(-1)} className='mb-3 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900'>
        <ArrowLeft className='h-4 w-4' /> Back
      </button>

      <div className='flex flex-wrap items-center gap-2'>
        <Hash className='h-5 w-5 text-primary-600' />
        <h1 className='text-lg font-bold text-gray-900'>{tag}</h1>
        {hashtag?.featured && <span className='badge-primary'>Featured topic</span>}
        {hashtag?.restricted && <span className='badge-warning'>Restricted topic</span>}
      </div>
      {hashtag?.restricted && (
        <p className='mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800'>
          Community admins flagged this topic as restricted — posts here are subject to moderation review.
        </p>
      )}
      <div className='mt-4'>

      {isLoading ? (
        <PostSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState icon={<Hash className='h-10 w-10' />} title={`No posts with #${tag}`} description='Try exploring other hashtags in Discover.' action={<Button onClick={() => navigate('/community/discover')}>Go to Discover</Button>} />
      ) : (
        <div className='space-y-4'>
          {visible.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              liked={actions.isLiked(post.id)}
              saved={actions.isSaved(post.id)}
              onLike={actions.onLike}
              onSave={actions.onSave}
              onComment={onComment}
              onShare={actions.onShare}
              onMore={actions.onMore}
            />
          ))}
        </div>
      )}
      </div>

      {actions.modals}
    </div>
  )
}
