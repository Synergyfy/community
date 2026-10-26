import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArrowDown, ArrowUp, Flag, MessageSquare, Pencil, Plus, Repeat, Trash2 } from 'lucide-react'
import { adminApi } from '@/services/admin.service'
import { readExchangeRequests } from '@/hooks/useExchangeRequests'
import { canAdmin } from '@/lib/permissions'
import type { ContentVisibility } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth.store'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { locationLabel } from '@/lib/format'
import { formatDate } from '../business/helpers'
import type { PublicExchange } from '@/types/community-public'

/** Every audience value the data model supports (§7 vocabulary) — a group or
 *  private item must show its real audience, never be read as 'public'. */
const VISIBILITY_OPTIONS: readonly ContentVisibility[] = [
  'public',
  'both',
  'business',
  'consumer',
  'group',
  'private',
]

/**
 * #Exchange Management (spec §5.2, §5.3):
 * - Category management — the admin-managed store the exchange composer and
 *   filters consume (add/rename/reorder/show-hide, all audited).
 * - Full status vocabulary display: All / Active / Completed / Expired /
 *   Cancelled tabs with per-status actions. Display only — no transition
 *   exists that the spec does not grant; transition rules pending §17-2.
 * - Reported items cross-linked into the central queue (§3.5).
 * - Messages-context panel behind the `view_messages_context` permission
 *   gate, with the §17-7 privacy-scope notice.
 */

type StatusFilter = 'all' | PublicExchange['status']

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'expired', label: 'Expired' },
  { id: 'cancelled', label: 'Cancelled' },
]

const STATUS_BADGE: Record<PublicExchange['status'], 'success' | 'primary' | 'warning' | 'danger'> = {
  active: 'success',
  completed: 'primary',
  expired: 'warning',
  cancelled: 'danger',
}

