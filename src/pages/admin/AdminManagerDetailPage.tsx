import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, History, ShieldCheck } from 'lucide-react'
import { adminApi } from '@/services/admin.service'
import { MANAGER_PERMISSION_LABELS, emptyPermissions } from '@/services/managers.service'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '../business/helpers'
import type { ManagerPermissions, ManagerRecord } from '@/types/community-public'

const STATUS_VARIANT: Record<ManagerRecord['status'], 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  invited: 'warning',
  suspended: 'danger',
  removed: 'neutral',
}

/**
 * Community Hub Manager detail (spec §8): reassign areas, change permissions
 * and restrictions, suspend / reactivate / remove the staff role, and review
 * the manager's retained activity history. Every mutation is audited and the
 * CHS account itself is never touched by a lifecycle change.
 */
export function AdminManagerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data: manager, isLoading } = useQuery({
    queryKey: ['admin', 'managers', id],
    queryFn: () => adminApi.getManager(id ?? ''),
    enabled: !!id,
  })
  const { data: config } = useQuery({ queryKey: ['admin', 'manager-config'], queryFn: adminApi.getManagerConfig })
  const { data: managers = [] } = useQuery({ queryKey: ['admin', 'managers'], queryFn: adminApi.listManagers })
  const { data: activity = [] } = useQuery({
    queryKey: ['admin', 'manager-activity', manager?.userId],
    queryFn: () => adminApi.listManagerActivity(manager?.userId ?? null),
    enabled: !!manager?.userId,
  })

  const [areasDraft, setAreasDraft] = useState<string[]>([])
  const [levelDraft, setLevelDraft] = useState('')
  const [supervisorDraft, setSupervisorDraft] = useState('')
  const [permDraft, setPermDraft] = useState<ManagerPermissions>(emptyPermissions)
  const [restrictDraft, setRestrictDraft] = useState<ManagerRecord['restrictions']>({ permittedContentTypes: null, announcementAudiences: null })
  const [audienceDraft, setAudienceDraft] = useState<('business' | 'consumer' | 'both')[]>([])
  const [typeDraft, setTypeDraft] = useState('')
  const [notice, setNotice] = useState('')

  // Sync local drafts when the record loads or changes.
  useEffect(() => {
    if (!manager) return
    setAreasDraft(manager.areas)
    setLevelDraft(manager.reportingLevel != null ? String(manager.reportingLevel) : '')
    setSupervisorDraft(manager.supervisorId ?? '')
    setPermDraft({ ...emptyPermissions(), ...manager.permissions })
    setRestrictDraft(manager.restrictions)
    setAudienceDraft(manager.restrictions.announcementAudiences ?? [])
  }, [manager])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'managers'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'manager-activity'] })
  }
  const flash = (msg: string) => {
    setNotice(msg)
    window.setTimeout(() => setNotice(''), 3000)
  }

  const assignmentMutation = useMutation({
    mutationFn: () =>
      adminApi.updateManagerAssignment(manager!.id, {
        areas: areasDraft,
        locations: manager!.locations,
        reportingLevel: manager!.structure === 'hierarchy' && levelDraft ? Number(levelDraft) : null,
        supervisorId: supervisorDraft || null,
      }),
    onSuccess: () => {
      invalidate()
      flash('Assignment updated.')
    },
  })

  const permissionsMutation = useMutation({
    mutationFn: () => adminApi.updateManagerPermissions(manager!.id, permDraft),
    onSuccess: () => {
      invalidate()
      flash('Permissions updated.')
    },
  })

  const restrictionsMutation = useMutation({
    mutationFn: () =>
      adminApi.updateManagerRestrictions(manager!.id, {
        permittedContentTypes: restrictDraft.permittedContentTypes,
        announcementAudiences: audienceDraft.length > 0 ? audienceDraft : null,
      }),
    onSuccess: () => {
      invalidate()
      flash('Restrictions updated.')
    },
  })

  const statusMutation = useMutation({
    mutationFn: (status: ManagerRecord['status']) => adminApi.setManagerStatus(manager!.id, status),
    onSuccess: () => {
      invalidate()
      flash('Status updated.')
    },
  })

  const removeMutation = useMutation({
    mutationFn: () => adminApi.removeManagerRole(manager!.id),
    onSuccess: () => {
      invalidate()
      flash('Manager role removed — the CHS account is untouched.')
    },
  })

  if (isLoading) return <div className='card p-4 text-sm text-gray-500'>Loading manager…</div>
  if (!manager)
    return (
      <div className='card'>
        <EmptyState title='Manager not found' description='This appointment record does not exist.' />
        <div className='px-4 pb-4'>
          <Link to='/admin/managers' className='btn btn-secondary btn-sm'>
            <ArrowLeft className='h-4 w-4' /> Back to managers
          </Link>
        </div>
      </div>
    )

  const areas = config?.areas ?? []
  const lifecycleEntry = activity.filter((e) => e.targetType === 'manager' && e.targetId === manager.id)

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <Link to='/admin/managers' className='mb-1 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline'>
            <ArrowLeft className='h-3.5 w-3.5' /> Community Hub Managers
          </Link>
          <h2 className='flex items-center gap-2 text-lg font-bold text-gray-900'>
            {manager.name} <Badge variant={STATUS_VARIANT[manager.status]}>{manager.status}</Badge>
            {manager.source === 'demo' && <Badge variant='warning'>demo seed</Badge>}
          </h2>
          <p className='text-sm text-gray-600'>
            {manager.email || (manager.userId ? 'email held on the CHS account' : 'no email recorded')}
            {' · '}Appointed by {manager.appointedByName} on {formatDate(manager.appointedAt)}
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          {manager.status === 'active' && (
            <button className='btn btn-secondary btn-sm' onClick={() => statusMutation.mutate('suspended')}>
              Suspend access
            </button>
          )}
          {manager.status === 'suspended' && (
            <button className='btn btn-primary btn-sm' onClick={() => statusMutation.mutate('active')}>
              Reactivate access
            </button>
          )}
          {manager.status !== 'removed' && (
            <button
              className='btn btn-danger btn-sm'
              onClick={() => {
                if (window.confirm(`Remove the Community Hub Manager role from ${manager.name}? Their CHS account and memberships stay untouched.`)) {
                  removeMutation.mutate()
                }
              }}
            >
              Remove role
            </button>
          )}
        </div>
      </div>

      {notice && <p className='rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700'>{notice}</p>}

      <div className='grid gap-4 lg:grid-cols-2'>
        {/* Assignment */}
        <div className='card'>
          <div className='card-content space-y-3'>
            <h3 className='text-sm font-semibold text-gray-900'>Assignment</h3>
            <div>
              <p className='mb-1 text-xs font-medium text-gray-700'>Areas</p>
              <div className='flex flex-wrap gap-3'>
                {areas.map((area) => (
                  <label key={area.id} className='flex items-center gap-1.5 text-sm'>
                    <input
                      type='checkbox'
                      checked={areasDraft.includes(area.id)}
                      onChange={() =>
                        setAreasDraft((sel) => (sel.includes(area.id) ? sel.filter((a) => a !== area.id) : [...sel, area.id]))
                      }
                    />
                    {area.name}
                  </label>
                ))}
              </div>
            </div>
            {manager.structure === 'hierarchy' && (
              <div className='grid gap-2 sm:grid-cols-2'>
                <div>
                  <label className='label' htmlFor='level'>
                    Reporting level
                  </label>
                  <select id='level' className='input-field' value={levelDraft} onChange={(e) => setLevelDraft(e.target.value)}>
                    <option value=''>—</option>
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <option key={lvl} value={lvl}>
                        Level {lvl}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='label' htmlFor='supervisor'>
                    Supervisor
                  </label>
                  <select id='supervisor' className='input-field' value={supervisorDraft} onChange={(e) => setSupervisorDraft(e.target.value)}>
                    <option value=''>— none —</option>
                    {managers
                      .filter((m) => m.id !== manager.id && m.status === 'active')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}
            <button className='btn btn-secondary btn-sm' onClick={() => assignmentMutation.mutate()} disabled={assignmentMutation.isPending}>
              Save assignment
            </button>
          </div>
        </div>

        {/* Permissions */}
        <div className='card'>
          <div className='card-content space-y-3'>
            <h3 className='text-sm font-semibold text-gray-900'>Permissions</h3>
            <p className='text-xs text-gray-500'>
              Each permission is independent — a manager who can approve posts does not automatically gain announcement
              publishing or platform settings.
            </p>
            <div className='grid gap-2'>
              {MANAGER_PERMISSION_LABELS.map((p) => (
                <label key={p.key} className='flex items-start gap-2 text-sm'>
                  <input
                    type='checkbox'
                    className='mt-0.5'
                    checked={permDraft[p.key]}
                    onChange={() => setPermDraft((d) => ({ ...d, [p.key]: !d[p.key] }))}
                  />
                  <span className='text-sm text-gray-800'>{p.label}</span>
                </label>
              ))}
            </div>
            <button className='btn btn-secondary btn-sm' onClick={() => permissionsMutation.mutate()} disabled={permissionsMutation.isPending}>
              Save permissions
            </button>
          </div>
        </div>

        {/* Restrictions */}
        <div className='card'>
          <div className='card-content space-y-3'>
            <h3 className='text-sm font-semibold text-gray-900'>Restrictions</h3>
            <div>
              <p className='mb-1 text-xs font-medium text-gray-700'>Permitted content types (blank = all)</p>
              <div className='flex flex-wrap items-center gap-2'>
                <input
                  className='input-field'
                  placeholder='e.g. standard'
                  value={typeDraft}
                  onChange={(e) => setTypeDraft(e.target.value)}
                />
                <button
                  className='btn btn-secondary btn-sm'
                  onClick={() => {
                    const t = typeDraft.trim()
                    if (t && !restrictDraft.permittedContentTypes?.includes(t)) {
                      setRestrictDraft((r) => ({ ...r, permittedContentTypes: [...(r.permittedContentTypes ?? []), t] }))
                    }
                    setTypeDraft('')
                  }}
                >
                  Add
                </button>
                {restrictDraft.permittedContentTypes?.map((t) => (
                  <button
                    key={t}
                    className='rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-200'
                    onClick={() =>
                      setRestrictDraft((r) => ({
                        ...r,
                        permittedContentTypes: (r.permittedContentTypes ?? []).filter((x) => x !== t),
                      }))
                    }
                  >
                    {t} ✕
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className='mb-1 text-xs font-medium text-gray-700'>Announcement audiences (none selected = all)</p>
              <div className='flex flex-wrap gap-3'>
                {(['business', 'consumer', 'both'] as const).map((aud) => (
                  <label key={aud} className='flex items-center gap-1.5 text-sm'>
                    <input
                      type='checkbox'
                      checked={audienceDraft.includes(aud)}
                      onChange={() =>
                        setAudienceDraft((sel) => (sel.includes(aud) ? sel.filter((a) => a !== aud) : [...sel, aud]))
                      }
                    />
                    {aud}
                  </label>
                ))}
              </div>
            </div>
            <button className='btn btn-secondary btn-sm' onClick={() => restrictionsMutation.mutate()} disabled={restrictionsMutation.isPending}>
              Save restrictions
            </button>
          </div>
        </div>

        {/* Activity history */}
        <div className='card'>
          <div className='card-content space-y-3'>
            <h3 className='flex items-center gap-2 text-sm font-semibold text-gray-900'>
              <History className='h-4 w-4 text-gray-400' /> Activity history
            </h3>
            {lifecycleEntry.length === 0 && activity.length === 0 ? (
              <p className='text-sm text-gray-500'>No recorded activity yet.</p>
            ) : (
              <ul className='space-y-2'>
                {[...lifecycleEntry, ...activity.filter((e) => e.targetType !== 'manager')]
                  .sort((a, b) => b.at.localeCompare(a.at))
                  .slice(0, 12)
                  .map((entry) => (
                    <li key={entry.id} className='rounded-lg border border-gray-100 px-3 py-2 text-xs'>
                      <p className='font-medium text-gray-900'>
                        {entry.action} <span className='font-normal text-gray-500'>· {formatDate(entry.at)}</span>
                      </p>
                      <p className='text-gray-600'>
                        {entry.targetLabel ?? entry.targetId}
                        {entry.details ? ` — ${entry.details}` : ''}
                      </p>
                      <p className='text-gray-400'>by {entry.adminName}</p>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <p className='flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600'>
        <ShieldCheck className='mt-0.5 h-4 w-4 shrink-0 text-gray-400' />
        Community Hub Manager is a staff role, not a membership. Suspending or removing this role never deletes the
        person&apos;s CHS account or unrelated memberships. Content decisions this manager makes are recorded in the audit
        log under their account.
      </p>
    </div>
  )
}
