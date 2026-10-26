import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  CalendarClock,
  Eye,
  ExternalLink,
  History,
  Megaphone,
  MessageSquare,
  Pin,
  Search,
  ShieldAlert,
  Star,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { adminApi, type PostModerationAction } from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth.store'
import { useEngagementStore } from '@/stores/engagement.store'
import { canAdmin } from '@/lib/permissions'
import type { ContentVisibility } from '@/lib/constants'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { MediaPreview } from '@/components/community/MediaPreview'
import { GroupContextModal } from '@/components/admin/GroupContextModal'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/format'
import { formatDate } from '../business/helpers'
import type { PublicGroup } from '@/types/community-public'

/**
 * Content Management & Feed Controls (spec §3.1, §5.2): search and filter all
 * Community content, review it in any state, approve/reject with reasons,
 * hide/remove/restore, pin/feature, control visibility, schedule (§17-1
 * pending), open the original, inspect linked comments and read each post's
 * moderation history. Destructive actions require confirmation; everything is
 * written to the audit log.
 */

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending review' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'archived', label: 'Hidden' },
] as const

type StatusTab = (typeof STATUS_TABS)[number]['id']

/** Every value the data model supports (§7 vocabulary) — a consumer/group/private
 *  post must show its real audience here, never be silently read as 'public'. */
const VISIBILITY_OPTIONS: readonly ContentVisibility[] = [
  'public',
  'both',
  'business',
  'consumer',
  'group',
  'private',
]

