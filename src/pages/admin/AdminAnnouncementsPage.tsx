import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Clock, Edit, MapPin, Megaphone, Pin, Plus, Trash2, Users as UsersIcon } from 'lucide-react'
import { adminApi } from '@/services/admin.service'
import { categoriesService } from '@/services/categories.service'
import { communityApi } from '@/services/community.service'
import { entitiesApi } from '@/services/entities.service'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate } from '../business/helpers'
import { cn } from '@/lib/utils'
import type { Announcement } from '@/types/community-public'

/**
 * Announcements (spec §4): the admin composer for one record that fans out
 * to public, business, consumer, local and group surfaces (§15). Full
 * composer (title/content/media/category/audience/location/group scope/
 * publish timing/expiry/pin) + lifecycle actions (publish now, schedule,
 * pin, expire, archive, delete). Audience, location and group targeting are
 * applied centrally on the read side (announcementsService.isTargetedAt).
 */

type Timing = 'now' | 'schedule' | 'draft'

interface ComposerState {
  mode: 'create' | 'edit'
  id?: string
  initial?: Announcement
  title: string
  content: string
  imageUrl: string
  categoryId: string
  audience: Announcement['audience']
  city: string
  groupId: string
  timing: Timing
  scheduleAt: string
  expiresAt: string
  isPinned: boolean
}

const STATUS_BADGE: Record<Announcement['status'], 'success' | 'primary' | 'warning' | 'danger' | 'neutral'> = {
  published: 'success',
  scheduled: 'primary',
  draft: 'neutral',
  expired: 'danger',
  archived: 'neutral',
}

const AUDIENCE_LABEL: Record<Announcement['audience'], string> = {
  both: 'Everyone',
  business: 'Businesses',
  consumer: 'Consumers',
}

/** ISO → value for `<input type='datetime-local'>`. */
function toInputValue(iso: string | Date): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function emptyComposer(): ComposerState {
  return {
    mode: 'create',
    title: '',
    content: '',
    imageUrl: '',
    categoryId: '',
    audience: 'both',
    city: '',
    groupId: '',
    timing: 'now',
    scheduleAt: '',
    expiresAt: '',
    isPinned: false,
  }
}

function composerFrom(record: Announcement): ComposerState {
  const timing: Timing =
    record.status === 'scheduled' ? 'schedule' : record.status === 'draft' ? 'draft' : 'now'
  return {
    mode: 'edit',
    id: record.id,
    initial: record,
    title: record.title,
    content: record.content,
    imageUrl: record.imageUrl ?? '',
    categoryId: record.categoryId ?? '',
    audience: record.audience,
    city: record.location?.cityName ?? '',
    groupId: record.groupId ?? '',
    timing,
    scheduleAt: record.publishAt && new Date(record.publishAt).getTime() > Date.now() ? toInputValue(record.publishAt) : '',
    expiresAt: record.expiresAt ? toInputValue(record.expiresAt) : '',
    isPinned: record.isPinned,
  }
}

