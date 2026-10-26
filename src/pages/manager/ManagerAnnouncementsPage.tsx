import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Flag } from 'lucide-react'
import { adminApi } from '@/services/admin.service'
import { managersService } from '@/services/managers.service'
import { useAuthStore } from '@/stores/auth.store'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '../business/helpers'

/**
 * Community Manager — Announcements (Community Hub Manager spec §8).
 *
 * Available only when the appointment grants `publishAnnouncements` — an
 * independent permission from approving posts (spec §3). If the appointment
 * restricts announcement audiences, the audience picker offers only those
 * audiences. Publications go through the same audited service methods as the
 * central Admin screen and appear on the same announcement records (§15).
 */
export function ManagerAnnouncementsPage() {
  const user = useAuthStore((s) => s.user)
  const record = managersService.getAnyForUser(user?.id)
  const queryClient = useQueryClient()

  const [form, setForm] = useState({ title: '', content: '', audience: 'both' as 'business' | 'consumer' | 'both' })
  const [error, setError] = useState('')

  const { data: announcements = [] } = useQuery({
    queryKey: ['admin', 'announcements'],
    queryFn: adminApi.listAnnouncements,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createAnnouncement({
        title: form.title.trim(),
        content: form.content.trim(),
        audience: form.audience,
        status: 'published',
        isPinned: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] })
      setForm({ title: '', content: '', audience: form.audience })
      setError('')
    },
    onError: (e: Error) => setError(e.message),
  })

  if (!record) return null

  const allowedAudiences = record.restrictions.announcementAudiences ?? (['business', 'consumer', 'both'] as const)
  const mine = announcements.filter((a) => a.authorId === record.userId)

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-gray-900'>Announcements</h2>
        <p className='text-sm text-gray-600'>
          Compose and publish announcements to your permitted audiences. Publishing announcements is a separate
          permission from content approval.
        </p>
      </div>

      <div className='card'>
        <div className='card-content space-y-3'>
          <h3 className='text-sm font-semibold text-gray-900'>New announcement</h3>
          <div>
            <label className='label' htmlFor='mgr-ann-title'>
              Title
            </label>
            <input
              id='mgr-ann-title'
              className='input-field'
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label className='label' htmlFor='mgr-ann-content'>
              Content
            </label>
            <textarea
              id='mgr-ann-content'
              className='input-field min-h-[110px]'
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>
          <div>
            <label className='label' htmlFor='mgr-ann-audience'>
              Audience
            </label>
            <select
              id='mgr-ann-audience'
              className='input-field'
              value={form.audience}
              onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value as 'business' | 'consumer' | 'both' }))}
            >
              {allowedAudiences.map((aud) => (
                <option key={aud} value={aud}>
                  {aud}
                </option>
              ))}
            </select>
            {record.restrictions.announcementAudiences && (
              <p className='mt-1 text-xs text-gray-500'>
                Your appointment restricts you to these audiences: {record.restrictions.announcementAudiences.join(', ')}.
              </p>
            )}
          </div>
          {error && <p className='text-sm text-red-600'>{error}</p>}
          <button
            className='btn btn-primary'
            disabled={!form.title.trim() || !form.content.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Publishing…' : 'Publish now'}
          </button>
        </div>
      </div>

      <div className='card'>
        <div className='card-content space-y-3'>
          <h3 className='text-sm font-semibold text-gray-900'>Announcements I published</h3>
          {mine.length === 0 ? (
            <EmptyState
              icon={<Flag className='h-10 w-10' />}
              title='Nothing published yet'
              description='Announcements you publish appear here and on the same records the Admin screens read.'
            />
          ) : (
            <ul className='divide-y divide-gray-100 rounded-lg border border-gray-100'>
              {mine.map((a) => (
                <li key={a.id} className='flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm'>
                  <span className='min-w-0'>
                    <span className='font-medium text-gray-900'>{a.title}</span>
                    <span className='block text-xs text-gray-500'>
                      {a.audience} · published {formatDate(a.createdAt)}
                      {a.location?.cityName ? ` · ${a.location.cityName}` : ''}
                    </span>
                  </span>
                  <Badge variant={a.status === 'published' ? 'success' : a.status === 'scheduled' ? 'warning' : 'neutral'}>
                    {a.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
