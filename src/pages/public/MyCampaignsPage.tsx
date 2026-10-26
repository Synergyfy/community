import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { Flag, Info, Share2, Sparkles } from 'lucide-react'
import { discoverApi } from '@/services/discover.service'
import { communityApi } from '@/services/community.service'
import { attributionApi } from '@/services/attribution.service'
import { useAuthStore } from '@/stores/auth.store'
import { useEngagementStore } from '@/stores/engagement.store'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/pages/business/helpers'
import type { PublicCampaign } from '@/types/community-public'

/**
 * My Campaigns (spec §4.3): the consumer's relationship with campaigns,
 * based on actual recorded events only — campaigns followed (engagement
 * store), campaigns shared (attribution store) and their updates. A consumer
 * who merely viewed a campaign is never shown as having joined or supported
 * it. Contribution records live in the connected product (§4.2, §9).
 */

function campaignEnded(campaign: PublicCampaign): boolean {
  if (campaign.status === 'ended') return true
  if (campaign.status === 'active' && campaign.endDate) {
    return new Date(campaign.endDate).getTime() < Date.now()
  }
  return false
}

export function MyCampaignsPage() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const joinedCampaignIds = useEngagementStore((s) => s.joinedCampaignIds)

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['community', 'campaigns'],
    queryFn: () => discoverApi.getFeaturedCampaigns(),
  })

  const { data: feedPosts = [] } = useQuery({
    queryKey: ['community', 'feed', { scope: 'my-campaigns' }],
    queryFn: () => communityApi.getFeed(),
  })

  const followed = useMemo(() => campaigns.filter((c) => joinedCampaignIds.includes(c.id)), [campaigns, joinedCampaignIds])
  const sharedIds = useMemo(() => {
    if (!user) return []
    return attributionApi
      .listSharesFor(user.id)
      .filter((s) => s.targetType === 'campaign')
      .map((s) => s.targetId!)
  }, [user])

  const shared = useMemo(() => campaigns.filter((c) => sharedIds.includes(c.id)), [campaigns, sharedIds])
  const updates = useMemo(
    () => feedPosts.filter((p) => p.postType === 'campaign_update' && p.campaignId && joinedCampaignIds.includes(p.campaignId)),
    [feedPosts, joinedCampaignIds],
  )
  const completed = useMemo(() => followed.filter(campaignEnded), [followed])

  const sectionsEmpty = followed.length === 0 && shared.length === 0

  return (
    <div className='container-page max-w-2xl space-y-4 py-3 sm:py-4'>
      <header className='space-y-1'>
        <h1 className='flex items-center gap-2 text-xl font-bold text-gray-900'>
          <Flag className='h-5 w-5 text-primary-600' /> My Campaigns
        </h1>
        <p className='text-sm text-gray-600'>Campaigns you follow and share, in one place.</p>
      </header>

      <div className='flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600'>
        <Info className='mt-0.5 h-3.5 w-3.5 shrink-0' />
        Only campaigns you have followed or shared appear here — just viewing one is not recorded
        as joining or supporting it. Confirmed contributions appear once they are processed by the
        connected fundraising service.
      </div>

      {!user ? (
        /* Guests get the sign-in handoff with return-to-action, not a generic empty list (§1). */
        <EmptyState
          icon={<Flag className='h-10 w-10' />}
          title='Sign in to see your campaigns'
          description='Campaigns you follow or share are recorded to your account and listed here.'
          action={
            <Link to='/auth/login' state={{ from: location }} className='btn-primary'>
              Sign in
            </Link>
          }
        />
      ) : isLoading ? (
        <Skeleton className='h-40 w-full rounded-lg' />
      ) : sectionsEmpty ? (
        <EmptyState
          icon={<Flag className='h-10 w-10' />}
          title='No campaigns yet'
          description='Follow or share a campaign and it will show up here.'
          action={
            <Link to='/community/campaigns'>
              <Button>Discover campaigns</Button>
            </Link>
          }
        />
      ) : (
        <div className='space-y-6'>
          {followed.length > 0 && (
            <section className='space-y-2'>
              <h2 className='text-sm font-semibold text-gray-900'>Following</h2>
              <div className='space-y-2'>
                {followed.map((campaign) => {
                  const ended = campaignEnded(campaign)
                  return (
                    <Link key={campaign.id} to={`/community/campaign/${campaign.id}`} className='card block p-3 transition hover:shadow-md'>
                      <div className='flex items-start justify-between gap-2'>
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-semibold text-gray-900'>{campaign.title}</p>
                          <p className='mt-0.5 text-xs text-gray-500'>{campaign.location?.cityName ?? 'Community campaign'}</p>
                        </div>
                        <Badge variant={ended ? 'neutral' : 'success'}>{ended ? 'Ended' : 'Active'}</Badge>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {updates.length > 0 && (
            <section className='space-y-2'>
              <h2 className='flex items-center gap-1.5 text-sm font-semibold text-gray-900'>
                <Sparkles className='h-4 w-4 text-primary-600' /> Updates from campaigns you follow
              </h2>
              <div className='space-y-2'>
                {updates.map((post) => (
                  <Link key={post.id} to={`/community/post/${post.id}`} className='card block p-3 transition hover:shadow-md'>
                    <p className='truncate text-sm font-semibold text-gray-900'>{post.title ?? post.content}</p>
                    <p className='mt-0.5 text-xs text-gray-500'>{formatDate(post.createdAt)}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {shared.length > 0 && (
            <section className='space-y-2'>
              <h2 className='flex items-center gap-1.5 text-sm font-semibold text-gray-900'>
                <Share2 className='h-4 w-4 text-primary-600' /> Shared by you
              </h2>
              <div className='space-y-2'>
                {shared.map((campaign) => (
                  <Link key={campaign.id} to='/community/sharing' className='card block p-3 transition hover:shadow-md'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold text-gray-900'>{campaign.title}</p>
                        <p className='mt-0.5 text-xs text-gray-500'>See visits and outcomes for your links</p>
                      </div>
                      <Badge variant='primary'>View results</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section className='space-y-2'>
              <h2 className='text-sm font-semibold text-gray-900'>Completed</h2>
              <div className='space-y-2'>
                {completed.map((campaign) => (
                  <Link key={campaign.id} to={`/community/campaign/${campaign.id}`} className='card block p-3 opacity-75 transition hover:opacity-100'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold text-gray-900'>{campaign.title}</p>
                        <p className='mt-0.5 text-xs text-gray-500'>
                          {campaign.endDate ? `Ended ${formatDate(campaign.endDate)}` : 'No longer active'}
                        </p>
                      </div>
                      <Badge variant='neutral'>Completed</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
