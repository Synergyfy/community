import { useQuery } from '@tanstack/react-query'
import { MessageCircleOff } from 'lucide-react'
import { communityApi } from '@/services/community.service'
import type { PublicPost } from '@/types/community-public'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { PostCard } from './PostCard'
import { FeedSkeleton } from './PostSkeleton'
import { CommunityGroups } from './CommunityGroups'
import type { FeedFilter } from './FeedTabs'

interface FeedProps {
  filter: FeedFilter
  location?: string
  likedIds: string[]
  savedIds: string[]
  hiddenIds?: string[]
  onLike: (post: PublicPost) => void
  onComment: (post: PublicPost) => void
  onShare: (post: PublicPost) => void
  onSave: (post: PublicPost) => void
  onMore: (post: PublicPost) => void
}

export function Feed({ filter, location, likedIds, savedIds, hiddenIds = [], onLike, onComment, onShare, onSave, onMore }: FeedProps) {
  const isGroupsTab = filter === 'groups'

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['community', 'feed', filter, location],
    queryFn: () => communityApi.getFeed({ filter, location }),
    enabled: !isGroupsTab,
  })

  if (isGroupsTab) return <CommunityGroups location={location} />

  if (isLoading) return <FeedSkeleton />

  if (isError) {
    return (
      <EmptyState
        icon={<MessageCircleOff className='h-10 w-10' />}
        title="We couldn't load the Community right now."
        description='Please try again in a moment.'
        action={<Button onClick={() => refetch()}>Try again</Button>}
      />
    )
  }

  const posts = (data ?? []).filter((p) => !hiddenIds.includes(p.id))

  if (posts.length === 0) {
    const copy =
      filter === 'businesses'
        ? { title: 'No business posts yet', description: 'Local business posts and offers will appear here.' }
        : filter === 'consumers'
          ? { title: 'No posts from neighbours yet', description: 'Be the first to share something with your Community.' }
          : { title: 'Nothing here yet.', description: 'Be the first to share something with your Community.' }
    return <EmptyState icon={<MessageCircleOff className='h-10 w-10' />} title={copy.title} description={copy.description} />
  }

  return (
    <div className='space-y-4'>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          liked={likedIds.includes(post.id)}
          saved={savedIds.includes(post.id)}
          onLike={onLike}
          onComment={onComment}
          onShare={onShare}
          onSave={onSave}
          onMore={onMore}
        />
      ))}
    </div>
  )
}
