import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ExternalLink, Gift, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { adminApi } from '@/services/admin.service'
import { verifyDestination, type DestinationVerification } from '@/services/notification-config.service'
import { useAuthStore } from '@/stores/auth.store'
import { canAdmin } from '@/lib/permissions'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import { formatDate } from '../business/helpers'
import type { NotificationEventDef, NotificationEventTemplate } from '@/types/community-public'

/**
 * Rewards & Notifications (spec §11, §10) — Phase H.
 *
 * Two oversight surfaces, both honest about their boundaries:
 *
 * - **Rewards (§11):** read-only records of the central Rewards system.
 *   Community runs no reward engine — triggers, claims and qualification are
 *   that system's (§17-5 pending), so this screen never mutates a reward; it
 *   links each record to its campaign, its reward page and any Community
 *   content promoting it (§15: one record, cross-linked, not copied).
 *
 * - **Notification events (§10):** a factual inventory of every notification
 *   event in this codebase — where it is emitted, its in-app type, its
 *   destination — with destination verification against the routes in App.tsx
 *   and against the demo records the links point at. Message templates are
 *   stored configuration records, audited on save (§13, §14): which events
 *   trigger a notification and whether in-app/email delivery applies is an
 *   open decision (§9-8), so emitters keep their built-in text until it
 *   lands. Template editing sits behind `configure_notifications` (§17-6).
 */

type Tab = 'rewards' | 'notifications'

