import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { discoverApi } from '@/services/discover.service'
import { CampaignCard } from '@/components/discover/CampaignCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { timeUntil } from '@/lib/format'
import type { PublicCampaign } from '@/types/community-public'

/**
 * Campaigns discovery (spec §4.2 steps 1–3): search or filter available
 * campaigns, then open a campaign card for details. Only eligible campaigns
 * surfaced through Community appear here.
 */

type StatusFilter = 'all' | 'active' | 'ended'

function isEnded(campaign: PublicCampaign): boolean {
  if (campaign.status === 'ended') return true
  if (campaign.status === 'active' && campaign.endDate) {
    return new Date(campaign.endDate).getTime() < Date.now()
  }
  return false
}

export function CampaignsListPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['community', 'campaigns'],
    queryFn: () => discoverApi.getFeaturedCampaigns(),
  })

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return campaigns.filter((c) => {
      if (status === 'active' && isEnded(c)) return false
      if (status === 'ended' && !isEnded(c)) return false
      if (!q) return true
      return (
        c.title.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        (c.location?.cityName ?? '').toLowerCase().includes(q)
      )
    })
  }, [campaigns, query, status])

  return (
    <div className='container-page max-w-2xl space-y-4 py-3 sm:py-4'>
      <header className='space-y-1'>
        <h1 className='text-xl font-bold text-gray-900'>Campaigns</h1>
        <p className='text-sm text-gray-600'>Causes and initiatives you can discover, follow and share.</p>
      </header>

      <div className='flex gap-2'>
        <div className='relative flex-1'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
          <input
            type='search'
            className='input-field pl-9'
            placeholder='Search campaigns…'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label='Search campaigns'
          />
        </div>
      </div>

      <div className='flex gap-1.5'>
        {(['all', 'active', 'ended'] as const).map((id) => (
          <button
            key={id}
            onClick={() => setStatus(id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm capitalize',
              status === id
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50',
            )}
          >
            {id}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className='grid gap-3 sm:grid-cols-2'>
          <Skeleton className='h-64 w-full rounded-xl' />
          <Skeleton className='h-64 w-full rounded-xl' />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          title='No campaigns found'
          description={
            campaigns.length === 0
              ? 'There are no campaigns in your community right now. Check back soon.'
              : 'Try a different search or filter.'
          }
        />
      ) : (
        <div className='grid gap-3 sm:grid-cols-2'>
          {visible.map((campaign) => {
            const ended = isEnded(campaign)
            return (
              <div key={campaign.id} className='relative'>
                {ended ? (
                  <Badge variant='neutral' className='absolute right-2 top-2 z-10'>
                    Ended
                  </Badge>
                ) : campaign.endDate ? (
                  <Badge variant='success' className='absolute right-2 top-2 z-10'>
                    {timeUntil(campaign.endDate)}
                  </Badge>
                ) : null}
                <CampaignCard campaign={campaign} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
