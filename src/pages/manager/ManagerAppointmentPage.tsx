import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { History, Home, ScrollText, ShieldCheck } from 'lucide-react'
import { adminApi } from '@/services/admin.service'
import { managersService, MANAGER_PERMISSION_LABELS } from '@/services/managers.service'
import { useAuthStore } from '@/stores/auth.store'
import { homeForUser } from '@/components/auth/ProtectedRoute'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '../business/helpers'
import { managerScope } from './manager-scope'

/**
 * Community Manager — My appointment (Community Hub Manager spec §8).
 *
 * The manager's own appointment record: scope, hierarchy, granted
 * permissions, restrictions, who appointed them and when, plus their retained
 * activity history. Read-only — permission and scope changes are made by the
 * central Admin on the admin side.
 */
export function ManagerAppointmentPage() {
  const user = useAuthStore((s) => s.user)
  const record = managersService.getAnyForUser(user?.id)
  const config = managersService.getConfig()

  const { data: activity = [] } = useQuery({
    queryKey: ['admin', 'manager-activity', record?.userId],
    queryFn: () => adminApi.listManagerActivity(record?.userId ?? null),
    enabled: !!record?.userId,
  })

  if (!record) return null

  const scope = managerScope(record, config.areas)
  const supervisor = record.supervisorId ? managersService.getManager(record.supervisorId) : null
  const areaNames = record.areas.map((id) => config.areas.find((a) => a.id === id)?.name ?? id).join(', ')

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-gray-900'>My appointment</h2>
        <p className='text-sm text-gray-600'>
          Your Community Hub Manager appointment record. Changes to scope, permissions or status are made by the
          central Admin — every change is recorded here.
        </p>
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        {/* Scope & hierarchy */}
        <div className='card'>
          <div className='card-content space-y-3'>
            <h3 className='text-sm font-semibold text-gray-900'>Scope</h3>
            <ul className='space-y-1.5 text-sm text-gray-700'>
              <li>
                <span className='font-medium'>Areas:</span> {areaNames || '—'}
              </li>
              <li>
                <span className='font-medium'>Scope resolution:</span>{' '}
                {scope.all ? 'platform-wide (all content)' : `content located in ${scope.cities.join(', ') || '—'}`}
              </li>
              {record.locations.length > 0 && (
                <li>
                  <span className='font-medium'>Extra locations:</span> {record.locations.join(', ')}
                </li>
              )}
              {record.structure === 'hierarchy' && (
                <>
                  <li>
                    <span className='font-medium'>Reporting level:</span> {record.reportingLevel ?? '—'}
                  </li>
                  <li>
                    <span className='font-medium'>Supervisor:</span> {supervisor?.name ?? '— none —'}
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Granted permissions */}
        <div className='card'>
          <div className='card-content space-y-3'>
            <h3 className='text-sm font-semibold text-gray-900'>Granted permissions</h3>
            <ul className='grid gap-1.5 text-sm'>
              {MANAGER_PERMISSION_LABELS.map((p) => (
                <li key={p.key} className='flex items-center gap-2'>
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${record.permissions[p.key] ? 'bg-green-500' : 'bg-gray-300'}`}
                    aria-hidden
                  />
                  <span className={record.permissions[p.key] ? 'text-gray-900' : 'text-gray-400'}>{p.label}</span>
                </li>
              ))}
            </ul>
            <p className='text-xs text-gray-500'>
              Each permission is granted independently — content approval never implies announcement publishing or
              platform settings.
            </p>
          </div>
        </div>

        {/* Restrictions */}
        <div className='card'>
          <div className='card-content space-y-3'>
            <h3 className='text-sm font-semibold text-gray-900'>Restrictions</h3>
            <ul className='space-y-1.5 text-sm text-gray-700'>
              <li>
                <span className='font-medium'>Permitted content types:</span>{' '}
                {record.restrictions.permittedContentTypes?.join(', ') || 'all types'}
              </li>
              <li>
                <span className='font-medium'>Announcement audiences:</span>{' '}
                {record.restrictions.announcementAudiences?.join(', ') || 'all audiences'}
              </li>
            </ul>
          </div>
        </div>

        {/* Appointment record */}
        <div className='card'>
          <div className='card-content space-y-3'>
            <h3 className='flex items-center gap-2 text-sm font-semibold text-gray-900'>
              <ScrollText className='h-4 w-4 text-gray-400' /> Appointment record
            </h3>
            <ul className='space-y-1.5 text-sm text-gray-700'>
              <li>
                <span className='font-medium'>Status:</span> <Badge variant='success'>{record.status}</Badge>
              </li>
              <li>
                <span className='font-medium'>Appointed by:</span> {record.appointedByName}
              </li>
              <li>
                <span className='font-medium'>Appointed on:</span> {formatDate(record.appointedAt)}
              </li>
              {record.updatedAt && (
                <li>
                  <span className='font-medium'>Last change:</span> {formatDate(record.updatedAt)}
                </li>
              )}
            </ul>
            {record.source === 'demo' && <Badge variant='warning'>demo seed appointment</Badge>}
            <Link
              to={homeForUser(user?.userType, user?.id)}
              className='btn btn-secondary btn-sm inline-flex items-center gap-1'
            >
              <Home className='h-4 w-4' /> My CHS home
            </Link>
          </div>
        </div>
      </div>

      {/* Activity history */}
      <div className='card'>
        <div className='card-content space-y-3'>
          <h3 className='flex items-center gap-2 text-sm font-semibold text-gray-900'>
            <History className='h-4 w-4 text-gray-400' /> My activity history
          </h3>
          {activity.length === 0 ? (
            <p className='text-sm text-gray-500'>No recorded actions yet.</p>
          ) : (
            <ul className='space-y-2'>
              {activity.slice(0, 20).map((entry) => (
                <li key={entry.id} className='rounded-lg border border-gray-100 px-3 py-2 text-xs'>
                  <p className='font-medium text-gray-900'>
                    {entry.action} <span className='font-normal text-gray-500'>· {formatDate(entry.at)}</span>
                  </p>
                  <p className='text-gray-600'>
                    {entry.targetLabel ?? entry.targetId}
                    {entry.details ? ` — ${entry.details}` : ''}
                    {entry.reason ? ` · reason: ${entry.reason}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className='flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600'>
        <ShieldCheck className='mt-0.5 h-4 w-4 shrink-0 text-gray-400' />
        Community Hub Manager is a staff role, not a membership — it requires no separate purchase and your CHS
        account and memberships are independent of it. Sensitive or disputed cases can be escalated to the central
        Admin from your working pages.
      </p>
    </div>
  )
}
