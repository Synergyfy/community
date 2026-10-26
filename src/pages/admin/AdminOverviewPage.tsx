import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Eye,
  Flag,
  Flag as FlagIcon,
  Megaphone,
  Repeat,
  Share2,
  Users,
} from 'lucide-react'
import { adminApi } from '@/services/admin.service'
import { communityApi } from '@/services/community.service'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate } from '../business/helpers'

/**
 * Admin Overview (spec §5.1): community health, outstanding work and recent
 * activity. Every metric states its calculation; totals are distinguished
 * from pending work.
 *
 * Date/location filters (§2D, Phase I): applied to the metric cards only.
 * Each card states which filters touched it; records without a date or
 * location say so. Outstanding work and recent administrative actions are
 * always unfiltered — work lists never hide behind a filter.
 */

function Metric({ label, value, caption, icon }: { label: string; value: number; caption: string; icon: React.ReactNode }) {
  return (
    <div className='card'>
      <div className='card-content flex items-start gap-3'>
        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600'>{icon}</div>
        <div className='min-w-0'>
          <p className='text-2xl font-bold text-gray-900'>{value}</p>
          <p className='truncate text-sm font-medium text-gray-700'>{label}</p>
          <p className='text-xs text-gray-500'>{caption}</p>
        </div>
      </div>
    </div>
  )
}

