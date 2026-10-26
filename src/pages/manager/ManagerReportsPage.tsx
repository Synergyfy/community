import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldAlert } from 'lucide-react'
import { adminApi } from '@/services/admin.service'
import { managersService } from '@/services/managers.service'
import { useAuthStore } from '@/stores/auth.store'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { formatDate } from '../business/helpers'
import { inScope, managerScope } from './manager-scope'
import type { ReportRecord, ReportTargetType } from '@/types/community-public'

const STATUS_VARIANT: Record<ReportRecord['status'], 'success' | 'warning' | 'danger' | 'neutral' | 'primary'> = {
  pending: 'warning',
  under_review: 'primary',
  escalated: 'danger',
  resolved: 'success',
}

const TARGET_LABEL: Record<ReportTargetType, string> = {
  post: 'Post',
  comment: 'Comment',
  exchange: '#Exchange item',
  user: 'Account',
}

/**
 * Community Manager — Reports (Community Hub Manager spec §8).
 *
 * Open reports on in-scope targets only. The manager can mark cases under
 * review, escalate to the central Admin (their own permission) and dismiss.
 * Upholding a report is available for content and exchange targets within
 * scope; ACCOUNT-level restrictions are reserved for the central Admin —
 * a manager report power never implies account suspension.
 */
