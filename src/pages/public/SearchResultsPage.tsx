import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SearchX, Repeat } from 'lucide-react'
import { discoverApi } from '@/services/discover.service'
import { useDebounce } from '@/hooks/useDebounce'
import { useCommunityLocation } from '@/hooks/useCommunityLocation'
import { usePostActions } from '@/hooks/usePostActions'
import type { PublicPost } from '@/types/community-public'
import { SearchBar } from '@/components/discover/SearchBar'
import { BusinessCard } from '@/components/discover/BusinessCard'
import { CampaignCard } from '@/components/discover/CampaignCard'
import { CommunityCard } from '@/components/discover/CommunityCard'
import { PostCard } from '@/components/community/PostCard'
import { PostSkeleton } from '@/components/community/PostSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { saveLocation } from '@/lib/location'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'posts', label: 'Posts' },
  { id: 'communities', label: 'Communities' },
  { id: 'businesses', label: 'Businesses' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'exchanges', label: '#Exchange' },
] as const

type Tab = (typeof TABS)[number]['id']

export function SearchResultsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useCommunityLocation()
  const actions = usePostActions()

  const urlQuery = params.get('q') || ''
  const [input, setInput] = useState(urlQuery)
  const [tab, setTab] = useState<Tab>('all')

  const debounced = useDebounce(input, 350)

  useEffect(() => {
    setParams(debounced.trim() ? { q: debounced.trim() } : {}, { replace: true })
  }, [debounced, setParams])

  useEffect(() => {
    setInput(urlQuery)
  }, [urlQuery])

  const { data, isLoading } = useQuery({
    queryKey: ['community', 'search', debounced, location?.cityName],
    queryFn: () => discoverApi.search(debounced, location?.cityName),
    enabled: debounced.trim().length > 0,
  })

  const results = data ?? { posts: [], businesses: [], campaigns: [], exchanges: [], hashtags: [], communities: [] }
  const total =
    results.posts.length + results.businesses.length + results.campaigns.length + results.exchanges.length + results.communities.length
  const hasQuery = debounced.trim().length > 0

  const switchCommunity = (slug: string, name: string) => {
    saveLocation({ cityName: name, citySlug: slug })
    navigate('/community')
  }

  const onComment = (post: PublicPost) => navigate(`/community/post/${post.id}`)
  const visiblePosts = actions.visiblePosts(results.posts)

  const showPosts = tab === 'all' || tab === 'posts'
  const showCommunities = tab === 'all' || tab === 'communities'
  const showBusinesses = tab === 'all' || tab === 'businesses'
  const showCampaigns = tab === 'all' || tab === 'campaigns'
  const showExchanges = tab === 'all' || tab === 'exchanges'

  return (
    <div className='container-page max-w-2xl space-y-4 py-3 sm:py-4'>
      <SearchBar value={input} onChange={setInput} autoFocus />

      <div className='flex gap-1 overflow-x-auto border-b border-gray-200 scrollbar-hide'>
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

      {!hasQuery ? (
        <EmptyState icon={<SearchX className='h-10 w-10' />} title='Search your Community' description='Find posts, communities, businesses, campaigns and exchanges near you.' />
      ) : isLoading ? (
        <div className='space-y-3'>
          <PostSkeleton />
        </div>
      ) : total === 0 ? (
        <EmptyState icon={<SearchX className='h-10 w-10' />} title={`No results for “${debounced}”`} description='Try a different search term.' />
      ) : (
        <div className='space-y-6'>
          {showPosts && visiblePosts.length > 0 && (
            <section className='space-y-4'>
              {tab === 'all' && <h2 className='text-sm font-semibold text-gray-900'>Posts</h2>}
              {visiblePosts.map((post) => (
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
            </section>
          )}

          {showCommunities && results.communities.length > 0 && (
            <section>
              {tab === 'all' && <h2 className='mb-2 text-sm font-semibold text-gray-900'>Communities</h2>}
              <div className='space-y-2'>
                {results.communities.map((c) => (
                  <CommunityCard
                    key={c.id}
                    community={c}
                    isCurrent={(c.slug || c.location?.citySlug) === location?.citySlug}
                    onSelect={(community) =>
                      switchCommunity(community.slug, community.location?.cityName || community.name)
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {showBusinesses && results.businesses.length > 0 && (
            <section>
              {tab === 'all' && <h2 className='mb-2 text-sm font-semibold text-gray-900'>Businesses</h2>}
              <div className='space-y-2'>
                {results.businesses.map((b) => (
                  <BusinessCard key={b.id} business={b} />
                ))}
              </div>
            </section>
          )}

          {showCampaigns && results.campaigns.length > 0 && (
            <section>
              {tab === 'all' && <h2 className='mb-2 text-sm font-semibold text-gray-900'>Campaigns</h2>}
              <div className='flex gap-3 overflow-x-auto scrollbar-hide pb-1'>
                {results.campaigns.map((c) => (
                  <div key={c.id} className='w-56 shrink-0'>
                    <CampaignCard campaign={c} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {showExchanges && results.exchanges.length > 0 && (
            <section>
              {tab === 'all' && <h2 className='mb-2 text-sm font-semibold text-gray-900'>#Exchange</h2>}
              <div className='space-y-2'>
                {results.exchanges.map((e) => (
                  <Link key={e.id} to={`/community/exchange/${e.id}`} className='card flex items-start gap-3 p-3 hover:shadow-md'>
                    <span className='mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600'>
                      <Repeat className='h-4 w-4' />
                    </span>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold text-gray-900'>{e.title}</p>
                      <p className='line-clamp-2 text-xs text-gray-600'>{e.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {actions.modals}
    </div>
  )
}
