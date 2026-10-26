import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ExternalLink, FileText, Search, Settings, XCircle } from 'lucide-react'
import { adminApi } from '@/services/admin.service'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { formatDate } from '../business/helpers'
import type { ReportRecord, ReportTargetType } from '@/types/community-public'

/**
 * Reports Center (spec §3.6): the full report ledger — every reason and
 * reporter against every content type, link to the original, context to
 * inspect it, and the recorded decision + outcome for resolved items.
 * Configurable reasons live on the Configuration page (§3.6). This view and
 * the moderation queue read the same report records (§15), so a decision made
 * in either place updates both.
 */

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'pending', label: 'Pending' },
  { id: 'under_review', label: 'Under review' },
  { id: 'escalated', label: 'Escalated' },
  { id: 'resolved', label: 'Resolved' },
] as const

const TYPE_OPTIONS: Array<{ id: '' | ReportTargetType; label: string }> = [
  { id: '', label: 'All content types' },
  { id: 'post', label: 'Posts' },
  { id: 'comment', label: 'Comments' },
  { id: 'exchange', label: 'Exchanges' },
  { id: 'user', label: 'Accounts' },
]

const STATUS_BADGE: Record<ReportRecord['status'], 'warning' | 'primary' | 'danger' | 'success'> = {
  pending: 'warning',
  under_review: 'primary',
  escalated: 'danger',
  resolved: 'success',
}

