import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Hash } from 'lucide-react'
import { discoverApi } from '@/services/discover.service'
import { useAuthGate } from '@/hooks/useAuthGate'
import type { PublicPost } from '@/types/community-public'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PostSkeleton } from '@/components/community/PostSkeleton'
import { PostCard } from '@/components/community/PostCard'
import { ShareModal } from '@/components/sharing/ShareModal'

export function HashtagPage() {
  const { tag } = useParams<{ tag: string }>()
  const navigate = useNavigate()
  const { requireAuth } = useAuthGate()
  const [shareId, setShareId] = useState<string | null>(null)

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['hashtag', tag],
    queryFn: () => discoverApi.getHashtagPosts(tag as string),
    enabled: !!tag,
  })

  const onComment = (post: PublicPost) => navigate(`/community/post/${post.id}`)

  return (
    <div className='container-page max-w-2xl py-3 sm:py-4'>
      <button onClick={() => navigate(-1)} className='mb-3 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900'>
        <ArrowLeft className='h-4 w-4' /> Back
      </button>

      <div className='mb-4 flex items-center gap-2'>
        <Hash className='h-5 w-5 text-primary-600' />
        <h1 className='text-lg font-bold text-gray-900'>{tag}</h1>
      </div>

      {isLoading ? (
        <PostSkeleton />
      ) : posts.length === 0 ? (
        <EmptyState icon={<Hash className='h-10 w-10' />} title={`No posts with #${tag}`} description='Try exploring other hashtags in Discover.' action={<Button onClick={() => navigate('/community/discover')}>Go to Discover</Button>} />
      ) : (
        <div className='space-y-4'>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={() => requireAuth(() => undefined)}
              onSave={() => requireAuth(() => undefined)}
              onComment={onComment}
              onShare={(p) => requireAuth(() => setShareId(p.id))}
              onMore={() => undefined}
            />
          ))}
        </div>
      )}

      <ShareModal isOpen={!!shareId} onClose={() => setShareId(null)} targetType='post' targetId={shareId || undefined} />
    </div>
  )
}
