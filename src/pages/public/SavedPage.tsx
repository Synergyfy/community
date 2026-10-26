import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bookmark } from 'lucide-react'
import { communityApi } from '@/services/community.service'
import { useEngagementStore } from '@/stores/engagement.store'
import { useAuthStore } from '@/stores/auth.store'
import { PostList } from '@/components/community/PostList'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export function SavedPage() {
  const savedIds = useEngagementStore((s) => s.savedPostIds)
  const { user, authStatus } = useAuthStore()
  const location = useLocation()

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['community', 'saved', savedIds],
    queryFn: () => communityApi.getPostsByIds(savedIds),
    enabled: authStatus === 'authenticated',
  })

  return (
    <div className='container-page max-w-2xl space-y-4 py-3 sm:py-4'>
      <header className='space-y-1'>
        <h1 className='flex items-center gap-2 text-xl font-bold text-gray-900'>
          <Bookmark className='h-5 w-5 text-primary-600' /> Saved
        </h1>
        <p className='text-sm text-gray-600'>Posts and updates you have bookmarked.</p>
      </header>

      {authStatus !== 'authenticated' || !user ? (
        <EmptyState
          icon={<Bookmark className='h-10 w-10' />}
          title='Sign in to see your saved posts'
          description='Bookmark posts to find them here later.'
          action={
            <Link to='/auth/login' state={{ from: location }} className='btn-primary'>
              Sign in
            </Link>
          }
        />
      ) : isLoading ? (
        <div className='space-y-3'>
          <Skeleton className='h-32 w-full rounded-lg' />
          <Skeleton className='h-32 w-full rounded-lg' />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<Bookmark className='h-10 w-10' />}
          title='Nothing saved yet'
          description='Tap the bookmark icon on a post to save it here.'
        />
      ) : (
        <PostList posts={posts} />
      )}
    </div>
  )
}