export function AdminExchangePage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canConfigureCategories = canAdmin(user, 'configure_platform')
  const canSeeMessages = canAdmin(user, 'view_messages_context')

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [rejecting, setRejecting] = useState<{ id: string; title: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [removing, setRemoving] = useState<{ id: string; title: string } | null>(null)
  const [messagesFor, setMessagesFor] = useState<PublicExchange | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)

  const { data: exchanges = [], isLoading } = useQuery({ queryKey: ['admin', 'exchanges'], queryFn: adminApi.listExchanges })
  const config = adminApi.getConfig()

  // Category store (§5.2) — same records the composer and filters consume (§15).
  const { data: categories = [] } = useQuery({
    queryKey: ['admin', 'categories', 'exchange'],
    queryFn: () => adminApi.listCategories('exchange'),
  })

  // Open reports per exchange — cross-links rows to the central queue (§3.5, §15).
  const { data: reports = [] } = useQuery({ queryKey: ['admin', 'reports'], queryFn: () => adminApi.listReports() })
  const openReports = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of reports) {
      if (r.targetType === 'exchange' && r.status !== 'resolved') {
        map.set(r.targetId, (map.get(r.targetId) ?? 0) + 1)
      }
    }
    return map
  }, [reports])

  // Deliberately not memoized: mutations edit demo exchange objects in place,
  // so the `exchanges` array reference can stay the same across renders.
  const counts: Record<StatusFilter, number> = { all: exchanges.length, active: 0, completed: 0, expired: 0, cancelled: 0 }
  for (const e of exchanges) counts[e.status] += 1

  const filtered = statusFilter === 'all' ? exchanges : exchanges.filter((e) => e.status === statusFilter)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'exchanges'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] })
  }

  const moderate = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'reject' | 'archive' | 'remove'; reason?: string }) =>
      adminApi.moderateExchange(id, action, reason),
    onSuccess: () => {
      setRejecting(null)
      setRejectReason('')
      invalidate()
    },
  })

  const setVisibility = useMutation({
    mutationFn: ({ id, visibility }: { id: string; visibility: ContentVisibility }) =>
      adminApi.setExchangeVisibility(id, visibility),
    onSuccess: () => invalidate(),
  })

  const categoryMutation = useMutation({
    mutationFn: async (
      op:
        | { kind: 'create'; name: string }
        | { kind: 'rename'; id: string; name: string }
        | { kind: 'toggle'; id: string; active: boolean }
        | { kind: 'move'; id: string; direction: -1 | 1 },
    ): Promise<void> => {
      switch (op.kind) {
        case 'create':
          await adminApi.createCategory({ kind: 'exchange', name: op.name })
          return
        case 'rename':
          await adminApi.updateCategory('exchange', op.id, { name: op.name })
          return
        case 'toggle':
          await adminApi.updateCategory('exchange', op.id, { active: op.active })
          return
        case 'move':
          await adminApi.moveCategory('exchange', op.id, op.direction)
          return
      }
    },
    onSuccess: () => {
      setRenaming(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
    },
  })

  const addCategory = () => {
    const name = newCategory.trim()
    if (!name) return
    categoryMutation.mutate({ kind: 'create', name })
    setNewCategory('')
  }

  const requestMessage = messagesFor ? readExchangeRequests()[messagesFor.id] : undefined

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-gray-900'>#Exchange Management</h2>
        <p className='text-sm text-gray-600'>
          Every exchange item and category, in any state. Type rules live in Configuration; status transitions
          beyond these moderation actions are pending §17-2.
        </p>
      </div>

      {/* Category management (§5.2) — one store feeds composer + filters (§15) */}
      <section aria-label='Exchange categories' className='card'>
        <div className='card-content space-y-3'>
          <div className='flex items-center justify-between gap-2'>
            <div>
              <h3 className='text-sm font-semibold text-gray-900'>Exchange categories</h3>
              <p className='text-xs text-gray-500'>
                The exchange composer and category filters consume exactly this store (§5.2, §15).
              </p>
            </div>
          </div>

          <ul className='divide-y divide-gray-100 rounded-lg border border-gray-100'>
            {categories.map((cat, i) => (
              <li key={cat.id} className='flex items-center gap-2 px-3 py-2'>
                <span className='min-w-0 flex-1 truncate text-sm text-gray-800'>
                  {cat.name}
                  {!cat.active && <Badge variant='neutral'>hidden from members</Badge>}
                </span>
                <div className='flex shrink-0 items-center gap-1'>
                  <Button
                    size='sm'
                    variant='ghost'
                    aria-label={`Move ${cat.name} up`}
                    icon={<ArrowUp className='h-3.5 w-3.5' />}
                    disabled={!canConfigureCategories || i === 0 || categoryMutation.isPending}
                    title={canConfigureCategories ? undefined : "Requires 'Configure Community' — role grants pending §17-6"}
                    onClick={() => categoryMutation.mutate({ kind: 'move', id: cat.id, direction: -1 })}
                  />
                  <Button
                    size='sm'
                    variant='ghost'
                    aria-label={`Move ${cat.name} down`}
                    icon={<ArrowDown className='h-3.5 w-3.5' />}
                    disabled={!canConfigureCategories || i === categories.length - 1 || categoryMutation.isPending}
                    title={canConfigureCategories ? undefined : "Requires 'Configure Community' — role grants pending §17-6"}
                    onClick={() => categoryMutation.mutate({ kind: 'move', id: cat.id, direction: 1 })}
                  />
                  <Button
                    size='sm'
                    variant='ghost'
                    icon={<Pencil className='h-3.5 w-3.5' />}
                    disabled={!canConfigureCategories}
                    title={canConfigureCategories ? undefined : "Requires 'Configure Community' — role grants pending §17-6"}
                    onClick={() => setRenaming({ id: cat.id, name: cat.name })}
                  >
                    Rename
                  </Button>
                  <Button
                    size='sm'
                    variant='ghost'
                    disabled={!canConfigureCategories || categoryMutation.isPending}
                    title={canConfigureCategories ? undefined : "Requires 'Configure Community' — role grants pending §17-6"}
                    onClick={() => categoryMutation.mutate({ kind: 'toggle', id: cat.id, active: !cat.active })}
                  >
                    {cat.active ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </li>
            ))}
            {categories.length === 0 && (
              <li className='px-3 py-2 text-sm text-gray-500'>No exchange categories yet.</li>
            )}
          </ul>

          <div className='flex items-center gap-2'>
            <input
              className='input-field py-1.5 text-sm'
              placeholder='New category name'
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              disabled={!canConfigureCategories}
              aria-label='New exchange category name'
              onKeyDown={(e) => {
                if (e.key === 'Enter') addCategory()
              }}
            />
            <Button
              size='sm'
              icon={<Plus className='h-4 w-4' />}
              onClick={addCategory}
              disabled={!canConfigureCategories || !newCategory.trim() || categoryMutation.isPending}
              title={canConfigureCategories ? undefined : "Requires 'Configure Community' — role grants pending §17-6"}
            >
              Add
            </Button>
          </div>
          <p className='text-xs text-gray-400'>
            Hidden categories stop appearing to members; items already filed under them keep their label.
          </p>
        </div>
      </section>

      {/* Full status vocabulary (§5.3) — display only, transitions pending §17-2 */}
      <div className='flex gap-1 overflow-x-auto border-b border-gray-200 scrollbar-hide' role='tablist' aria-label='Exchange status'>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            role='tab'
            aria-selected={statusFilter === tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              statusFilter === tab.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-800',
            )}
          >
            {tab.label} <span className='text-xs text-gray-400'>({counts[tab.id]})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className='h-40 w-full' />
      ) : filtered.length === 0 ? (
        <div className='card'>
          <EmptyState icon={<Repeat className='h-10 w-10' />} title='No exchange items' description='Items will appear here as they are created.' />
        </div>
      ) : (
        <div className='space-y-3'>
          {filtered.map((exchange) => {
            const typeConfig = config.exchangeTypes[exchange.exchangeType]
            const reportsForItem = openReports.get(exchange.id) ?? 0
            const isFinal = exchange.status === 'completed' || exchange.status === 'expired'
            return (
              <div key={exchange.id} className='card'>
                <div className='card-content space-y-3'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Badge variant={STATUS_BADGE[exchange.status]}>{exchange.status}</Badge>
                    <Badge variant='neutral'>{exchange.exchangeType}</Badge>
                    <Badge variant='neutral'>{exchange.visibility ?? 'public'}</Badge>
                    {typeConfig && !typeConfig.enabled && <Badge variant='warning'>Type disabled</Badge>}
                    {reportsForItem > 0 && (
                      <Link
                        to='/admin/moderation'
                        className='inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 transition hover:bg-red-100'
                      >
                        <Flag className='h-3 w-3' /> {reportsForItem} open report{reportsForItem > 1 ? 's' : ''}
                      </Link>
                    )}
                    <span className='text-xs text-gray-500'>
                      {exchange.creator.name} · {formatDate(exchange.createdAt)}
                      {locationLabel(exchange.location) ? ` · ${locationLabel(exchange.location)}` : ''}
                    </span>
                  </div>

                  <h3 className='text-sm font-semibold text-gray-900'>{exchange.title}</h3>
                  <p className='line-clamp-2 text-sm text-gray-700'>{exchange.description}</p>
                  <div className='grid gap-2 text-xs sm:grid-cols-2'>
                    <p className='rounded bg-gray-50 p-2 text-gray-700'>
                      <span className='font-medium'>Offering:</span> {exchange.offering}
                    </p>
                    <p className='rounded bg-gray-50 p-2 text-gray-700'>
                      <span className='font-medium'>Seeking:</span> {exchange.seeking}
                    </p>
                  </div>
                  {exchange.expiresAt && (
                    <p className='text-xs text-gray-500'>
                      {exchange.status === 'expired' ? 'Expired' : 'Listing expires'} {formatDate(exchange.expiresAt)}
                    </p>
                  )}
                  {exchange.status === 'cancelled' && exchange.moderationReason && (
                    <p className='rounded-lg bg-red-50 p-2.5 text-xs text-red-700'>Rejection reason: {exchange.moderationReason}</p>
                  )}
                  {exchange.status === 'completed' && (
                    <p className='rounded-lg bg-primary-50 p-2.5 text-xs text-primary-800'>
                      Completed — recorded as reached; no admin transition exists for this state (display only, transition rules pending §17-2).
                    </p>
                  )}
                  {exchange.status === 'expired' && (
                    <p className='rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800'>
                      Expired — the listing window has passed (or it was archived). Approve restores it to active; automatic expiry rules are pending §17-2.
                    </p>
                  )}

                  <div className='flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3'>
                    {(exchange.status === 'cancelled' || exchange.status === 'expired') && (
                      <Button size='sm' onClick={() => moderate.mutate({ id: exchange.id, action: 'approve' })} disabled={moderate.isPending}>
                        Approve
                      </Button>
                    )}
                    {exchange.status === 'active' && (
                      <Button size='sm' variant='secondary' onClick={() => setRejecting({ id: exchange.id, title: exchange.title })}>
                        Reject
                      </Button>
                    )}
                    {exchange.status === 'active' && (
                      <Button
                        size='sm'
                        variant='ghost'
                        icon={<Archive className='h-4 w-4' />}
                        onClick={() => moderate.mutate({ id: exchange.id, action: 'archive' })}
                        disabled={moderate.isPending}
                      >
                        Archive
                      </Button>
                    )}
                    {exchange.status === 'active' && (
                      <select
                        value={exchange.visibility ?? 'public'}
                        onChange={(e) => setVisibility.mutate({ id: exchange.id, visibility: e.target.value as ContentVisibility })}
                        className='input-field w-auto py-1.5 text-xs'
                        aria-label={`Visibility for ${exchange.title}`}
                      >
                        {VISIBILITY_OPTIONS.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    )}
                    <Button
                      size='sm'
                      variant='ghost'
                      icon={<MessageSquare className='h-4 w-4' />}
                      disabled={!canSeeMessages}
                      title={
                        canSeeMessages
                          ? 'Request/message context for this item'
                          : "Requires the 'View messages context' permission — role grants pending §17-6; privacy scope pending §17-7"
                      }
                      onClick={() => setMessagesFor(exchange)}
                    >
                      Messages
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='ml-auto text-red-600 hover:bg-red-50'
                      icon={<Trash2 className='h-4 w-4' />}
                      onClick={() => setRemoving({ id: exchange.id, title: exchange.title })}
                    >
                      Remove
                    </Button>
                  </div>
                  {isFinal && (
                    <p className='text-xs text-gray-400'>
                      Removed from member browse (author and admin only). See the moderation queue for any open reports.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal isOpen={!!rejecting} onClose={() => setRejecting(null)} title='Reject with reason'>
        <div className='space-y-3'>
          <p className='text-sm text-gray-600'>The creator will see this reason: “{rejecting?.title}”</p>
          <textarea
            className={cn('textarea-field')}
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder='Why is this item being rejected?'
            autoFocus
          />
          <div className='flex justify-end gap-2'>
            <Button variant='secondary' size='sm' onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              size='sm'
              onClick={() => rejecting && moderate.mutate({ id: rejecting.id, action: 'reject', reason: rejectReason.trim() })}
              disabled={!rejectReason.trim() || moderate.isPending}
            >
              Reject item
            </Button>
          </div>
          {!rejectReason.trim() && (
            <p className='text-xs text-gray-500'>A reason is required — the member sees it with the decision (§5.2).</p>
          )}
        </div>
      </Modal>

      <Modal isOpen={!!removing} onClose={() => setRemoving(null)} title='Remove this item?'>
        <div className='space-y-3'>
          <p className='text-sm text-gray-600'>“{removing?.title}” will be permanently removed. This cannot be undone.</p>
          <div className='flex justify-end gap-2'>
            <Button variant='secondary' size='sm' onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              size='sm'
              className='bg-red-600 hover:bg-red-700'
              onClick={() => {
                if (removing) moderate.mutate({ id: removing.id, action: 'remove' })
                setRemoving(null)
              }}
              disabled={moderate.isPending}
            >
              Remove permanently
            </Button>
          </div>
        </div>
      </Modal>

      {/* Messages context (§5.3) — permission-gated, privacy scope pending §17-7 */}
      <Modal
        isOpen={!!messagesFor}
        onClose={() => setMessagesFor(null)}
        title={`Messages context${messagesFor ? ` — ${messagesFor.title}` : ''}`}
      >
        <div className='space-y-3'>
          <p className='rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800'>
            Privacy scope for message data is an open decision (§17-7). This panel sits behind the{' '}
            <span className='font-semibold'>View messages context</span> permission while that scope is agreed — who may
            see it beyond admins may change.
          </p>
          {requestMessage ? (
            <div className='space-y-1'>
              <p className='text-xs font-medium text-gray-700'>Request message</p>
              <p className='rounded-lg bg-gray-50 p-2.5 text-sm text-gray-800'>{requestMessage}</p>
              <p className='text-xs text-gray-400'>Demo store: request messages are recorded in this browser.</p>
            </div>
          ) : (
            <p className='text-sm text-gray-600'>No request messages recorded for this item.</p>
          )}
          <div className='flex justify-end'>
            <Button size='sm' variant='secondary' onClick={() => setMessagesFor(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!renaming} onClose={() => setRenaming(null)} title='Rename category'>
        <div className='space-y-3'>
          <input
            className='input-field'
            value={renaming?.name ?? ''}
            onChange={(e) => renaming && setRenaming({ ...renaming, name: e.target.value })}
            aria-label='Category name'
            autoFocus
          />
          <div className='flex justify-end gap-2'>
            <Button variant='secondary' size='sm' onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button
              size='sm'
              onClick={() => renaming && categoryMutation.mutate({ kind: 'rename', id: renaming.id, name: renaming.name.trim() || renaming.name })}
              disabled={categoryMutation.isPending}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
