import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ExternalLink, Inbox, ShieldAlert, UserCheck, Users, XCircle } from 'lucide-react'
import { adminApi } from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth.store'
import { canAdmin } from '@/lib/permissions'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { GroupContextModal } from '@/components/admin/GroupContextModal'
import { cn } from '@/lib/utils'
import { formatDate } from '../business/helpers'
import type { PublicGroup, ReportRecord, ReportTargetType } from '@/types/community-public'

/**
 * Central Moderation Queue (spec §3.5): one queue over posts, comments,
 * exchanges and accounts — reported items and content awaiting approval —
 * with the workflow states Pending → Under review → Escalated → Resolved
 * (upheld/dismissed). Each row shows content type, preview, creator, date
 * reported, reasons, report count, status, assigned reviewer, available
 * actions and whether the content is still visible to the community (§15:
 * this queue and the reports center read the same report records).
 */

type RowStatus = 'pending' | 'under_review' | 'escalated'

interface QueueRow {
  key: string
  kind: 'report' | 'awaiting'
  reportId: string | null
  targetType: ReportTargetType
  targetId: string
  targetLabel: string
  preview: string
  creator: string
  status: RowStatus
  reasons: string[]
  reportCount: number
  reportedAt: string | null
  assignedToName: string | null
  demo: boolean
  link: string | null
  visible: boolean
  visibleNote: string
  /** Group the target originated in, when any — group-origin identification (§9). */
  groupId: string | null
}

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'under_review', label: 'Under review' },
  { id: 'escalated', label: 'Escalated' },
] as const

const TYPE_OPTIONS: Array<{ id: '' | ReportTargetType; label: string }> = [
  { id: '', label: 'All content types' },
  { id: 'post', label: 'Posts' },
  { id: 'comment', label: 'Comments' },
  { id: 'exchange', label: 'Exchanges' },
  { id: 'user', label: 'Accounts' },
]

const STATUS_LABEL: Record<RowStatus, string> = {
  pending: 'Pending',
  under_review: 'Under review',
  escalated: 'Escalated',
}

const STATUS_BADGE: Record<RowStatus, 'warning' | 'primary' | 'danger'> = {
  pending: 'warning',
  under_review: 'primary',
  escalated: 'danger',
}

/** Group open reports per target into a single queue row (§15 — one record, one row). */
function reportRow(report: ReportRecord, siblings: ReportRecord[], extras: Partial<QueueRow>): QueueRow {
  const label = report.targetLabel ?? report.targetId
  const reasons = [...new Set(siblings.map((r) => r.reasonLabel ?? r.reasonCode))]
  const dates = siblings.map((r) => r.createdAt).sort()
  return {
    key: `${report.targetType}:${report.targetId}`,
    kind: 'report',
    reportId: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    targetLabel: label,
    preview: report.details ?? '',
    creator: '',
    status: report.status === 'escalated' ? 'escalated' : report.status === 'under_review' ? 'under_review' : 'pending',
    reasons,
    reportCount: siblings.length,
    reportedAt: (dates.length ? dates[dates.length - 1] : null) ?? report.createdAt,
    assignedToName: report.assignedToName ?? null,
    demo: siblings.every((r) => r.source === 'demo'),
    link: null,
    visible: true,
    visibleNote: '',
    groupId: null,
    ...extras,
  }
}

