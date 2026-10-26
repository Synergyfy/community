import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, EyeOff, MessageSquare, RotateCcw, ShieldAlert, Trash2, XCircle } from 'lucide-react'
import { adminApi } from '@/services/admin.service'
import { managersService } from '@/services/managers.service'
import { useAuthStore } from '@/stores/auth.store'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { timeAgo } from '@/lib/format'
import { inScope, managerScope } from './manager-scope'
import type { PublicComment, PublicPost } from '@/types/community-public'

/**
 * Community Manager — Content review (Community Hub Manager spec §8).
 *
 * In-scope posts and comments with only the actions this manager is
 * authorised for (spec §3 — permissions are independent switches). Every
 * action goes through the same audited admin service methods the central
 * Admin pages use; the records are the same ones (§15). Account-level
 * actions and platform settings are not available here at all.
 */
export function ManagerContentPage() {
  const user = useAuthStore((s) => s.user)
  const record = managersService.getAnyForUser(user?.id)
  const config = managersService.getConfig()
  const queryClient = useQueryClient()

  const [rejecting, setRejecting] = useState<{ id: string; label: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [escalating, setEscalating] = useState<{ id: string; label: string } | null>(null)
  const [escalateNote, setEscalateNote] = useState('')

  const { data: posts = [] } = useQuery({ queryKey: ['admin', 'posts'], queryFn: adminApi.listPosts })
  const { data: comments = [] } = useQuery({ queryKey: ['admin', 'comments'], queryFn: adminApi.listComments })
  const { data: reports = [] } = useQuery({ queryKey: ['admin', 'reports'], queryFn: () => adminApi.listReports() })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] })
  }

  const moderateMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'hide' | 'restore' | 'remove'; reason?: string }) =>
      adminApi.moderatePost(id, action, reason),
    onSuccess: invalidate,
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.moderatePost(id, 'reject', reason),
    onSuccess: () => {
      invalidate()
      setRejecting(null)
      setRejectReason('')
      setRejectError('')
    },
    onError: (e: Error) => setRejectError(e.message),
  })

  const commentMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'remove' | 'restore'; reason?: string }) =>
      adminApi.moderateComment(id, action, reason),
    onSuccess: invalidate,
  })

  // Escalation is a routing action for the central Admin, not a status change
  // the manager owns: it writes an audited entry and leaves the target record
  // untouched (same path ManagerExchangePage uses; §17-2).
  const escalateMutation = useMutation({
    mutationFn: ({ id, label, note }: { id: string; label: string; note: string }) =>
      adminApi.escalateToAdmin('report', id, label, note),
    onSuccess: () => {
      setEscalating(null)
      setEscalateNote('')
    },
  })

  const scope = record ? managerScope(record, config.areas) : { all: false, cities: [] }
  const perms = record?.permissions

  const { inScopePosts, hiddenCount } = useMemo(() => {
    const scoped = posts.filter((p) => inScope(scope, p.location?.cityName))
    return { inScopePosts: scoped, hiddenCount: posts.length - scoped.length }
  }, [posts, scope])

  if (!record || !perms) return null

  const typeAllowed = (post: PublicPost): boolean =>
    !record.restrictions.permittedContentTypes?.length ||
    record.restrictions.permittedContentTypes.includes(post.postType)

  const actionBlockedReason = (post: PublicPost): string | null => {
    if (!typeAllowed(post)) return `Your appointment restricts you to: ${record.restrictions.permittedContentTypes?.join(', ')}`
    return null
  }

  const openReportFor = (postId: string) =>
    reports.find((r) => r.targetType === 'post' && r.targetId === postId && r.status !== 'resolved')

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-gray-900'>Content review</h2>
        <p className='text-sm text-gray-600'>
          Posts and comments within your assigned areas. You see only the actions you are authorised for — approving,
          publishing, taking content down and escalating are separate permissions.
        </p>
      </div>

      {hiddenCount > 0 && (
        <p className='rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500'>
          {hiddenCount} post{hiddenCount === 1 ? '' : 's'} outside your assigned areas {hiddenCount === 1 ? 'is' : 'are'} hidden
          from this dashboard.
        </p>
      )}

      {inScopePosts.length === 0 ? (
        <div className='card'>
          <EmptyState title='No content in scope' description='Posts within your assigned areas appear here.' />
        </div>
      ) : (
        <div className='space-y-3'>
          {inScopePosts.map((post) => {
            const blocked = actionBlockedReason(post)
            const postComments = comments.filter((c) => c.postId === post.id)
            const report = openReportFor(post.id)
            return (
              <div key={post.id} className='card'>
                <div className='card-content space-y-2'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold text-gray-900'>
                        {post.title ?? post.content.slice(0, 60)}
                      </p>
                      <p className='text-xs text-gray-500'>
                        {post.author?.name} · {post.postType} · {timeAgo(post.createdAt)}
                        {post.location?.cityName ? ` · ${post.location.cityName}` : ' · no location'}
                      </p>
                    </div>
                    <div className='flex flex-wrap items-center gap-1.5'>
                      <Badge variant={post.status === 'published' ? 'success' : post.status === 'pending' ? 'warning' : 'neutral'}>
                        {post.status}
                      </Badge>
                      {post.groupId && <Badge variant='neutral'>group content</Badge>}
                      {report && <Badge variant='danger'>reported</Badge>}
                    </div>
                  </div>

                  {blocked && (
                    <p className='rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800'>{blocked}</p>
                  )}

                  {/* Actions — each behind its own permission */}
                  <div className='flex flex-wrap gap-2'>
                    {post.status === 'pending' && (perms.approveRejectContent || perms.publishPosts) && !blocked && (
                      <button
                        className='btn btn-primary btn-sm'
                        onClick={() => moderateMutation.mutate({ id: post.id, action: 'approve' })}
                      >
                        <CheckCircle2 className='h-4 w-4' /> {perms.approveRejectContent ? 'Approve' : 'Publish'}
                      </button>
                    )}
                    {post.status === 'pending' && perms.approveRejectContent && !blocked && (
                      <button
                        className='btn btn-secondary btn-sm'
                        onClick={() => {
                          setRejecting({ id: post.id, label: post.title ?? post.content.slice(0, 40) })
                          setRejectReason('')
                          setRejectError('')
                        }}
                      >
                        <XCircle className='h-4 w-4' /> Reject
                      </button>
                    )}
                    {perms.hideRemoveRestore && post.status !== 'archived' && (
                      <button className='btn btn-secondary btn-sm' onClick={() => moderateMutation.mutate({ id: post.id, action: 'hide' })}>
                        <EyeOff className='h-4 w-4' /> Hide
                      </button>
                    )}
                    {perms.hideRemoveRestore && post.status === 'archived' && (
                      <button className='btn btn-secondary btn-sm' onClick={() => moderateMutation.mutate({ id: post.id, action: 'restore' })}>
                        <RotateCcw className='h-4 w-4' /> Restore
                      </button>
                    )}
                    {perms.hideRemoveRestore && post.status !== 'archived' && (
                      <button
                        className='btn btn-danger btn-sm'
                        onClick={() => {
                          if (window.confirm('Remove this post? This is recorded and can be audited.')) {
                            moderateMutation.mutate({ id: post.id, action: 'remove' })
                          }
                        }}
                      >
                        <Trash2 className='h-4 w-4' /> Remove
                      </button>
                    )}
                    {perms.escalateToAdmin && report && (
                      <button
                        className='btn btn-secondary btn-sm'
                        onClick={() => {
                          setEscalating({ id: report.id, label: post.title ?? post.content.slice(0, 40) })
                          setEscalateNote('')
                        }}
                        disabled={report.status === 'escalated'}
                      >
                        <ShieldAlert className='h-4 w-4' />
                        {report.status === 'escalated' ? 'Escalated to Admin' : 'Escalate to Admin'}
                      </button>
                    )}
                  </div>

                  {/* Comments */}
                  {postComments.length > 0 && (
                    <div className='rounded-lg border border-gray-100'>
                      <p className='flex items-center gap-1.5 border-b border-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700'>
                        <MessageSquare className='h-3.5 w-3.5' /> Comments ({postComments.length})
                      </p>
                      <ul className='divide-y divide-gray-50'>
                        {postComments.map((comment: PublicComment) => (
                          <li key={comment.id} className='flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-xs'>
                            <span className='min-w-0 text-gray-700'>
                              <span className='font-medium'>{comment.author?.name}</span> — {comment.content}
                              {comment.status === 'removed' && <span className='ml-1 text-gray-400'>(removed)</span>}
                            </span>
                            {perms.hideRemoveRestore &&
                              (comment.status === 'removed' ? (
                                <button
                                  className='text-primary-600 hover:underline'
                                  onClick={() => commentMutation.mutate({ id: comment.id, action: 'restore' })}
                                >
                                  Restore
                                </button>
                              ) : (
                                <button
                                  className='text-red-600 hover:underline'
                                  onClick={() => {
                                    if (window.confirm('Remove this comment?')) {
                                      commentMutation.mutate({ id: comment.id, action: 'remove' })
                                    }
                                  }}
                                >
                                  Remove
                                </button>
                              ))}
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

      {/* Reject modal */}
      <Modal
        isOpen={!!rejecting}
        onClose={() => setRejecting(null)}
        title={`Reject “${rejecting?.label ?? ''}”`}
      >
        <div className='space-y-3'>
          <div>
            <label className='label' htmlFor='mgr-reject-reason'>
              Reason (recorded with the decision)
            </label>
            <textarea
              id='mgr-reject-reason'
              className='input-field min-h-[90px]'
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          {rejectError && <p className='text-sm text-red-600'>{rejectError}</p>}
          <button
            className='btn btn-primary'
            disabled={!rejectReason.trim() || rejectMutation.isPending}
            onClick={() => rejecting && rejectMutation.mutate({ id: rejecting.id, reason: rejectReason.trim() })}
          >
            {rejectMutation.isPending ? 'Rejecting…' : 'Reject with reason'}
          </button>
        </div>
      </Modal>
      {/* Escalate modal — records an audited escalation to the central Admin */}
      <Modal
        isOpen={!!escalating}
        onClose={() => setEscalating(null)}
        title={`Escalate “${escalating?.label ?? ''}” to Admin`}
      >
        <div className='space-y-3'>
          <div>
            <label className='label' htmlFor='mgr-content-escalate-note'>
              Note for the Admin (recorded with the escalation)
            </label>
            <textarea
              id='mgr-content-escalate-note'
              className='input-field min-h-[90px]'
              value={escalateNote}
              onChange={(e) => setEscalateNote(e.target.value)}
            />
          </div>
          <button
            className='btn btn-primary'
            disabled={!escalateNote.trim() || escalateMutation.isPending}
            onClick={() =>
              escalating && escalateMutation.mutate({ id: escalating.id, label: escalating.label, note: escalateNote.trim() })
            }
          >
            {escalateMutation.isPending ? 'Escalating…' : 'Escalate to Admin'}
          </button>
          <p className='text-xs text-gray-500'>
            Escalation is recorded in the audit log and routed to the central Admin — the item&apos;s state does not
            change until the Admin acts.
          </p>
        </div>
      </Modal>
    </div>
  )
}
