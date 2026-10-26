import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Plus, UserPlus, X } from 'lucide-react'
import { adminApi } from '@/services/admin.service'
import { MANAGER_PERMISSION_LABELS, emptyPermissions } from '@/services/managers.service'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate } from '../business/helpers'
import type { ManagerPermissions, ManagerRecord, ManagerStructure } from '@/types/community-public'

const STATUS_VARIANT: Record<ManagerRecord['status'], 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  invited: 'warning',
  suspended: 'danger',
  removed: 'neutral',
}

const STRUCTURE_LABELS: Record<ManagerStructure, string> = {
  single: 'One manager per area',
  multiple: 'Multiple managers per area',
  hierarchy: 'Hierarchy (reporting levels)',
}

/**
 * Community Hub Managers (spec §8): Admin-only appointment and lifecycle
 * management for the Community Hub Manager staff role.
 *
 * Hard boundaries:
 * - A manager appointment is a staff record attached to a CHS account — it is
 *   NOT a membership (spec §4). Appointing or removing the role never touches
 *   the person's CHS account or memberships.
 * - Every manager permission is an independent switch: approving posts does
 *   not imply publishing announcements or changing platform settings (spec §3).
 * - Only an authorised Admin can appoint; the appointment record captures the
 *   appointing Admin, date, assignment and permissions granted (spec §7).
 */
