import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Activity } from 'lucide-react'
import { communityApi } from '@/services/community.service'
import { useAuthStore } from '@/stores/auth.store'
import { PostList } from '@/components/community/PostList'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export function ActivityPage() {
  const { user, authStatus } = useAuthStore()

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['community', 'author', user?.id],
    queryFn: () => (user ? communityApi.getPostsByAuthor(user.id) : Promise.resolve([])),
    enabled: authStatus === 'authenticated' && !!user,
  })

  return (
    <div className='container-page max-w-2xl space-y-4 py-3 sm:py-4'>
      <header className='space-y-1'>
        <h1 className='flex items-center gap-2 text-xl font-bold text-gray-900'>
          <Activity className='h-5 w-5 text-primary-600' /> Your activity
        </h1>
        <p className='text-sm text-gray-600'>Everything you have posted in your Community.</p>
      </header>

      {authStatus !== 'authenticated' || !user ? (
        <EmptyState
          icon={<Activity className='h-10 w-10' />}
          title='Sign in to see your activity'
          description='Your posts and exchanges will appear here.'
          action={
            <Link to='/auth/login' className='btn-primary'>
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
          icon={<Activity className='h-10 w-10' />}
          title='No posts yet'
          description='Share something with your Community from the home feed.'
          action={
            <Link to='/community' className='btn-primary'>
              Go to feed
            </Link>
          }
        />
      ) : (
        <PostList posts={posts} />
      )}
    </div>
  )
}
