import { useQuery } from '@tanstack/react-query'
import { FileText, Megaphone, Repeat, ScrollText, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { adminApi } from '@/services/admin.service'
import { managersService, MANAGER_PERMISSION_LABELS } from '@/services/managers.service'
import { useAuthStore } from '@/stores/auth.store'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '../business/helpers'
import { inScope, managerScope } from './manager-scope'

/**
 * Community Manager Dashboard — Overview (Community Hub Manager spec §8).
 * Shows the manager's own appointment (scope + granted permissions), their
 * in-scope workload, and their recent recorded activity. Counts are derived
 * from the same stores the Admin surfaces read (one set of records).
 */
export function ManagerOverviewPage() {
  const user = useAuthStore((s) => s.user)
  const record = managersService.getAnyForUser(user?.id)
  const config = managersService.getConfig()

  const { data: posts = [] } = useQuery({ queryKey: ['admin', 'posts'], queryFn: adminApi.listPosts })
  const { data: exchanges = [] } = useQuery({ queryKey: ['admin', 'exchanges'], queryFn: adminApi.listExchanges })
  const { data: reports = [] } = useQuery({ queryKey: ['admin', 'reports'], queryFn: () => adminApi.listReports() })
  const { data: comments = [] } = useQuery({ queryKey: ['admin', 'comments'], queryFn: adminApi.listComments })
  const { data: activity = [] } = useQuery({
    queryKey: ['admin', 'manager-activity', record?.userId],
    queryFn: () => adminApi.listManagerActivity(record?.userId ?? null),
    enabled: !!record?.userId,
  })

  if (!record) return null

  const scope = managerScope(record, config.areas)
  const granted = MANAGER_PERMISSION_LABELS.filter((p) => record.permissions[p.key])
  const areaNames = record.areas.map((id) => config.areas.find((a) => a.id === id)?.name ?? id).join(', ')
  const supervisor = record.supervisorId ? managersService.getManager(record.supervisorId) : null

  const pendingPosts = posts.filter(
    (p) => p.status === 'pending' && inScope(scope, p.location?.cityName),
  ).length
  // Open reports counted only inside the assigned areas — the same scope the
  // Reports page uses, so the number links to work the manager can act on.
  const openReports = reports.filter((r) => {
    if (r.status === 'resolved' || r.targetType === 'user') return false
    if (r.targetType === 'post') return inScope(scope, posts.find((p) => p.id === r.targetId)?.location?.cityName)
    if (r.targetType === 'exchange') return inScope(scope, exchanges.find((e) => e.id === r.targetId)?.location?.cityName)
    if (r.targetType === 'comment') {
      const comment = comments.find((c) => c.id === r.targetId)
      const parent = comment ? posts.find((p) => p.id === comment.postId) : undefined
      return parent ? inScope(scope, parent.location?.cityName) : scope.all
    }
    return true
  }).length
  const activeExchange = exchanges.filter(
    (e) => e.status === 'active' && inScope(scope, e.location?.cityName),
  ).length

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-gray-900'>Welcome, {record.name}</h2>
        <p className='text-sm text-gray-600'>
          Your Community Manager Dashboard is limited to your assigned scope and authorised actions. This staff role
          overlays your CHS account — your membership entitlements are unchanged.
        </p>
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        {/* Appointment summary */}
        <div className='card'>
          <div className='card-content space-y-3'>
            <h3 className='text-sm font-semibold text-gray-900'>My appointment</h3>
            <div className='flex flex-wrap items-center gap-2 text-xs text-gray-600'>
              <Badge variant='success'>{record.status}</Badge>
              <Badge variant='neutral'>{record.structure}</Badge>
              <span>Appointed by {record.appointedByName} · {formatDate(record.appointedAt)}</span>
              {record.source === 'demo' && <Badge variant='warning'>demo seed</Badge>}
            </div>
            <div className='text-sm text-gray-700'>
              <p>
                <span className='font-medium'>Areas:</span> {areaNames || '—'}
              </p>
              {record.structure === 'hierarchy' && (
                <p>
                  <span className='font-medium'>Level:</span> {record.reportingLevel ?? '—'}
                  {supervisor ? ` · Supervisor: ${supervisor.name}` : ' · No supervisor'}
                </p>
              )}
            </div>
            <div>
              <p className='mb-1 text-xs font-medium text-gray-700'>Granted permissions</p>
              {granted.length > 0 ? (
                <div className='flex flex-wrap gap-1'>
                  {granted.map((p) => (
                    <Badge key={p.key} variant='primary'>
                      {p.label}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className='text-sm text-gray-500'>No permissions granted.</p>
              )}
            </div>
            <Link to='/manager/appointment' className='btn btn-secondary btn-sm inline-flex items-center gap-1'>
              <ScrollText className='h-4 w-4' /> Full appointment &amp; history
            </Link>
          </div>
        </div>

        {/* Workload */}
        <div className='card'>
          <div className='card-content space-y-3'>
            <h3 className='text-sm font-semibold text-gray-900'>In-scope workload</h3>
            <ul className='space-y-2 text-sm'>
              {record.permissions.viewReviewContent && (
                <li className='flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2'>
                  <span className='flex items-center gap-2'>
                    <Megaphone className='h-4 w-4 text-gray-400' /> Posts awaiting review
                  </span>
                  <span className='font-semibold text-gray-900'>{pendingPosts}</span>
                </li>
              )}
              {record.permissions.moderateReports && (
                <li className='flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2'>
                  <span className='flex items-center gap-2'>
                    <FileText className='h-4 w-4 text-gray-400' /> Open reports (content &amp; exchange)
                  </span>
                  <span className='font-semibold text-gray-900'>{openReports}</span>
                </li>
              )}
              {record.permissions.moderateExchange && (
                <li className='flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2'>
                  <span className='flex items-center gap-2'>
                    <Repeat className='h-4 w-4 text-gray-400' /> Active #Exchange items in scope
                  </span>
                  <span className='font-semibold text-gray-900'>{activeExchange}</span>
                </li>
              )}
              {!record.permissions.viewReviewContent && !record.permissions.moderateReports && !record.permissions.moderateExchange && (
                <li className='text-gray-500'>No workload sections are enabled for your permissions.</li>
              )}
            </ul>
            <p className='text-xs text-gray-500'>
              Scope: {scope.all ? 'platform-wide (all areas)' : scope.cities.join(', ') || 'no cities assigned'}.
              Content outside your scope is hidden from your dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className='card'>
        <div className='card-content space-y-3'>
          <h3 className='flex items-center gap-2 text-sm font-semibold text-gray-900'>
            <ShieldCheck className='h-4 w-4 text-gray-400' /> Recent activity
          </h3>
          {activity.length === 0 ? (
            <p className='text-sm text-gray-500'>No recorded actions yet — your decisions appear here once you act.</p>
          ) : (
            <ul className='space-y-2'>
              {activity.slice(0, 6).map((entry) => (
                <li key={entry.id} className='rounded-lg border border-gray-100 px-3 py-2 text-xs'>
                  <p className='font-medium text-gray-900'>
                    {entry.action} <span className='font-normal text-gray-500'>· {formatDate(entry.at)}</span>
                  </p>
                  <p className='text-gray-600'>
                    {entry.targetLabel ?? entry.targetId}
                    {entry.details ? ` — ${entry.details}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
