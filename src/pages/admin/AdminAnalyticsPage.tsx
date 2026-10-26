import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, ExternalLink, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { adminApi } from '@/services/admin.service'
import { readExchangeRequests } from '@/hooks/useExchangeRequests'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate } from '../business/helpers'

/**
 * Analytics & Reporting (spec §12, §2D) — Phase I.
 *
 * Three report suites — Community, Exchange, Sharing — over the same records
 * the management screens use (§15: no parallel analytics data store). The
 * honesty rules this page is built around:
 *
 * - **Every metric carries its definition** — what it counts, from which
 *   record type, and what it does not count. Shares ≠ visits ≠ registrations
 *   ≠ qualified outcomes; pending attribution is never counted as confirmed;
 *   unique clicks appear only when the backend supplies them (§6.6, §17-3).
 * - **Filters are stated, never silent.** Date and location filters apply
 *   where a record carries the field; every card says which filters touched
 *   it and records without a date or location say so.
 * - **Drill-down shows the exact records** behind each figure — the number
 *   is always reproducible from the listed rows.
 * - **Export is a JSON snapshot** of the filtered records and definitions
 *   shown here. The export policy (approved scope, recipients, retention)
 *   is an open decision (§17-8) — nothing broader is offered.
 */

type Tab = 'community' | 'exchange' | 'sharing'

interface DrillRow {
  id: string
  label: string
  meta: string
  to?: string
}

interface DrillList {
  title: string
  rows: DrillRow[]
}

interface SuiteMetric {
  key: string
  label: string
  value: number
  definition: string
  /** How the active filters touch this figure — always displayed (§12). */
  scopeNote: string
  caption?: string
  drill?: DrillList
}

const ROW_CAP = 25