export function AdminManagersPage() {
  const queryClient = useQueryClient()
  const { data: managers = [], isLoading } = useQuery({ queryKey: ['admin', 'managers'], queryFn: adminApi.listManagers })
  const { data: config } = useQuery({ queryKey: ['admin', 'manager-config'], queryFn: adminApi.getManagerConfig })
  const { data: users = [] } = useQuery({ queryKey: ['admin', 'users'], queryFn: adminApi.listUsers })

  const [createOpen, setCreateOpen] = useState(false)
  const [areaDraft, setAreaDraft] = useState<{ name: string; city: string }>({ name: '', city: '' })

  const structureMutation = useMutation({
    mutationFn: (structure: ManagerStructure) => adminApi.saveManagerConfig({ structure }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'manager-config'] }),
  })

  const addAreaMutation = useMutation({
    mutationFn: () => {
      if (!config || !areaDraft.name.trim()) return Promise.resolve()
      const area = {
        id: `area-${areaDraft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: areaDraft.name.trim(),
        city: areaDraft.city.trim() || null,
      }
      if (config.areas.some((a) => a.id === area.id)) return Promise.resolve()
      return adminApi.saveManagerConfig({ areas: [...config.areas, area] })
    },
    onSuccess: () => {
      setAreaDraft({ name: '', city: '' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'manager-config'] })
    },
  })

  const removeAreaMutation = useMutation({
    mutationFn: (id: string) => {
      if (!config) return Promise.resolve()
      return adminApi.saveManagerConfig({ areas: config.areas.filter((a) => a.id !== id) })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'manager-config'] }),
  })

  const areas = config?.areas ?? []

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 className='text-lg font-bold text-gray-900'>Community Hub Managers</h2>
          <p className='text-sm text-gray-600'>
            Appoint and manage the Community Hub Manager staff role. A manager appointment is attached to a CHS account —
            it is a staff role, not a membership, and never changes the person&apos;s account or memberships.
          </p>
        </div>
        <button className='btn btn-primary' onClick={() => setCreateOpen(true)}>
          <UserPlus className='h-4 w-4' /> Create Manager
        </button>
      </div>

      {/* Management structure + areas */}
      <div className='card'>
        <div className='card-content space-y-3'>
          <h3 className='text-sm font-semibold text-gray-900'>Management structure &amp; areas</h3>
          <div className='grid gap-3 sm:grid-cols-2'>
            <div>
              <label className='label' htmlFor='mgr-structure'>
                Structure
              </label>
              <select
                id='mgr-structure'
                className='input-field'
                value={config?.structure ?? 'hierarchy'}
                onChange={(e) => structureMutation.mutate(e.target.value as ManagerStructure)}
              >
                <option value='single'>One manager per area</option>
                <option value='multiple'>Multiple managers per area</option>
                <option value='hierarchy'>Hierarchy (reporting levels)</option>
              </select>
              <p className='mt-1 text-xs text-gray-500'>
                {STRUCTURE_LABELS[config?.structure ?? 'hierarchy']}. The appointment flow adapts to the structure you
                choose.
              </p>
            </div>
            <div>
              <label className='label' htmlFor='area-name'>
                Add an area
              </label>
              <div className='flex gap-2'>
                <input
                  id='area-name'
                  className='input-field'
                  placeholder='Area name (e.g. North Worcestershire)'
                  value={areaDraft.name}
                  onChange={(e) => setAreaDraft((d) => ({ ...d, name: e.target.value }))}
                />
                <input
                  className='input-field'
                  placeholder='City (blank = platform-wide)'
                  value={areaDraft.city}
                  onChange={(e) => setAreaDraft((d) => ({ ...d, city: e.target.value }))}
                />
                <button
                  className='btn btn-secondary'
                  disabled={!areaDraft.name.trim()}
                  onClick={() => addAreaMutation.mutate()}
                  aria-label='Add area'
                >
                  <Plus className='h-4 w-4' />
                </button>
              </div>
            </div>
          </div>
          <ul className='flex flex-wrap gap-2'>
            {areas.map((area) => (
              <li key={area.id} className='flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700'>
                <Building2 className='h-3.5 w-3.5 text-gray-400' />
                {area.name}
                <span className='text-gray-400'>({area.city ?? 'platform-wide'})</span>
                <button
                  className='text-gray-400 hover:text-red-600'
                  onClick={() => removeAreaMutation.mutate(area.id)}
                  aria-label={`Remove ${area.name}`}
                >
                  <X className='h-3.5 w-3.5' />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Appointed managers */}
      {isLoading ? (
        <Skeleton className='h-40 w-full' />
      ) : managers.length === 0 ? (
        <div className='card'>
          <EmptyState
            icon={<UserPlus className='h-10 w-10' />}
            title='No Community Hub Managers yet'
            description='Appoint the first manager with the Create Manager button above.'
          />
        </div>
      ) : (
        <div className='space-y-3'>
          {managers.map((mgr) => {
            const granted = MANAGER_PERMISSION_LABELS.filter((p) => mgr.permissions[p.key])
            return (
              <div key={mgr.id} className='card'>
                <div className='card-content space-y-2'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='min-w-0'>
                      <h3 className='truncate text-sm font-semibold text-gray-900'>{mgr.name}</h3>
                      <p className='text-xs text-gray-500'>
                        {mgr.email || (mgr.userId ? 'email held on the CHS account' : 'no email recorded')}
                        {mgr.userId ? ' · existing CHS account' : ' · invite pending CHS sign-up'}
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Badge variant={STATUS_VARIANT[mgr.status]}>{mgr.status}</Badge>
                      <a href={`/admin/managers/${mgr.id}`} className='btn btn-secondary btn-sm'>
                        Manage
                      </a>
                    </div>
                  </div>
                  <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600'>
                    <span>
                      Areas:{' '}
                      {mgr.areas
                        .map((id) => areas.find((a) => a.id === id)?.name ?? id)
                        .join(', ') || '—'}
                    </span>
                    {mgr.locations.length > 0 && <span>Extra locations: {mgr.locations.join(', ')}</span>}
                    {mgr.structure === 'hierarchy' && (
                      <span>
                        Level {mgr.reportingLevel ?? '—'}
                        {mgr.supervisorId
                          ? ` · reports to ${managers.find((m) => m.id === mgr.supervisorId)?.name ?? mgr.supervisorId}`
                          : ' · no supervisor'}
                      </span>
                    )}
                    <span>
                      Appointed by {mgr.appointedByName} · {formatDate(mgr.appointedAt)}
                    </span>
                    {mgr.source === 'demo' && <Badge variant='warning'>demo seed</Badge>}
                  </div>
                  <p className='text-xs text-gray-600'>
                    {granted.length > 0 ? (
                      granted.map((p) => (
                        <Badge key={p.key} variant='primary' className='mr-1'>
                          {p.label}
                        </Badge>
                      ))
                    ) : (
                      <span className='text-gray-400'>No permissions granted yet.</span>
                    )}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CreateManagerModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        structure={config?.structure ?? 'hierarchy'}
        areas={areas}
        users={users}
        existingManagers={managers}
        onAppointed={() => queryClient.invalidateQueries({ queryKey: ['admin', 'managers'] })}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create Manager — the 8-step appointment process as one reviewable form
// ---------------------------------------------------------------------------

function CreateManagerModal({
  isOpen,
  onClose,
  structure,
  areas,
  users,
  existingManagers,
  onAppointed,
}: {
  isOpen: boolean
  onClose: () => void
  structure: ManagerStructure
  areas: Array<{ id: string; name: string; city?: string | null }>
  users: Array<{ id: string; name: string; userType: string; businessId?: string | null; businessName?: string | null }>
  existingManagers: ManagerRecord[]
  onAppointed: () => void
}) {
  const [mode, setMode] = useState<'existing' | 'invite'>('existing')
  const [userId, setUserId] = useState('')
  const [invite, setInvite] = useState({ name: '', email: '' })
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [reportingLevel, setReportingLevel] = useState('')
  const [supervisorId, setSupervisorId] = useState('')
  const [permissions, setPermissions] = useState<ManagerPermissions>(emptyPermissions)
  const [restrictions, setRestrictions] = useState<{ permittedContentTypes: string[] | null; announcementAudiences: ('business' | 'consumer' | 'both')[] | null }>({
    permittedContentTypes: null,
    announcementAudiences: null,
  })
  const [contentTypeDraft, setContentTypeDraft] = useState('')
  const [audienceDraft, setAudienceDraft] = useState<('business' | 'consumer' | 'both')[]>([])
  const [error, setError] = useState('')

  const chosenUser = users.find((u) => u.id === userId)
  const candidateUsers = useMemo(
    () => users.filter((u) => u.userType !== 'admin' && !existingManagers.some((m) => m.userId === u.id && m.status !== 'removed')),
    [users, existingManagers],
  )

  const togglePermission = (key: keyof ManagerPermissions) =>
    setPermissions((p) => ({ ...p, [key]: !p[key] }))

  const mutation = useMutation({
    mutationFn: async () => {
      const grantedAny = Object.values(permissions).some(Boolean)
      if (mode === 'existing' && !chosenUser) throw new Error('Select a CHS account to appoint.')
      if (mode === 'invite' && (!invite.name.trim() || !invite.email.trim())) throw new Error('Enter the invitee’s name and email.')
      if (selectedAreas.length === 0) throw new Error('Assign at least one area.')
      if (structure === 'hierarchy' && !reportingLevel.trim()) throw new Error('Choose a reporting level for the hierarchy.')
      if (!grantedAny) throw new Error('Grant at least one permission.')

      return adminApi.appointManager({
        userId: mode === 'existing' && chosenUser ? chosenUser.id : null,
        name: mode === 'existing' && chosenUser ? chosenUser.name : invite.name.trim(),
        // Existing accounts keep the email held on their CHS account — we do
        // not fabricate one here; invites carry the address they were sent to.
        email: mode === 'existing' ? '' : invite.email.trim(),
        status: mode === 'existing' ? 'active' : 'invited',
        structure,
        areas: selectedAreas,
        locations: [],
        reportingLevel: structure === 'hierarchy' ? Number(reportingLevel) : null,
        supervisorId: structure === 'hierarchy' && supervisorId ? supervisorId : null,
        permissions,
        restrictions: {
          permittedContentTypes: restrictions.permittedContentTypes,
          announcementAudiences: restrictions.announcementAudiences,
        },
      })
    },
    onSuccess: () => {
      onAppointed()
      onClose()
      // Reset for a possible next appointment.
      setUserId('')
      setInvite({ name: '', email: '' })
      setSelectedAreas([])
      setReportingLevel('')
      setSupervisorId('')
      setPermissions(emptyPermissions)
      setRestrictions({ permittedContentTypes: null, announcementAudiences: null })
      setContentTypeDraft('')
      setAudienceDraft([])
      setError('')
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='Create Community Hub Manager' className='max-w-2xl'>
      <div className='space-y-4'>
        <p className='rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-600'>
          Only an authorised Admin can appoint a Community Hub Manager. This creates a staff record — it is not a
          membership and does not change the person&apos;s CHS account.
        </p>

        {/* 1. Account or invite */}
        <section>
          <h3 className='text-sm font-semibold text-gray-900'>1 · Account</h3>
          <div className='mt-2 flex gap-4 text-sm'>
            <label className='flex items-center gap-1.5'>
              <input type='radio' checked={mode === 'existing'} onChange={() => setMode('existing')} /> Existing CHS
              account
            </label>
            <label className='flex items-center gap-1.5'>
              <input type='radio' checked={mode === 'invite'} onChange={() => setMode('invite')} /> Invite via CHS
              sign-up
            </label>
          </div>
          {mode === 'existing' ? (
            <select className='input-field mt-2' value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value=''>Select an account…</option>
              {candidateUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.userType}
                  {u.businessName ? ` (${u.businessName})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className='mt-2 grid gap-2 sm:grid-cols-2'>
              <input
                className='input-field'
                placeholder='Full name'
                value={invite.name}
                onChange={(e) => setInvite((v) => ({ ...v, name: e.target.value }))}
              />
              <input
                className='input-field'
                placeholder='Email for CHS invite'
                value={invite.email}
                onChange={(e) => setInvite((v) => ({ ...v, email: e.target.value }))}
              />
            </div>
          )}
        </section>

        {/* 2. Areas */}
        <section>
          <h3 className='text-sm font-semibold text-gray-900'>2 · Areas</h3>
          <div className='mt-2 flex flex-wrap gap-3'>
            {areas.map((area) => (
              <label key={area.id} className='flex items-center gap-1.5 text-sm'>
                <input
                  type='checkbox'
                  checked={selectedAreas.includes(area.id)}
                  onChange={() =>
                    setSelectedAreas((sel) => (sel.includes(area.id) ? sel.filter((a) => a !== area.id) : [...sel, area.id]))
                  }
                />
                {area.name} <span className='text-xs text-gray-400'>({area.city ?? 'platform-wide'})</span>
              </label>
            ))}
          </div>
        </section>

        {/* 3. Hierarchy */}
        {structure === 'hierarchy' && (
          <section>
            <h3 className='text-sm font-semibold text-gray-900'>3 · Hierarchy</h3>
            <div className='mt-2 grid gap-2 sm:grid-cols-2'>
              <select className='input-field' value={reportingLevel} onChange={(e) => setReportingLevel(e.target.value)}>
                <option value=''>Reporting level…</option>
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    Level {lvl}
                  </option>
                ))}
              </select>
              <select className='input-field' value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}>
                <option value=''>Supervisor (optional)…</option>
                {existingManagers
                  .filter((m) => m.status === 'active')
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>
          </section>
        )}

        {/* 4. Permissions */}
        <section>
          <h3 className='text-sm font-semibold text-gray-900'>4 · Permissions</h3>
          <p className='mt-1 text-xs text-gray-500'>
            Each permission is independent — approving posts does not imply publishing announcements or changing platform
            settings.
          </p>
          <div className='mt-2 grid gap-2 sm:grid-cols-2'>
            {MANAGER_PERMISSION_LABELS.map((p) => (
              <label key={p.key} className='flex items-start gap-2 text-sm'>
                <input type='checkbox' className='mt-0.5' checked={permissions[p.key]} onChange={() => togglePermission(p.key)} />
                <span>
                  <span className='font-medium text-gray-900'>{p.label}</span>
                  <span className='block text-xs text-gray-500'>{p.description}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* 5. Restrictions */}
        <section>
          <h3 className='text-sm font-semibold text-gray-900'>5 · Restrictions</h3>
          <div className='mt-2 space-y-2'>
            <div className='flex items-center gap-2'>
              <input
                className='input-field'
                placeholder='Permitted content type (e.g. standard) — blank = all'
                value={contentTypeDraft}
                onChange={(e) => setContentTypeDraft(e.target.value)}
              />
              <button
                className='btn btn-secondary btn-sm'
                onClick={() => {
                  const t = contentTypeDraft.trim()
                  if (t && !restrictions.permittedContentTypes?.includes(t)) {
                    setRestrictions((r) => ({ ...r, permittedContentTypes: [...(r.permittedContentTypes ?? []), t] }))
                  }
                  setContentTypeDraft('')
                }}
              >
                Add
              </button>
            </div>
            {restrictions.permittedContentTypes && restrictions.permittedContentTypes.length > 0 && (
              <div className='flex flex-wrap gap-1'>
                {restrictions.permittedContentTypes.map((t) => (
                  <Badge key={t} variant='neutral'>
                    {t}
                  </Badge>
                ))}
              </div>
            )}
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
                  Announcement audience: {aud}
                </label>
              ))}
            </div>
          </div>
        </section>

        {error && <p className='text-sm text-red-600'>{error}</p>}

        {/* 6. Review & confirm */}
        <section className='rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700'>
          <h3 className='text-sm font-semibold text-gray-900'>6 · Review &amp; confirm</h3>
          <ul className='mt-1 list-disc space-y-0.5 pl-4'>
            <li>
              Account:{' '}
              {mode === 'existing'
                ? chosenUser
                  ? `${chosenUser.name} (${chosenUser.userType})`
                  : '— select an account —'
                : `${invite.name || '—'} (${invite.email || 'no email'})`}
            </li>
            <li>
              Areas:{' '}
              {selectedAreas.map((id) => areas.find((a) => a.id === id)?.name ?? id).join(', ') || '— none —'}
            </li>
            {structure === 'hierarchy' && (
              <li>
                Hierarchy: level {reportingLevel || '—'}
                {supervisorId
                  ? `, supervisor ${existingManagers.find((m) => m.id === supervisorId)?.name ?? supervisorId}`
                  : ', no supervisor'}
              </li>
            )}
            <li>
              Permissions:{' '}
              {MANAGER_PERMISSION_LABELS.filter((p) => permissions[p.key])
                .map((p) => p.label)
                .join(', ') || '— none —'}
            </li>
            <li>
              Restrictions:{' '}
              {[
                restrictions.permittedContentTypes?.length ? `content types: ${restrictions.permittedContentTypes.join(', ')}` : null,
                restrictions.announcementAudiences?.length ? `audiences: ${restrictions.announcementAudiences.join(', ')}` : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'none'}
            </li>
            <li>Appointing Admin and date are recorded automatically.</li>
          </ul>
          <button className='btn btn-primary mt-3' onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Appointing…' : 'Confirm appointment'}
          </button>
        </section>
      </div>
    </Modal>
  )
}
