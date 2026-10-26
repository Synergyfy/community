import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Info, Pencil, Plus, X } from 'lucide-react'
import { adminApi } from '@/services/admin.service'
import { PostType, ExchangeType } from '@/lib/constants'
import { ADMIN_ACTIONS, getRoleGrants, type AdminAction } from '@/lib/permissions'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { ContentCategory, LeaderboardMetric, ReportReason } from '@/types/community-public'

/**
 * Community Configuration (spec §5.3 / §3.6 / §10 / §13): the single
 * configuration surface. Everything Community-wide is configured here;
 * per-record settings stay on their own screens — this page only *summarises*
 * those and links to their editing surface, so no record has two editors (§15).
 *
 * Consumed by: the #Exchange composer (type switches), the report modal
 * (reasons), Discover/category pages (community categories), the exchange
 * composer + admin list + analytics (exchange categories), hashtag pages
 * (featured/restricted flags), and the campaign detail screens (per-campaign
 * sharing/referral/leaderboard — edited there, summarised here).
 */

const METRIC_LABEL: Record<LeaderboardMetric, string> = {
  qualified: 'Qualified outcomes',
  registrations: 'Confirmed registrations',
  clicks: 'Clicks (total)',
}

/** Role columns of the §14 action matrix — public visitors hold no admin actions. */
const ROLE_COLUMNS: Array<{ id: 'admin' | 'business' | 'consumer'; label: string }> = [
  { id: 'admin', label: 'Admin' },
  { id: 'business', label: 'Business' },
  { id: 'consumer', label: 'Consumer' },
]

const GROUP_LABEL: Record<'moderation' | 'configuration' | 'oversight', string> = {
  moderation: 'Moderation',
  configuration: 'Configuration',
  oversight: 'Oversight',
}

