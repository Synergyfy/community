import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { adminApi } from '@/services/admin.service'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate } from '../business/helpers'

/**
 * Audit Log (spec §10 item 12, §14): administrative changes with the acting
 * administrator, action, target and timestamp. Entries are immutable — the
 * filters below only change which recorded entries are shown, never what is
 * recorded.
 */
export function AdminAuditPage() {
  const entries = adminApi.listAudit()
  const [query, setQuery] = useState('')
  const [action, setAction] = useState('all')
  const [targetType, setTargetType] = useState('all')

  const actionOptions = useMemo(() => [...new Set(entries.map((e) => e.action))].sort(), [entries])
  const typeOptions = useMemo(() => [...new Set(entries.map((e) => e.targetType))].sort(), [entries])

  const q = query.trim().toLowerCase()
  const filtered = entries.filter((e) => {
    if (action !== 'all' && e.action !== action) return false
    if (targetType !== 'all' && e.targetType !== targetType) return false
    if (!q) return true
    return [e.action, e.targetLabel ?? '', e.adminName, e.targetId ?? '', e.details ?? ''].some((t) =>
      t.toLowerCase().includes(q),
    )
  })
  const filtersActive = !!q || action !== 'all' || targetType !== 'all'
  const clearFilters = () => {
    setQuery('')
    setAction('all')
    setTargetType('all')
  }

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-gray-900'>Audit Log</h2>
        <p className='text-sm text-gray-600'>
          Administrative changes — who did what, to which target, and when. Entries are immutable.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className='card'>
          <EmptyState
            title='No admin actions recorded yet'
            description='Moderation, user and configuration actions will appear here as they happen.'
          />
        </div>
      ) : (
        <>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='relative min-w-56 flex-1'>
              <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
              <input
                className='input-field pl-9'
                placeholder='Search action, target or admin…'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label='Search audit entries'
              />
            </div>
            <select
              className='input-field w-auto'
              value={action}
              onChange={(e) => setAction(e.target.value)}
              aria-label='Filter by action'
            >
              <option value='all'>All actions</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select
              className='input-field w-auto'
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              aria-label='Filter by target type'
            >
              <option value='all'>All target types</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {filtersActive && (
              <Button size='sm' variant='secondary' icon={<X className='h-4 w-4' />} onClick={clearFilters}>
                Clear
              </Button>
            )}
            <span className='text-xs text-gray-500'>
              {filtered.length} of {entries.length} entries
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className='card'>
              <EmptyState
                title='No entries match these filters'
                description='Adjust the search or filters — the full log is unchanged, only this view is filtered.'
                action={
                  <Button size='sm' variant='secondary' onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            </div>
          ) : (
            <div className='card overflow-hidden'>
              <ul className='divide-y divide-gray-100'>
                {filtered.map((entry) => (
                  <li key={entry.id} className='flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm'>
                    <div className='min-w-0'>
                      <p className='text-gray-900'>
                        <span className='font-semibold'>{entry.adminName}</span> {entry.action}
                        {entry.targetLabel ? <span className="text-gray-600"> — “{entry.targetLabel}”</span> : null}
                      </p>
                      {(entry.previousStatus || entry.resultingStatus) && (
                        <p className='mt-1 flex flex-wrap items-center gap-1.5 text-xs'>
                          {entry.previousStatus && <Badge variant='neutral'>before: {entry.previousStatus}</Badge>}
                          {entry.previousStatus && entry.resultingStatus && <span className='text-gray-400'>→</span>}
                          {entry.resultingStatus && <Badge variant='primary'>after: {entry.resultingStatus}</Badge>}
                        </p>
                      )}
                      {entry.reason && <p className='mt-0.5 text-xs italic text-gray-600'>Reason: {entry.reason}</p>}
                      <p className='mt-0.5 text-xs text-gray-500'>
                        {entry.targetType}
                        {entry.targetId ? ` · ${entry.targetId}` : ''}
                        {entry.details ? ` · ${entry.details}` : ''}
                      </p>
                    </div>
                    <div className='flex shrink-0 items-center gap-2'>
                      <Badge variant='neutral'>{entry.targetType}</Badge>
                      <span className='text-xs text-gray-400'>{formatDate(entry.at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
