import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Store, Users } from 'lucide-react'
import { discoverApi } from '@/services/discover.service'
import { communityApi } from '@/services/community.service'
import { useCommunityLocation } from '@/hooks/useCommunityLocation'
import { saveLocation } from '@/lib/location'
import { SearchBar } from '@/components/discover/SearchBar'
import { CategoryGrid } from '@/components/discover/CategoryGrid'
import { HashtagChips } from '@/components/discover/HashtagChips'
import { CampaignCard } from '@/components/discover/CampaignCard'
import { BusinessCard } from '@/components/discover/BusinessCard'
import { CommunityCard } from '@/components/discover/CommunityCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import type { PublicCommunity } from '@/types/community-public'

export function DiscoverPage() {
  const navigate = useNavigate()
  const location = useCommunityLocation()
  const [query, setQuery] = useState('')
  const [communityQuery, setCommunityQuery] = useState('')

  const locationName = location?.cityName

  const { data: communities = [], isLoading: communitiesLoading } = useQuery({
    queryKey: ['communities', communityQuery],
    queryFn: () => communityApi.getCommunities(communityQuery),
  })

  const { data: hashtags = [] } = useQuery({
    queryKey: ['discover', 'hashtags'],
    queryFn: discoverApi.getTrendingHashtags,
  })

  const { data: campaigns = [] } = useQuery({
    queryKey: ['discover', 'campaigns', locationName],
    queryFn: () => discoverApi.getFeaturedCampaigns(locationName),
  })

  const { data: businesses = [], isLoading: businessesLoading } = useQuery({
    queryKey: ['discover', 'businesses', locationName],
    queryFn: () => discoverApi.getLocalBusinesses(locationName),
  })

  const goSearch = () => {
    const q = query.trim()
    navigate(q ? `/community/discover/search?q=${encodeURIComponent(q)}` : '/community/discover/search')
  }

  const switchCommunity = (community: PublicCommunity) => {
    saveLocation({
      cityName: community.location?.cityName || community.name,
      citySlug: community.slug,
      countryCode: community.location?.countryCode,
    })
    navigate('/community')
  }

  return (
    <div className='container-page max-w-2xl space-y-6 py-3 sm:py-4'>
      <SearchBar value={query} onChange={setQuery} onSubmit={goSearch} />

      <section>
        <h2 className='mb-2 text-sm font-semibold text-gray-900'>Search communities</h2>
        <div className='relative flex items-center'>
          <Users className='pointer-events-none absolute left-3 h-4 w-4 text-gray-400' />
          <input
            type='search'
            value={communityQuery}
            onChange={(e) => setCommunityQuery(e.target.value)}
            placeholder='Find a community by city or name'
            className='w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary-400 focus:bg-white focus:ring-1 focus:ring-primary-400'
          />
        </div>
        <div className='mt-3 space-y-2'>
          {communitiesLoading ? (
            [0, 1].map((i) => <Skeleton key={i} className='h-16 w-full rounded-lg' />)
          ) : communities.length === 0 ? (
            <EmptyState
              icon={<Users className='h-8 w-8' />}
              title='No communities found'
              description='Try a different city or name.'
            />
          ) : (
            communities.map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
                isCurrent={(community.slug || community.location?.citySlug) === location?.citySlug}
                onSelect={switchCommunity}
              />
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className='mb-2 text-sm font-semibold text-gray-900'>Browse categories</h2>
        <CategoryGrid />
      </section>

      {hashtags.length > 0 && <HashtagChips hashtags={hashtags.slice(0, 8)} />}

      {campaigns.length > 0 && (
        <section>
          <div className='mb-2 flex items-center justify-between'>
            <h2 className='text-sm font-semibold text-gray-900'>Campaigns to support</h2>
            <Link to='/community/campaigns' className='text-sm font-medium text-primary-600 hover:underline'>
              View all
            </Link>
          </div>
          <div className='flex gap-3 overflow-x-auto scrollbar-hide pb-1'>
            {campaigns.map((campaign) => (
              <div key={campaign.id} className='w-56 shrink-0'>
                <CampaignCard campaign={campaign} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className='mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900'>
          <Store className='h-4 w-4 text-gray-400' /> Local businesses
        </h2>
        {businessesLoading ? (
          <div className='space-y-2'>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className='h-20 w-full rounded-lg' />
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <EmptyState
            icon={<Store className='h-8 w-8' />}
            title='No businesses yet'
            description='Local businesses will appear here as they join your Community.'
          />
        ) : (
          <div className='space-y-2'>
            {businesses.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        )}
      </section>

      <section className='pt-2'>
        <button onClick={() => navigate('/community/discover/search')} className='flex items-center gap-1.5 text-sm font-medium text-primary-600'>
          <Search className='h-4 w-4' /> Search all posts, businesses & campaigns
        </button>
      </section>
    </div>
  )
}
