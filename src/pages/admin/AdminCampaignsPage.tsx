import { useQuery } from '@tanstack/react-query'
import { Flag, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { adminApi } from '@/services/admin.service'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, formatPence } from '../business/helpers'

/**
 * Campaign Connections (spec §5 item 6): campaigns available through
 * Community, their status and their link to the connected product.
 * Contributions are processed by the connected fundraising service — Community
 * only surfaces availability and sharing (§4.2, §9). Each campaign opens a
 * per-campaign detail with sharing/referral configuration, QR record,
 * campaign-scoped attribution and the config-driven leaderboard (§7.4).
 */
export function AdminCampaignsPage() {
  const { data: campaigns = [], isLoading } = useQuery({ queryKey: ['admin', 'campaigns'], queryFn: adminApi.listCampaigns })

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-gray-900'>Campaign Connections</h2>
        <p className='text-sm text-gray-600'>
          Campaigns available through Community and their product links. Contributions are handled by the connected
          fundraising service, not by Community.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className='h-40 w-full' />
      ) : campaigns.length === 0 ? (
        <div className='card'>
          <EmptyState icon={<Flag className='h-10 w-10' />} title='No campaigns connected' description='Connected campaigns will appear here.' />
        </div>
      ) : (
        <div className='space-y-3'>
          {campaigns.map((campaign) => {
            const cfg = adminApi.getCampaignConfig(campaign.id)
            return (
              <div key={campaign.id} className='card'>
                <div className='card-content space-y-2'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='min-w-0'>
                      <h3 className='truncate text-sm font-semibold text-gray-900'>{campaign.title}</h3>
                      <p className='text-xs text-gray-500'>
                        {campaign.creator?.name ?? 'Unknown organiser'}
                        {campaign.location?.cityName ? ` · ${campaign.location.cityName}` : ''}
                        {campaign.endDate ? ` · ends ${formatDate(campaign.endDate)}` : ''}
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Badge variant={campaign.status === 'active' ? 'success' : 'neutral'}>{campaign.status ?? 'active'}</Badge>
                      <Link
                        to={`/admin/campaigns/${campaign.id}`}
                        className='btn btn-secondary btn-sm'
                        aria-label={`Manage ${campaign.title}`}
                      >
                        <Settings2 className='h-4 w-4' /> Manage
                      </Link>
                    </div>
                  </div>
                  <div className='flex flex-wrap items-center gap-4 text-xs text-gray-600'>
                    <span>
                      Raised {formatPence(campaign.raisedAmountPence)} of {formatPence(campaign.goalAmountPence)}
                    </span>
                    {campaign.supporterCount !== undefined && <span>{campaign.supporterCount} supporters</span>}
                    <span className='flex flex-wrap items-center gap-1'>
                      <Badge variant={cfg.sharingEnabled ? 'primary' : 'neutral'}>
                        sharing {cfg.sharingEnabled ? 'on' : 'off'}
                      </Badge>
                      <Badge variant={cfg.referralEnabled ? 'primary' : 'neutral'}>
                        referrals {cfg.referralEnabled ? 'on' : 'off'}
                      </Badge>
                      <Badge variant={cfg.leaderboardEnabled ? 'primary' : 'neutral'}>
                        leaderboard {cfg.leaderboardEnabled ? 'on' : 'off'}
                      </Badge>
                      {cfg.source === 'demo' && <Badge variant='warning'>demo seed config</Badge>}
                    </span>
                    <span className='rounded bg-gray-100 px-2 py-0.5 text-gray-600'>
                      Connected product: fundraising service (contributions) · Community (sharing, attribution)
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