export function AdminReportsPage() {
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_TABS)[number]['id']>('all')
  const [typeFilter, setTypeFilter] = useState<'' | ReportTargetType>('')
  const [search, setSearch] = useState('')

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: () => adminApi.listReports(),
  })
  const { data: comments = [] } = useQuery({ queryKey: ['admin', 'comments'], queryFn: adminApi.listComments })
  const { data: users = [] } = useQuery({ queryKey: ['admin', 'users'], queryFn: adminApi.listUsers })
  const { data: posts = [] } = useQuery({ queryKey: ['admin', 'posts'], queryFn: adminApi.listPosts })
  const { data: groups = [] } = useQuery({ queryKey: ['admin', 'groups'], queryFn: adminApi.listGroups })

  /**
   * Group origin of a reported target (§9): posts carry their group directly;
   * comments inherit the group of their parent post. Plain metadata — the
   * gated context panel lives on the moderation queue and content page.
   */
  const groupFor = (report: ReportRecord): string | null => {
    if (report.targetType === 'post') return posts.find((p) => p.id === report.targetId)?.groupId ?? null
    if (report.targetType === 'comment') {
      const comment = comments.find((c) => c.id === report.targetId)
      return comment ? (posts.find((p) => p.id === comment.postId)?.groupId ?? null) : null
    }
    return null
  }

  /** Resolve a stored account id to a display name, falling back to the raw id. */
  const nameFor = (id: string | null | undefined): string => {
    if (!id) return ''
    return users.find((u) => u.id === id)?.name ?? id
  }

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin'] })
    void queryClient.invalidateQueries({ queryKey: ['discover', 'exchanges'] })
  }

  const resolve = useMutation({
    mutationFn: ({ targetType, targetId, outcome }: { targetType: ReportTargetType; targetId: string; outcome: 'uphold' | 'dismiss' }) =>
      adminApi.resolveReports(targetType, targetId, outcome),
    onSuccess: () => void invalidate(),
  })

  /** Original-content link per target type (§3.6 — “link to the original”). */
  const linkFor = (report: ReportRecord): string | null => {
    if (report.targetType === 'post') return `/community/post/${report.targetId}`
    if (report.targetType === 'exchange') return `/community/exchange/${report.targetId}`
    if (report.targetType === 'comment') {
      const comment = comments.find((c) => c.id === report.targetId)
      return comment ? `/community/post/${comment.postId}` : null
    }
    return null
  }

  const { openCount, resolvedCount } = useMemo(
    () => ({
      openCount: reports.filter((r) => r.status !== 'resolved').length,
      resolvedCount: reports.filter((r) => r.status === 'resolved').length,
    }),
    [reports],
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return reports
      .filter((r) => {
        if (statusFilter === 'open' && r.status === 'resolved') return false
        if (statusFilter !== 'all' && statusFilter !== 'open' && r.status !== statusFilter) return false
        if (typeFilter && r.targetType !== typeFilter) return false
        if (q) {
          const haystack = [
            r.reasonLabel ?? r.reasonCode,
            r.details ?? '',
            r.reporterName ?? r.reporterId,
            r.targetLabel ?? r.targetId,
            r.targetType,
            r.resolutionNote ?? '',
            r.resolvedBy ?? '',
          ]
            .join(' ')
            .toLowerCase()
          if (!haystack.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [reports, statusFilter, typeFilter, search])

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div>
          <h2 className='text-lg font-bold text-gray-900'>Reports</h2>
          <p className='text-sm text-gray-600'>
            Every report with its reason, reporter, context and recorded decision (§3.6). {openCount} open ·{' '}
            {resolvedCount} resolved.
          </p>
        </div>
        <Link
          to='/admin/config'
          className='flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50'
        >
          <Settings className='h-4 w-4' /> Report reasons are configurable
        </Link>
      </div>

      <div className='card'>
        <div className='card-content'>
          <div className='relative'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
            <input
              type='search'
              className='input-field pl-9'
              placeholder='Search by reason, details, reporter or content…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label='Search reports'
            />
          </div>
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-1.5'>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={cn(
              'whitespace-nowrap rounded-full border px-3 py-1.5 text-sm',
              statusFilter === tab.id
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50',
            )}
          >
            {tab.label}
          </button>
        ))}
        <select
          className='input-field ml-auto w-auto py-1.5 text-sm'
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as '' | ReportTargetType)}
          aria-label='Filter by content type'
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Skeleton className='h-40 w-full' />
      ) : visible.length === 0 ? (
        <div className='card'>
          <EmptyState
            icon={<FileText className='h-10 w-10' />}
            title='No reports here'
            description='No reports match the current filters.'
          />
        </div>
      ) : (
        <div className='space-y-3'>
          {visible.map((report) => {
            const link = linkFor(report)
            return (
              <div key={report.id} className={cn('card', report.status === 'escalated' && 'border-red-300')}>
                <div className='card-content space-y-3'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Badge variant={STATUS_BADGE[report.status]}>
                      {report.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant='neutral'>{report.targetType}</Badge>
                    {groupFor(report) && (
                      <Badge variant='neutral'>
                        group: {groups.find((g) => g.id === groupFor(report))?.name ?? groupFor(report)}
                      </Badge>
                    )}
                    <span className='text-xs text-gray-500'>
                      Reported {formatDate(report.createdAt)} by {report.reporterName ?? report.reporterId}
                      {report.source === 'demo' && ' · demo record'}
                    </span>
                    {link && (
                      <Link to={link} className='ml-auto flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline'>
                        Open original <ExternalLink className='h-3 w-3' />
                      </Link>
                    )}
                  </div>

                  {/* Reason + context (§3.6 — inspect before deciding) */}
                  <div className='rounded-lg bg-gray-50 p-3'>
                    <p className='text-sm font-semibold text-gray-900'>
                      {report.reasonLabel ?? report.reasonCode}
                    </p>
                    <p className='mt-1 text-sm text-gray-700'>
                      {report.details ? `“${report.details}”` : <span className='text-gray-400'>No extra details provided.</span>}
                    </p>
                    <p className='mt-1.5 text-xs text-gray-500'>Target: {report.targetLabel ?? report.targetId}</p>
                  </div>

                  <div className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500'>
                    <span>Reviewer: {report.assignedToName ?? 'unassigned'}</span>
                  </div>

                  {report.status === 'resolved' ? (
                    <div className='rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-900'>
                      <p className='font-semibold'>
                        Decision: {report.decision === 'uphold' ? 'Upheld' : 'Dismissed'}
                        {report.resolvedBy && <> · by {nameFor(report.resolvedBy)}</>}
                        {report.resolvedAt && <> · {formatDate(report.resolvedAt)}</>}
                      </p>
                      {report.resolutionNote && <p className='mt-0.5'>{report.resolutionNote}</p>}
                      <p className='mt-1 text-green-800'>
                        Outcome applied to the content is recorded in the audit log.
                      </p>
                    </div>
                  ) : (
                    <div className='flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3'>
                      <Button
                        size='sm'
                        icon={<CheckCircle2 className='h-4 w-4' />}
                        onClick={() => resolve.mutate({ targetType: report.targetType, targetId: report.targetId, outcome: 'uphold' })}
                        disabled={resolve.isPending}
                      >
                        Uphold report
                      </Button>
                      <Button
                        size='sm'
                        variant='secondary'
                        icon={<XCircle className='h-4 w-4' />}
                        onClick={() => resolve.mutate({ targetType: report.targetType, targetId: report.targetId, outcome: 'dismiss' })}
                        disabled={resolve.isPending}
                      >
                        Dismiss report
                      </Button>
                      <span className='text-xs text-gray-400'>
                        Uphold applies the enforcement action for this content type; dismiss closes this report only.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
