import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, Flag, Gift, QrCode, Trophy } from 'lucide-react'
import { adminApi } from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth.store'
import { canAdmin } from '@/lib/permissions'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { formatDate, formatPence } from '../business/helpers'
import type { CampaignShareConfig, LeaderboardMetric } from '@/types/community-public'

/**
 * Per-campaign detail (spec §5 item 6, §7.4): sharing configuration, the
 * referral configuration *as actually configured* (never hardcoded rules),
 * the campaign QR record, campaign-scoped attribution, the config-driven
 * leaderboard and links to the campaign's rewards.
 *
 * Hard rules honoured here (§7, §13, §16, §17-3/4/5):
 * - Referral criteria, attribution windows and leaderboard ranking are the
 *   configured values stored per campaign — the frontend never hardcodes or
 *   enforces qualification logic; the backend decides outcomes.
 * - Clicks are totals; unique clicks appear only when a backend supplies
 *   them. Pending events are never presented as confirmed outcomes.
 * - QR records are ordinary tracked shares (one ledger, §15).
 * - Reward triggers are processed by the connected product — links only.
 * - Config edits are audited (§14) and gated by 'Configure campaigns'
 *   (role grants pending §17-6).
 */

const METRIC_LABEL: Record<LeaderboardMetric, string> = {
  qualified: 'Qualified outcomes',
  registrations: 'Confirmed registrations',
  clicks: 'Clicks (total)',
}

