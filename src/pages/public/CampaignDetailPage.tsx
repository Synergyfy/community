import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarClock, HeartHandshake, MapPin, Share2, Megaphone } from 'lucide-react'
import { entitiesApi } from '@/services/entities.service'
import { useAuthGate } from '@/hooks/useAuthGate'
import { usePostActions } from '@/hooks/usePostActions'
import type { PublicPost } from '@/types/community-public'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { PostCard } from '@/components/community/PostCard'
import { RewardCard } from '@/components/entities/RewardCard'
import { CampaignProgress } from '@/components/entities/CampaignProgress'
import { FollowButton } from '@/components/entities/FollowButton'
import { ComingSoonModal } from '@/components/entities/ComingSoonModal'
import { ShareModal } from '@/components/sharing/ShareModal'
import { locationLabel, timeUntil } from '@/lib/format'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'story', label: 'Story' },
  { id: 'updates', label: 'Updates' },
  { id: 'rewards', label: 'Rewards' },
] as const

type Tab = (typeof TABS)[number]['id']

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { requireAuth } = useAuthGate()
  const [tab, setTab] = useState<Tab>('story')
  const [shareOpen, setShareOpen] = useState(false)
  const [contributeOpen, setContributeOpen] = useState(false)
  const actions = usePostActions()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['entity', 'campaign', id],
    queryFn: () => entitiesApi.getCampaign(id as string),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className='container-page max-w-2xl py-4'>
        <Skeleton className='h-56 w-full rounded-xl' />
        <Skeleton className='mt-4 h-40 w-full rounded-lg' />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className='container-page max-w-2xl py-10'>
        <EmptyState
          icon={<Megaphone className='h-10 w-10' />}
          title='Campaign not available'
          description='This campaign may have ended or been removed.'
          action={<Button onClick={() => navigate('/community/discover')}>Discover campaigns</Button>}
        />
      </div>
    )
  }

  const { campaign, updates, rewards } = data
  const onPostComment = (post: PublicPost) => navigate(`/community/post/${post.id}`)

  return (
    <div className='container-page max-w-2xl py-3 sm:py-4'>
      <button onClick={() => navigate(-1)} className='mb-3 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900'>
        <ArrowLeft className='h-4 w-4' /> Back
      </button>

      <div className='card overflow-hidden'>
        {campaign.imageUrl && <img src={campaign.imageUrl} alt={campaign.title} className='h-56 w-full object-cover' />}
        <div className='p-4'>
          <div className='flex items-start justify-between gap-2'>
            <div className='min-w-0'>
              <span className='badge-primary'>Campaign</span>
              <h1 className='mt-2 text-xl font-bold text-gray-900'>{campaign.title}</h1>
            </div>
            <Button variant='secondary' size='sm' icon={<Share2 className='h-4 w-4' />} onClick={() => requireAuth(() => setShareOpen(true))}>
              Share
            </Button>
          </div>

          <div className='mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500'>
            {campaign.creator && (
              <span className='flex items-center gap-1.5'>
                <Avatar src={campaign.creator.avatarUrl} name={campaign.creator.name} size='sm' className='h-5 w-5' />
                {campaign.creator.name}
              </span>
            )}
            {locationLabel(campaign.location) && (
              <span className='flex items-center gap-0.5'>
                <MapPin className='h-3.5 w-3.5' /> {locationLabel(campaign.location)}
              </span>
            )}
            {campaign.endDate && (
              <span className='flex items-center gap-0.5'>
                <CalendarClock className='h-3.5 w-3.5' /> {timeUntil(campaign.endDate)}
              </span>
            )}
          </div>

          <CampaignProgress
            raisedAmountPence={campaign.raisedAmountPence}
            goalAmountPence={campaign.goalAmountPence}
            supporterCount={campaign.supporterCount}
            className='mt-4'
          />

          <div className='mt-4 flex gap-2'>
            <Button
              className='flex-1'
              icon={<HeartHandshake className='h-4 w-4' />}
              onClick={() => requireAuth(() => setContributeOpen(true))}
            >
              Back This Campaign
            </Button>
            <Button
              variant='secondary'
              icon={<Share2 className='h-4 w-4' />}
              onClick={() => requireAuth(() => setShareOpen(true))}
            >
              Share
            </Button>
            <FollowButton targetType='campaign' targetId={campaign.id} size='sm' />
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
        {tab === 'story' && (
          <div className='card p-4'>
            <p className='whitespace-pre-line text-sm leading-relaxed text-gray-700'>
              {campaign.description || 'No story has been added to this campaign yet.'}
            </p>
          </div>
        )}

        {tab === 'updates' &&
          (updates.length === 0 ? (
            <EmptyState title='No updates yet' description='The organiser has not posted any updates.' />
          ) : (
            actions.visiblePosts(updates).map((post) => (
              <PostCard
                key={post.id}
                post={post}
                liked={actions.isLiked(post.id)}
                saved={actions.isSaved(post.id)}
                onLike={actions.onLike}
                onSave={actions.onSave}
                onComment={onPostComment}
                onShare={actions.onShare}
                onMore={actions.onMore}
              />
            ))
          ))}

        {tab === 'rewards' &&
          (rewards.length === 0 ? (
            <EmptyState title='No rewards' description='This campaign has no rewards to claim.' />
          ) : (
            <div className='space-y-3'>
              {rewards.map((reward) => (
                <RewardCard key={reward.id} reward={reward} />
              ))}
            </div>
          ))}
      </div>

      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} targetType='campaign' targetId={campaign.id} title={campaign.title} />
      {actions.modals}
      <ComingSoonModal
        isOpen={contributeOpen}
        onClose={() => setContributeOpen(false)}
        title='Support this campaign'
        message='Secure contributions and rewards tracking are being connected. You will be able to contribute and earn rewards here very soon.'
      />
    </div>
  )
}