/** ISO → value for `<input type='datetime-local'>`. */
function toInputValue(iso: string | Date): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AdminContentPage() {
  const queryClient = useQueryClient()
  const me = useAuthStore((s) => s.user)
  const adminName = useAuthStore((s) => s.user?.name ?? 'Admin')
  const legacyReportedIds = useEngagementStore((s) => s.reportedPostIds)
  // Group context (§9, §17-7) sits behind its own permission, mirroring the
  // exchange Messages-context panel; the plain group badge is ungated metadata.
  const canSeeGroupContext = canAdmin(me, 'view_group_context')

  // B1 filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reportsFirst, setReportsFirst] = useState(false)

  // Modals
  const [rejecting, setRejecting] = useState<{ id: string; label: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [removing, setRemoving] = useState<{ id: string; label: string } | null>(null)
  const [scheduling, setScheduling] = useState<{ id: string; label: string; at: string | null } | null>(null)
  const [scheduleValue, setScheduleValue] = useState('')
  const [contextGroup, setContextGroup] = useState<PublicGroup | null>(null)

  // Expansions
  const [historyFor, setHistoryFor] = useState<string | null>(null)
  const [commentsFor, setCommentsFor] = useState<string | null>(null)

  const { data: posts = [], isLoading } = useQuery({ queryKey: ['admin', 'posts'], queryFn: adminApi.listPosts })
  const { data: comments = [] } = useQuery({ queryKey: ['admin', 'comments'], queryFn: adminApi.listComments })
  const { data: groups = [] } = useQuery({ queryKey: ['admin', 'groups'], queryFn: adminApi.listGroups })
  const { data: openReports = [] } = useQuery({
    queryKey: ['admin', 'reports', 'open'],
    queryFn: () => adminApi.listReports().filter((r) => r.status !== 'resolved'),
  })

  const reportedPostIds = useMemo(
    () => [...new Set([...legacyReportedIds, ...openReports.filter((r) => r.targetType === 'post').map((r) => r.targetId)])],
    [legacyReportedIds, openReports],
  )
  const openPostReports = useMemo(() => openReports.filter((r) => r.targetType === 'post'), [openReports])

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'comments'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] })
  }

  const reportsFor = (postId: string) => openPostReports.filter((r) => r.targetId === postId)
  const commentsForPost = (postId: string) => comments.filter((c) => c.postId === postId)
  const openCommentReports = openReports.filter((r) => r.targetType === 'comment')

  const moderate = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: PostModerationAction; reason?: string }) =>
      adminApi.moderatePost(id, action, reason),
    onSuccess: () => {
      setRejecting(null)
      setRejectReason('')
      setRejectError('')
      void invalidate()
    },
  })

  const setVisibility = useMutation({
    mutationFn: ({ id, visibility }: { id: string; visibility: ContentVisibility }) =>
      adminApi.setPostVisibility(id, visibility),
    onSuccess: () => void invalidate(),
  })

  const reviewReport = useMutation({
    mutationFn: ({ postId, outcome }: { postId: string; outcome: 'uphold' | 'dismiss' }) =>
      adminApi.reviewReport(postId, outcome),
    onSuccess: () => void invalidate(),
  })

  const moderateComment = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'remove' | 'restore' }) => adminApi.moderateComment(id, action),
    onSuccess: () => void invalidate(),
  })

  const schedule = useMutation({
    mutationFn: ({ id, at }: { id: string; at: string | null }) => adminApi.schedulePost(id, at),
    onSuccess: () => {
      setScheduling(null)
      void invalidate()
    },
  })

  // B1: every listed filter applies over the same record set.
  const typeOptions = useMemo(() => [...new Set(posts.map((p) => p.postType))], [posts])
  const cityOptions = useMemo(() => [...new Set(posts.map((p) => p.location?.cityName).filter((c): c is string => !!c))], [posts])
  const hasFilters = !!(search || typeFilter || roleFilter || cityFilter || dateFrom || dateTo)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = posts.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (typeFilter && p.postType !== typeFilter) return false
      if (roleFilter && p.author.userType !== roleFilter) return false
      if (cityFilter && (p.location?.cityName ?? '') !== cityFilter) return false
      if (dateFrom && new Date(p.createdAt).getTime() < new Date(`${dateFrom}T00:00:00`).getTime()) return false
      if (dateTo && new Date(p.createdAt).getTime() > new Date(`${dateTo}T23:59:59`).getTime()) return false
      if (q) {
        const haystack = [p.id, p.title ?? '', p.content, p.author.name, ...(p.hashtags ?? [])].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
    if (reportsFirst) {
      const rank = new Set(reportedPostIds)
      list = [...list].sort((a, b) => Number(rank.has(b.id)) - Number(rank.has(a.id)))
    }
    return list
  }, [posts, statusFilter, typeFilter, roleFilter, cityFilter, dateFrom, dateTo, search, reportsFirst, reportedPostIds])

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('')
    setRoleFilter('')
    setCityFilter('')
    setDateFrom('')
    setDateTo('')
  }

  const openReject = (id: string, label: string) => {
    setRejecting({ id, label })
    setRejectReason('')
    setRejectError('')
  }

  const confirmReject = () => {
    if (!rejecting) return
    if (!rejectReason.trim()) {
      setRejectError('A moderation reason is required (§5.2).')
      return
    }
    moderate.mutate({ id: rejecting.id, action: 'reject', reason: rejectReason.trim() })
  }

  const confirmRemove = () => {
    if (!removing) return
    moderate.mutate({ id: removing.id, action: 'remove' })
    setRemoving(null)
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h2 className='text-lg font-bold text-gray-900'>Content Management</h2>
          <p className='text-sm text-gray-600'>Posts, announcements and moderation. Acting as {adminName}.</p>
        </div>
        <button
          onClick={() => setReportsFirst((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm',
            reportsFirst ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50',
          )}
        >
          <ShieldAlert className='h-4 w-4' /> {reportsFirst ? 'Reports first: on' : 'Sort reports first'} ({reportedPostIds.length})
        </button>
      </div>

      {/* B1 — search + filters (title, text, creator, id / type / role / location / date) */}
      <div className='card'>
        <div className='card-content space-y-3'>
          <div className='relative'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
            <input
              type='search'
              className='input-field pl-9'
              placeholder='Search by title, text, creator or id…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label='Search content'
            />
          </div>
          <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5'>
            <select className='input-field py-2 text-sm' value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label='Filter by content type'>
              <option value=''>All content types</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <select className='input-field py-2 text-sm' value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label='Filter by creator type'>
              <option value=''>Businesses & consumers</option>
              <option value='business'>Businesses only</option>
              <option value='consumer'>Consumers only</option>
            </select>
            <select className='input-field py-2 text-sm' value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} aria-label='Filter by location'>
              <option value=''>All locations</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input type='date' className='input-field py-2 text-sm' value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label='Published from' />
            <input type='date' className='input-field py-2 text-sm' value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label='Published to' />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className='flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline'>
              <X className='h-3.5 w-3.5' /> Clear filters
            </button>
          )}
        </div>
      </div>

      <div className='flex gap-1.5 overflow-x-auto scrollbar-hide'>
        {STATUS_TABS.map((tab) => {
          const count = tab.id === 'all' ? posts.length : posts.filter((p) => p.status === tab.id).length
          if (tab.id !== 'all' && count === 0 && statusFilter !== tab.id) return null
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm',
                statusFilter === tab.id
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {tab.label}
              <span className='rounded-full bg-gray-100 px-1.5 text-xs text-gray-600'>{count}</span>
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <Skeleton className='h-40 w-full' />
      ) : visible.length === 0 ? (
        <div className='card'>
          <EmptyState
            icon={<Megaphone className='h-10 w-10' />}
            title='Nothing here'
            description={hasFilters ? 'No posts match the current filters.' : 'No posts in this state.'}
          />
        </div>
      ) : (
        <div className='space-y-3'>
          {visible.map((post) => {
            const isReported = reportedPostIds.includes(post.id)
            const label = post.title ?? post.content.slice(0, 60)
            const postComments = commentsForPost(post.id)
            const isHistoryOpen = historyFor === post.id
            const isCommentsOpen = commentsFor === post.id
            return (
              <div key={post.id} className={cn('card', isReported && 'border-amber-300')}>
                <div className='card-content space-y-3'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Badge variant={post.status === 'published' ? 'success' : post.status === 'pending' ? 'warning' : post.status === 'rejected' ? 'danger' : 'neutral'}>
                      {post.status}
                    </Badge>
                    <Badge variant='neutral'>{post.postType}</Badge>
                    <Badge variant='neutral'>{post.visibility}</Badge>
                    {post.isPinned && <Badge variant='primary'>Pinned</Badge>}
                    {post.isFeatured && <Badge variant='primary'>Featured</Badge>}
                    {post.scheduledAt && <Badge variant='primary'>Scheduled {formatDate(post.scheduledAt)}</Badge>}
                    {isReported && <Badge variant='warning'>Reported by a user</Badge>}
                    {post.groupId && (
                      <>
                        <Badge variant='neutral'>
                          group: {groups.find((g) => g.id === post.groupId)?.name ?? post.groupId}
                        </Badge>
                        <Button
                          size='sm'
                          variant='ghost'
                          icon={<Users className='h-4 w-4' />}
                          disabled={!canSeeGroupContext}
                          title={
                            canSeeGroupContext
                              ? 'Group context for this post'
                              : "Requires the 'View group context' permission — role grants pending §17-6; privacy scope pending §17-7"
                          }
                          onClick={() => setContextGroup(groups.find((g) => g.id === post.groupId) ?? null)}
                        >
                          Group context
                        </Button>
                      </>
                    )}
                    <span className='text-xs text-gray-500'>
                      {post.author.name} · {formatDate(post.createdAt)}
                    </span>
                    <Link
                      to={`/community/post/${post.id}`}
                      className='ml-auto flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline'
                    >
                      Open original <ExternalLink className='h-3 w-3' />
                    </Link>
                  </div>

                  {post.title && <h3 className='text-sm font-semibold text-gray-900'>{post.title}</h3>}
                  <p className='line-clamp-3 whitespace-pre-wrap text-sm text-gray-800'>{post.content}</p>
                  {post.mediaUrls && post.mediaUrls.length > 0 && <MediaPreview urls={post.mediaUrls} />}
                  {post.status === 'rejected' && post.moderationReason && (
                    <p className='rounded-lg bg-red-50 p-2.5 text-xs text-red-700'>
                      Rejection reason: {post.moderationReason}
                    </p>
                  )}

                  <div className='flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3'>
                    {post.status !== 'published' && (
                      <Button size='sm' onClick={() => moderate.mutate({ id: post.id, action: 'approve' })} disabled={moderate.isPending}>
                        Approve
                      </Button>
                    )}
                    {post.status !== 'rejected' && (
                      <Button size='sm' variant='secondary' onClick={() => openReject(post.id, label)}>
                        Reject
                      </Button>
                    )}
                    {post.status === 'published' ? (
                      <Button size='sm' variant='secondary' icon={<Eye className='h-4 w-4' />} onClick={() => moderate.mutate({ id: post.id, action: 'hide' })}>
                        Hide
                      </Button>
                    ) : post.status === 'archived' ? (
                      <Button size='sm' variant='secondary' icon={<Archive className='h-4 w-4' />} onClick={() => moderate.mutate({ id: post.id, action: 'restore' })}>
                        Restore
                      </Button>
                    ) : null}
                    {post.isPinned ? (
                      <Button size='sm' variant='ghost' icon={<Pin className='h-4 w-4' />} onClick={() => moderate.mutate({ id: post.id, action: 'unpin' })}>
                        Unpin
                      </Button>
                    ) : (
                      <Button size='sm' variant='ghost' icon={<Pin className='h-4 w-4' />} onClick={() => moderate.mutate({ id: post.id, action: 'pin' })}>
                        Pin
                      </Button>
                    )}
                    {post.isFeatured ? (
                      <Button size='sm' variant='ghost' icon={<Star className='h-4 w-4' />} onClick={() => moderate.mutate({ id: post.id, action: 'unfeature' })}>
                        Unfeature
                      </Button>
                    ) : (
                      <Button size='sm' variant='ghost' icon={<Star className='h-4 w-4' />} onClick={() => moderate.mutate({ id: post.id, action: 'feature' })}>
                        Feature
                      </Button>
                    )}
                    {post.status !== 'published' && (
                      <Button
                        size='sm'
                        variant='ghost'
                        icon={<CalendarClock className='h-4 w-4' />}
                        onClick={() => {
                          setScheduling({ id: post.id, label, at: post.scheduledAt ? String(post.scheduledAt) : null })
                          setScheduleValue(post.scheduledAt ? toInputValue(post.scheduledAt) : '')
                        }}
                      >
                        Schedule
                      </Button>
                    )}
                    <select
                      value={post.visibility ?? 'public'}
                      onChange={(e) => setVisibility.mutate({ id: post.id, visibility: e.target.value as ContentVisibility })}
                      className='input-field w-auto py-1.5 text-xs'
                      aria-label={`Visibility for ${label}`}
                    >
                      {VISIBILITY_OPTIONS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='text-red-600 hover:bg-red-50'
                      icon={<Trash2 className='h-4 w-4' />}
                      onClick={() => setRemoving({ id: post.id, label })}
                    >
                      Remove
                    </Button>
                  </div>

                  {/* Linked comments + moderation history (§3.1, §3.4) */}
                  <div className='flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 text-xs'>
                    <button
                      onClick={() => setCommentsFor(isCommentsOpen ? null : post.id)}
                      className='flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900'
                    >
                      <MessageSquare className='h-3.5 w-3.5' /> Comments ({postComments.length})
                    </button>
                    <button
                      onClick={() => setHistoryFor(isHistoryOpen ? null : post.id)}
                      className='flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900'
                    >
                      <History className='h-3.5 w-3.5' /> Moderation history
                    </button>
                  </div>

                  {isCommentsOpen && (
                    <div className='space-y-2 rounded-lg bg-gray-50 p-3'>
                      {postComments.length === 0 ? (
                        <p className='text-xs text-gray-500'>No comments on this post.</p>
                      ) : (
                        postComments.map((c) => {
                          const commentReported = openCommentReports.some((r) => r.targetId === c.id)
                          const removed = c.status === 'removed'
                          return (
                            <div key={c.id} className='rounded-md bg-white px-2.5 py-2 text-xs'>
                              <div className='flex flex-wrap items-center gap-1.5'>
                                <span className='font-semibold text-gray-900'>{c.author.name}</span>
                                <span className='text-gray-400'>{timeAgo(c.createdAt)}</span>
                                {commentReported && <Badge variant='warning'>Reported</Badge>}
                                {removed && <Badge variant='danger'>Removed</Badge>}
                                <span className='ml-auto flex gap-2'>
                                  {removed ? (
                                    <button
                                      onClick={() => moderateComment.mutate({ id: c.id, action: 'restore' })}
                                      className='font-medium text-primary-600 hover:underline'
                                    >
                                      Restore
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => moderateComment.mutate({ id: c.id, action: 'remove' })}
                                      className='font-medium text-red-600 hover:underline'
                                    >
                                      Remove
                                    </button>
                                  )}
                                </span>
                              </div>
                              <p className='mt-1 text-gray-700'>{c.content}</p>
                              {removed && c.moderationReason && <p className='mt-1 text-red-600'>Reason: {c.moderationReason}</p>}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}

                  {isHistoryOpen && (
                    <div className='space-y-1.5 rounded-lg bg-gray-50 p-3 text-xs'>
                      {(() => {
                        const entries = adminApi.listAuditFor(post.id)
                        if (entries.length === 0) return <p className='text-gray-500'>No administrative actions recorded for this post yet.</p>
                        return entries.map((e) => (
                          <div key={e.id} className='rounded-md bg-white px-2.5 py-2'>
                            <p className='text-gray-800'>
                              <span className='font-semibold'>{e.adminName}</span> {e.action}
                            </p>
                            <p className='text-gray-500'>
                              {formatDate(e.at)}
                              {e.previousStatus || e.resultingStatus
                                ? ` · ${e.previousStatus ?? '—'} → ${e.resultingStatus ?? '—'}`
                                : ''}
                            </p>
                            {e.reason && <p className='text-gray-600'>Reason: {e.reason}</p>}
                          </div>
                        ))
                      })()}
                    </div>
                  )}

                  {isReported && (
                    <div className='space-y-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900'>
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <span className='font-medium'>
                          {reportsFor(post.id).length || 1} open report(s) — see reason and reporter below.
                        </span>
                        <span className='flex gap-2'>
                          <button
                            onClick={() => reviewReport.mutate({ postId: post.id, outcome: 'dismiss' })}
                            className='font-medium underline'
                          >
                            Dismiss report
                          </button>
                          <button
                            onClick={() => reviewReport.mutate({ postId: post.id, outcome: 'uphold' })}
                            className='font-medium text-red-700 underline'
                          >
                            Uphold (remove post)
                          </button>
                        </span>
                      </div>
                      <ul className='space-y-1'>
                        {reportsFor(post.id).map((r) => (
                          <li key={r.id} className='rounded bg-white/60 px-2 py-1.5'>
                            <span className='font-medium'>{r.reasonLabel ?? r.reasonCode}</span>
                            <span className='text-amber-700'>
                              {' '}· {r.reporterName ?? r.reporterId} · {formatDate(r.createdAt)}
                              {r.source === 'demo' ? ' · demo record' : ''}
                            </span>
                            {r.details && <p className='mt-0.5 text-amber-800'>“{r.details}”</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Rejection reason modal (§5.2 — record moderation reasons) */}
      <Modal isOpen={!!rejecting} onClose={() => setRejecting(null)} title='Reject with reason'>
        <div className='space-y-3'>
          <p className='text-sm text-gray-600'>
            The author will see this reason on their rejected post: “{rejecting?.label}”
          </p>
          <textarea
            className={cn('textarea-field', rejectError && 'border-red-400')}
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder='e.g. Promotional posts require an approved offer or campaign.'
            autoFocus
          />
          {rejectError && <p className='error-text'>{rejectError}</p>}
          <div className='flex justify-end gap-2'>
            <Button variant='secondary' size='sm' onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button size='sm' onClick={confirmReject} disabled={moderate.isPending}>
              Reject post
            </Button>
          </div>
        </div>
      </Modal>

      {/* Scheduling shell (§17-1 pending — server scheduler applies the approved rule) */}
      <Modal isOpen={!!scheduling} onClose={() => setScheduling(null)} title='Schedule publication'>
        <div className='space-y-3'>
          <p className='text-sm text-gray-600'>
            “{scheduling?.label}” — choose when this post should publish.
          </p>
          <input
            type='datetime-local'
            className='input-field'
            value={scheduleValue}
            onChange={(e) => setScheduleValue(e.target.value)}
            aria-label='Scheduled publish time'
          />
          <p className='rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800'>
            Scheduling rules (which types may be scheduled, auto-publication) are pending approval
            (§17-1). The requested time is recorded; automatic publication applies once the
            server-side scheduler is connected.
          </p>
          <div className='flex flex-wrap justify-end gap-2'>
            {scheduling?.at && (
              <Button
                variant='secondary'
                size='sm'
                onClick={() => schedule.mutate({ id: scheduling.id, at: null })}
                disabled={schedule.isPending}
              >
                Clear schedule
              </Button>
            )}
            <Button variant='secondary' size='sm' onClick={() => setScheduling(null)}>
              Cancel
            </Button>
            <Button
              size='sm'
              disabled={!scheduleValue || schedule.isPending}
              onClick={() => scheduling && schedule.mutate({ id: scheduling.id, at: new Date(scheduleValue).toISOString() })}
            >
              Save schedule
            </Button>
          </div>
        </div>
      </Modal>

      {/* Destructive confirmation (§5.2) */}
      <Modal isOpen={!!removing} onClose={() => setRemoving(null)} title='Remove this post?'>
        <div className='space-y-3'>
          <p className='text-sm text-gray-600'>
            “{removing?.label}” will be permanently removed for all accounts. This cannot be undone.
          </p>
          <div className='flex justify-end gap-2'>
            <Button variant='secondary' size='sm' onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button size='sm' className='bg-red-600 hover:bg-red-700' onClick={confirmRemove} disabled={moderate.isPending}>
              Remove permanently
            </Button>
          </div>
        </div>
      </Modal>

      {/* Group context (§9, §17-7) — permission-gated, group administration stays with Groups & Circles */}
      <GroupContextModal group={contextGroup} onClose={() => setContextGroup(null)} />
    </div>
  )
}