export function ManagerReportsPage() {
  const user = useAuthStore((s) => s.user)
  const record = managersService.getAnyForUser(user?.id)
  const config = managersService.getConfig()
  const queryClient = useQueryClient()

  const [escalating, setEscalating] = useState<{ id: string; label: string } | null>(null)
  const [escalateNote, setEscalateNote] = useState('')
  /** Reports this session already escalated (records don't change on escalation). */
  const [escalatedIds, setEscalatedIds] = useState<string[]>([])

  const { data: reports = [] } = useQuery({ queryKey: ['admin', 'reports'], queryFn: () => adminApi.listReports() })
  const { data: posts = [] } = useQuery({ queryKey: ['admin', 'posts'], queryFn: adminApi.listPosts })
  const { data: comments = [] } = useQuery({ queryKey: ['admin', 'comments'], queryFn: adminApi.listComments })
  const { data: exchanges = [] } = useQuery({ queryKey: ['admin', 'exchanges'], queryFn: adminApi.listExchanges })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] })

  const reviewMutation = useMutation({
    mutationFn: (reportId: string) => adminApi.setReportStatus(reportId, 'under_review'),
    onSuccess: invalidate,
  })
  // Escalation is a routing action, not a status transition the manager owns:
  // it writes an audited entry addressed to the central Admin and leaves the
  // report record untouched — the Admin decides the outcome (§17-2).
  const escalateMutation = useMutation({
    mutationFn: ({ id, label, note }: { id: string; label: string; note: string }) =>
      adminApi.escalateToAdmin('report', id, label, note),
    onSuccess: (_data, vars) => {
      setEscalatedIds((ids) => (ids.includes(vars.id) ? ids : [...ids, vars.id]))
      setEscalating(null)
      setEscalateNote('')
    },
  })
  const resolveMutation = useMutation({
    mutationFn: ({ targetType, targetId, outcome }: { targetType: ReportTargetType; targetId: string; outcome: 'uphold' | 'dismiss' }) =>
      adminApi.resolveReports(targetType, targetId, outcome),
    onSuccess: invalidate,
  })

  if (!record) return null
  const perms = record.permissions
  const scope = managerScope(record, config.areas)

  /** City of a report's target, for scope filtering. */
  const cityFor = (r: ReportRecord): string | null | undefined => {
    if (r.targetType === 'post') return posts.find((p) => p.id === r.targetId)?.location?.cityName
    if (r.targetType === 'exchange') return exchanges.find((e) => e.id === r.targetId)?.location?.cityName
    return undefined // account/comment reports have no city — handled below
  }

  const openReports = reports.filter((r) => r.status !== 'resolved')

  const scoped = openReports.filter((r) => {
    if (r.targetType === 'post' || r.targetType === 'exchange') return inScope(scope, cityFor(r))
    // Comments inherit their parent post's scope; accounts have no city scope.
    if (r.targetType === 'comment') {
      const comment = comments.find((c) => c.id === r.targetId)
      const parent = comment ? posts.find((p) => p.id === comment.postId) : undefined
      return parent ? inScope(scope, parent.location?.cityName) : scope.all
    }
    return true
  })

  const hiddenCount = openReports.length - scoped.length

  const labelFor = (r: ReportRecord): string => {
    if (r.targetLabel) return r.targetLabel
    if (r.targetType === 'post') return posts.find((p) => p.id === r.targetId)?.title ?? 'Post'
    if (r.targetType === 'exchange') return exchanges.find((e) => e.id === r.targetId)?.title ?? 'Exchange item'
    if (r.targetType === 'comment') return comments.find((c) => c.id === r.targetId)?.content.slice(0, 60) ?? 'Comment'
    return r.targetId
  }

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-gray-900'>Reports</h2>
        <p className='text-sm text-gray-600'>
          Open reports on content and #Exchange items within your assigned areas. Escalate sensitive or disputed cases
          to the central Admin — account restrictions stay with them.
        </p>
      </div>

      {hiddenCount > 0 && (
        <p className='rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500'>
          {hiddenCount} open report{hiddenCount === 1 ? '' : 's'} outside your assigned areas {hiddenCount === 1 ? 'is' : 'are'} hidden.
        </p>
      )}

      {scoped.length === 0 ? (
        <div className='card'>
          <EmptyState title='No open reports in scope' description='Reports on content within your areas appear here.' />
        </div>
      ) : (
        <div className='space-y-3'>
          {scoped.map((r) => {
            const accountTarget = r.targetType === 'user'
            return (
              <div key={r.id} className='card'>
                <div className='card-content space-y-2'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold text-gray-900'>{labelFor(r)}</p>
                      <p className='text-xs text-gray-500'>
                        {TARGET_LABEL[r.targetType]} · “{r.reasonLabel ?? r.reasonCode}” · filed by {r.reporterName ?? r.reporterId} ·{' '}
                        {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[r.status]}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                  {r.details && <p className='text-xs text-gray-600'>“{r.details}”</p>}
                  {r.source === 'demo' && <Badge variant='warning'>demo seed report</Badge>}
                  {accountTarget && (
                    <p className='rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800'>
                      Account restrictions are reserved for the central Admin. You can mark this case under review,
                      escalate it or dismiss it — but not suspend the account.
                    </p>
                  )}

                  <div className='flex flex-wrap gap-2'>
                    {perms.moderateReports && r.status === 'pending' && (
                      <button className='btn btn-secondary btn-sm' onClick={() => reviewMutation.mutate(r.id)}>
                        Mark under review
                      </button>
                    )}
                    {perms.escalateToAdmin && r.status !== 'escalated' && !escalatedIds.includes(r.id) && (
                      <button
                        className='btn btn-secondary btn-sm'
                        onClick={() => {
                          setEscalating({ id: r.id, label: labelFor(r) })
                          setEscalateNote('')
                        }}
                      >
                        <ShieldAlert className='h-4 w-4' /> Escalate to Admin
                      </button>
                    )}
                    {perms.escalateToAdmin && escalatedIds.includes(r.id) && (
                      <span className='flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800'>
                        <ShieldAlert className='h-3.5 w-3.5' /> Escalated to Admin — awaiting their decision
                      </span>
                    )}
                    {perms.moderateReports && !accountTarget && (
                      <button
                        className='btn btn-secondary btn-sm'
                        onClick={() => {
                          if (window.confirm('Uphold this report and enforce its target type’s decision?')) {
                            resolveMutation.mutate({ targetType: r.targetType, targetId: r.targetId, outcome: 'uphold' })
                          }
                        }}
                      >
                        Uphold &amp; enforce
                      </button>
                    )}
                    {perms.moderateReports && (
                      <button className='btn btn-secondary btn-sm' onClick={() => resolveMutation.mutate({ targetType: r.targetType, targetId: r.targetId, outcome: 'dismiss' })}>
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Escalate modal — records an audited escalation to the central Admin */}
      <Modal
        isOpen={!!escalating}
        onClose={() => setEscalating(null)}
        title={`Escalate “${escalating?.label ?? ''}” to Admin`}
      >
        <div className='space-y-3'>
          <div>
            <label className='label' htmlFor='mgr-report-escalate-note'>
              Note for the Admin (recorded with the escalation)
            </label>
            <textarea
              id='mgr-report-escalate-note'
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
            Escalation is recorded in the audit log and routed to the central Admin — the report&apos;s state does not
            change until the Admin acts.
          </p>
        </div>
      </Modal>
    </div>
  )
}