export function AdminAnalyticsPage() {
  const [tab, setTab] = useState<Tab>('community')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [city, setCity] = useState('')
  const [drill, setDrill] = useState<DrillList | null>(null)

  const { data: posts = [], isLoading } = useQuery({ queryKey: ['admin', 'posts'], queryFn: adminApi.listPosts })
  const { data: exchanges = [] } = useQuery({ queryKey: ['admin', 'exchanges'], queryFn: adminApi.listExchanges })
  const { data: users = [] } = useQuery({ queryKey: ['admin', 'users'], queryFn: adminApi.listUsers })
  const { data: comments = [] } = useQuery({ queryKey: ['admin', 'comments'], queryFn: adminApi.listComments })
  const { data: reports = [] } = useQuery({ queryKey: ['admin', 'reports'], queryFn: () => adminApi.listReports() })
  const { data: announcements = [] } = useQuery({ queryKey: ['admin', 'announcements'], queryFn: adminApi.listAnnouncements })
  const shares = adminApi.listAllShares()
  const events = adminApi.listAllEvents()
  const requests = readExchangeRequests()
  const exchangeCategories = adminApi.listCategories('exchange', { includeInactive: true })

  const usersById = new Map(users.map((u) => [u.id, u]))

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

  const cityOptions = [
    ...new Set(
      [...posts.map((p) => p.location?.cityName), ...exchanges.map((e) => e.location?.cityName)].filter(
        (c): c is string => !!c,
      ),
    ),
  ].sort()

  const rangeText = hasDate
    ? `${dateFrom ? formatDate(`${dateFrom}T00:00:00`) : 'the beginning'} → ${dateTo ? formatDate(`${dateTo}T23:59:59`) : 'now'}`
    : 'all recorded dates'

  const presetRange = (days: number | null) => {
    if (days === null) {
      setDateFrom('')
      setDateTo('')
      return
    }
    const d = new Date()
    d.setDate(d.getDate() - days)
    const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    setDateFrom(local)
    setDateTo('')
  }

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setCity('')
    setDrill(null)
  }

  // -------------------------------------------------------------------------
  // Filtered record sets (one source: the same stores as the admin screens)
  // -------------------------------------------------------------------------

  const fPosts = posts.filter((p) => matchesDate(p.createdAt) && matchesCity(p.location?.cityName))
  const fComments = comments.filter((c) => matchesDate(c.createdAt))
  const fReports = reports.filter((r) => matchesDate(r.createdAt))
  const fAnnouncements = announcements.filter((a) => matchesDate(a.publishAt ?? a.createdAt))
  const fExchanges = exchanges.filter((e) => matchesDate(e.createdAt) && matchesCity(e.location?.cityName))
  const fShares = shares.filter((s) => matchesDate(s.createdAt))
  const fEvents = events.filter((e) => matchesDate(e.occurredAt))

  // -------------------------------------------------------------------------
  // Suite metrics — each with definition + filter-scope note
  // -------------------------------------------------------------------------

  const bothNote = hasFilters
    ? hasDate && hasCity
      ? 'date & location filters applied'
      : hasDate
        ? 'date filter applied'
        : 'location filter applied'
    : 'no filters — all recorded records'
  const dateNote = hasFilters
    ? hasDate
      ? hasCity
        ? 'date filter applied · location not recorded on these records'
        : 'date filter applied'
      : 'location filter not applied — no location recorded'
    : 'no filters — all recorded records'

  const communityMetrics: SuiteMetric[] = [
    {
      key: 'posts',
      label: 'Posts created',
      value: fPosts.length,
      definition: 'Posts recorded with a created date in range — every status. One record per post (§15).',
      scopeNote: bothNote,
      drill: {
        title: `Posts created (${fPosts.length})`,
        rows: fPosts.map((p) => ({
          id: p.id,
          label: p.title ?? `${p.content.slice(0, 60)}…`,
          meta: `${p.status} · ${p.postType}${p.campaignId ? ' · campaign' : ''}${p.groupId ? ' · group' : ''} · ${formatDate(p.createdAt)}${p.location?.cityName ? ` · ${p.location.cityName}` : ''}`,
          to: `/community/post/${p.id}`,
        })),
      },
    },
    {
      key: 'published',
      label: 'Published posts',
      value: fPosts.filter((p) => p.status === 'published').length,
      definition: 'Posts with status "published" — visible in public views. The server remains authoritative on visibility.',
      scopeNote: bothNote,
      drill: {
        title: `Published posts (${fPosts.filter((p) => p.status === 'published').length})`,
        rows: fPosts
          .filter((p) => p.status === 'published')
          .map((p) => ({
            id: p.id,
            label: p.title ?? `${p.content.slice(0, 60)}…`,
            meta: `${p.postType}${p.campaignId ? ' · campaign' : ''}${p.groupId ? ' · group' : ''} · ${formatDate(p.createdAt)}${p.location?.cityName ? ` · ${p.location.cityName}` : ''}`,
            to: `/community/post/${p.id}`,
          })),
      },
    },
    {
      key: 'pending',
      label: 'Pending review',
      value: fPosts.filter((p) => p.status === 'pending').length,
      definition: 'Posts awaiting a moderation decision. Work lists on Content and Overview are never filtered.',
      scopeNote: bothNote,
      drill: {
        title: `Posts pending review (${fPosts.filter((p) => p.status === 'pending').length})`,
        rows: fPosts
          .filter((p) => p.status === 'pending')
          .map((p) => ({
            id: p.id,
            label: p.title ?? `${p.content.slice(0, 60)}…`,
            meta: `${p.author?.name ?? p.authorId} · ${p.postType} · filed ${formatDate(p.createdAt)}${p.location?.cityName ? ` · ${p.location.cityName}` : ''}`,
            to: '/admin/content',
          })),
      },
    },
    {
      key: 'comments',
      label: 'Comments',
      value: fComments.length,
      definition: 'Comments recorded in range, including ones since removed by moderation.',
      scopeNote: dateNote,
      drill: {
        title: `Comments (${fComments.length})`,
        rows: fComments.map((c) => ({
          id: c.id,
          label: `${c.author.name}: ${c.content.slice(0, 60)}${c.content.length > 60 ? '…' : ''}`,
          meta: `${c.status === 'removed' ? 'removed by moderation' : 'visible'} · ${formatDate(c.createdAt)}`,
          to: `/community/post/${c.postId}`,
        })),
      },
    },
    {
      key: 'reports',
      label: 'Reports filed',
      value: fReports.length,
      definition: 'User reports on posts, comments, exchanges or accounts. Resolution is a recorded decision, not a derived number.',
      scopeNote: dateNote,
      caption: `${fReports.filter((r) => r.status !== 'resolved').length} open · ${fReports.filter((r) => r.status === 'resolved').length} resolved`,
      drill: {
        title: `Reports filed (${fReports.length})`,
        rows: fReports.map((r) => ({
          id: r.id,
          label: r.reasonLabel ?? r.reasonCode,
          meta: `${r.targetType} · ${r.status}${r.decision ? ` (${r.decision})` : ''} · ${formatDate(r.createdAt)}${r.source === 'demo' ? ' · demo seed' : ''}`,
          to: '/admin/reports',
        })),
      },
    },
    {
      key: 'announcements',
      label: 'Announcements published',
      value: fAnnouncements.filter((a) => a.status === 'published').length,
      definition: 'Announcements with status "published", measured by publish date. Announcement location is a targeting scope, not a venue.',
      scopeNote: dateNote,
      caption: `${fAnnouncements.length} in range across all statuses`,
      drill: {
        title: `Announcements published (${fAnnouncements.filter((a) => a.status === 'published').length})`,
        rows: fAnnouncements
          .filter((a) => a.status === 'published')
          .map((a) => ({
            id: a.id,
            label: a.title,
            meta: `${a.audience} audience · publish ${formatDate(a.publishAt ?? a.createdAt)}${a.location?.cityName ? ` · ${a.location.cityName}` : ''}`,
            to: '/admin/announcements',
          })),
      },
    },
  ]

  const exchangeMetrics: SuiteMetric[] = [
    {
      key: 'items',
      label: 'Exchange items created',
      value: fExchanges.length,
      definition: 'Items recorded in #Exchange with a created date in range — every status.',
      scopeNote: bothNote,
      drill: {
        title: `Exchange items (${fExchanges.length})`,
        rows: fExchanges.map((e) => ({
          id: e.id,
          label: e.title,
          meta: `${e.status} · ${e.exchangeType} · ${
            e.categoryId ? (exchangeCategories.find((c) => c.id === e.categoryId)?.name ?? e.categoryId) : 'uncategorised'
          } · ${formatDate(e.createdAt)}${e.location?.cityName ? ` · ${e.location.cityName}` : ''}`,
          to: `/community/exchange/${e.id}`,
        })),
      },
    },
    {
      key: 'active',
      label: 'Active items',
      value: fExchanges.filter((e) => e.status === 'active').length,
      definition: 'Items with status "active" — the only state public browse shows. Community performs no status transition (§17-2).',
      scopeNote: bothNote,
      drill: {
        title: `Active exchange items (${fExchanges.filter((e) => e.status === 'active').length})`,
        rows: fExchanges
          .filter((e) => e.status === 'active')
          .map((e) => ({
            id: e.id,
            label: e.title,
            meta: `${e.exchangeType} · ${formatDate(e.createdAt)}${e.location?.cityName ? ` · ${e.location.cityName}` : ''}`,
            to: `/community/exchange/${e.id}`,
          })),
      },
    },
    {
      key: 'completed',
      label: 'Completed items',
      value: fExchanges.filter((e) => e.status === 'completed').length,
      definition: 'Items with status "completed" — recorded by the backend, never transitioned by the UI.',
      scopeNote: bothNote,
      drill: {
        title: `Completed exchange items (${fExchanges.filter((e) => e.status === 'completed').length})`,
        rows: fExchanges
          .filter((e) => e.status === 'completed')
          .map((e) => ({
            id: e.id,
            label: e.title,
            meta: `${e.exchangeType} · created ${formatDate(e.createdAt)}${e.location?.cityName ? ` · ${e.location.cityName}` : ''}`,
            to: '/admin/exchange',
          })),
      },
    },
    {
      key: 'expired-cancelled',
      label: 'Expired or cancelled',
      value: fExchanges.filter((e) => e.status === 'expired' || e.status === 'cancelled').length,
      definition: 'Items with status "expired" or "cancelled" — displayed as recorded states.',
      scopeNote: bothNote,
      drill: {
        title: `Expired or cancelled items (${fExchanges.filter((e) => e.status === 'expired' || e.status === 'cancelled').length})`,
        rows: fExchanges
          .filter((e) => e.status === 'expired' || e.status === 'cancelled')
          .map((e) => ({
            id: e.id,
            label: e.title,
            meta: `${e.status}${e.moderationReason ? ` · “${e.moderationReason}”` : ''} · created ${formatDate(e.createdAt)}${e.location?.cityName ? ` · ${e.location.cityName}` : ''}`,
            to: '/admin/exchange',
          })),
      },
    },
    {
      key: 'requests',
      label: 'Items with a recorded request',
      value: fExchanges.filter((e) => (requests[e.id] ?? '').trim().length > 0).length,
      definition:
        'Items in range that carry a recorded request message. This counts items only — message content sits behind the view_messages_context permission (§17-7).',
      scopeNote: hasFilters ? 'item date & location filters applied · requests themselves carry no date' : bothNote,
      drill: {
        title: `Items with a recorded request (${fExchanges.filter((e) => (requests[e.id] ?? '').trim().length > 0).length})`,
        rows: fExchanges
          .filter((e) => (requests[e.id] ?? '').trim().length > 0)
          .map((e) => ({
            id: e.id,
            label: e.title,
            // Message content stays behind view_messages_context (§17-7) — the
            // drill confirms which items carry a request, never what it says.
            meta: `${e.status} · request recorded (content not shown here) · created ${formatDate(e.createdAt)}`,
            to: '/admin/exchange',
          })),
      },
    },
  ]

  const visits = fEvents.filter((e) => e.eventType === 'visit')
  const signups = fEvents.filter((e) => e.eventType === 'signup')
  const unconfirmedRegs = signups.filter((e) => e.status === 'pending')
  const joins = fEvents.filter((e) => e.eventType === 'campaign_join')
  const qualified = fEvents.filter((e) => e.status === 'qualified')
  const pendingEvents = fEvents.filter((e) => e.status === 'pending')

  // Drill rows for tracked events — the share they belong to resolves the target.
  const sharesById = new Map(shares.map((s) => [s.id, s]))
  const eventRows = (list: typeof fEvents) =>
    list.map((e) => {
      const share = sharesById.get(e.shareId)
      return {
        id: e.id,
        label: share?.targetTitle ?? `Share ${e.trackingCode}`,
        meta: `${e.targetType} · ${e.status}${share?.campaignTitle ? ` · ${share.campaignTitle}` : ''} · ${formatDate(e.occurredAt)}${e.isDemo ? ' · demo seed' : ''}`,
        to: '/admin/sharing',
      }
    })
  const sharingNote = hasFilters
    ? hasCity
      ? hasDate
        ? 'date filter applied (shares by creation, events by occurrence) · shares carry no location'
        : 'location filter not applied — shares carry no location'
      : 'date filter applied (shares by creation, events by occurrence)'
    : 'no filters — all recorded records'

  const sharingMetrics: SuiteMetric[] = [
    {
      key: 'shares',
      label: 'Shares created',
      value: fShares.length,
      definition: 'Trackable share links created in range — a QR counts as one share record (§15). A share is a link: not a visit, not an outcome.',
      scopeNote: sharingNote,
      caption: `${fShares.filter((s) => s.source === 'demo').length} demo-seeded`,
      drill: {
        title: `Shares created (${fShares.length})`,
        rows: fShares.map((s) => ({
          id: s.id,
          label: s.targetTitle ?? 'Shared target',
          meta: `${usersById.get(s.sharerId)?.name ?? s.sharerId} (${s.sharerType}) · ${s.shareType ?? 'link'} · ${formatDate(s.createdAt)}${s.campaignTitle ? ` · ${s.campaignTitle}` : ''}${s.source === 'demo' ? ' · demo seed' : ''}`,
          to: '/admin/sharing',
        })),
      },
    },
    {
      key: 'visits',
      label: 'Recorded visits',
      value: visits.length,
      definition: 'Link-open events recorded against share links in range (by event date). Totals only — unique clicks appear only when the backend supplies them (§6.6).',
      scopeNote: sharingNote,
      drill: { title: `Recorded visits (${visits.length})`, rows: eventRows(visits) },
    },
    {
      key: 'registrations',
      label: 'Registrations',
      value: signups.length,
      definition: 'Signup events recorded against share links in range. A registration is not a confirmed outcome until the backend attributes it.',
      scopeNote: sharingNote,
      caption: `${signups.length - unconfirmedRegs.length} attributed · ${unconfirmedRegs.length} unconfirmed (pending)`,
      drill: { title: `Registration events (${signups.length})`, rows: eventRows(signups) },
    },
    {
      key: 'joins',
      label: 'Campaign joins',
      value: joins.length,
      definition: 'Campaign join events recorded in range — recorded events, not attributed outcomes.',
      scopeNote: sharingNote,
      drill: { title: `Campaign join events (${joins.length})`, rows: eventRows(joins) },
    },
    {
      key: 'qualified',
      label: 'Qualified outcomes',
      value: qualified.length,
      definition: 'Events the server marked "qualified". Pending events are never counted here (§6.6, §17-3).',
      scopeNote: sharingNote,
      caption: `${pendingEvents.length} pending (never counted as qualified)`,
      drill: { title: `Qualified events (${qualified.length})`, rows: eventRows(qualified) },
    },
  ]

  const activeMetrics = tab === 'community' ? communityMetrics : tab === 'exchange' ? exchangeMetrics : sharingMetrics

  // Sharing: shares by related campaign — campaign vs ordinary-target distinction (§5).
  const sharesByCampaign = [...fShares.reduce((m, s) => {
    const k = s.campaignTitle ?? 'No related campaign'
    m.set(k, (m.get(k) ?? 0) + 1)
    return m
  }, new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1])

  // Exchange: items by admin-managed category.
  const itemsByCategory = exchangeCategories
    .map((c) => ({ name: c.name, count: fExchanges.filter((e) => e.categoryId === c.id).length }))
    .filter((row) => row.count > 0)

  const exportJson = () => {
    const records =
      tab === 'community'
        ? { posts: fPosts, comments: fComments, reports: fReports, announcements: fAnnouncements }
        : tab === 'exchange'
          ? { exchanges: fExchanges }
          : { shares: fShares, events: fEvents }
    const payload = {
      exportedAt: new Date().toISOString(),
      suite: tab,
      filters: { dateFrom: dateFrom || null, dateTo: dateTo || null, location: city || null },
      notice:
        'Export policy pending §17-8 — this snapshot contains only the records and metric definitions shown on the analytics screen. The server remains authoritative.',
      metrics: activeMetrics.map((m) => ({ label: m.label, value: m.value, definition: m.definition })),
      records,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `community-analytics-${tab}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-24 w-full' />
        <div className='grid grid-cols-2 gap-3 lg:grid-cols-3'>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className='h-32 w-full' />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-gray-900'>Analytics & Reporting</h2>
        <p className='text-sm text-gray-600'>
          Community, #Exchange and Sharing report suites over the same records the management screens use — every
          figure states its definition and which filters touched it.
        </p>
      </div>

      {/* Filters (§2D) — stated, never silent */}
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
                aria-label='Filter by location'
              >
                <option value=''>All locations</option>
                {cityOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <span className='flex flex-wrap items-center gap-1'>
              <button className='btn btn-secondary btn-sm' onClick={() => presetRange(null)}>
                All time
              </button>
              <button className='btn btn-secondary btn-sm' onClick={() => presetRange(7)}>
                Last 7 days
              </button>
              <button className='btn btn-secondary btn-sm' onClick={() => presetRange(1)}>
                Last 24 hours
              </button>
              {hasFilters && (
                <button className='btn btn-secondary btn-sm' onClick={clearFilters}>
                  Clear
                </button>
              )}
            </span>
          </div>
          <p className='text-xs text-gray-500'>
            Showing <span className='font-medium text-gray-700'>{rangeText}</span>
            {hasCity ? (
              <>
                {' '}
                · <span className='font-medium text-gray-700'>{city}</span>
              </>
            ) : (
              ' · all locations'
            )}
            . Date filters match each record's own date: creation for posts, exchange items and shares; occurrence for
            tracked events; filing for reports; publish date for announcements.
          </p>
        </div>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-2 border-b border-gray-200'>
        <div className='flex gap-1' role='tablist' aria-label='Report suites'>
          {(
            [
              { id: 'community', label: `Community (${fPosts.length})` },
              { id: 'exchange', label: `#Exchange (${fExchanges.length})` },
              { id: 'sharing', label: `Sharing (${fShares.length})` },
            ] as Array<{ id: Tab; label: string }>
          ).map((t) => (
            <button
              key={t.id}
              role='tab'
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id)
                setDrill(null)
              }}
              className={
                tab === t.id
                  ? '-mb-px whitespace-nowrap border-b-2 border-primary-600 px-3 py-2 text-sm font-medium text-primary-700'
                  : '-mb-px whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-800'
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className='pb-2'>
          <Button size='sm' variant='secondary' icon={<Download className='h-4 w-4' />} onClick={exportJson}>
            Export JSON
          </Button>
        </div>
      </div>
      <p className='-mt-2 text-[11px] text-gray-400'>
        Export policy (approved scope, recipients, retention) is pending §17-8 — exports contain only the filtered
        records and definitions shown on this screen.
      </p>

      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
        {activeMetrics.map((m) => (
          <div key={m.key} className='card'>
            <div className='card-content space-y-1'>
              <div className='flex items-start justify-between gap-2'>
                <p className='text-sm font-medium text-gray-700'>{m.label}</p>
                {m.drill && m.drill.rows.length > 0 && (
                  <button
                    onClick={() => setDrill(m.drill as DrillList)}
                    className='shrink-0 text-xs font-medium text-primary-600 hover:underline'
                  >
                    View records
                  </button>
                )}
              </div>
              <p className='text-2xl font-bold text-gray-900'>{m.value}</p>
              {m.caption && <p className='text-xs text-gray-600'>{m.caption}</p>}
              <p className='text-xs text-gray-500'>{m.definition}</p>
              <p className='text-[11px] text-gray-400'>{m.scopeNote}</p>
            </div>
          </div>
        ))}
      </div>

      {drill && (
        <div className='card'>
          <div className='card-header flex items-center justify-between gap-2'>
            <h3 className='text-sm font-semibold text-gray-900'>{drill.title}</h3>
            <button onClick={() => setDrill(null)} aria-label='Close record list' className='btn-icon text-gray-500'>
              <X className='h-4 w-4' />
            </button>
          </div>
          {drill.rows.length === 0 ? (
            <p className='card-content text-sm text-gray-500'>No records match the current filters.</p>
          ) : (
            <>
              <ul className='divide-y divide-gray-100'>
                {drill.rows.slice(0, ROW_CAP).map((r) => (
                  <li key={r.id} className='flex items-center justify-between gap-3 px-4 py-2.5'>
                    <div className='min-w-0'>
                      <p className='truncate text-sm text-gray-900'>{r.label}</p>
                      <p className='truncate text-xs text-gray-500'>{r.meta}</p>
                    </div>
                    {r.to && (
                      <Link
                        to={r.to}
                        className='inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary-600 hover:underline'
                      >
                        Open <ExternalLink className='h-3.5 w-3.5' />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              {drill.rows.length > ROW_CAP && (
                <p className='card-content pt-0 text-xs text-gray-400'>
                  Showing the first {ROW_CAP} of {drill.rows.length} records — use Export JSON for the full filtered
                  list.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'exchange' && itemsByCategory.length > 0 && (
        <div className='card'>
          <div className='card-header'>
            <h3 className='text-sm font-semibold text-gray-900'>Items by category</h3>
            <p className='text-xs text-gray-500'>Admin-managed exchange categories (§5.2) — same store the composer and filters use.</p>
          </div>
          <ul className='divide-y divide-gray-100'>
            {itemsByCategory.map((row) => (
              <li key={row.name} className='flex items-center justify-between px-4 py-2 text-sm'>
                <span className='text-gray-800'>{row.name}</span>
                <span className='font-medium text-gray-900'>{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'sharing' && (
        <div className='card'>
          <div className='card-header'>
            <h3 className='text-sm font-semibold text-gray-900'>Shares by related campaign</h3>
            <p className='text-xs text-gray-500'>
              Campaign and ordinary-target shares are distinguished by the recorded relation on the share (§5). Visits
              and qualified outcomes are separate measures — never added into this count.
            </p>
          </div>
          <ul className='divide-y divide-gray-100'>
            {sharesByCampaign.map(([name, count]) => (
              <li key={name} className='flex items-center justify-between px-4 py-2 text-sm'>
                <span className='text-gray-800'>{name}</span>
                <span className='font-medium text-gray-900'>{count}</span>
              </li>
            ))}
            {sharesByCampaign.length === 0 && <li className='px-4 py-2 text-sm text-gray-500'>No shares in range.</li>}
          </ul>
        </div>
      )}

      <div className='rounded-lg bg-gray-50 p-3 text-xs text-gray-600'>
        {tab === 'community' &&
          'Every figure counts recorded records from the same stores the Content, Reports and Announcements screens use (§15) — there is no separate analytics data. Statuses shown are the records’ own states.'}
        {tab === 'exchange' &&
          'Statuses are the records’ own states — Community performs no #Exchange status transition (§17-2 pending). Request messages sit behind view_messages_context (§17-7); this suite counts items only.'}
        {tab === 'sharing' &&
          'Shares ≠ visits ≠ registrations ≠ qualified outcomes — each is a different recorded measure. Pending attribution is never counted as confirmed, and unique clicks appear only when the backend supplies them (§6.6, §17-3). Full journeys and referral tables live on Sharing & Attribution.'}
      </div>
    </div>
  )
}
