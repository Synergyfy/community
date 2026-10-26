import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, MapPin, Users } from 'lucide-react'
import type { PublicPost } from '@/types/community-public'
import { useAuthStore } from '@/stores/auth.store'
import { useCommunityLocation } from '@/hooks/useCommunityLocation'
import { usePostActions } from '@/hooks/usePostActions'
import { discoverApi } from '@/services/discover.service'
import { AnnouncementStrip } from '@/components/community/AnnouncementStrip'
import { PostComposer } from '@/components/community/PostComposer'
import { FeedTabs, type FeedFilter } from '@/components/community/FeedTabs'
import { Feed } from '@/components/community/Feed'
import { CampaignCard } from '@/components/discover/CampaignCard'

export function CommunityHomePage() {
  const navigate = useNavigate()
  const location = useCommunityLocation()
  const user = useAuthStore((s) => s.user)
  const actions = usePostActions()

  const [filter, setFilter] = useState<FeedFilter>('all')

  // Campaign highlights (spec §4.1 item 6). Admin announcements render through
  // the shared fan-out strip below (spec §4, §15 — one record, every surface).
  const { data: campaigns = [] } = useQuery({
    queryKey: ['discover', 'campaigns', location?.cityName],
    queryFn: () => discoverApi.getFeaturedCampaigns(location?.cityName),
  })

  const communityName = location?.cityName ? `${location.cityName} Community` : 'Your Community'

  const onComment = (post: PublicPost) => navigate(`/community/post/${post.id}`)

  return (
    <div className='container-page max-w-2xl space-y-4 py-3 sm:py-4'>
      <button
        onClick={() => navigate('/community/discover')}
        className='card flex w-full items-center justify-between gap-2 p-3 text-left transition hover:shadow-md'
      >
        <div className='flex min-w-0 items-center gap-2'>
          <span className='flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600'>
            <Users className='h-4 w-4' />
          </span>
          <div className='min-w-0'>
            <p className='truncate text-sm font-semibold text-gray-900'>{communityName}</p>
            <p className='flex items-center gap-1 text-xs text-gray-500'>
              <MapPin className='h-3 w-3' /> {location?.cityName || 'Set your location'}
            </p>
          </div>
        </div>
        <span className='flex shrink-0 items-center gap-1 text-xs font-medium text-primary-600'>
          Switch <ChevronDown className='h-4 w-4' />
        </span>
      </button>

      {/* Welcome / profile prompt (spec §4.1 item 2) */}
      {user ? (
        <Link to='/community/profile' className='card flex items-center gap-3 p-3 transition hover:shadow-md'>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-sm font-semibold text-gray-900'>Welcome back, {user.name.split(' ')[0]}</p>
            <p className='text-xs text-gray-500'>Your profile, campaigns and sharing results live here.</p>
          </div>
          <span className='shrink-0 text-xs font-medium text-primary-600'>View profile</span>
        </Link>
      ) : null}

      <PostComposer />

      {/* Admin announcements (spec §4.1 item 5) — shared strip over the announcement store (§4, §15) */}
      <AnnouncementStrip />

      {/* Campaign highlights (spec §4.1 item 6) */}
      {campaigns.length > 0 && (
        <section aria-label='Campaign highlights'>
          <div className='mb-2 flex items-center justify-between'>
            <h2 className='text-sm font-semibold text-gray-900'>Campaign highlights</h2>
            <Link to='/community/campaigns' className='text-sm font-medium text-primary-600 hover:underline'>
              See all
            </Link>
          </div>
          <div className='flex gap-3 overflow-x-auto pb-1 scrollbar-hide'>
            {campaigns.slice(0, 5).map((campaign) => (
              <div key={campaign.id} className='w-64 shrink-0'>
                <CampaignCard campaign={campaign} />
              </div>
            ))}
          </div>
        </section>
      )}

      <FeedTabs active={filter} onChange={setFilter} />

      <Feed
        filter={filter}
        location={location?.cityName}
        likedIds={actions.likedIds}
        savedIds={actions.savedIds}
        hiddenIds={actions.hiddenIds}
        onLike={actions.onLike}
        onComment={onComment}
        onShare={actions.onShare}
        onSave={actions.onSave}
        onMore={actions.onMore}
      />

      {actions.modals}
    </div>
  )
}
