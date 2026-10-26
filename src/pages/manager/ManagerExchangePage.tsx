import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, CheckCircle2, ShieldAlert, XCircle } from 'lucide-react'
import { adminApi } from '@/services/admin.service'
import { managersService } from '@/services/managers.service'
import { useAuthStore } from '@/stores/auth.store'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { timeAgo } from '@/lib/format'
import { inScope, managerScope } from './manager-scope'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  completed: 'neutral',
  expired: 'neutral',
  cancelled: 'danger',
}

/**
 * Community Manager — #Exchange moderation (Community Hub Manager spec §8).
 *
 * In-scope exchange items with the approve / reject / archive powers granted
 * on the appointment. Permanent removal is left to the central Admin; every
 * action runs through the same audited service methods as the admin screen
 * and records the manager as the acting user.
 */
export function ManagerExchangePage() {
  const user = useAuthStore((s) => s.user)
  const record = managersService.getAnyForUser(user?.id)
  const config = managersService.getConfig()
  const queryClient = useQueryClient()

  const [rejecting, setRejecting] = useState<{ id: string; label: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [escalating, setEscalating] = useState<{ id: string; label: string } | null>(null)
  const [escalateNote, setEscalateNote] = useState('')

  const { data: exchanges = [] } = useQuery({ queryKey: ['admin', 'exchanges'], queryFn: adminApi.listExchanges })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'exchanges'] })

  const moderateMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'archive'; reason?: string }) =>
      adminApi.moderateExchange(id, action, reason),
    onSuccess: invalidate,
  })

  const escalateMutation = useMutation({
    mutationFn: ({ id, label, note }: { id: string; label: string; note: string }) =>
      adminApi.escalateToAdmin('exchange', id, label, note),
    onSuccess: () => {
      setEscalating(null)
      setEscalateNote('')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.moderateExchange(id, 'reject', reason),
    onSuccess: () => {
      invalidate()
      setRejecting(null)
      setRejectReason('')
      setRejectError('')
    },
    onError: (e: Error) => setRejectError(e.message),
  })

  if (!record) return null
  const perms = record.permissions
  const scope = managerScope(record, config.areas)
  const canModerate = perms.moderateExchange

  const scoped = exchanges.filter((e) => inScope(scope, e.location?.cityName))
  const hiddenCount = exchanges.length - scoped.length

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-gray-900'>#Exchange moderation</h2>
        <p className='text-sm text-gray-600'>
          Exchange items within your assigned areas. Approve, reject with a reason, or archive. Permanent removal stays
          with the central Admin.
        </p>
      </div>

      {/* Per-permission gate (spec §2.5b): controls follow the appointment, not the route. */}
      {!canModerate && (
        <div className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800'>
          <span className='font-semibold'>#Exchange moderation is not part of your manager permissions.</span> You can
          read the items in your areas and escalate them where allowed, but approve / reject / archive stay hidden.
          Ask a Community Admin to update your appointment.
        </div>
      )}

      {hiddenCount > 0 && (
        <p className='rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500'>
          {hiddenCount} item{hiddenCount === 1 ? '' : 's'} outside your assigned areas {hiddenCount === 1 ? 'is' : 'are'} hidden.
        </p>
      )}

      {scoped.length === 0 ? (
        <div className='card'>
          <EmptyState title='No exchange items in scope' description='Items within your assigned areas appear here.' />
        </div>
      ) : (
        <div className='space-y-3'>
          {scoped.map((item) => (
            <div key={item.id} className='card'>
              <div className='card-content space-y-2'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-semibold text-gray-900'>{item.title}</p>
                    <p className='text-xs text-gray-500'>
                      {item.creator?.name} · {item.exchangeType} · {timeAgo(item.createdAt)}
                      {item.location?.cityName ? ` · ${item.location.cityName}` : ''}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[item.status] ?? 'neutral'}>{item.status}</Badge>
                </div>
                <p className='text-xs text-gray-600'>
                  <span className='font-medium'>Offering:</span> {item.offering} · <span className='font-medium'>Seeking:</span>{' '}
                  {item.seeking}
                </p>
                {item.moderationReason && (
                  <p className='rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600'>Moderation note: {item.moderationReason}</p>
                )}

                <div className='flex flex-wrap gap-2'>
                  {/* Same transitions the central Admin offers (§17-2: no invented
                      moves — a completed item has no transition back to active). */}
                  {canModerate && (item.status === 'cancelled' || item.status === 'expired') && (
                    <button className='btn btn-primary btn-sm' onClick={() => moderateMutation.mutate({ id: item.id, action: 'approve' })}>
                      <CheckCircle2 className='h-4 w-4' /> Approve
                    </button>
                  )}
                  {canModerate && item.status === 'active' && (
                    <button
                      className='btn btn-secondary btn-sm'
                      onClick={() => {
                        setRejecting({ id: item.id, label: item.title })
                        setRejectReason('')
                        setRejectError('')
                      }}
                    >
                      <XCircle className='h-4 w-4' /> Reject
                    </button>
                  )}
                  {canModerate && item.status === 'active' && (
                    <button
                      className='btn btn-secondary btn-sm'
                      onClick={() => {
                        if (window.confirm('Archive this exchange item?')) {
                          moderateMutation.mutate({ id: item.id, action: 'archive' })
                        }
                      }}
                    >
                      <Archive className='h-4 w-4' /> Archive
                    </button>
                  )}
                  {perms.escalateToAdmin && (
                    <button
                      className='btn btn-secondary btn-sm'
                      onClick={() => {
                        setEscalating({ id: item.id, label: item.title })
                        setEscalateNote('')
                      }}
                    >
                      <ShieldAlert className='h-4 w-4' /> Escalate to Admin
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      <Modal isOpen={!!rejecting} onClose={() => setRejecting(null)} title={`Reject “${rejecting?.label ?? ''}”`}>
        <div className='space-y-3'>
          <div>
            <label className='label' htmlFor='mgr-exchange-reject'>
              Reason (shown to the member)
            </label>
            <textarea
              id='mgr-exchange-reject'
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
      <Modal isOpen={!!escalating} onClose={() => setEscalating(null)} title={`Escalate “${escalating?.label ?? ''}” to Admin`}>
        <div className='space-y-3'>
          <div>
            <label className='label' htmlFor='mgr-escalate-note'>
              Note for the central Admin
            </label>
            <textarea
              id='mgr-escalate-note'
              className='input-field min-h-[90px]'
              value={escalateNote}
              onChange={(e) => setEscalateNote(e.target.value)}
            />
          </div>
          <button
            className='btn btn-primary'
            disabled={!escalateNote.trim() || escalateMutation.isPending}
            onClick={() => escalating && escalateMutation.mutate({ id: escalating.id, label: escalating.label, note: escalateNote.trim() })}
          >
            {escalateMutation.isPending ? 'Escalating…' : 'Escalate to Admin'}
          </button>
          <p className='text-xs text-gray-500'>
            Escalation is recorded in the audit log and routed to the central Admin — the item&apos;s state does not change
            until they decide.
          </p>
        </div>
      </Modal>
    </div>
  )
}
