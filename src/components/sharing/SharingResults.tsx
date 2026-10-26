import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Eye, Share2, TrendingUp } from 'lucide-react'
import { attributionApi } from '@/services/attribution.service'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CampaignShareModal } from '@/components/business/CampaignShareModal'
import type { PublicCampaign, ShareRecord } from '@/types/community-public'
import { formatDate } from '@/pages/business/helpers'

/**
 * Shared My Sharing view (spec §3.5 business / §4.4 consumer): shares,
 * recorded visits and qualifying outcomes, clearly distinguished. A click is
 * not a contribution; unconfirmed events show as pending and are never
 * counted as qualified outcomes.
 */

const TARGET_HREF: Record<string, (id: string) => string> = {
  campaign: (id) => `/community/campaign/${id}`,
  post: (id) => `/community/post/${id}`,
  business: (id) => `/community/business/${id}`,
  offer: (id) => `/community/offer/${id}`,
  reward: (id) => `/community/reward/${id}`,
  exchange: (id) => `/community/exchange/${id}`,
}

export interface SharingResultsProps {
  sharerId: string
  title: string
  subtitle: string
  /** Campaigns available to this account, for the "Share again" action. */
  campaigns: PublicCampaign[]
  /** Shown when the account has not shared anything yet. */
  emptyAction?: React.ReactNode
  onOpenCampaignShare?: (campaign: PublicCampaign) => void
}

export function SharingResults({ sharerId, title, subtitle, campaigns, emptyAction, onOpenCampaignShare }: SharingResultsProps) {
  const [reshare, setReshare] = useState<PublicCampaign | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const shares: ShareRecord[] = attributionApi.listSharesFor(sharerId)
  const totalVisits = shares.reduce((sum, s) => sum + s.visitCount, 0)
  const totalQualified = shares.reduce((sum, s) => sum + s.qualifiedCount, 0)
  const campaignById = new Map(campaigns.map((c) => [c.id, c]))

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-gray-900'>{title}</h2>
        <p className='text-sm text-gray-600'>{subtitle}</p>
      </div>

      <div className='grid grid-cols-3 gap-3'>
        <ResultStat icon={<Share2 className='h-5 w-5' />} label='Shares' value={shares.length} />
        <ResultStat icon={<Eye className='h-5 w-5' />} label='Clicks (total)' value={totalVisits} />
        <ResultStat icon={<TrendingUp className='h-5 w-5' />} label='Qualified' value={totalQualified} />
      </div>

      <div className='rounded-lg bg-gray-50 p-3 text-xs text-gray-600'>
        <p>
          <span className='font-medium text-gray-800'>How to read this:</span> a share is a link you created;
          a click is someone opening it; a qualified outcome is a confirmed action taken through your link.
          Clicks are totals — unique visitor counts appear only when the platform reports them. Registrations
          through your link are confirmed by the server; recent ones may show as unconfirmed. Outcomes appear
          only once the server has confirmed them.
        </p>
      </div>

      {shares.length === 0 ? (
        <div className='card'>
          <EmptyState
            icon={<Share2 className='h-10 w-10' />}
            title='No shares yet'
            description='Share a campaign with your community to start tracking visits and outcomes.'
            action={emptyAction}
          />
        </div>
      ) : (
        <div className='space-y-3'>
          {shares.map((share) => {
            const href = TARGET_HREF[share.targetType]?.(share.targetId ?? '') ?? '/community'
            const campaign = share.targetType === 'campaign' ? campaignById.get(share.targetId ?? '') : undefined
            const events = attributionApi.listEventsFor(share.trackingCode)
            const signupEvents = events.filter((e) => e.eventType === 'signup')
            const unconfirmedRegs = signupEvents.filter((e) => e.status === 'pending').length
            const isExpanded = expanded === share.id
            return (
              <div key={share.id} className='card'>
                <div className='card-content space-y-3'>
                  <div className='flex flex-wrap items-start justify-between gap-2'>
                    <div className='min-w-0'>
                      <h3 className='truncate text-sm font-semibold text-gray-900'>
                        {share.targetTitle ?? 'Community link'}
                      </h3>
                      <p className='mt-0.5 text-xs text-gray-500'>
                        Shared {formatDate(share.createdAt)} · code {share.trackingCode}
                      </p>
                      {share.campaignTitle && share.targetType !== 'campaign' && (
                        <p className='mt-0.5 text-xs text-gray-500'>Related campaign: {share.campaignTitle}</p>
                      )}
                    </div>
                    <div className='flex items-center gap-1.5'>
                      {share.source === 'demo' && <Badge variant='warning'>demo seed</Badge>}
                      <Badge variant='neutral'>{share.shareType ?? 'link'}</Badge>
                      <Badge variant='success'>Link active</Badge>
                    </div>
                  </div>

                  <div className='grid grid-cols-3 gap-2 text-center'>
                    <div className='rounded-lg bg-gray-50 p-2'>
                      <p className='text-lg font-bold text-gray-900'>{share.visitCount}</p>
                      <p className='text-xs text-gray-500'>Clicks (total)</p>
                      <p className='text-[11px] text-gray-400'>
                        unique: {share.uniqueVisitCount != null ? share.uniqueVisitCount : '—'}
                      </p>
                    </div>
                    <div className='rounded-lg bg-gray-50 p-2'>
                      <p className='text-lg font-bold text-gray-900'>{signupEvents.length}</p>
                      <p className='text-xs text-gray-500'>Registrations</p>
                      <p className='text-[11px] text-gray-400'>
                        {unconfirmedRegs > 0 ? `${unconfirmedRegs} unconfirmed` : 'all confirmed'}
                      </p>
                    </div>
                    <div className='rounded-lg bg-gray-50 p-2'>
                      <p className='text-lg font-bold text-gray-900'>{share.qualifiedCount}</p>
                      <p className='text-xs text-gray-500'>Qualified</p>
                    </div>
                  </div>

                  {events.length > 0 && (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : share.id)}
                      className='text-sm font-medium text-primary-600 hover:underline'
                    >
                      {isExpanded ? 'Hide tracked events' : `View tracked events (${events.length})`}
                    </button>
                  )}
                  {isExpanded && (
                    <ul className='space-y-1.5'>
                      {events.map((event) => (
                        <li key={event.id} className='flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs'>
                          <span className='capitalize text-gray-700'>{event.eventType}</span>
                          <span className='text-gray-500'>{formatDate(event.occurredAt)}</span>
                          <Badge variant={event.status === 'qualified' ? 'success' : event.status === 'rejected' ? 'danger' : 'neutral'}>
                            {event.status}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className='flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3'>
                    <Link
                      to={href}
                      className='flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline'
                    >
                      <ExternalLink className='h-4 w-4' /> Open{' '}
                      {share.targetType === 'campaign' ? 'campaign' : share.targetType}
                    </Link>
                    {campaign && (
                      <Button
                        size='sm'
                        variant='secondary'
                        onClick={() => (onOpenCampaignShare ? onOpenCampaignShare(campaign) : setReshare(campaign))}
                      >
                        Share again
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {reshare && !onOpenCampaignShare && <CampaignShareModal campaign={reshare} onClose={() => setReshare(null)} />}
    </div>
  )
}

function ResultStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className='card'>
      <div className='card-content flex flex-col items-center gap-1 text-center'>
        <span className='flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600'>{icon}</span>
        <p className='text-xl font-bold text-gray-900'>{value}</p>
        <p className='text-xs text-gray-500'>{label}</p>
      </div>
    </div>
  )
}