export function AdminOverviewPage() {
  // Date/location filter state (§2D) — applies to metric cards only.
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [city, setCity] = useState('')

  const { data: posts = [], isLoading: postsLoading } = useQuery({ queryKey: ['admin', 'posts'], queryFn: adminApi.listPosts })
  const { data: exchanges = [], isLoading: exchangesLoading } = useQuery({
    queryKey: ['admin', 'exchanges'],
    queryFn: adminApi.listExchanges,
  })
  const { data: users = [] } = useQuery({ queryKey: ['admin', 'users'], queryFn: adminApi.listUsers })
  const { data: campaigns = [] } = useQuery({ queryKey: ['admin', 'campaigns'], queryFn: adminApi.listCampaigns })
  const { data: feedPosts = [] } = useQuery({ queryKey: ['community', 'feed', 'all', undefined], queryFn: () => communityApi.getFeed() })
  // First-class report records across content types (§3.5, §3.6).
  const { data: openReports = [] } = useQuery({
    queryKey: ['admin', 'reports', 'open'],
    queryFn: () => adminApi.listReports().filter((r) => r.status !== 'resolved'),
  })
  // Announcement lifecycle tasks (§4): what is queued to publish and what expires.
  const { data: announcements = [] } = useQuery({
    queryKey: ['admin', 'announcements'],
    queryFn: () => adminApi.listAnnouncements(),
  })
  const reportedPostIds = [...new Set(openReports.filter((r) => r.targetType === 'post').map((r) => r.targetId))]
  const reportedExchangeIds = [...new Set(openReports.filter((r) => r.targetType === 'exchange').map((r) => r.targetId))]
  const shares = adminApi.listAllShares()
  const events = adminApi.listAllEvents()
  const audit = adminApi.listAudit()

  // Filter predicates — date matches each record's own date; location only
  // where the record carries one. Records without a matching field are kept
  // only when the corresponding filter is off, and the card says so.
  const hasDate = !!(dateFrom || dateTo)
  const hasCity = !!city
  const hasFilters = hasDate || hasCity
  const matchesDate = (iso: string | Date | null | undefined): boolean => {
    if (!iso) return !hasDate
    const t = new Date(iso).getTime()
    if (dateFrom && t < new Date(`${dateFrom}T00:00:00`).getTime()) return false
    if (dateTo && t > new Date(`${dateTo}T23:59:59`).getTime()) return false
    return true
  }
  const matchesCity = (c?: string | null): boolean => (!hasCity ? true : (c ?? '') === city)
  /**
   * Caption suffix for filtered metrics. `kind: 'full'` — the record carries
   * both a date and a location. `kind: 'dateOnly'` — the record has no
   * location, so the location filter says so instead of pretending to apply.
   */
  const filterNote = (kind: 'full' | 'dateOnly', dateDetail: string): string => {
    if (!hasFilters) return ''
    if (kind === 'dateOnly') {
      if (hasDate && hasCity) return ` · filtered by date (${dateDetail}) · location not recorded on this record`
      if (hasDate) return ` · filtered by date (${dateDetail})`
      return ' · not filtered — location not recorded on this record'
    }
    const dims = [hasDate ? `date (${dateDetail})` : null, hasCity ? 'location' : null].filter(Boolean).join(' & ')
    return ` · filtered by ${dims}`
  }
  const unfilteredNote = (reason: string): string => (hasFilters ? ` · not filtered — ${reason}` : '')
  const campaignNote = (): string => {
    if (!hasFilters) return ''
    if (hasDate && hasCity) return ' · filtered by location · campaigns carry no recorded date'
    if (hasDate) return ' · not filtered — campaigns carry no recorded date'
    return ' · filtered by location'
  }

  const pendingPosts = posts.filter((p) => p.status === 'pending')
  const rejectedPosts = posts.filter((p) => p.status === 'rejected')
  // Metric-card record sets (filtered); the work lists above stay unfiltered.
  const publishedCount = feedPosts.filter((p) => matchesDate(p.createdAt) && matchesCity(p.location?.cityName)).length
  const activeExchanges = exchanges.filter((e) => e.status === 'active' && matchesDate(e.createdAt) && matchesCity(e.location?.cityName))
  const activeCampaigns = campaigns.filter((c) => c.status === 'active' && matchesCity(c.location?.cityName))
  const filteredOpenReports = openReports.filter((r) => matchesDate(r.createdAt))
  const filteredShares = shares.filter((s) => matchesDate(s.createdAt))
  const businesses = users.filter((u) => u.userType === 'business')
  const consumers = users.filter((u) => u.userType === 'consumer')
  const visitEvents = events.filter((e) => e.eventType === 'visit' && matchesDate(e.occurredAt))
  const qualifiedEvents = events.filter((e) => e.status === 'qualified' && matchesDate(e.occurredAt))
  const scheduledAnnouncements = announcements.filter((a) => a.status === 'scheduled')
  const expiringAnnouncements = announcements.filter((a) => a.status === 'published' && a.expiresAt)
  const nextPublish = scheduledAnnouncements.map((a) => a.publishAt).filter((t): t is string => !!t).sort()[0]
  const nextExpiry = expiringAnnouncements.map((a) => a.expiresAt).filter((t): t is string => !!t).sort()[0]
  const outstanding =
    pendingPosts.length +
    rejectedPosts.length +
    openReports.length +
    scheduledAnnouncements.length +
    expiringAnnouncements.length

  if (postsLoading || exchangesLoading) {
    return (
      <div className='space-y-4'>
        <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className='h-24 w-full' />
          ))}
        </div>
        <Skeleton className='h-40 w-full' />
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Date/location filters (§2D) — metric cards only; work lists stay unfiltered. */}
      <div className='card'>
        <div className='card-content space-y-2'>
          <div className='flex flex-wrap items-end gap-3'>
            <label className='block space-y-1'>
              <span className='text-xs font-medium text-gray-600'>From</span>
              <input
                type='date'
                className='input-field py-1 text-sm'
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label='Date from'
              />
            </label>
            <label className='block space-y-1'>
              <span className='text-xs font-medium text-gray-600'>To</span>
              <input
                type='date'
                className='input-field py-1 text-sm'
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label='Date to'
              />
            </label>
            <label className='block space-y-1'>
              <span className='text-xs font-medium text-gray-600'>Location</span>
              <select
                className='input-field py-1 text-sm'
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-label='Filter metrics by location'
              >
                <option value=''>All locations</option>
                {[
                  ...new Set(
                    [...feedPosts.map((p) => p.location?.cityName), ...exchanges.map((e) => e.location?.cityName)].filter(
                      (c): c is string => !!c,
                    ),
                  ),
                ]
                  .sort()
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
            </label>
            {hasFilters && (
              <button className='btn btn-secondary btn-sm' onClick={() => { setDateFrom(''); setDateTo(''); setCity('') }}>
                Clear filters
              </button>
            )}
          </div>
          <p className='text-xs text-gray-500'>
            Applies to the metric cards below — each card states which filters touched it. Outstanding work and recent
            administrative actions always list everything. Date filters match each record's own date: creation for
            posts, exchange items and shares; occurrence for tracked events; filing for reports.
          </p>
        </div>
      </div>

      {outstanding > 0 && (
        <div className='card border-amber-200 bg-amber-50/60'>
          <div className='card-content space-y-2'>
            <h2 className='flex items-center gap-1.5 text-sm font-semibold text-amber-900'>
              <AlertTriangle className='h-4 w-4' /> Outstanding work
            </h2>
            <ul className='space-y-1 text-sm text-amber-900'>
              {pendingPosts.length > 0 && (
                <li className='flex items-center justify-between gap-2'>
                  <span>{pendingPosts.length} post(s) awaiting review</span>
                  <Link to='/admin/content' className='text-xs font-medium text-primary-700 hover:underline'>
                    Review
                  </Link>
                </li>
              )}
              {rejectedPosts.length > 0 && (
                <li className='flex items-center justify-between gap-2'>
                  <span>{rejectedPosts.length} rejected post(s) to re-check</span>
                  <Link to='/admin/content' className='text-xs font-medium text-primary-700 hover:underline'>
                    Review
                  </Link>
                </li>
              )}
              {reportedPostIds.length > 0 && (
                <li className='flex items-center justify-between gap-2'>
                  <span>{reportedPostIds.length} reported post(s) to review</span>
                  <Link to='/admin/content' className='text-xs font-medium text-primary-700 hover:underline'>
                    Review
                  </Link>
                </li>
              )}
              {reportedExchangeIds.length > 0 && (
                <li className='flex items-center justify-between gap-2'>
                  <span>{reportedExchangeIds.length} reported exchange item(s) to review</span>
                  <Link to='/admin/exchange' className='text-xs font-medium text-primary-700 hover:underline'>
                    Review
                  </Link>
                </li>
              )}
              {scheduledAnnouncements.length > 0 && (
                <li className='flex items-center justify-between gap-2'>
                  <span>
                    {scheduledAnnouncements.length} announcement(s) scheduled to publish
                    {nextPublish ? ` · next ${formatDate(nextPublish)}` : ''}
                  </span>
                  <Link to='/admin/announcements' className='text-xs font-medium text-primary-700 hover:underline'>
                    Manage
                  </Link>
                </li>
              )}
              {expiringAnnouncements.length > 0 && (
                <li className='flex items-center justify-between gap-2'>
                  <span>
                    {expiringAnnouncements.length} announcement(s) with an expiry set
                    {nextExpiry ? ` · next ${formatDate(nextExpiry)}` : ''}
                  </span>
                  <Link to='/admin/announcements' className='text-xs font-medium text-primary-700 hover:underline'>
                    Manage
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <Metric
          label='Accounts'
          value={users.length}
          caption={`${businesses.length} business · ${consumers.length} consumer (demo dataset)${unfilteredNote('accounts carry no recorded date or location')}`}
          icon={<Users className='h-5 w-5' />}
        />
        <Metric
          label='Published in feed'
          value={publishedCount}
          caption={`Posts visible in the public feed now${filterNote('full', 'created in range')}`}
          icon={<Megaphone className='h-5 w-5' />}
        />
        <Metric
          label='Active #Exchange items'
          value={activeExchanges.length}
          caption={`Status "active" in the exchange area${filterNote('full', 'created in range')}`}
          icon={<Repeat className='h-5 w-5' />}
        />
        <Metric
          label='Campaigns available'
          value={activeCampaigns.length}
          caption={`Status "active" through Community${campaignNote()}`}
          icon={<FlagIcon className='h-5 w-5' />}
        />
      </div>

      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <Metric
          label='Open reports'
          value={filteredOpenReports.length}
          caption={`Unresolved reports on posts, exchanges or accounts${filterNote('dateOnly', 'filed in range')}`}
          icon={<AlertTriangle className='h-5 w-5' />}
        />
        <Metric
          label='Shares created'
          value={filteredShares.length}
          caption={`Trackable links, all accounts${filterNote('dateOnly', 'created in range')}`}
          icon={<Share2 className='h-5 w-5' />}
        />
        <Metric
          label='Recorded visits'
          value={visitEvents.length}
          caption={`Link opens behind shares${filterNote('dateOnly', 'recorded in range')}`}
          icon={<Eye className='h-5 w-5' />}
        />
        <Metric
          label='Qualified outcomes'
          value={qualifiedEvents.length}
          caption={`Server-confirmed only${filterNote('dateOnly', 'confirmed in range')}`}
          icon={<Flag className='h-5 w-5' />}
        />
      </div>

      <div className='card'>
        <div className='card-header'>
          <h2 className='text-base font-semibold text-gray-900'>Recent administrative actions</h2>
        </div>
        {audit.length === 0 ? (
          <p className='card-content text-sm text-gray-500'>No admin actions recorded yet.</p>
        ) : (
          <ul className='divide-y divide-gray-100'>
            {audit.slice(0, 5).map((entry) => (
              <li key={entry.id} className='px-4 py-3 text-sm'>
                <span className='font-medium text-gray-900'>{entry.adminName}</span>{' '}
                <span className='text-gray-700'>{entry.action}</span>{' '}
                {entry.targetLabel && <span className="text-gray-500">— “{entry.targetLabel}”</span>}
                <span className='block text-xs text-gray-400'>{formatDate(entry.at)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className='card-content pt-0'>
          <Link to='/admin/audit' className='text-sm font-medium text-primary-600 hover:underline'>
            Full audit log
          </Link>
        </div>
      </div>
    </div>
  )
}
