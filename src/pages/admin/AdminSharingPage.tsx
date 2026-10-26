import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Eye, QrCode, Share2, TrendingUp, UserPlus } from 'lucide-react'
import { adminApi } from '@/services/admin.service'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { ShareEventStatus } from '@/lib/constants'
import { formatDate } from '../business/helpers'
import type { AttributionEvent, PublicUser, ReferralRecord, ShareRecord } from '@/types/community-public'

/**
 * Sharing & Attribution (spec §5.4, §6.6): every share across accounts with
 * its journey drill-down — click, registration (attributed vs unconfirmed),
 * attribution decision, join, contribution and referral outcome — plus a
 * referrals table with backend-decided status columns (§17-4).
 *
 * Hard rules honoured here (§7, §16, §17-3/4):
 * - Clicks are shown as totals; unique clicks appear only when a backend
 *   supplies them, never computed on this page.
 * - Pending events are never presented as confirmed outcomes.
 * - Attribution windows, deduplication and qualification are backend-owned;
 *   statuses displayed are the server's decisions as recorded.
 * - Demo-seeded records are labelled `demo seed`.
 * - The front end never rewrites outcomes — corrections are authorised,
 *   auditable server processes.
 */

const STATUS_BADGE: Record<ShareEventStatus, 'neutral' | 'primary' | 'success' | 'danger'> = {
  pending: 'neutral',
  attributed: 'primary',
  qualified: 'success',
  rejected: 'danger',
}

type Tab = 'shares' | 'referrals'