export function AdminModerationPage() {
  const queryClient = useQueryClient()
  const admin = useAuthStore((s) => s.user)
  // Group context (§9, §17-7) sits behind its own permission; the group badge
  // itself is plain metadata any reviewer may see.
  const canSeeGroupContext = canAdmin(admin, 'view_group_context')

  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_TABS)[number]['id']>('all')
  const [typeFilter, setTypeFilter] = useState<'' | ReportTargetType>('')
  const [rejecting, setRejecting] = useState<{ id: string; label: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [contextGroup, setContextGroup] = useState<PublicGroup | null>(null)

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['admin', 'posts'],
    queryFn: adminApi.listPosts,
  })
  const { data: comments = [] } = useQuery({ queryKey: ['admin', 'comments'], queryFn: adminApi.listComments })
  const { data: exchanges = [] } = useQuery({ queryKey: ['discover', 'exchanges'], queryFn: adminApi.listExchanges })
  const { data: users = [] } = useQuery({ queryKey: ['admin', 'users'], queryFn: adminApi.listUsers })
  const { data: groups = [] } = useQuery({ queryKey: ['admin', 'groups'], queryFn: adminApi.listGroups })
  const { data: allReports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: () => adminApi.listReports(),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin'] })
    void queryClient.invalidateQueries({ queryKey: ['discover', 'exchanges'] })
  }

  const rows = useMemo<QueueRow[]>(() => {
    const open = allReports.filter((r) => r.status !== 'resolved')

    // --- Reported targets: one row per target, merging duplicate reports ---
    const byTarget = new Map<string, ReportRecord[]>()
    for (const r of open) {
      const key = `${r.targetType}:${r.targetId}`
      byTarget.set(key, [...(byTarget.get(key) ?? []), r])
    }
    const reported: QueueRow[] = [...byTarget.values()].map((siblings) => {
      const first = siblings[0]!
      const target = first.targetId
      const extras: Partial<QueueRow> = {}

      if (first.targetType === 'post') {
        const post = posts.find((p) => p.id === target)
        const postComments = comments.filter((c) => c.postId === target)
        extras.targetLabel = post?.title ?? post?.content.slice(0, 60) ?? first.targetLabel ?? target
        extras.preview = post?.content.slice(0, 140) ?? first.details ?? ''
        extras.creator = post?.author.name ?? '—'
        extras.link = `/community/post/${target}`
        extras.visible = post ? post.status === 'published' : false
        extras.visibleNote = post ? `post is ${post.status}` : 'post not found'
        extras.groupId = post?.groupId ?? null
        if (post) extras.preview = `${post.content.slice(0, 140)}${postComments.length ? ` · ${postComments.length} comment(s)` : ''}`
      } else if (first.targetType === 'comment') {
        const comment = comments.find((c) => c.id === target)
        const post = comment ? posts.find((p) => p.id === comment.postId) : undefined
        extras.targetLabel = comment?.content.slice(0, 60) ?? first.targetLabel ?? target
        extras.preview = comment?.content ?? first.details ?? ''
        extras.creator = comment?.author.name ?? '—'
        extras.link = post ? `/community/post/${post.id}` : null
        extras.visible = comment ? (comment.status ?? 'visible') === 'visible' : false
        extras.visibleNote = comment ? `comment is ${comment.status ?? 'visible'}` : 'comment not found'
        extras.groupId = post?.groupId ?? null
      } else if (first.targetType === 'exchange') {
        const exchange = exchanges.find((e) => e.id === target)
        extras.targetLabel = exchange?.title ?? first.targetLabel ?? target
        extras.preview = exchange ? `${exchange.offering} → ${exchange.seeking}` : first.details ?? ''
        extras.creator = exchange?.creator.name ?? '—'
        extras.link = `/community/exchange/${target}`
        extras.visible = exchange ? exchange.status === 'active' : false
        extras.visibleNote = exchange ? `exchange is ${exchange.status}` : 'exchange not found'
      } else {
        const user = users.find((u) => u.id === target)
        extras.targetLabel = user?.name ?? first.targetLabel ?? target
        extras.preview = user ? `${user.name} · ${user.userType} · ${user.accountStatus ?? 'active'}` : first.details ?? ''
        extras.creator = user?.name ?? '—'
        extras.link = null
        extras.visible = user ? user.accountStatus !== 'suspended' : false
        extras.visibleNote = user ? `account is ${user.accountStatus}` : 'account not found'
      }

      return reportRow(first, siblings, extras)
    })

    // --- Content awaiting approval with no report (§2B outstanding) ---
    const reportedKeys = new Set(reported.map((r) => r.key))
    const awaiting: QueueRow[] = posts
      .filter((p) => p.status === 'pending' && !reportedKeys.has(`post:${p.id}`))
      .map((p) => ({
        key: `post:${p.id}`,
        kind: 'awaiting',
        reportId: null,
        targetType: 'post' as const,
        targetId: p.id,
        targetLabel: p.title ?? p.content.slice(0, 60),
        preview: p.content.slice(0, 140),
        creator: p.author.name,
        status: 'pending' as const,
        reasons: [],
        reportCount: 0,
        reportedAt: null,
        assignedToName: null,
        demo: false,
        link: `/community/post/${p.id}`,
        visible: false,
        visibleNote: 'not yet published',
        groupId: p.groupId ?? null,
      }))

    const combined = [...reported, ...awaiting]
    return combined
      .filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter))
      .filter((r) => (typeFilter ? r.targetType === typeFilter : true))
      .sort((a, b) => {
        // Escalated first, then most reports, then newest.
        const rank: Record<RowStatus, number> = { escalated: 0, pending: 1, under_review: 2 }
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status]
        if (b.reportCount !== a.reportCount) return b.reportCount - a.reportCount
        return (b.reportedAt ?? '').localeCompare(a.reportedAt ?? '')
      })
  }, [allReports, posts, comments, exchanges, users, statusFilter, typeFilter])

  const setReportStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'under_review' | 'escalated' }) =>
      adminApi.setReportStatus(id, status),
    onSuccess: () => void invalidate(),
  })

  const assignReport = useMutation({
    mutationFn: (id: string) => adminApi.assignReport(id),
    onSuccess: () => void invalidate(),
  })

  const resolveReport = useMutation({
    mutationFn: ({ row, outcome }: { row: QueueRow; outcome: 'uphold' | 'dismiss' }) =>
      adminApi.resolveReports(row.targetType, row.targetId, outcome),
    onSuccess: () => void invalidate(),
  })

  const approvePost = useMutation({
    mutationFn: (id: string) => adminApi.moderatePost(id, 'approve'),
    onSuccess: () => void invalidate(),
  })

  const rejectPost = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.moderatePost(id, 'reject', reason),
    onSuccess: () => {
      setRejecting(null)
      setRejectReason('')
      setRejectError('')
      void invalidate()
    },
  })

  const openCount = allReports.filter((r) => r.status !== 'resolved').length
  const awaitingCount = posts.filter((p) => p.status === 'pending').length

  const confirmReject = () => {
    if (!rejecting) return
    if (!rejectReason.trim()) {
      setRejectError('A moderation reason is required (§5.2).')
      return
    }
    rejectPost.mutate({ id: rejecting.id, reason: rejectReason.trim() })
  }

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-gray-900'>Moderation queue</h2>
        <p className='text-sm text-gray-600'>
          Every reported or pending item — posts, comments, exchanges and accounts — in one queue (§3.5).
          {openCount} open report(s), {awaitingCount} post(s) awaiting review.
        </p>
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

      {postsLoading || reportsLoading ? (
        <Skeleton className='h-40 w-full' />
      ) : rows.length === 0 ? (
        <div className='card'>
          <EmptyState
            icon={<Inbox className='h-10 w-10' />}
            title='Queue is clear'
            description='Nothing matches the current filters — no reported or pending items in this view.'
          />
        </div>
      ) : (
        <div className='space-y-3'>
          {rows.map((row) => (
            <div key={row.key} className={cn('card', row.status === 'escalated' && 'border-red-300')}>
              <div className='card-content space-y-3'>
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant={STATUS_BADGE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                  <Badge variant='neutral'>{row.targetType}</Badge>
                  {row.kind === 'awaiting' && <Badge variant='neutral'>Awaiting approval</Badge>}
                  {row.reportCount > 0 && <Badge variant='warning'>{row.reportCount} report(s)</Badge>}
                  {row.demo && <Badge variant='neutral'>demo record</Badge>}
                  {row.groupId && (
                    <>
                      <Badge variant='neutral'>
                        group: {groups.find((g) => g.id === row.groupId)?.name ?? row.groupId}
                      </Badge>
                      <Button
                        size='sm'
                        variant='ghost'
                        icon={<Users className='h-4 w-4' />}
                        disabled={!canSeeGroupContext}
                        title={
                          canSeeGroupContext
                            ? 'Group context for this item'
                            : "Requires the 'View group context' permission — role grants pending §17-6; privacy scope pending §17-7"
                        }
                        onClick={() => setContextGroup(groups.find((g) => g.id === row.groupId) ?? null)}
                      >
                        Group context
                      </Button>
                    </>
                  )}
                  <span className='text-xs text-gray-500'>
                    {row.reportedAt ? `Reported ${formatDate(row.reportedAt)}` : `Created by ${row.creator}`}
                  </span>
                  {row.link && (
                    <Link to={row.link} className='ml-auto flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline'>
                      Open original <ExternalLink className='h-3 w-3' />
                    </Link>
                  )}
                </div>

                <div>
                  <p className='text-sm font-semibold text-gray-900'>{row.targetLabel}</p>
                  {row.preview && <p className='mt-0.5 line-clamp-2 text-sm text-gray-700'>{row.preview}</p>}
                  <p className='mt-1 text-xs text-gray-500'>
                    {row.creator && <>by {row.creator} · </>}
                    <span className={cn(row.visible ? 'text-green-700' : 'text-gray-500')}>
                      {row.visible ? 'Visible to the community' : 'Not visible'} ({row.visibleNote})
                    </span>
                  </p>
                </div>

                {row.reasons.length > 0 && (
                  <div className='flex flex-wrap gap-1.5'>
                    {row.reasons.map((reason) => (
                      <span key={reason} className='rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800'>
                        {reason}
                      </span>
                    ))}
                  </div>
                )}

                <p className='text-xs text-gray-500'>
                  Reviewer: {row.assignedToName ?? 'unassigned'}
                  {row.assignedToName === null && row.reportId && admin && <> · assign yourself to take this item</>}
                </p>

                <div className='flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3'>
                  {row.kind === 'awaiting' ? (
                    <>
                      <Button
                        size='sm'
                        icon={<CheckCircle2 className='h-4 w-4' />}
                        onClick={() => approvePost.mutate(row.targetId)}
                        disabled={approvePost.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        size='sm'
                        variant='secondary'
                        icon={<XCircle className='h-4 w-4' />}
                        onClick={() => {
                          setRejecting({ id: row.targetId, label: row.targetLabel })
                          setRejectReason('')
                          setRejectError('')
                        }}
                      >
                        Reject with reason
                      </Button>
                    </>
                  ) : (
                    <>
                      {row.status === 'pending' && row.reportId && (
                        <Button
                          size='sm'
                          variant='secondary'
                          onClick={() => setReportStatus.mutate({ id: row.reportId!, status: 'under_review' })}
                          disabled={setReportStatus.isPending}
                        >
                          Mark under review
                        </Button>
                      )}
                      {row.status !== 'escalated' && row.reportId && (
                        <Button
                          size='sm'
                          variant='ghost'
                          icon={<ShieldAlert className='h-4 w-4' />}
                          onClick={() => setReportStatus.mutate({ id: row.reportId!, status: 'escalated' })}
                          disabled={setReportStatus.isPending}
                        >
                          Escalate
                        </Button>
                      )}
                      {row.reportId && !row.assignedToName && (
                        <Button
                          size='sm'
                          variant='ghost'
                          icon={<UserCheck className='h-4 w-4' />}
                          onClick={() => assignReport.mutate(row.reportId!)}
                          disabled={assignReport.isPending}
                        >
                          Assign to me
                        </Button>
                      )}
                      <Button
                        size='sm'
                        icon={<CheckCircle2 className='h-4 w-4' />}
                        onClick={() => resolveReport.mutate({ row, outcome: 'uphold' })}
                        disabled={resolveReport.isPending}
                      >
                        Uphold & enforce
                      </Button>
                      <Button
                        size='sm'
                        variant='secondary'
                        onClick={() => resolveReport.mutate({ row, outcome: 'dismiss' })}
                        disabled={resolveReport.isPending}
                      >
                        Dismiss
                      </Button>
                      {row.targetType === 'post' && (
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => {
                            setRejecting({ id: row.targetId, label: row.targetLabel })
                            setRejectReason('')
                            setRejectError('')
                          }}
                        >
                          Reject with reason
                        </Button>
                      )}
                    </>
                  )}
                </div>
                <p className='text-xs text-gray-400'>
                  Uphold enforces the platform action for this content type; dismiss records the decision and
                  leaves the content untouched. Both are written to the audit log.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!rejecting} onClose={() => setRejecting(null)} title='Reject with reason'>
        <div className='space-y-3'>
          <p className='text-sm text-gray-600'>
            The author will see this reason: “{rejecting?.label}”
          </p>
          <textarea
            className={cn('textarea-field', rejectError && 'border-red-400')}
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder='e.g. Off-topic for this community.'
            autoFocus
          />
          {rejectError && <p className='error-text'>{rejectError}</p>}
          <div className='flex justify-end gap-2'>
            <Button variant='secondary' size='sm' onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button size='sm' onClick={confirmReject} disabled={rejectPost.isPending}>
              Reject
            </Button>
          </div>
        </div>
      </Modal>

      {/* Group context (§9, §17-7) — permission-gated, group administration stays with Groups & Circles */}
      <GroupContextModal group={contextGroup} onClose={() => setContextGroup(null)} />
    </div>
  )
}
