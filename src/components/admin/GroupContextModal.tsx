import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { adminApi } from '@/services/admin.service'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/pages/business/helpers'
import type { PublicGroup } from '@/types/community-public'

/**
 * Group context panel (spec §9, §17-7): permission-gated context for content
 * that originated inside a group, shown from the moderation surfaces.
 *
 * Hard boundaries (§9, §16):
 * - Group *administration* (membership, join approvals, group settings) stays
 *   with the Groups & Circles product — Community only identifies group-origin
 *   content and surfaces report context, never a second Groups admin.
 * - The privacy scope for group data is an open decision (§17-7); the panel
 *   sits behind the `view_group_context` permission while that scope is
 *   agreed, mirroring the exchange Messages-context panel.
 */
export function GroupContextModal({ group, onClose }: { group: PublicGroup | null; onClose: () => void }) {
  const { data: reports = [] } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: () => adminApi.listReports(),
    enabled: !!group,
  })
  const { data: posts = [] } = useQuery({
    queryKey: ['admin', 'posts'],
    queryFn: adminApi.listPosts,
    enabled: !!group,
  })

  const groupPosts = group ? posts.filter((p) => p.groupId === group.id) : []
  const reported = group
    ? groupPosts.filter((p) => reports.some((r) => r.targetType === 'post' && r.targetId === p.id && r.status !== 'resolved'))
    : []

  return (
    <Modal isOpen={!!group} onClose={onClose} title={group ? `Group context — ${group.name}` : 'Group context'}>
      <div className='space-y-3'>
        <p className='rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800'>
          Privacy scope for group data is an open decision (§17-7). This panel sits behind the{' '}
          <span className='font-semibold'>View group context</span> permission while that scope is agreed — who may see
          it beyond admins may change.
        </p>

        {group ? (
          <>
            <div className='flex items-start gap-3'>
              {group.imageUrl && <img src={group.imageUrl} alt='' className='h-12 w-12 rounded-lg object-cover' />}
              <div className='min-w-0'>
                <p className='text-sm font-semibold text-gray-900'>{group.name}</p>
                {group.description && <p className='text-xs text-gray-600'>{group.description}</p>}
                <p className='mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500'>
                  <Users className='h-3.5 w-3.5' />
                  {group.memberCount ?? '—'} members
                  {group.location?.cityName ? ` · ${group.location.cityName}` : ''}
                  <Badge variant='neutral'>{group.isPublic ? 'public group' : 'private group'}</Badge>
                </p>
              </div>
            </div>

            <div className='rounded-lg border border-gray-100'>
              <p className='border-b border-gray-100 px-3 py-2 text-xs font-semibold text-gray-700'>
                Content from this group in Community ({groupPosts.length})
              </p>
              {groupPosts.length === 0 ? (
                <p className='px-3 py-2.5 text-sm text-gray-500'>No posts recorded for this group.</p>
              ) : (
                <ul className='divide-y divide-gray-100'>
                  {groupPosts.map((p) => {
                    const openReports = reports.filter(
                      (r) => r.targetType === 'post' && r.targetId === p.id && r.status !== 'resolved',
                    )
                    return (
                      <li key={p.id} className='flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm'>
                        <span className='min-w-0'>
                          <span className='font-medium text-gray-900'>{p.title ?? p.content.slice(0, 50)}</span>
                          <span className='ml-2 text-xs text-gray-500'>{p.author.name} · {formatDate(p.createdAt)}</span>
                        </span>
                        <span className='flex items-center gap-2'>
                          {p.status !== 'published' && <Badge variant='warning'>{p.status}</Badge>}
                          {openReports.length > 0 && (
                            <Badge variant='danger'>{openReports.length} open report(s)</Badge>
                          )}
                          <Link
                            to='/admin/moderation'
                            onClick={onClose}
                            className='text-xs font-medium text-primary-600 hover:underline'
                          >
                            Queue
                          </Link>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <p className='rounded-lg bg-gray-50 p-2.5 text-xs text-gray-500'>
              Group administration — membership, join approvals and group settings — belongs to the Groups &amp; Circles
              product (§9). Community identifies group-origin content for moderation only; no group management is
              duplicated here.
            </p>

            {reported.length > 0 && (
              <p className='text-xs text-amber-800'>
                {reported.length} post(s) from this group currently have open reports.
              </p>
            )}
          </>
        ) : (
          <EmptyState icon={<Users className='h-10 w-10' />} title='Group not found' />
        )}

        <div className='flex justify-end'>
          <button type='button' className='btn btn-secondary btn-sm' onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