export function AdminSharingPage() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('shares')
  const { data: users = [] } = useQuery({ queryKey: ['admin', 'users'], queryFn: adminApi.listUsers })
  const shares = adminApi.listAllShares()
  const events = adminApi.listAllEvents()
  const referrals = adminApi.listReferrals()

  const usersById = useMemo(() => new Map<string, PublicUser>(users.map((u) => [u.id, u])), [users])
  const eventsByCode = useMemo(() => {
    const map = new Map<string, AttributionEvent[]>()
    for (const e of events) {
      const list = map.get(e.trackingCode)
      if (list) list.push(e)
      else map.set(e.trackingCode, [e])
    }
    return map
  }, [events])

  const clicks = events.filter((e) => e.eventType === 'visit').length
  const registrations = events.filter((e) => e.eventType === 'signup')
  const unconfirmedRegs = registrations.filter((e) => e.status === 'pending').length
  const joins = events.filter((e) => e.eventType === 'campaign_join').length
  const qualified = events.filter((e) => e.status === 'qualified').length
  const pending = events.filter((e) => e.status === 'pending').length

  const exportJson = () => {
    const payload = { exportedAt: new Date().toISOString(), shares, events, referrals }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `community-attribution-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h2 className='text-lg font-bold text-gray-900'>Sharing & Attribution</h2>
          <p className='text-sm text-gray-600'>
            Share links, their journeys and referral candidates across all accounts.
          </p>
        </div>
        <Button size='sm' variant='secondary' icon={<Download className='h-4 w-4' />} onClick={exportJson}>
          Export report
        </Button>
      </div>

      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
        <Stat label='Shares' value={shares.length} icon={<Share2 className='h-5 w-5' />} />
        <Stat label='Clicks (total)' value={clicks} icon={<Eye className='h-5 w-5' />} caption='unique: supplied by backend' />
        <Stat label='Registrations' value={registrations.length} icon={<UserPlus className='h-5 w-5' />} caption={`${unconfirmedRegs} unconfirmed`} />
        <Stat label='Joins' value={joins} />
        <Stat label='Qualified' value={qualified} icon={<TrendingUp className='h-5 w-5' />} caption={`${pending} pending`} />
      </div>

      <div className='rounded-lg bg-gray-50 p-3 text-xs text-gray-600'>
        Attribution is decided by the server against the approved qualification rules — the front
        end records candidate events only. Correcting attribution happens through authorised,
        auditable processes, never by editing data here. Clicks are totals; unique clicks are shown
        only when the backend supplies them. Attribution windows and deduplication (§17-3) and
        referral qualification criteria (§17-4) are backend-owned — this page displays their
        recorded values and statuses.
      </div>

      <div className='flex gap-1 border-b border-gray-200' role='tablist' aria-label='Sharing views'>
        {(
          [
            { id: 'shares', label: 'Shares' },
            { id: 'referrals', label: `Referrals (${referrals.length})` },
          ] as Array<{ id: Tab; label: string }>
        ).map((t) => (
          <button
            key={t.id}
            role='tab'
            aria-selected={tab === t.id}
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

      {tab === 'shares' ? (
        shares.length === 0 ? (
          <div className='card'>
            <p className='card-content text-sm text-gray-500'>No shares have been created yet.</p>
          </div>
        ) : (
          <div className='space-y-3'>
            {shares.map((share) => {
              const sharer = usersById.get(share.sharerId)
              const shareEvents = eventsByCode.get(share.trackingCode) ?? []
              const isExpanded = expanded === share.id
              return (
                <ShareCard
                  key={share.id}
                  share={share}
                  sharer={sharer}
                  events={shareEvents}
                  expanded={isExpanded}
                  onToggle={() => setExpanded(isExpanded ? null : share.id)}
                />
              )
            })}
          </div>
        )
      ) : (
        <ReferralsTable referrals={referrals} usersById={usersById} />
      )}
    </div>
  )
}

/** One share with its §6.6 journey drill-down. */
function ShareCard({
  share,
  sharer,
  events,
  expanded,
  onToggle,
}: {
  share: ShareRecord
  sharer?: PublicUser
  events: AttributionEvent[]
  expanded: boolean
  onToggle: () => void
}) {
  const visits = events.filter((e) => e.eventType === 'visit')
  const signups = events.filter((e) => e.eventType === 'signup')
  const joins = events.filter((e) => e.eventType === 'campaign_join')
  const contributions = events.filter((e) => e.eventType === 'contribution')
  const unconfirmed = signups.filter((e) => e.status === 'pending').length
  const attributedRegs = signups.filter((e) => e.status === 'attributed' || e.status === 'qualified').length

  const stages = buildJourney({ share, visits, signups, joins, contributions, events })

  return (
    <div className='card'>
      <div className='card-content space-y-3'>
        <div className='flex flex-wrap items-start justify-between gap-2'>
          <div className='min-w-0'>
            <h3 className='truncate text-sm font-semibold text-gray-900'>
              {share.targetTitle ?? share.targetType}
            </h3>
            <p className='mt-0.5 text-xs text-gray-500'>
              Sharer: {sharer?.name ?? share.sharerId} ({share.sharerType}) · {formatDate(share.createdAt)} · code{' '}
              {share.trackingCode}
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-1.5'>
            <Badge variant={share.sharerType === 'business' ? 'primary' : 'neutral'}>{share.sharerType}</Badge>
            <Badge variant='neutral'>{share.shareType ?? 'link'}</Badge>
            {share.qrCodeUrl && (
              <Badge variant='neutral'>
                <QrCode className='mr-1 inline h-3 w-3' /> QR
              </Badge>
            )}
            {share.source === 'demo' && <Badge variant='warning'>demo seed</Badge>}
          </div>
        </div>

        {(share.campaignTitle || share.productTitle) && (
          <p className='text-xs text-gray-600'>
            {share.campaignTitle && <>Related campaign: <span className='font-medium'>{share.campaignTitle}</span></>}
            {share.campaignTitle && share.productTitle && ' · '}
            {share.productTitle && <>Related product: <span className='font-medium'>{share.productTitle}</span></>}
          </p>
        )}

        <div className='grid grid-cols-2 gap-2 text-center sm:grid-cols-4'>
          <div className='rounded-lg bg-gray-50 p-2'>
            <p className='text-lg font-bold text-gray-900'>{visits.length}</p>
            <p className='text-xs text-gray-500'>Clicks (total)</p>
            <p className='text-[11px] text-gray-400'>
              unique: {share.uniqueVisitCount != null ? share.uniqueVisitCount : '—'}
            </p>
          </div>
          <div className='rounded-lg bg-gray-50 p-2'>
            <p className='text-lg font-bold text-gray-900'>{signups.length}</p>
            <p className='text-xs text-gray-500'>Registrations</p>
            <p className='text-[11px] text-gray-400'>
              {attributedRegs} attributed · {unconfirmed} unconfirmed
            </p>
          </div>
          <div className='rounded-lg bg-gray-50 p-2'>
            <p className='text-lg font-bold text-gray-900'>{joins.length}</p>
            <p className='text-xs text-gray-500'>Joins</p>
          </div>
          <div className='rounded-lg bg-gray-50 p-2'>
            <p className='text-lg font-bold text-gray-900'>{share.qualifiedCount}</p>
            <p className='text-xs text-gray-500'>Qualified</p>
          </div>
        </div>

        <button onClick={onToggle} className='text-sm font-medium text-primary-600 hover:underline'>
          {expanded ? 'Hide journey' : 'Show journey (§6.6)'}
        </button>

        {expanded && (
          <ol className='space-y-1.5'>
            {stages.map((stage) => (
              <li
                key={stage.n}
                className='flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs'
              >
                <span className='font-medium text-gray-700'>
                  {stage.n}. {stage.label}
                </span>
                <span className='text-gray-500'>{stage.detail}</span>
                <Badge variant={stage.variant}>{stage.badge}</Badge>
              </li>
            ))}
            <li className='rounded-lg bg-white p-2.5 text-[11px] text-gray-400'>
              Attribution decisions, windows and deduplication are recorded server-side (§17-3); this
              drill-down displays them as stored.
            </li>
          </ol>
        )}
      </div>
    </div>
  )
}

interface JourneyArgs {
  share: ShareRecord
  visits: AttributionEvent[]
  signups: AttributionEvent[]
  joins: AttributionEvent[]
  contributions: AttributionEvent[]
  events: AttributionEvent[]
}

interface JourneyStage {
  n: number
  label: string
  badge: string
  variant: 'neutral' | 'primary' | 'success' | 'danger'
  detail: string
}

/**
 * The §6.6 journey as seven stages over the recorded events. Pure display —
 * no stage transition or qualification is decided here.
 */
function buildJourney({ share, visits, signups, joins, contributions, events }: JourneyArgs): JourneyStage[] {
  const statusOf = (list: AttributionEvent[]): JourneyStage['variant'] => {
    if (list.some((e) => e.status === 'qualified')) return 'success'
    if (list.some((e) => e.status === 'rejected')) return 'danger'
    if (list.some((e) => e.status === 'attributed')) return 'primary'
    if (list.length > 0) return 'neutral'
    return 'neutral'
  }
  const statusSummary = (list: AttributionEvent[]): string => {
    if (list.length === 0) return 'not recorded'
    const counts = new Map<string, number>()
    for (const e of list) counts.set(e.status, (counts.get(e.status) ?? 0) + 1)
    return [...counts.entries()].map(([s, n]) => `${n} ${s}`).join(' · ')
  }
  const attributedRegs = (list: AttributionEvent[]): number =>
    list.filter((e) => e.status === 'attributed' || e.status === 'qualified').length

  const qualifiedEvents = events.filter((e) => e.status === 'qualified')

  return [
    {
      n: 1,
      label: 'Share created',
      badge: share.shareType ?? 'link',
      variant: 'primary',
      detail: formatDate(share.createdAt),
    },
    {
      n: 2,
      label: 'Click',
      badge: visits.length > 0 ? `${visits.length} total` : 'none',
      variant: visits.length > 0 ? 'success' : 'neutral',
      detail:
        share.uniqueVisitCount != null
          ? `${share.uniqueVisitCount} unique (backend)`
          : 'unique: not supplied by backend',
    },
    {
      n: 3,
      label: 'Registration',
      badge:
        signups.length === 0
          ? 'none'
          : attributedRegs(signups) > 0
            ? `${attributedRegs(signups)} attributed`
            : `${signups.length} unconfirmed`,
      variant: statusOf(signups),
      detail: statusSummary(signups),
    },
    {
      n: 4,
      label: 'Attribution decision',
      badge: qualifiedEvents.length > 0 ? 'qualified' : events.some((e) => e.status === 'pending') ? 'pending' : 'none',
      variant: qualifiedEvents.length > 0 ? 'success' : events.some((e) => e.status === 'pending') ? 'neutral' : 'neutral',
      detail: statusSummary(events),
    },
    {
      n: 5,
      label: 'Campaign join',
      badge: joins.length > 0 ? `${joins.length}` : 'none',
      variant: statusOf(joins),
      detail: statusSummary(joins),
    },
    {
      n: 6,
      label: 'Contribution',
      badge: contributions.length > 0 ? `${contributions.length}` : 'none',
      variant: statusOf(contributions),
      detail: statusSummary(contributions),
    },
    {
      n: 7,
      label: 'Referral outcome',
      badge: signups.length > 0 ? (signups[0]?.status ?? 'none') : 'none',
      variant: signups.length > 0 ? STATUS_BADGE[signups[0]?.status ?? 'pending'] : 'neutral',
      detail:
        signups.length === 0
          ? 'no registration recorded'
          : 'qualification criteria are backend-configured (§17-4)',
    },
  ]
}

/** Referral candidates with backend-decided status columns (§17-4). */
function ReferralsTable({
  referrals,
  usersById,
}: {
  referrals: ReferralRecord[]
  usersById: Map<string, PublicUser>
}) {
  return (
    <div className='space-y-3'>
      <div className='rounded-lg bg-gray-50 p-3 text-xs text-gray-600'>
        One row per registration recorded against a share. Qualification criteria are configured
        per campaign and decided by the backend (§17-4) — statuses below are the recorded
        decisions; unconfirmed registrations stay pending here until confirmed.
      </div>
      {referrals.length === 0 ? (
        <div className='card'>
          <p className='card-content text-sm text-gray-500'>No referral candidates recorded yet.</p>
        </div>
      ) : (
        <div className='space-y-2'>
          {referrals.map((r) => (
            <div key={r.id} className='card'>
              <div className='card-content flex flex-wrap items-center justify-between gap-2 text-sm'>
                <div className='min-w-0'>
                  <p className='font-medium text-gray-900'>{r.referredLabel ?? 'Referred person not recorded'}</p>
                  <p className='text-xs text-gray-500'>
                    {usersById.get(r.sharerId)?.name ?? r.sharerId} ({r.sharerType}) ·{' '}
                    {r.campaignTitle ?? r.campaignId ?? 'no campaign'} · {formatDate(r.occurredAt)} · code {r.trackingCode}
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-xs text-gray-500'>
                    window: {r.attributionWindowDays != null ? `${r.attributionWindowDays} days` : '—'}
                  </span>
                  {r.source === 'demo' && <Badge variant='warning'>demo seed</Badge>}
                  <Badge variant={STATUS_BADGE[r.status]}>{r.status}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, icon, caption }: { label: string; value: number; icon?: React.ReactNode; caption?: string }) {
  return (
    <div className='card'>
      <div className='card-content flex flex-col items-center gap-1 text-center'>
        {icon && <span className='flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600'>{icon}</span>}
        <p className={cn('text-xl font-bold text-gray-900')}>{value}</p>
        <p className='text-xs text-gray-500'>{label}</p>
        {caption && <p className='text-[11px] text-gray-400'>{caption}</p>}
      </div>
    </div>
  )
}
