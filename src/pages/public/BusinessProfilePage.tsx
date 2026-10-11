import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BadgeCheck, MapPin, Share2, Store, Users } from 'lucide-react'
import { entitiesApi } from '@/services/entities.service'
import { useAuthGate } from '@/hooks/useAuthGate'
import type { PublicPost } from '@/types/community-public'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { PostCard } from '@/components/community/PostCard'
import { OfferCard } from '@/components/entities/OfferCard'
import { CampaignCard } from '@/components/discover/CampaignCard'
import { FollowButton } from '@/components/entities/FollowButton'
import { ShareModal } from '@/components/sharing/ShareModal'
import { locationLabel } from '@/lib/format'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'posts', label: 'Posts' },
  { id: 'offers', label: 'Offers' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'about', label: 'About' },
] as const

type Tab = (typeof TABS)[number]['id']

export function BusinessProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { requireAuth } = useAuthGate()
  const [tab, setTab] = useState<Tab>('posts')
  const [likedIds, setLikedIds] = useState<string[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [shareOpen, setShareOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['entity', 'business', id],
    queryFn: () => entitiesApi.getBusiness(id as string),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className='container-page max-w-2xl py-4'>
        <Skeleton className='h-32 w-full rounded-xl' />
        <div className='mt-4 space-y-3'>
          <Skeleton className='h-20 w-full rounded-lg' />
          <Skeleton className='h-20 w-full rounded-lg' />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className='container-page max-w-2xl py-10'>
        <EmptyState
          icon={<Store className='h-10 w-10' />}
          title='Business not available'
          description='This business page may have been removed.'
          action={<Button onClick={() => navigate('/community/discover')}>Discover businesses</Button>}
        />
      </div>
    )
  }

  const { business, posts, offers, campaigns } = data

  const onPostComment = (post: PublicPost) => navigate(`/community/post/${post.id}`)

  return (
    <div className='container-page max-w-2xl py-3 sm:py-4'>
      <button onClick={() => navigate(-1)} className='mb-3 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900'>
        <ArrowLeft className='h-4 w-4' /> Back
      </button>

      <div className='card overflow-hidden'>
        <div className='h-24 bg-gradient-to-r from-primary-500 to-primary-700' />
        <div className='px-4 pb-4'>
          <div className='-mt-8 flex items-end justify-between'>
            <Avatar src={business.logoUrl} name={business.name} size='lg' className='h-16 w-16 rounded-xl ring-4 ring-white' />
            <div className='flex gap-2 pb-1'>
              <Button variant='secondary' size='sm' icon={<Share2 className='h-4 w-4' />} onClick={() => requireAuth(() => setShareOpen(true))}>
                Share
              </Button>
              <FollowButton targetType='business' targetId={business.id} size='sm' />
            </div>
          </div>
          <div className='mt-3'>
            <div className='flex items-center gap-1.5'>
              <h1 className='text-lg font-bold text-gray-900'>{business.name}</h1>
              <BadgeCheck className='h-5 w-5 text-primary-600' />
            </div>
            {business.category && <p className='text-sm text-gray-500'>{business.category}</p>}
            <div className='mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500'>
              {locationLabel(business.location) && (
                <span className='flex items-center gap-0.5'>
                  <MapPin className='h-3.5 w-3.5' /> {locationLabel(business.location)}
                </span>
              )}
              {business.followerCount != null && (
                <span className='flex items-center gap-0.5'>
                  <Users className='h-3.5 w-3.5' /> {business.followerCount} followers
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className='mt-4 flex gap-1 overflow-x-auto border-b border-gray-200 scrollbar-hide'>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-800',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className='mt-4 space-y-4'>
        {tab === 'posts' &&
          (posts.length === 0 ? (
            <EmptyState title='No posts yet' description='This business has not posted anything yet.' />
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                liked={likedIds.includes(post.id)}
                saved={savedIds.includes(post.id)}
                onLike={(p) => requireAuth(() => setLikedIds((ids) => (ids.includes(p.id) ? ids.filter((i) => i !== p.id) : [...ids, p.id])))}
                onSave={(p) => requireAuth(() => setSavedIds((ids) => (ids.includes(p.id) ? ids.filter((i) => i !== p.id) : [...ids, p.id])))}
                onComment={onPostComment}
                onShare={() => requireAuth(() => setShareOpen(true))}
                onMore={() => undefined}
              />
            ))
          ))}

        {tab === 'offers' &&
          (offers.length === 0 ? (
            <EmptyState title='No offers right now' description='Check back soon for local offers.' />
          ) : (
            offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)
          ))}

        {tab === 'campaigns' &&
          (campaigns.length === 0 ? (
            <EmptyState title='No campaigns' description='This business is not running any campaigns.' />
          ) : (
            <div className='space-y-3'>
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          ))}

        {tab === 'about' && (
          <div className='card p-4'>
            <h2 className='text-sm font-semibold text-gray-900'>About {business.name}</h2>
            <p className='mt-2 text-sm text-gray-700'>
              {business.description || 'No description provided yet.'}
            </p>
          </div>
        )}
      </div>

      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} targetType='business' targetId={business.id} title={business.name} />
    </div>
  )
}