export function AdminCampaignDetailPage() {
  const { id = '' } = useParams()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const canConfigure = canAdmin(user, 'configure_campaigns')
  const canViewAttribution = canAdmin(user, 'view_attribution')
  const gateTitle = canConfigure ? undefined : "Requires 'Configure campaigns' — role grants pending §17-6"

  const { data: campaigns = [], isLoading } = useQuery({ queryKey: ['admin', 'campaigns'], queryFn: adminApi.listCampaigns })
  const campaign = campaigns.find((c) => c.id === id)

  const { data: users = [] } = useQuery({ queryKey: ['admin', 'users'], queryFn: adminApi.listUsers })
  const { data: attribution } = useQuery({
    queryKey: ['admin', 'campaign-attribution', id],
    queryFn: () => adminApi.listCampaignAttribution(id),
  })

  const [config, setConfig] = useState<CampaignShareConfig>(() => adminApi.getCampaignConfig(id))
  const [criteriaDraft, setCriteriaDraft] = useState(config.referralCriteria ?? '')
  const [windowDraft, setWindowDraft] = useState(config.referralWindowDays != null ? String(config.referralWindowDays) : '')
  const [qrResult, setQrResult] = useState<{ trackingCode: string; shareUrl: string; qrCodeUrl?: string | null } | null>(null)

  // Re-sync config state when switching between campaign details (the route
  // param can change without a remount).
  useEffect(() => {
    const cfg = adminApi.getCampaignConfig(id)
    setConfig(cfg)
    setCriteriaDraft(cfg.referralCriteria ?? '')
    setWindowDraft(cfg.referralWindowDays != null ? String(cfg.referralWindowDays) : '')
    setQrResult(null)
  }, [id])

  const saveConfig = useMutation({
    mutationFn: (patch: Partial<Omit<CampaignShareConfig, 'campaignId'>>) => adminApi.saveCampaignConfig(id, patch),
    onSuccess: (next) => {
      setConfig(next)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] })
    },
  })

  const createQr = useMutation({
    mutationFn: () => adminApi.createCampaignQr(id),
    onSuccess: (res) => {
      setQrResult(res)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'campaign-attribution', id] })
    },
  })

  const saveCriteria = () => {
    const days = windowDraft.trim() === '' ? null : Number.parseInt(windowDraft, 10)
    saveConfig.mutate({
      referralCriteria: criteriaDraft.trim() || null,
      referralWindowDays: days != null && Number.isFinite(days) && days > 0 ? days : null,
    })
  }

  const criteriaDirty =
    criteriaDraft.trim() !== (config.referralCriteria ?? '') ||
    (windowDraft.trim() === '' ? config.referralWindowDays != null : String(config.referralWindowDays) !== windowDraft.trim())

  if (isLoading) return <Skeleton className='h-64 w-full' />

  if (!campaign) {
    return (
      <div className='card'>
        <EmptyState
          icon={<Flag className='h-10 w-10' />}
          title='Campaign not found'
          description='It may have been removed from the connected product.'
          action={<Link to='/admin/campaigns' className='btn btn-secondary btn-sm'>Back to campaigns</Link>}
        />
      </div>
    )
  }

  const shares = attribution?.shares ?? []
  const events = attribution?.events ?? []
  const usersById = new Map(users.map((u) => [u.id, u]))
  const qrShares = shares.filter((s) => s.shareType === 'qr')

  const clicks = events.filter((e) => e.eventType === 'visit').length
  const signupEvents = events.filter((e) => e.eventType === 'signup')
  const confirmedRegs = signupEvents.filter((e) => e.status === 'attributed' || e.status === 'qualified').length
  const unconfirmedRegs = signupEvents.filter((e) => e.status === 'pending').length
  const joins = events.filter((e) => e.eventType === 'campaign_join').length
  const qualified = events.filter((e) => e.status === 'qualified').length
  const pending = events.filter((e) => e.status === 'pending').length

  // Config-driven leaderboard (spec §5 item 6): rows are ranked by the
  // campaign's configured metric over the recorded events. Qualification is
  // the backend's decision (§17-3/§17-4) — pending registrations are never
  // counted, and demo-seeded shares stay labelled (§16).
  const leaderboardRows = (() => {
    const bySharer = new Map<
      string,
      { name: string; type: string; clicks: number; registrations: number; unconfirmed: number; qualified: number; demo: boolean }
    >()
    for (const share of shares) {
      const row = bySharer.get(share.sharerId) ?? {
        name: usersById.get(share.sharerId)?.name ?? share.sharerId,
        type: share.sharerType,
        clicks: 0,
        registrations: 0,
        unconfirmed: 0,
        qualified: 0,
        demo: false,
      }
      if (share.source === 'demo') row.demo = true
      const shareEvents = events.filter((e) => e.trackingCode === share.trackingCode)
      row.clicks += shareEvents.filter((e) => e.eventType === 'visit').length
      row.registrations += shareEvents.filter(
        (e) => e.eventType === 'signup' && (e.status === 'attributed' || e.status === 'qualified'),
      ).length
      row.unconfirmed += shareEvents.filter((e) => e.eventType === 'signup' && e.status === 'pending').length
      row.qualified += shareEvents.filter((e) => e.status === 'qualified').length
      bySharer.set(share.sharerId, row)
    }
    const metric = config.leaderboardMetric
    return [...bySharer.values()].sort((a, b) => {
      const diff = b[metric] - a[metric]
      return diff !== 0 ? diff : a.name.localeCompare(b.name)
    })
  })()

  const metricValue = (row: (typeof leaderboardRows)[number]): number => row[config.leaderboardMetric]

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div className='min-w-0'>
          <Link to='/admin/campaigns' className='mb-1 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline'>
            <ArrowLeft className='h-3.5 w-3.5' /> All campaigns
          </Link>
          <h2 className='text-lg font-bold text-gray-900'>{campaign.title}</h2>
          <p className='text-sm text-gray-600'>
            {campaign.creator?.name ?? 'Unknown organiser'}
            {campaign.location?.cityName ? ` · ${campaign.location.cityName}` : ''}
            {campaign.endDate ? ` · ends ${formatDate(campaign.endDate)}` : ''}
            {' · '}
            raised {formatPence(campaign.raisedAmountPence)} of {formatPence(campaign.goalAmountPence)}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Badge variant={campaign.status === 'active' ? 'success' : 'neutral'}>{campaign.status ?? 'active'}</Badge>
          <Link to='/community' className='text-xs font-medium text-primary-600 hover:underline'>
            View in Community
          </Link>
        </div>
      </div>

      {/* Sharing configuration (spec §5 item 6, §13) */}
      <section className='card' aria-label='Sharing configuration'>
        <div className='card-header'>
          <h3 className='text-base font-semibold text-gray-900'>Sharing</h3>
          <p className='text-xs text-gray-500'>
            Controls whether members can share this campaign. Attribution outcomes are always decided by the server
            (§7.4).
          </p>
        </div>
        <div className='space-y-2 px-4 py-3'>
          <label className='flex items-center gap-2 text-sm text-gray-800'>
            <input
              type='checkbox'
              checked={config.sharingEnabled}
              disabled={!canConfigure || saveConfig.isPending}
              title={gateTitle}
              onChange={(e) => saveConfig.mutate({ sharingEnabled: e.target.checked })}
            />
            Sharing enabled
            {config.source === 'demo' && <Badge variant='warning'>demo seed</Badge>}
          </label>
          <p className='text-xs text-gray-400'>
            Last updated {formatDate(config.updatedAt)}
            {config.updatedBy ? ` by ${config.updatedBy}` : ''}
          </p>
        </div>
      </section>

      {/* Referral configuration (§17-4 — criteria as configured, never hardcoded) */}
      <section className='card' aria-label='Referral configuration'>
        <div className='card-header'>
          <h3 className='text-base font-semibold text-gray-900'>Referrals</h3>
          <p className='text-xs text-gray-500'>
            The criteria below are the campaign's actual configured rules, stored as data. Community displays them;
            qualification is decided by the backend against them (§17-4 pending formal sign-off).
          </p>
        </div>
        <div className='space-y-3 px-4 py-3'>
          <label className='flex items-center gap-2 text-sm text-gray-800'>
            <input
              type='checkbox'
              checked={config.referralEnabled}
              disabled={!canConfigure || saveConfig.isPending}
              title={gateTitle}
              onChange={(e) => saveConfig.mutate({ referralEnabled: e.target.checked })}
            />
            Referral tracking enabled
          </label>
          <div>
            <label htmlFor='referral-criteria' className='mb-1 block text-xs font-medium text-gray-700'>
              Configured criteria
            </label>
            <textarea
              id='referral-criteria'
              className='input-field min-h-[80px] resize-y text-sm'
              placeholder='Describe what qualifies as a referral for this campaign…'
              value={criteriaDraft}
              disabled={!canConfigure}
              title={gateTitle}
              onChange={(e) => setCriteriaDraft(e.target.value)}
            />
          </div>
          <div className='flex flex-wrap items-end gap-3'>
            <div>
              <label htmlFor='referral-window' className='mb-1 block text-xs font-medium text-gray-700'>
                Attribution window (days)
              </label>
              <input
                id='referral-window'
                type='number'
                min={1}
                className='input-field w-32 py-1.5 text-sm'
                placeholder='—'
                value={windowDraft}
                disabled={!canConfigure}
                title={gateTitle}
                onChange={(e) => setWindowDraft(e.target.value)}
              />
              <p className='mt-1 text-[11px] text-gray-400'>
                Shown as configured; enforcement and deduplication are backend-owned (§17-3).
              </p>
            </div>
            <Button
              size='sm'
              variant='secondary'
              disabled={!canConfigure || !criteriaDirty || saveConfig.isPending}
              title={gateTitle}
              onClick={saveCriteria}
            >
              {saveConfig.isPending ? 'Saving…' : 'Save criteria'}
            </Button>
          </div>
        </div>
      </section>

      {/* QR record (spec §5 item 6 — QR is an ordinary tracked share, §15) */}
      <section className='card' aria-label='QR record'>
        <div className='card-header flex flex-wrap items-center justify-between gap-2'>
          <div>
            <h3 className='text-base font-semibold text-gray-900'>QR record</h3>
            <p className='text-xs text-gray-500'>
              A QR code is a tracked share of this campaign — one ledger entry, visible in Sharing &amp; Attribution
              (§15), never a separate counter.
            </p>
          </div>
          <Button
            size='sm'
            icon={<QrCode className='h-4 w-4' />}
            disabled={!canConfigure || createQr.isPending}
            title={gateTitle}
            onClick={() => createQr.mutate()}
          >
            {createQr.isPending ? 'Creating…' : 'Create QR'}
          </Button>
        </div>
        <div className='space-y-3 px-4 py-3'>
          {qrResult && (
            <div className='flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 p-3 text-sm'>
              {qrResult.qrCodeUrl ? (
                <img src={qrResult.qrCodeUrl} alt='Campaign QR code' className='h-24 w-24 rounded bg-white' />
              ) : null}
              <div className='min-w-0'>
                <p className='font-medium text-gray-900'>QR created</p>
                <p className='text-xs text-gray-500'>
                  Code <code className='rounded bg-gray-100 px-1'>{qrResult.trackingCode}</code>
                </p>
                <p className='truncate text-xs text-gray-500'>{qrResult.shareUrl}</p>
              </div>
            </div>
          )}
          {qrShares.length === 0 ? (
            <p className='text-sm text-gray-500'>No QR records yet.</p>
          ) : (
            <ul className='divide-y divide-gray-100 rounded-lg border border-gray-100'>
              {qrShares.map((s) => (
                <li key={s.id} className='flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm'>
                  <span className='min-w-0'>
                    <code className='rounded bg-gray-100 px-1 text-xs'>{s.trackingCode}</code>
                    <span className='ml-2 text-xs text-gray-500'>
                      {usersById.get(s.sharerId)?.name ?? s.sharerId} · {formatDate(s.createdAt)}
                    </span>
                  </span>
                  <span className='flex items-center gap-2'>
                    {s.source === 'demo' && <Badge variant='warning'>demo seed</Badge>}
                    <a
                      href={s.shareUrl}
                      target='_blank'
                      rel='noreferrer'
                      className='inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline'
                    >
                      Open <ExternalLink className='h-3 w-3' />
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Campaign-scoped attribution (spec §7.4) */}
      <section className='card' aria-label='Campaign attribution'>
        <div className='card-header flex flex-wrap items-center justify-between gap-2'>
          <div>
            <h3 className='text-base font-semibold text-gray-900'>Attribution (this campaign)</h3>
            <p className='text-xs text-gray-500'>
              Scoped view of the sharing ledger (§7.4). Clicks are totals; unique clicks appear only when the backend
              supplies them. Pending events are never counted as outcomes (§17-3).
            </p>
          </div>
          <Link to='/admin/sharing' className='text-xs font-medium text-primary-600 hover:underline'>
            Full journey drill-down →
          </Link>
        </div>
        {canViewAttribution ? (
          <div className='px-4 py-3'>
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-5'>
              <AttributionStat label='Shares' value={shares.length} />
              <AttributionStat label='Clicks (total)' value={clicks} caption='unique: backend-supplied only' />
              <AttributionStat
                label='Registrations'
                value={confirmedRegs}
                caption={unconfirmedRegs > 0 ? `${unconfirmedRegs} unconfirmed` : 'all confirmed'}
              />
              <AttributionStat label='Joins' value={joins} />
              <AttributionStat label='Qualified' value={qualified} caption={pending > 0 ? `${pending} pending` : undefined} />
            </div>
          </div>
        ) : (
          <p className='px-4 py-3 text-sm text-gray-500'>
            Requires &lsquo;View attribution&rsquo; — role grants pending §17-6.
          </p>
        )}
      </section>

      {/* Config-driven leaderboard (spec §5 item 6 — ranking is configuration, not a hardcoded rule) */}
      <section className='card' aria-label='Leaderboard'>
        <div className='card-header flex flex-wrap items-center justify-between gap-2'>
          <div>
            <h3 className='text-base font-semibold text-gray-900'>
              <Trophy className='mr-1 inline h-4 w-4 text-amber-500' />
              Leaderboard
            </h3>
            <p className='text-xs text-gray-500'>
              Ranked by the configured metric. Qualification is backend-decided (§17-3/§17-4); pending registrations
              are shown separately and never ranked.
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <label className='flex items-center gap-2 text-sm text-gray-800'>
              <input
                type='checkbox'
                checked={config.leaderboardEnabled}
                disabled={!canConfigure || saveConfig.isPending}
                title={gateTitle}
                onChange={(e) => saveConfig.mutate({ leaderboardEnabled: e.target.checked })}
              />
              Enabled
            </label>
            <label className='flex items-center gap-1.5 text-xs text-gray-600'>
              Metric:
              <select
                value={config.leaderboardMetric}
                disabled={!canConfigure || saveConfig.isPending}
                title={gateTitle}
                className='input-field w-auto py-1 text-xs'
                onChange={(e) => saveConfig.mutate({ leaderboardMetric: e.target.value as LeaderboardMetric })}
              >
                <option value='qualified'>Qualified outcomes</option>
                <option value='registrations'>Confirmed registrations</option>
                <option value='clicks'>Clicks (total)</option>
              </select>
            </label>
          </div>
        </div>
        <div className='px-4 py-3'>
          {!config.leaderboardEnabled ? (
            <p className='text-sm text-gray-500'>Leaderboard is off for this campaign.</p>
          ) : leaderboardRows.length === 0 ? (
            <p className='text-sm text-gray-500'>No shares recorded for this campaign yet.</p>
          ) : (
            <>
              <ol className='space-y-1.5'>
                {leaderboardRows.map((row, i) => (
                  <li
                    key={row.name + i}
                    className='flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm'
                  >
                    <span className='flex min-w-0 items-center gap-2'>
                      <span className='w-6 shrink-0 text-center text-xs font-bold text-gray-400'>{i + 1}</span>
                      <span className='min-w-0'>
                        <span className='font-medium text-gray-900'>{row.name}</span>
                        <span className='ml-2 text-xs text-gray-500'>({row.type})</span>
                      </span>
                      {row.demo && <Badge variant='warning'>demo seed</Badge>}
                    </span>
                    <span className='flex items-center gap-3 text-xs text-gray-500'>
                      <span>clicks {row.clicks}</span>
                      <span>
                        registrations {row.registrations}
                        {row.unconfirmed > 0 ? ` (+${row.unconfirmed} unconfirmed)` : ''}
                      </span>
                      <span className={cn('text-base font-bold text-gray-900')}>{metricValue(row)}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className='mt-2 text-[11px] text-gray-400'>
                Ranking metric: {METRIC_LABEL[config.leaderboardMetric]}. Clicks are totals and are not outcomes;
                shares, clicks and qualified outcomes remain distinct measures (§7, §16).
              </p>
            </>
          )}
        </div>
      </section>

      {/* Rewards link (spec §5 item 6 — triggers are the connected product's, §17-5) */}
      <section className='card' aria-label='Rewards'>
        <div className='card-header'>
          <h3 className='text-base font-semibold text-gray-900'>
            <Gift className='mr-1 inline h-4 w-4 text-pink-500' />
            Rewards
          </h3>
          <p className='text-xs text-gray-500'>
            Reward triggers and claim handling are processed by the connected product — Community links to the
            configured reward pages (§17-5 pending).
          </p>
        </div>
        <RewardList campaignId={id} />
      </section>
    </div>
  )
}

function AttributionStat({ label, value, caption }: { label: string; value: number; caption?: string }) {
  return (
    <div className='rounded-lg bg-gray-50 p-2 text-center'>
      <p className='text-xl font-bold text-gray-900'>{value}</p>
      <p className='text-xs text-gray-500'>{label}</p>
      {caption && <p className='text-[11px] text-gray-400'>{caption}</p>}
    </div>
  )
}

function RewardList({ campaignId }: { campaignId: string }) {
  const rewards = adminApi.listCampaignRewards(campaignId)
  if (rewards.length === 0) {
    return <p className='px-4 py-3 text-sm text-gray-500'>No rewards configured for this campaign.</p>
  }
  return (
    <ul className='divide-y divide-gray-100 px-4 py-1'>
      {rewards.map((r) => (
        <li key={r.id} className='flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm'>
          <span className='min-w-0'>
            <span className='font-medium text-gray-900'>{r.title}</span>
            {r.valueText && <span className='ml-2 text-xs text-gray-500'>{r.valueText}</span>}
            {r.status === 'ended' && <Badge variant='neutral'>ended</Badge>}
          </span>
          <Link to={`/community/reward/${r.id}`} className='inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline'>
            Open reward page <ExternalLink className='h-3 w-3' />
          </Link>
        </li>
      ))}
    </ul>
  )
}