function Section({
  title,
  note,
  children,
  action,
}: {
  title: string
  note?: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className='card overflow-hidden'>
      <div className='card-header flex items-start justify-between gap-2'>
        <div className='min-w-0'>
          <h3 className='text-base font-semibold text-gray-900'>{title}</h3>
          {note && <p className='text-xs text-gray-500'>{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function AdminConfigPage() {
  const queryClient = useQueryClient()
  const [config, setConfig] = useState(() => adminApi.getConfig())
  const [newReason, setNewReason] = useState('')
  const [reasonError, setReasonError] = useState('')

  // Community categories (§3.2) — the same store Discover and category pages consume.
  const { data: communityCategories = [] } = useQuery({
    queryKey: ['admin', 'config', 'categories', 'community'],
    queryFn: () => adminApi.listCategories('community'),
  })
  const [newCatName, setNewCatName] = useState('')
  const [catError, setCatError] = useState('')
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')

  // Hashtag flags (§3.3) — the same records hashtag pages display.
  const { data: hashtags = [] } = useQuery({
    queryKey: ['admin', 'config', 'hashtags'],
    queryFn: () => adminApi.listHashtags(),
  })

  // Admin role matrix (§14, §17-6) — the grants store canAdmin reads.
  const [roleGrants, setRoleGrants] = useState(() => getRoleGrants())

  // Campaign summary (§5 item 6, §7.4) — edited on each campaign's detail page.
  const { data: campaigns = [] } = useQuery({ queryKey: ['admin', 'campaigns'], queryFn: () => adminApi.listCampaigns() })
  const rewards = adminApi.listRewards()

  const exchangeCategories = adminApi.listCategories('exchange')

  const updateType = (type: string, patch: Partial<{ enabled: boolean; whoCanCreate: string; requiresApproval: boolean }>) => {
    const current = config.exchangeTypes[type] ?? { enabled: true, whoCanCreate: 'both', requiresApproval: false }
    const next = { ...current, ...patch } as (typeof current)
    setConfig({ ...config, exchangeTypes: { ...config.exchangeTypes, [type]: next } })
    void adminApi.setExchangeTypeConfig(type, next)
  }

  const saveReasons = (reasons: ReportReason[]) => {
    setConfig({ ...config, reportReasons: reasons })
    void adminApi.setReportReasons(reasons)
  }

  const addReason = () => {
    const label = newReason.trim()
    if (!label) return
    if (config.reportReasons.some((r) => r.label.toLowerCase() === label.toLowerCase())) {
      setReasonError('That reason already exists.')
      return
    }
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    saveReasons([...config.reportReasons, { id, label }])
    setNewReason('')
    setReasonError('')
  }

  const removeReason = (id: string) => {
    if (config.reportReasons.length <= 1) {
      setReasonError('At least one report reason must remain.')
      return
    }
    saveReasons(config.reportReasons.filter((r) => r.id !== id))
    setReasonError('')
  }

  // --- Community categories -------------------------------------------------
  const refreshCategories = () => queryClient.invalidateQueries({ queryKey: ['admin', 'config', 'categories', 'community'] })
  const refreshHashtags = () => queryClient.invalidateQueries({ queryKey: ['admin', 'config', 'hashtags'] })

  const addCategory = async () => {
    const name = newCatName.trim()
    if (!name) return
    if (communityCategories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setCatError('That category already exists.')
      return
    }
    await adminApi.createCategory({ kind: 'community', name })
    setNewCatName('')
    setCatError('')
    await refreshCategories()
  }

  const renameCategory = async (id: string) => {
    const name = editCatName.trim()
    if (!name) return
    await adminApi.updateCategory('community', id, { name })
    setEditCatId(null)
    setEditCatName('')
    await refreshCategories()
  }

  const toggleCategory = async (id: string, active: boolean) => {
    await adminApi.updateCategory('community', id, { active })
    await refreshCategories()
  }

  const moveCategory = async (id: string, direction: -1 | 1) => {
    await adminApi.moveCategory('community', id, direction)
    await refreshCategories()
  }

  // --- Admin role matrix (§14, §17-6) --------------------------------------
  const notifyGrantsChanged = () => window.dispatchEvent(new Event('community-role-grants-changed'))

  const toggleRoleGrant = async (action: AdminAction, role: 'admin' | 'business' | 'consumer', granted: boolean) => {
    await adminApi.setRoleGrant(action, role, granted)
    setRoleGrants(getRoleGrants())
    notifyGrantsChanged()
  }

  const resetRoleGrants = async () => {
    await adminApi.resetRoleGrants()
    setRoleGrants(getRoleGrants())
    notifyGrantsChanged()
  }

  const postTypes = Object.values(PostType)

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-gray-900'>Community Configuration</h2>
        <p className='text-sm text-gray-600'>
          The single configuration surface for Community-wide rules (§13). Per-record settings stay on their own
          screens — this page summarises them and links to where they are edited, so no record has two editors (§15).
        </p>
      </div>

      <Section
        title='#Exchange item types'
        note='Consumed by the #Exchange composer (members only see types their account can create) and the #Exchange admin list (items of disabled types stay visible for history).'
      >
        <div className='divide-y divide-gray-100'>
          {Object.values(ExchangeType).map((type) => {
            const cfg = config.exchangeTypes[type] ?? { enabled: true, whoCanCreate: 'both' as const, requiresApproval: false }
            return (
              <div key={type} className='space-y-2 px-4 py-3'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <p className='text-sm font-medium capitalize text-gray-900'>{type.replace(/_/g, ' ')}</p>
                  {!cfg.enabled && <Badge variant='warning'>Disabled</Badge>}
                </div>
                <div className='flex flex-wrap items-center gap-4 text-xs text-gray-600'>
                  <label className='flex items-center gap-1.5'>
                    <input type='checkbox' checked={cfg.enabled} onChange={(e) => updateType(type, { enabled: e.target.checked })} />
                    Enabled
                  </label>
                  <label className='flex items-center gap-1.5'>
                    <input type='checkbox' checked={cfg.requiresApproval} onChange={(e) => updateType(type, { requiresApproval: e.target.checked })} />
                    Requires approval
                  </label>
                  <label className='flex items-center gap-1.5'>
                    Who can create:
                    <select
                      value={cfg.whoCanCreate}
                      onChange={(e) => updateType(type, { whoCanCreate: e.target.value as typeof cfg.whoCanCreate })}
                      className='input-field w-auto py-1 text-xs'
                    >
                      <option value='both'>Businesses & consumers</option>
                      <option value='business'>Businesses only</option>
                      <option value='consumer'>Consumers only</option>
                      <option value='admin'>Admin only</option>
                    </select>
                  </label>
                </div>
              </div>
            )
          })}
        </div>
        <p className='px-4 pb-3 text-[11px] text-gray-400'>
          “Requires approval” is shown to members in the composer; the review workflow itself is pending the §17-2
          transition decision — no approval state is invented.
        </p>
      </Section>

      <Section
        title='Community categories'
        note='The Discover grid and category pages consume exactly this list (§15). Hiding a category removes it from public pickers; existing posts keep their category.'
      >
        <ul className='divide-y divide-gray-100'>
          {communityCategories.map((c, i) => (
            <li key={c.id} className='flex flex-wrap items-center justify-between gap-2 px-4 py-2.5'>
              {editCatId === c.id ? (
                <div className='flex min-w-0 flex-1 items-center gap-2'>
                  <input
                    className='input-field flex-1 py-1 text-sm'
                    value={editCatName}
                    onChange={(e) => setEditCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void renameCategory(c.id)
                      if (e.key === 'Escape') setEditCatId(null)
                    }}
                    aria-label={`Rename category ${c.name}`}
                    autoFocus
                  />
                  <Button size='sm' onClick={() => void renameCategory(c.id)} disabled={!editCatName.trim()}>
                    Save
                  </Button>
                  <button className='btn-icon text-gray-500' onClick={() => setEditCatId(null)} aria-label='Cancel rename'>
                    <X className='h-4 w-4' />
                  </button>
                </div>
              ) : (
                <>
                  <span className='flex min-w-0 items-center gap-2 text-sm text-gray-800'>
                    <span className='min-w-0 truncate'>{c.name}</span>
                    {!c.active && <Badge variant='warning'>Hidden</Badge>}
                  </span>
                  <span className='flex items-center gap-1'>
                    <label className='mr-2 flex items-center gap-1.5 text-xs text-gray-600'>
                      <input type='checkbox' checked={c.active} onChange={(e) => void toggleCategory(c.id, e.target.checked)} />
                      Visible
                    </label>
                    <button
                      className='btn-icon text-gray-400 disabled:opacity-30'
                      onClick={() => void moveCategory(c.id, -1)}
                      disabled={i === 0}
                      aria-label={`Move ${c.name} up`}
                    >
                      <ArrowUp className='h-4 w-4' />
                    </button>
                    <button
                      className='btn-icon text-gray-400 disabled:opacity-30'
                      onClick={() => void moveCategory(c.id, 1)}
                      disabled={i === communityCategories.length - 1}
                      aria-label={`Move ${c.name} down`}
                    >
                      <ArrowDown className='h-4 w-4' />
                    </button>
                    <button
                      className='btn-icon text-gray-400 hover:text-primary-600'
                      onClick={() => {
                        setEditCatId(c.id)
                        setEditCatName(c.name)
                        setCatError('')
                      }}
                      aria-label={`Rename ${c.name}`}
                    >
                      <Pencil className='h-4 w-4' />
                    </button>
                  </span>
                </>
              )}
            </li>
          ))}
          {communityCategories.length === 0 && <li className='px-4 py-3 text-sm text-gray-500'>No categories yet.</li>}
        </ul>
        <div className='space-y-2 px-4 pb-4'>
          <div className='flex flex-wrap items-center gap-2'>
            <input
              className={cn('input-field flex-1', catError && 'border-red-400')}
              placeholder='Add a community category…'
              value={newCatName}
              onChange={(e) => {
                setNewCatName(e.target.value)
                setCatError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void addCategory()
                }
              }}
              aria-label='New community category'
            />
            <Button size='sm' variant='secondary' icon={<Plus className='h-4 w-4' />} onClick={() => void addCategory()}>
              Add
            </Button>
          </div>
          {catError && <p className='text-xs text-red-600'>{catError}</p>}
        </div>
      </Section>

      <Section
        title='#Exchange categories'
        note='Management (add / rename / reorder / show-hide) lives on the #Exchange module (§5.2) — one editing surface, one record (§15). The exchange composer, admin list and analytics all consume this store.'
        action={
          <Link to='/admin/exchange' className='shrink-0 text-sm font-medium text-primary-600 hover:underline'>
            Manage on #Exchange
          </Link>
        }
      >
        <ul className='flex flex-wrap gap-1.5 px-4 pb-4'>
          {exchangeCategories.map((c: ContentCategory) => (
            <li key={c.id} className='flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600'>
              {c.name}
              {!c.active && <Badge variant='warning'>Hidden</Badge>}
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title='Hashtags'
        note='Featured and restricted flags are recorded on the hashtag itself and shown on the hashtag page (§3.3). What “restricted” enforces is a pending product decision (§9) — the flag is recorded and displayed, nothing more.'
      >
        <ul className='divide-y divide-gray-100'>
          {hashtags.map((h) => (
            <li key={h.slug} className='flex flex-wrap items-center justify-between gap-2 px-4 py-2.5'>
              <span className='flex min-w-0 items-center gap-2 text-sm text-gray-800'>
                <span className='font-medium'>#{h.tag}</span>
                <span className='text-xs text-gray-500'>{h.usageCount} posts</span>
                {h.featured && <Badge variant='primary'>Featured</Badge>}
                {h.restricted && <Badge variant='warning'>Restricted</Badge>}
              </span>
              <span className='flex items-center gap-2'>
                <button
                  className='text-xs font-medium text-primary-600 hover:underline'
                  onClick={() => void adminApi.updateHashtag(h.tag, { featured: !h.featured }).then(() => refreshHashtags())}
                >
                  {h.featured ? 'Unfeature' : 'Feature'}
                </button>
                <button
                  className={cn('text-xs font-medium hover:underline', h.restricted ? 'text-amber-700' : 'text-gray-600')}
                  onClick={() => void adminApi.updateHashtag(h.tag, { restricted: !h.restricted }).then(() => refreshHashtags())}
                >
                  {h.restricted ? 'Remove restriction' : 'Restrict'}
                </button>
              </span>
            </li>
          ))}
        </ul>
        <p className='px-4 pb-3 text-[11px] text-gray-400'>
          Both actions are audited (feature/unfeature hashtag, update hashtag) and change the same records hashtag
          pages and search results read (§15).
        </p>
      </Section>

      <Section
        title='Admin roles & permissions'
        note='The §14 action matrix: which account types hold each administrative action. Grants shape which sections and controls appear in the dashboard; admin routes are guarded separately, and the server is the authority (§5.5).'
        action={
          <Button size='sm' variant='secondary' onClick={() => void resetRoleGrants()}>
            Reset to defaults
          </Button>
        }
      >
        <p className='mx-4 mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800'>
          Role assignments are an open product decision (§17-6). Every action ships seeded <strong>admin-only</strong>{' '}
          — edit here once assignments are agreed; each change is recorded in the Audit Log (§14).
        </p>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-gray-100 text-xs text-gray-500'>
                <th className='px-4 py-2 text-left font-medium'>Action</th>
                {ROLE_COLUMNS.map((col) => (
                  <th key={col.id} className='px-3 py-2 text-center font-medium'>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            {(['moderation', 'configuration', 'oversight'] as const).map((group) => (
              <tbody key={group}>
                <tr>
                  <th
                    colSpan={4}
                    className='bg-gray-50 px-4 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500'
                  >
                    {GROUP_LABEL[group]}
                  </th>
                </tr>
                {ADMIN_ACTIONS.filter((a) => a.group === group).map((action) => (
                  <tr key={action.id} className='border-t border-gray-100 align-top'>
                    <td className='px-4 py-2.5'>
                      <p className='font-medium text-gray-900'>{action.label}</p>
                      <p className='text-xs text-gray-500'>{action.description}</p>
                      {roleGrants[action.id].length === 0 && (
                        <p className='mt-1 text-xs font-medium text-amber-700'>
                          No role holds this — hidden from every account.
                        </p>
                      )}
                    </td>
                    {ROLE_COLUMNS.map((col) => (
                      <td key={col.id} className='px-3 py-2.5 text-center'>
                        <input
                          type='checkbox'
                          checked={roleGrants[action.id].includes(col.id)}
                          onChange={(e) => void toggleRoleGrant(action.id, col.id, e.target.checked)}
                          aria-label={`${col.label} holds ${action.label}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
        <p className='px-4 pb-4 pt-3 text-[11px] text-gray-400'>
          Public visitors never hold administrative actions. Community Hub Managers are staff with their own permission
          set on the Manager Dashboard — manager permissions are separate from these admin-action grants.
        </p>
      </Section>

      <Section
        title='Announcements'
        note='Announcement-level settings live on each announcement — the composer controls audience, location scope, group scope, publish timing, expiry and pinning.'
        action={
          <Link to='/admin/announcements' className='shrink-0 text-sm font-medium text-primary-600 hover:underline'>
            Manage announcements
          </Link>
        }
      >
        <ul className='space-y-1 px-4 pb-4 text-sm text-gray-600'>
          <li>• Scheduling and expiry are swept on read: an announcement publishes or expires when its time passes and a surface loads it — no background timer.</li>
          <li>• One announcement record fans out to every targeted surface; audience, location and group targeting are applied centrally (§4, §15).</li>
          <li>• Publishing rights: admins, plus Community Hub Managers granted the publish-announcements permission, within their per-manager restrictions.</li>
          <li className='text-xs text-gray-500'>There are no platform-level announcement switches beyond these — none are invented pending product decisions.</li>
        </ul>
      </Section>

      <Section
        title='Campaign sharing, referral, leaderboard & rewards'
        note='Summary only — each campaign’s sharing config, referral criteria, attribution window, leaderboard metric and rewards are edited on that campaign’s detail page (§15: one editing surface per campaign). Values shown are stored configuration; qualification and windows are enforced by the backend (§17-3/§17-4).'
      >
        {campaigns.length === 0 ? (
          <p className='px-4 pb-4 text-sm text-gray-500'>No campaigns recorded.</p>
        ) : (
          <ul className='divide-y divide-gray-100'>
            {campaigns.map((campaign) => {
              const cfg = adminApi.getCampaignConfig(campaign.id)
              const rewardCount = rewards.filter((r) => r.campaignId === campaign.id).length
              return (
                <li key={campaign.id} className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3'>
                  <div className='min-w-0 space-y-1'>
                    <p className='truncate text-sm font-medium text-gray-900'>{campaign.title}</p>
                    <p className='flex flex-wrap items-center gap-1.5 text-xs text-gray-500'>
                      <Badge variant={campaign.status === 'active' ? 'success' : 'neutral'}>{campaign.status ?? 'unknown'}</Badge>
                      <span>Sharing {cfg.sharingEnabled ? 'on' : 'off'}</span>
                      <span>·</span>
                      <span>
                        Referrals {cfg.referralEnabled ? `on${cfg.referralWindowDays ? ` · ${cfg.referralWindowDays}-day window` : ''}` : 'off'}
                      </span>
                      <span>·</span>
                      <span>Leaderboard {cfg.leaderboardEnabled ? `on · ${METRIC_LABEL[cfg.leaderboardMetric]}` : 'off'}</span>
                      <span>·</span>
                      <span>
                        {rewardCount} reward{rewardCount === 1 ? '' : 's'}
                      </span>
                      {cfg.source === 'demo' && <Badge variant='warning'>demo config</Badge>}
                    </p>
                  </div>
                  <Link to={`/admin/campaigns/${campaign.id}`} className='shrink-0 text-xs font-medium text-primary-600 hover:underline'>
                    Manage
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <Section
        title='Report reasons'
        note='The reason choices shown in the report dialog (§3.6). Changes apply immediately for every account.'
      >
        <div className='space-y-3 px-4 pb-4'>
          <ul className='space-y-1.5'>
            {config.reportReasons.map((r) => (
              <li key={r.id} className='flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm'>
                <span className='min-w-0 truncate text-gray-800'>{r.label}</span>
                <button
                  onClick={() => removeReason(r.id)}
                  className='shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600'
                  aria-label={`Remove reason ${r.label}`}
                >
                  <X className='h-4 w-4' />
                </button>
              </li>
            ))}
          </ul>
          <div className='flex flex-wrap items-center gap-2'>
            <input
              className={cn('input-field flex-1', reasonError && 'border-red-400')}
              placeholder='Add a report reason…'
              value={newReason}
              onChange={(e) => {
                setNewReason(e.target.value)
                setReasonError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addReason()
                }
              }}
              aria-label='New report reason'
            />
            <Button size='sm' variant='secondary' icon={<Plus className='h-4 w-4' />} onClick={addReason}>
              Add
            </Button>
          </div>
          {reasonError && <p className='text-xs text-red-600'>{reasonError}</p>}
        </div>
      </Section>

      <Section
        title='Post types'
        note='Which types exist and which require approval is a pending product decision (§9) — shown read-only.'
      >
        <div className='flex flex-wrap gap-1.5 px-4 pb-4'>
          {postTypes.map((t) => (
            <span key={t} className='rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600'>
              {t.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </Section>

      <section className='card p-4' aria-label='Visibility rules'>
        <h3 className='text-base font-semibold text-gray-900'>Visibility rules</h3>
        <ul className={cn('mt-2 space-y-1 text-sm text-gray-600')}>
          <li>• Public content is visible to everyone, including signed-out visitors.</li>
          <li>• “Signed-in members” content is limited to business and consumer accounts.</li>
          <li>• “Businesses only” content never reaches consumer or public surfaces.</li>
          <li>• Group content is limited to members; private content to its author and admins.</li>
          <li className='flex items-center gap-1 text-xs text-gray-500'>
            <Info className='h-3 w-3' /> Enforced in the demo by lib/permissions.ts; the server is the authoritative
            boundary (§5.5).
          </li>
        </ul>
      </section>
    </div>
  )
}
