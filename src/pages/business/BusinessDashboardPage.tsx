import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Flag, Heart, Megaphone, MessageCircle, Package, Plus, Repeat, Share2, Users } from 'lucide-react'
import { businessApi } from '@/services/business.service'
import { AnnouncementStrip } from '@/components/community/AnnouncementStrip'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { formatDate } from './helpers'

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className='card'>
      <div className='card-content flex items-center gap-3'>
        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600'>{icon}</div>
        <div className='min-w-0'>
          <p className='text-2xl font-bold text-gray-900'>{value}</p>
          <p className='truncate text-sm text-gray-600'>{label}</p>
        </div>
      </div>
    </div>
  )
}

export function BusinessDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['business', 'dashboard'],
    queryFn: businessApi.getDashboard,
  })

  if (isLoading || !data) {
    return (
      <div className='space-y-4'>
        <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className='h-20 w-full' />
          ))}
        </div>
        <Skeleton className='h-40 w-full' />
      </div>
    )
  }

  const { business, posts, offers, campaigns } = data
  const recentPosts = [...posts]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
  const pendingPosts = posts.filter((p) => p.status === 'pending')
  const rejectedPosts = posts.filter((p) => p.status === 'rejected')
  const attention = [...rejectedPosts, ...pendingPosts].slice(0, 3)

  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <StatCard label='Followers' value={business.followerCount ?? 0} icon={<Users className='h-5 w-5' />} />
        <StatCard label='Posts' value={posts.length} icon={<Megaphone className='h-5 w-5' />} />
        <StatCard label='Offers' value={offers.length} icon={<Package className='h-5 w-5' />} />
        <StatCard label='Campaigns' value={campaigns.length} icon={<Flag className='h-5 w-5' />} />
      </div>

      {/* Quick actions (spec §3.1): create, explore exchange, share a campaign */}
      <div className='grid gap-3 sm:grid-cols-3'>
        <Link to='/business/posts' className='card transition hover:shadow-md'>
          <div className='card-content flex items-center gap-3'>
            <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600'>
              <Plus className='h-5 w-5' />
            </span>
            <span>
              <span className='block text-sm font-semibold text-gray-900'>Create a post</span>
              <span className='block text-xs text-gray-500'>Updates, offers and announcements</span>
            </span>
          </div>
        </Link>
        <Link to='/community/discover/exchanges' className='card transition hover:shadow-md'>
          <div className='card-content flex items-center gap-3'>
            <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600'>
              <Repeat className='h-5 w-5' />
            </span>
            <span>
              <span className='block text-sm font-semibold text-gray-900'>Explore #Exchange</span>
              <span className='block text-xs text-gray-500'>Find opportunities near you</span>
            </span>
          </div>
        </Link>
        <Link to='/business/campaigns' className='card transition hover:shadow-md'>
          <div className='card-content flex items-center gap-3'>
            <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600'>
              <Share2 className='h-5 w-5' />
            </span>
            <span>
              <span className='block text-sm font-semibold text-gray-900'>Share a campaign</span>
              <span className='block text-xs text-gray-500'>Trackable links and QR codes</span>
            </span>
          </div>
        </Link>
      </div>

      {/* Needs attention: rejected or pending posts (real data, no invented counts) */}
      {attention.length > 0 && (
        <div className='card border-amber-200 bg-amber-50/60'>
          <div className='card-content space-y-2'>
            <h2 className='flex items-center gap-1.5 text-sm font-semibold text-amber-900'>
              <AlertCircle className='h-4 w-4' /> Needs your attention
            </h2>
            <ul className='space-y-1.5'>
              {attention.map((post) => (
                <li key={post.id} className='flex items-center justify-between gap-2 text-sm'>
                  <span className='min-w-0 truncate text-amber-900'>
                    {post.status === 'rejected' ? 'Rejected' : 'Awaiting review'}: {post.title ?? post.content}
                  </span>
                  <Link to='/business/posts' className='shrink-0 text-xs font-medium text-primary-700 hover:underline'>
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Admin announcements (spec §3.1) — shared strip over the announcement store (§4, §15) */}
      <AnnouncementStrip heading='Community announcements' />

      <div className='card'>
        <div className='card-content flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-base font-semibold text-gray-900'>Quick actions</h2>
            <p className='text-sm text-gray-600'>Share an update, run an offer or start a campaign.</p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Link to='/business/posts'>
              <Button size='sm' icon={<Plus className='h-4 w-4' />}>
                New post
              </Button>
            </Link>
            <Link to='/business/offers'>
              <Button size='sm' variant='secondary'>
                New offer
              </Button>
            </Link>
            <Link to='/business/campaigns'>
              <Button size='sm' variant='secondary'>
                New campaign
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className='card'>
        <div className='card-header flex items-center justify-between'>
          <h2 className='text-base font-semibold text-gray-900'>Recent posts</h2>
          {posts.length > 3 && (
            <Link to='/business/posts' className='text-sm font-medium text-primary-600 hover:underline'>
              View all
            </Link>
          )}
        </div>
        {recentPosts.length === 0 ? (
          <EmptyState
            icon={<Megaphone className='h-10 w-10' />}
            title='No posts yet'
            description='Share news, updates and offers with your community.'
            action={
              <Link to='/business/posts'>
                <Button size='sm'>Create your first post</Button>
              </Link>
            }
          />
        ) : (
          <ul className='divide-y divide-gray-100'>
            {recentPosts.map((post) => (
              <li key={post.id} className='px-4 py-3'>
                <p className='line-clamp-2 text-sm text-gray-800'>{post.content}</p>
                <div className='mt-2 flex items-center gap-4 text-xs text-gray-500'>
                  <span>{formatDate(post.createdAt)}</span>
                  <span className='flex items-center gap-1'>
                    <Heart className='h-3.5 w-3.5' /> {post.likeCount ?? 0}
                  </span>
                  <span className='flex items-center gap-1'>
                    <MessageCircle className='h-3.5 w-3.5' /> {post.commentCount ?? 0}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