export function AdminRewardsPage() {
  const [tab, setTab] = useState<Tab>('rewards')
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const { data: campaigns = [] } = useQuery({ queryKey: ['admin', 'campaigns'], queryFn: adminApi.listCampaigns })
  const { data: templates = [] } = useQuery({
    queryKey: ['admin', 'notification-templates'],
    queryFn: adminApi.listNotificationTemplates,
  })

  const rewards = adminApi.listRewards()
  const events = adminApi.listNotificationEvents()
  const canConfigureTemplates = canAdmin(user, 'configure_notifications')

  const campaignById = useMemo(() => new Map(campaigns.map((c) => [c.id, c])), [campaigns])
  const verifications = useMemo(() => events.map((e) => verifyDestination(e.id)), [events])
  const routeFailures = verifications.filter((v) => !v.routeOk).length
  const recordFailures = verifications.filter((v) => v.recordOk === false).length
  const destinationCount = verifications.filter((v) => v.destination).length

  const available = rewards.filter((r) => r.status !== 'ended').length
  const ended = rewards.length - available
  const linkedContentCount = rewards.reduce((n, r) => n + adminApi.listPostsForReward(r.id).length, 0)

  const onTemplateSaved = (next: NotificationEventTemplate) => {
    queryClient.setQueryData<NotificationEventTemplate[]>(['admin', 'notification-templates'], (old) =>
      old ? old.map((t) => (t.eventId === next.eventId ? next : t)) : [next],
    )
  }

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-gray-900'>Rewards & Notifications</h2>
        <p className='text-sm text-gray-600'>
          Reward lifecycle records from the central Rewards system, plus the notification event inventory with
          destination verification.
        </p>
      </div>

      <div className='flex gap-1 border-b border-gray-200' role='tablist' aria-label='Rewards and notifications views'>
        {(
          [
            { id: 'rewards', label: `Rewards (${rewards.length})` },
            { id: 'notifications', label: `Notification events (${events.length})` },
          ] as Array<{ id: Tab; label: string }>
        ).map((t) => (
          <button
            key={t.id}
            role='tab'
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-800',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'rewards' ? (
        <>
          <div className='rounded-lg bg-gray-50 p-3 text-xs text-gray-600'>
            Rewards are records read from the central Rewards system (§11) — Community holds no reward engine.
            Triggers, claims and qualification are decided by that system (§17-5 pending), so this screen is
            read-only oversight: no reward is created, changed or closed here. Qualification text is shown exactly
            as configured; demo records are labelled <span className='font-medium'>demo seed</span>.
          </div>

          <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
            <Stat label='Reward records' value={rewards.length} caption='across all campaigns' />
            <Stat label='Available' value={available} caption='status "available"' />
            <Stat label='Ended' value={ended} caption='status "ended"' />
            <Stat label='Linked Community content' value={linkedContentCount} caption='posts promoting a reward' />
          </div>

          {rewards.length === 0 ? (
            <div className='card'>
              <EmptyState
                icon={<Gift className='h-10 w-10' />}
                title='No reward records'
                description='Rewards appear here once the central Rewards system provides them.'
              />
            </div>
          ) : (
            <div className='space-y-3'>
              {rewards.map((reward) => {
                const campaign = reward.campaignId ? campaignById.get(reward.campaignId) : undefined
                const linkedPosts = adminApi.listPostsForReward(reward.id)
                return (
                  <div key={reward.id} className='card'>
                    <div className='card-content space-y-2'>
                      <div className='flex flex-wrap items-start justify-between gap-2'>
                        <div className='min-w-0'>
                          <h3 className='text-sm font-semibold text-gray-900'>{reward.title}</h3>
                          {reward.valueText && <p className='text-xs text-gray-500'>{reward.valueText}</p>}
                        </div>
                        <span className='flex flex-wrap items-center gap-1.5'>
                          <Badge variant={reward.status === 'ended' ? 'neutral' : 'success'}>
                            {reward.status === 'ended' ? 'ended' : 'available'}
                          </Badge>
                          {reward.source === 'demo' && <Badge variant='warning'>demo seed</Badge>}
                        </span>
                      </div>

                      <p className='text-xs text-gray-600'>{reward.description}</p>

                      <div className='rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600'>
                        <p className='font-medium text-gray-700'>Qualification (as configured by the central Rewards system)</p>
                        <p>{reward.howToQualify ?? 'No qualification text supplied.'}</p>
                        <p className='mt-1 text-[11px] text-gray-400'>
                          Displayed as recorded — Community does not evaluate eligibility (§9, §17-5).
                        </p>
                      </div>

                      <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs'>
                        {campaign && (
                          <span className='text-gray-500'>
                            Campaign:{' '}
                            <Link to={`/admin/campaigns/${campaign.id}`} className='font-medium text-primary-600 hover:underline'>
                              {campaign.title}
                            </Link>
                          </span>
                        )}
                        <Link
                          to={`/community/reward/${reward.id}`}
                          className='inline-flex items-center gap-1 font-medium text-primary-600 hover:underline'
                        >
                          Open reward page <ExternalLink className='h-3.5 w-3.5' />
                        </Link>
                      </div>

                      <div className='border-t border-gray-100 pt-2'>
                        <p className='text-xs font-medium text-gray-500'>Community content promoting this reward</p>
                        {linkedPosts.length > 0 ? (
                          <ul className='mt-1 flex flex-wrap gap-2'>
                            {linkedPosts.map((p) => (
                              <li key={p.id}>
                                <Link
                                  to={`/community/post/${p.id}`}
                                  className='inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700 hover:bg-gray-200'
                                >
                                  {p.title ?? `${p.content.slice(0, 36)}…`}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className='mt-1 text-[11px] text-gray-400'>No Community content links to this reward.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className='rounded-lg bg-gray-50 p-3 text-xs text-gray-600'>
            Inventory of the notification events that exist in Community today (§10): where each event is emitted,
            the in-app type it uses and where it sends members. Destination checks verify every link against the
            routes registered in App.tsx and against the record it points at. Which events <em>should</em> notify,
            and whether in-app or email delivery applies, is an open decision (§9-8) — this inventory documents
            behaviour, it does not create triggers.
          </div>

          <div
            className={cn(
              'flex items-start gap-2 rounded-lg border p-3 text-xs',
              routeFailures === 0 && recordFailures === 0
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800',
            )}
            role='status'
          >
            {routeFailures === 0 && recordFailures === 0 ? (
              <>
                <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0' />
                <span>
                  Verified: all {destinationCount} destinations resolve to registered routes, and every example link
                  points at an existing record. Events without a destination link open the bell list directly.
                </span>
              </>
            ) : (
              <>
                <XCircle className='mt-0.5 h-4 w-4 shrink-0' />
                <span>
                  {routeFailures} destination(s) without a matching route, {recordFailures} example link(s) pointing
                  at a missing record.
                </span>
              </>
            )}
          </div>

          <div className='card overflow-x-auto'>
            <table className='min-w-full text-left text-xs'>
              <thead className='border-b border-gray-200 bg-gray-50 text-gray-500'>
                <tr>
                  <th className='px-3 py-2 font-medium'>Event</th>
                  <th className='px-3 py-2 font-medium'>In-app type</th>
                  <th className='px-3 py-2 font-medium'>Emitted at</th>
                  <th className='px-3 py-2 font-medium'>Destination</th>
                  <th className='px-3 py-2 font-medium'>Destination check</th>
                  <th className='px-3 py-2 font-medium'>Status</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className='px-3 py-2'>
                      <span className='block font-medium text-gray-900'>{event.label}</span>
                      <span className='block text-[11px] font-normal text-gray-400'>{event.id}</span>
                    </td>
                    <td className='px-3 py-2'>
                      <Badge variant='neutral'>{event.inAppType}</Badge>
                    </td>
                    <td className='px-3 py-2 text-gray-600'>{event.emittedAt}</td>
                    <td className='px-3 py-2 font-mono text-[11px] text-gray-600'>
                      {event.destination ?? <span className='font-sans text-gray-400'>no destination configured</span>}
                    </td>
                    <td className='px-3 py-2'>
                      <DestinationCheckCell check={verifyDestination(event.id)} />
                    </td>
                    <td className='px-3 py-2'>
                      {event.frontendWired ? (
                        <Badge variant='primary'>wired in front end</Badge>
                      ) : event.demoSeedOnly ? (
                        <Badge variant='warning'>demo seed only</Badge>
                      ) : (
                        <Badge variant='neutral'>not emitted yet</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className='space-y-3' aria-label='Notification message templates'>
            <div className='flex flex-wrap items-start justify-between gap-2'>
              <div>
                <h3 className='text-sm font-semibold text-gray-900'>Message templates</h3>
                <p className='text-xs text-gray-500'>
                  Stored configuration per event, audited on save (§13, §14). Placeholders like {'{group}'} or {'{name}'}
                  {' '}are shown as configured — never interpreted. Not yet applied by emitters: trigger and delivery
                  rules wait on the §9-8 decision.
                </p>
              </div>
              {!canConfigureTemplates && (
                <Badge variant='neutral'>read-only — configure_notifications required (§17-6)</Badge>
              )}
            </div>

            {templates.length === 0 ? (
              <div className='card'>
                <p className='card-content text-sm text-gray-500'>No template configuration stored yet.</p>
              </div>
            ) : (
              <div className='space-y-3'>
                {templates.map((template) => (
                  <TemplateRow
                    key={template.eventId}
                    event={events.find((e) => e.id === template.eventId)}
                    template={template}
                    readOnly={!canConfigureTemplates}
                    onSaved={onTemplateSaved}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function DestinationCheckCell({ check }: { check: DestinationVerification }) {
  if (!check.destination) {
    return <span className='text-gray-400'>no link to verify</span>
  }
  return (
    <span className='flex flex-col gap-0.5'>
      <span className={cn('flex items-center gap-1', check.routeOk ? 'text-green-700' : 'text-red-600')}>
        {check.routeOk ? <CheckCircle2 className='h-3.5 w-3.5 shrink-0' /> : <XCircle className='h-3.5 w-3.5 shrink-0' />}
        {check.routeOk ? `route ${check.matchedRoute}` : 'no matching route'}
      </span>
      <span
        className={cn(
          'flex items-center gap-1 text-[11px]',
          check.recordOk === null ? 'text-gray-400' : check.recordOk ? 'text-green-700' : 'text-red-600',
        )}
      >
        {check.recordOk !== null &&
          (check.recordOk ? <CheckCircle2 className='h-3.5 w-3.5 shrink-0' /> : <XCircle className='h-3.5 w-3.5 shrink-0' />)}
        {check.recordOk === null
          ? 'record check not applicable'
          : `record ${check.exampleLink ?? check.destination} ${check.recordOk ? 'found' : 'missing'}`}
      </span>
    </span>
  )
}

function TemplateRow({
  event,
  template,
  readOnly,
  onSaved,
}: {
  event: NotificationEventDef | undefined
  template: NotificationEventTemplate
  readOnly: boolean
  onSaved: (next: NotificationEventTemplate) => void
}) {
  const [title, setTitle] = useState(template.titleTemplate)
  const [body, setBody] = useState(template.bodyTemplate)
  const [inApp, setInApp] = useState(template.inAppEnabled)
  const [email, setEmail] = useState(template.emailEnabled)
  const [saving, setSaving] = useState(false)

  const dirty =
    title !== template.titleTemplate ||
    body !== template.bodyTemplate ||
    inApp !== template.inAppEnabled ||
    email !== template.emailEnabled

  const save = async () => {
    setSaving(true)
    try {
      const next = await adminApi.saveNotificationTemplate(template.eventId, {
        titleTemplate: title,
        bodyTemplate: body,
        inAppEnabled: inApp,
        emailEnabled: email,
      })
      onSaved(next)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='card'>
      <div className='card-content space-y-2'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <p className='text-sm font-semibold text-gray-900'>
            {event?.label ?? template.eventId}
            <span className='ml-2 text-[11px] font-normal text-gray-400'>{template.eventId}</span>
          </p>
          <span className='flex items-center gap-1.5'>
            {dirty && <Badge variant='danger'>unsaved</Badge>}
            <Badge variant={template.source === 'demo' ? 'warning' : 'primary'}>
              {template.source === 'demo' ? 'demo seed' : 'saved by admin'}
            </Badge>
          </span>
        </div>

        <label className='block space-y-1'>
          <span className='text-xs font-medium text-gray-600'>Title</span>
          <input
            className='input-field w-full py-1 text-xs'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={readOnly}
            aria-label={`Title template for ${event?.label ?? template.eventId}`}
          />
        </label>
        <label className='block space-y-1'>
          <span className='text-xs font-medium text-gray-600'>Body</span>
          <textarea
            className='input-field w-full py-1 text-xs'
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={readOnly}
            aria-label={`Body template for ${event?.label ?? template.eventId}`}
          />
        </label>

        <div className='flex flex-wrap items-center justify-between gap-2'>
          <span className='flex flex-wrap items-center gap-4 text-xs text-gray-600'>
            <label className='flex items-center gap-1.5'>
              <input type='checkbox' checked={inApp} onChange={(e) => setInApp(e.target.checked)} disabled={readOnly} />
              In-app (bell)
            </label>
            <label className='flex items-center gap-1.5' title='Email delivery requires a backend mailer — §9-8 pending'>
              <input type='checkbox' checked={email} onChange={(e) => setEmail(e.target.checked)} disabled={readOnly} />
              Email (delivery requires backend)
            </label>
          </span>
          <span className='flex items-center gap-3 text-[11px] text-gray-400'>
            {template.updatedAt && (
              <span>
                updated {formatDate(template.updatedAt)}
                {template.updatedBy ? ` by ${template.updatedBy}` : ''}
              </span>
            )}
            {!readOnly && (
              <Button size='sm' variant='secondary' disabled={!dirty || saving} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, caption }: { label: string; value: number; caption?: string }) {
  return (
    <div className='card'>
      <div className='card-content flex flex-col items-center gap-1 text-center'>
        <p className='text-xl font-bold text-gray-900'>{value}</p>
        <p className='text-xs text-gray-500'>{label}</p>
        {caption && <p className='text-[11px] text-gray-400'>{caption}</p>}
      </div>
    </div>
  )
}