export function AdminAnnouncementsPage() {
  const queryClient = useQueryClient()
  const [composer, setComposer] = useState<ComposerState | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['admin', 'announcements'],
    queryFn: () => adminApi.listAnnouncements(),
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'community'],
    queryFn: () => categoriesService.listCategories('community', { includeInactive: false }),
  })
  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: () => entitiesApi.getGroups() })
  const { data: communities = [] } = useQuery({ queryKey: ['communities'], queryFn: () => communityApi.getCommunities() })

  const cityOptions = useMemo(
    () => [...new Set(communities.map((c) => c.location?.cityName).filter((c): c is string => !!c))],
    [communities],
  )

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] })
    void queryClient.invalidateQueries({ queryKey: ['announcements'] })
  }

  const save = useMutation({
    mutationFn: async (state: ComposerState) => {
      const title = state.title.trim()
      const content = state.content.trim()
      const status: Announcement['status'] =
        state.timing === 'draft' ? 'draft' : state.timing === 'schedule' ? 'scheduled' : 'published'

      let publishAt: string | null
      if (state.timing === 'schedule') publishAt = new Date(state.scheduleAt).toISOString()
      else if (state.timing === 'draft') publishAt = null
      else if (state.initial?.status === 'published' && state.initial.publishAt) publishAt = state.initial.publishAt
      else publishAt = new Date().toISOString()

      const input = {
        title,
        content,
        imageUrl: state.imageUrl.trim() || null,
        categoryId: state.categoryId || null,
        audience: state.audience,
        location: state.city ? { cityName: state.city } : null,
        groupId: state.groupId || null,
        status,
        publishAt,
        expiresAt: state.expiresAt ? new Date(state.expiresAt).toISOString() : null,
        isPinned: state.isPinned,
      }

      if (state.mode === 'create') await adminApi.createAnnouncement(input)
      else await adminApi.updateAnnouncement(state.id!, input)
    },
    onSuccess: () => {
      setComposer(null)
      setErrors([])
      invalidate()
    },
    onError: () => setErrors(['Could not save the announcement. Please try again.']),
  })

  const lifecycle = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: 'publish' | 'expire' | 'archive' | 'pin' | 'delete' }) => {
      switch (kind) {
        case 'publish':
          return adminApi.publishAnnouncement(id)
        case 'expire':
          return adminApi.expireAnnouncement(id)
        case 'archive':
          return adminApi.archiveAnnouncement(id)
        case 'pin':
          return adminApi.toggleAnnouncementPin(id)
        case 'delete':
          return adminApi.deleteAnnouncement(id)
      }
    },
    onSuccess: () => invalidate(),
  })

  const openCreate = () => {
    setComposer(emptyComposer())
    setErrors([])
  }

  const openEdit = (record: Announcement) => {
    setComposer(composerFrom(record))
    setErrors([])
  }

  const submit = () => {
    if (!composer) return
    const errs: string[] = []
    if (!composer.title.trim()) errs.push('A title is required.')
    if (!composer.content.trim()) errs.push('Announcement text is required.')
    if (composer.timing === 'schedule') {
      if (!composer.scheduleAt) errs.push('Pick a publish time.')
      else if (new Date(composer.scheduleAt).getTime() <= Date.now()) errs.push('The publish time must be in the future.')
    }
    if (composer.expiresAt) {
      const expiry = new Date(composer.expiresAt).getTime()
      const publish: number | null =
        composer.timing === 'schedule'
          ? composer.scheduleAt
            ? new Date(composer.scheduleAt).getTime()
            : null
          : composer.timing === 'now'
            ? Date.now()
            : null
      if (publish !== null && expiry <= publish) errs.push('The expiry must be after the publish time.')
    }
    if (errs.length) {
      setErrors(errs)
      return
    }
    save.mutate(composer)
  }

  const confirmDelete = (record: Announcement) => {
    if (window.confirm(`Delete “${record.title}” permanently? This cannot be undone.`)) {
      lifecycle.mutate({ id: record.id, kind: 'delete' })
    }
  }

  const groupName = (id: string | null | undefined) =>
    id ? groups.find((g) => g.id === id)?.name ?? id : null

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h2 className='text-lg font-bold text-gray-900'>Announcements</h2>
          <p className='text-sm text-gray-600'>
            One record fans out to public, business, consumer, local and group surfaces (§4, §15).
          </p>
        </div>
        <Button icon={<Plus className='h-4 w-4' />} onClick={openCreate}>
          New announcement
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className='h-40 w-full' />
      ) : announcements.length === 0 ? (
        <div className='card'>
          <EmptyState
            icon={<Megaphone className='h-10 w-10' />}
            title='No announcements yet'
            description='Create one announcement — it appears everywhere its audience, location and group scope allow.'
            action={<Button onClick={openCreate}>New announcement</Button>}
          />
        </div>
      ) : (
        <div className='space-y-3'>
          {announcements.map((record) => (
            <div key={record.id} className='card'>
              <div className='card-content space-y-3'>
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant={STATUS_BADGE[record.status]}>{record.status}</Badge>
                  {record.isPinned && <Badge variant='primary'>Pinned</Badge>}
                  {record.source === 'demo' && <Badge variant='neutral'>demo</Badge>}
                  <span className='text-xs text-gray-500'>Created {formatDate(record.createdAt)}</span>
                </div>

                <div>
                  <p className='text-sm font-semibold text-gray-900'>{record.title}</p>
                  <p className='mt-0.5 line-clamp-2 text-sm text-gray-700'>{record.content}</p>
                </div>

                <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500'>
                  <span>{AUDIENCE_LABEL[record.audience]}</span>
                  <span className='flex items-center gap-1'>
                    <MapPin className='h-3 w-3' />{' '}
                    {record.location?.cityName ? record.location.cityName : 'All locations'}
                  </span>
                  <span className='flex items-center gap-1'>
                    <UsersIcon className='h-3 w-3' />{' '}
                    {record.groupId ? `Group: ${groupName(record.groupId)}` : 'Not group-scoped'}
                  </span>
                  {record.publishAt && (
                    <span className='flex items-center gap-1'>
                      <Clock className='h-3 w-3' />
                      {record.status === 'scheduled' ? 'Publishes' : 'Published'} {formatDate(record.publishAt)}
                    </span>
                  )}
                  {record.expiresAt && <span>Expires {formatDate(record.expiresAt)}</span>}
                </div>

                <div className='flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3'>
                  {(record.status === 'draft' || record.status === 'scheduled' || record.status === 'expired') && (
                    <Button
                      size='sm'
                      onClick={() => lifecycle.mutate({ id: record.id, kind: 'publish' })}
                      disabled={lifecycle.isPending}
                    >
                      Publish now
                    </Button>
                  )}
                  {(record.status === 'published' || record.status === 'scheduled') && (
                    <Button
                      size='sm'
                      variant='secondary'
                      onClick={() => lifecycle.mutate({ id: record.id, kind: 'expire' })}
                      disabled={lifecycle.isPending}
                    >
                      Expire now
                    </Button>
                  )}
                  <Button
                    size='sm'
                    variant='ghost'
                    icon={<Pin className='h-4 w-4' />}
                    onClick={() => lifecycle.mutate({ id: record.id, kind: 'pin' })}
                    disabled={lifecycle.isPending}
                  >
                    {record.isPinned ? 'Unpin' : 'Pin'}
                  </Button>
                  {record.status !== 'archived' && (
                    <Button
                      size='sm'
                      variant='ghost'
                      icon={<Archive className='h-4 w-4' />}
                      onClick={() => lifecycle.mutate({ id: record.id, kind: 'archive' })}
                      disabled={lifecycle.isPending}
                    >
                      Archive
                    </Button>
                  )}
                  <Button size='sm' variant='ghost' icon={<Edit className='h-4 w-4' />} onClick={() => openEdit(record)}>
                    Edit
                  </Button>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='text-red-600 hover:bg-red-50'
                    icon={<Trash2 className='h-4 w-4' />}
                    onClick={() => confirmDelete(record)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Composer (§4 — one record, full targeting controls) */}
      <Modal
        isOpen={!!composer}
        onClose={() => setComposer(null)}
        title={composer?.mode === 'edit' ? 'Edit announcement' : 'New announcement'}
      >
        {composer && (
          <div className='space-y-3'>
            <div>
              <label className='mb-1 block text-xs font-medium text-gray-700'>Title</label>
              <input
                className='input-field'
                value={composer.title}
                onChange={(e) => setComposer({ ...composer, title: e.target.value })}
                placeholder='e.g. Market street road closure this weekend'
                autoFocus
              />
            </div>
            <div>
              <label className='mb-1 block text-xs font-medium text-gray-700'>Announcement text</label>
              <textarea
                className='textarea-field'
                rows={4}
                value={composer.content}
                onChange={(e) => setComposer({ ...composer, content: e.target.value })}
                placeholder='What should the Community know?'
              />
            </div>
            <div>
              <label className='mb-1 block text-xs font-medium text-gray-700'>Image URL (optional)</label>
              <input
                className='input-field'
                value={composer.imageUrl}
                onChange={(e) => setComposer({ ...composer, imageUrl: e.target.value })}
                placeholder='https://…'
              />
              {composer.imageUrl && (
                <img
                  src={composer.imageUrl}
                  alt=''
                  className='mt-2 h-24 w-full rounded-lg border border-gray-200 object-cover'
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              )}
            </div>

            <div className='grid grid-cols-2 gap-2'>
              <div>
                <label className='mb-1 block text-xs font-medium text-gray-700'>Category</label>
                <select
                  className='input-field py-2 text-sm'
                  value={composer.categoryId}
                  onChange={(e) => setComposer({ ...composer, categoryId: e.target.value })}
                >
                  <option value=''>No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='mb-1 block text-xs font-medium text-gray-700'>Audience</label>
                <select
                  className='input-field py-2 text-sm'
                  value={composer.audience}
                  onChange={(e) => setComposer({ ...composer, audience: e.target.value as Announcement['audience'] })}
                >
                  <option value='both'>Everyone</option>
                  <option value='business'>Businesses only</option>
                  <option value='consumer'>Consumers only</option>
                </select>
              </div>
              <div>
                <label className='mb-1 block text-xs font-medium text-gray-700'>Location scope</label>
                <select
                  className='input-field py-2 text-sm'
                  value={composer.city}
                  onChange={(e) => setComposer({ ...composer, city: e.target.value })}
                >
                  <option value=''>All locations</option>
                  {cityOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='mb-1 block text-xs font-medium text-gray-700'>Group scope</label>
                <select
                  className='input-field py-2 text-sm'
                  value={composer.groupId}
                  onChange={(e) => setComposer({ ...composer, groupId: e.target.value })}
                >
                  <option value=''>All surfaces (not group-scoped)</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className='mb-1 block text-xs font-medium text-gray-700'>Publish timing</label>
              <div className='flex flex-wrap gap-2'>
                {(
                  [
                    { id: 'now', label: 'Publish now' },
                    { id: 'schedule', label: 'Schedule' },
                    { id: 'draft', label: 'Save as draft' },
                  ] as Array<{ id: Timing; label: string }>
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setComposer({ ...composer, timing: opt.id })}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm',
                      composer.timing === opt.id
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {composer.timing === 'schedule' && (
                <input
                  type='datetime-local'
                  className='input-field mt-2'
                  value={composer.scheduleAt}
                  onChange={(e) => setComposer({ ...composer, scheduleAt: e.target.value })}
                  aria-label='Publish time'
                />
              )}
              <p className='mt-1 text-xs text-gray-400'>
                Scheduled announcements go live automatically once their time passes (swept on read).
              </p>
            </div>

            <div>
              <label className='mb-1 block text-xs font-medium text-gray-700'>Expiry (optional)</label>
              <input
                type='datetime-local'
                className='input-field'
                value={composer.expiresAt}
                onChange={(e) => setComposer({ ...composer, expiresAt: e.target.value })}
                aria-label='Expiry time'
              />
              <p className='mt-1 text-xs text-gray-400'>Leave empty for no expiry — the announcement stays until retired.</p>
            </div>

            <label className='flex items-center gap-2 text-sm text-gray-700'>
              <input
                type='checkbox'
                checked={composer.isPinned}
                onChange={(e) => setComposer({ ...composer, isPinned: e.target.checked })}
              />
              Pin to the top of announcement strips
            </label>

            {errors.length > 0 && (
              <ul className='error-text list-disc pl-4'>
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}

            <div className='flex justify-end gap-2'>
              <Button variant='secondary' size='sm' onClick={() => setComposer(null)}>
                Cancel
              </Button>
              <Button size='sm' onClick={submit} disabled={save.isPending}>
                {composer.mode === 'edit' ? 'Save changes' : composer.timing === 'draft' ? 'Save draft' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
