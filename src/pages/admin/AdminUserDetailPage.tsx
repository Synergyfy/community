import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, Flag, ShieldCheck, ShieldOff, Users } from 'lucide-react'
import { adminApi, businessNameFor } from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth.store'
import { canAdmin } from '@/lib/permissions'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Avatar'
import { GroupContextModal } from '@/components/admin/GroupContextModal'
import { formatDate } from '../business/helpers'
import type { PublicGroup } from '@/types/community-public'

/**
 * Account participation drill-down (spec §5.5, §8): one account's content,
 * exchange items, sharing, referrals, reports and moderation history — a
 * read-only view assembled from the same stores the other admin screens use
 * (§15, one set of records, never a parallel copy).
 *
 * Hard rules honoured here (§8, §9, §16):
 * - Counts describe *recorded* records only; clicks are totals (unique only
 *   when a backend supplies them) and pending events are never shown as
 *   confirmed outcomes (§17-3).
 * - Group-origin posts are identified by group (§9); group *membership*
 *   records live in the Groups & Circles product and are not duplicated here.
 * - The group-context panel sits behind `view_group_context` (§17-7 scope
 *   pending); status controls sit behind `manage_users` and remain
 *   server-enforced — a hidden button is not a security boundary (§5.5).
 */
export function AdminUserDetailPage() {
  const { id = '' } = useParams()
  const me = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const canManage = canAdmin(me, 'manage_users')
  const canSeeGroupContext = canAdmin(me, 'view_group_context')
  const gateManage = canManage ? undefined : "Requires 'Manage users' — role grants pending §17-6"
  const gateGroup = canSeeGroupContext
    ? undefined
    : "Requires 'View group context' — role grants pending §17-6; privacy scope pending §17-7"

  const [contextGroup, setContextGroup] = useState<PublicGroup | null>(null)

  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin', 'users'], queryFn: adminApi.listUsers })
  const user = users.find((u) => u.id === id)

  const { data: participation } = useQuery({
    queryKey: ['admin', 'participation', id],
    queryFn: () => adminApi.getAccountParticipation(id),
    enabled: !!id,
  })
  const { data: groups = [] } = useQuery({ queryKey: ['admin', 'groups'], queryFn: adminApi.listGroups })

  const setStatus = useMutation({
    mutationFn: ({ status }: { status: 'active' | 'suspended' }) => adminApi.setUserStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  if (isLoading) return <Skeleton className='h-64 w-full' />

  if (!user) {
    return (
      <div className='card'>
        <EmptyState
          icon={<Flag className='h-10 w-10' />}
          title='Account not found'
          action={<Link to='/admin/users' className='btn btn-secondary btn-sm'>Back to accounts</Link>}
        />
      </div>
    )
  }

  const business = businessNameFor(user.businessId) ?? user.businessName ?? null
  const suspended = user.accountStatus === 'suspended'
  const p = participation
  const groupName = (gid: string) => groups.find((g) => g.id === gid)?.name ?? gid

  const posts = p?.posts ?? []
  const comments = p?.comments ?? []
  const exchanges = p?.exchanges ?? []
  const shares = p?.shares ?? []
  const referrals = p?.referrals ?? []
  const reportsFiled = p?.reportsFiled ?? []
  const reportsAgainst = p?.reportsAgainst ?? []
  const auditEntries = p?.auditEntries ?? []
  const groupPosts = p?.groupPosts ?? []

  const postsByStatus = (status: string) => posts.filter((x) => x.status === status).length
  const commentsRemoved = comments.filter((c) => c.status === 'removed').length

  const distinctGroups = [...new Set(groupPosts.map((gp) => gp.groupId!))]
    .map((gid) => groups.find((g) => g.id === gid))
    .filter((g): g is PublicGroup => !!g)

  return (
    <div className='space-y-4'>
      {/* Account header (§5.5) */}
      <div className='card'>
        <div className='card-content flex flex-wrap items-center gap-3'>
          <Avatar src={user.avatarUrl} name={user.name} size='lg' />
          <div className='min-w-0 flex-1'>
            <Link to='/admin/users' className='mb-1 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline'>
              <ArrowLeft className='h-3.5 w-3.5' /> All accounts
            </Link>
            <p className='flex flex-wrap items-center gap-2 text-base font-bold text-gray-900'>
              {user.name}
              <Badge variant={user.userType === 'business' ? 'primary' : user.userType === 'admin' ? 'warning' : 'neutral'}>
                {user.userType}
              </Badge>
              {suspended && <Badge variant='danger'>Suspended</Badge>}
              {user.isVerified && !suspended && <Badge variant='success'>Verified</Badge>}
            </p>
            <p className='mt-0.5 text-xs text-gray-500'>
              {business ? `${business} · ` : ''}account id {user.id}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Link to='/community' className='text-xs font-medium text-primary-600 hover:underline'>
              View in Community
            </Link>
            {user.userType !== 'admin' && (
              suspended ? (
                <Button
                  size='sm'
                  variant='secondary'
                  icon={<ShieldCheck className='h-4 w-4' />}
                  disabled={!canManage || setStatus.isPending}
                  title={gateManage}
                  onClick={() => setStatus.mutate({ status: 'active' })}
                >
                  Reactivate
                </Button>
              ) : (
                <Button
                  size='sm'
                  variant='ghost'
                  className='text-red-600 hover:bg-red-50'
                  icon={<ShieldOff className='h-4 w-4' />}
                  disabled={!canManage || setStatus.isPending}
                  title={gateManage}
                  onClick={() => {
                    if (window.confirm(`Suspend ${user.name}? They will lose Community access until reactivated.`)) {
                      setStatus.mutate({ status: 'suspended' })
                    }
                  }}
                >
                  Suspend
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Participation summary (§8) — recorded records only */}
      <section className='card' aria-label='Participation summary'>
        <div className='card-header'>
          <h3 className='text-base font-semibold text-gray-900'>Participation</h3>
          <p className='text-xs text-gray-500'>
            Counted from recorded records across Community — nothing here is estimated (§8). Pending moderation or
            attribution states are shown separately, never as outcomes (§17-3).
          </p>
        </div>
        <div className='grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-3 lg:grid-cols-6'>
          <Stat
            label='Posts'
            value={posts.length}
            caption={`${postsByStatus('published')} published · ${postsByStatus('pending')} pending · ${postsByStatus('rejected')} rejected`}
          />
          <Stat label='Comments' value={comments.length} caption={commentsRemoved > 0 ? `${commentsRemoved} removed` : 'all visible'} />
          <Stat label='Exchange items' value={exchanges.length} caption={`${exchanges.filter((e) => e.status === 'active').length} active`} />
          <Stat label='Shares' value={shares.length} caption='clicks: totals only' />
          <Stat
            label='Referrals'
            value={referrals.length}
            caption={`${referrals.filter((r) => r.status === 'pending').length} pending · ${referrals.filter((r) => r.status === 'rejected').length} rejected`}
          />
          <Stat
            label='Reports'
            value={reportsFiled.length}
            caption={`${reportsAgainst.length} on their content`}
          />
        </div>
      </section>

      {/* Group-origin participation (§9) — identification only; membership lives in Groups & Circles */}
      <section className='card' aria-label='Groups'>
        <div className='card-header'>
          <h3 className='text-base font-semibold text-gray-900'>
            <Users className='mr-1 inline h-4 w-4 text-teal-600' />
            Group-origin content
          </h3>
          <p className='text-xs text-gray-500'>
            Posts this account created inside groups (§9). Group membership and join requests are managed in the Groups
            &amp; Circles product — Community only identifies group-origin content.
          </p>
        </div>
        <div className='px-4 py-3'>
          {distinctGroups.length === 0 ? (
            <p className='text-sm text-gray-500'>No group-origin content recorded for this account.</p>
          ) : (
            <ul className='space-y-1.5'>
              {distinctGroups.map((g) => (
                <li key={g.id} className='flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm'>
                  <span className='min-w-0'>
                    <span className='font-medium text-gray-900'>{g.name}</span>
                    <span className='ml-2 text-xs text-gray-500'>
                      {groupPosts.filter((gp) => gp.groupId === g.id).length} post(s) · {g.memberCount ?? '—'} members
                    </span>
                  </span>
                  <Button
                    size='sm'
                    variant='secondary'
                    disabled={!canSeeGroupContext}
                    title={gateGroup}
                    onClick={() => setContextGroup(g)}
                  >
                    Group context
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Posts (§8) */}
      <section className='card' aria-label='Posts'>
        <div className='card-header'>
          <h3 className='text-base font-semibold text-gray-900'>Posts ({posts.length})</h3>
        </div>
        {posts.length === 0 ? (
          <p className='px-4 py-3 text-sm text-gray-500'>No posts recorded.</p>
        ) : (
          <ul className='divide-y divide-gray-100'>
            {posts.map((post) => (
              <li key={post.id} className='flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm'>
                <span className='min-w-0'>
                  <span className='font-medium text-gray-900'>{post.title ?? post.content.slice(0, 60)}</span>
                  <span className='ml-2 text-xs text-gray-500'>{formatDate(post.createdAt)}</span>
                </span>
                <span className='flex flex-wrap items-center gap-2'>
                  <Badge variant={post.status === 'published' ? 'success' : post.status === 'pending' ? 'warning' : 'danger'}>
                    {post.status}
                  </Badge>
                  {post.groupId && <Badge variant='neutral'>group: {groupName(post.groupId)}</Badge>}
                  <Link to={`/community/post/${post.id}`} className='inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline'>
                    Open <ExternalLink className='h-3 w-3' />
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Exchange items (§8) */}
      <section className='card' aria-label='Exchange items'>
        <div className='card-header'>
          <h3 className='text-base font-semibold text-gray-900'>Exchange items ({exchanges.length})</h3>
        </div>
        {exchanges.length === 0 ? (
          <p className='px-4 py-3 text-sm text-gray-500'>No exchange items recorded.</p>
        ) : (
          <ul className='divide-y divide-gray-100'>
            {exchanges.map((ex) => (
              <li key={ex.id} className='flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm'>
                <span className='min-w-0'>
                  <span className='font-medium text-gray-900'>{ex.title}</span>
                  <span className='ml-2 text-xs text-gray-500'>{formatDate(ex.createdAt)}</span>
                </span>
                <span className='flex items-center gap-2'>
                  <Badge variant={ex.status === 'active' ? 'success' : 'neutral'}>{ex.status}</Badge>
                  <Link to={`/community/exchange/${ex.id}`} className='inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline'>
                    Open <ExternalLink className='h-3 w-3' />
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Sharing (§8) — recorded shares for this account */}
      <section className='card' aria-label='Sharing'>
        <div className='card-header flex flex-wrap items-center justify-between gap-2'>
          <div>
            <h3 className='text-base font-semibold text-gray-900'>Sharing ({shares.length})</h3>
            <p className='text-xs text-gray-500'>
              Clicks are totals; unique clicks appear only when the backend supplies them. Pending events are never
              counted as outcomes (§17-3).
            </p>
          </div>
          <Link to='/admin/sharing' className='text-xs font-medium text-primary-600 hover:underline'>
            Full ledger →
          </Link>
        </div>
        {shares.length === 0 ? (
          <p className='px-4 py-3 text-sm text-gray-500'>No shares recorded for this account.</p>
        ) : (
          <ul className='divide-y divide-gray-100'>
            {shares.map((s) => (
              <li key={s.id} className='flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm'>
                <span className='min-w-0'>
                  <span className='font-medium text-gray-900'>
                    {s.campaignTitle ?? s.productTitle ?? s.targetType} {s.targetId ? `(${s.targetId})` : ''}
                  </span>
                  <span className='ml-2 text-xs text-gray-500'>
                    {s.shareType} · {formatDate(s.createdAt)} · code {s.trackingCode}
                  </span>
                </span>
                <span className='flex flex-wrap items-center gap-2 text-xs text-gray-500'>
                  <span>clicks {s.visitCount}</span>
                  <span>
                    registrations{' '}
                    {referrals.filter((r) => r.trackingCode === s.trackingCode && r.status !== 'pending' && r.status !== 'rejected').length}
                    {referrals.filter((r) => r.trackingCode === s.trackingCode && r.status === 'pending').length > 0
                      ? ` (+${referrals.filter((r) => r.trackingCode === s.trackingCode && r.status === 'pending').length} unconfirmed)`
                      : ''}
                  </span>
                  {s.source === 'demo' && <Badge variant='warning'>demo seed</Badge>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reports (§8) */}
      <section className='card' aria-label='Reports'>
        <div className='card-header'>
          <h3 className='text-base font-semibold text-gray-900'>Reports</h3>
          <p className='text-xs text-gray-500'>Reports filed by this account and reports on their content — the same records the queue works (§15).</p>
        </div>
        <div className='grid gap-4 px-4 py-3 lg:grid-cols-2'>
          <div>
            <p className='mb-1.5 text-xs font-semibold text-gray-700'>Filed by this account ({reportsFiled.length})</p>
            {reportsFiled.length === 0 ? (
              <p className='text-sm text-gray-500'>None recorded.</p>
            ) : (
              <ul className='space-y-1.5'>
                {reportsFiled.map((r) => (
                  <li key={r.id} className='rounded-lg bg-gray-50 px-3 py-2 text-sm'>
                    <span className='font-medium text-gray-900'>{r.reasonLabel ?? r.reasonCode}</span>
                    <span className='ml-2 text-xs text-gray-500'>on {r.targetType} {r.targetId} · {formatDate(r.createdAt)}</span>
                    <span className='ml-2'>{badgeFor(r.status)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className='mb-1.5 text-xs font-semibold text-gray-700'>On their content ({reportsAgainst.length})</p>
            {reportsAgainst.length === 0 ? (
              <p className='text-sm text-gray-500'>None recorded.</p>
            ) : (
              <ul className='space-y-1.5'>
                {reportsAgainst.map((r) => (
                  <li key={r.id} className='rounded-lg bg-gray-50 px-3 py-2 text-sm'>
                    <span className='font-medium text-gray-900'>{r.reasonLabel ?? r.reasonCode}</span>
                    <span className='ml-2 text-xs text-gray-500'>on {r.targetType} {r.targetId} · {formatDate(r.createdAt)}</span>
                    <span className='ml-2'>{badgeFor(r.status)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Moderation history (§8, §14) */}
      <section className='card' aria-label='Moderation history'>
        <div className='card-header'>
          <h3 className='text-base font-semibold text-gray-900'>Moderation history ({auditEntries.length})</h3>
          <p className='text-xs text-gray-500'>Audit entries targeting this account's content (§14, immutable).</p>
        </div>
        {auditEntries.length === 0 ? (
          <p className='px-4 py-3 text-sm text-gray-500'>No administrative actions recorded against this account's content.</p>
        ) : (
          <ul className='divide-y divide-gray-100'>
            {auditEntries.map((a) => (
              <li key={a.id} className='px-4 py-2.5 text-sm'>
                <span className='font-medium text-gray-900'>{a.action}</span>
                <span className='ml-2 text-xs text-gray-500'>
                  {a.targetType} {a.targetId} · {a.adminName} · {formatDate(a.at)}
                </span>
                {a.previousStatus || a.resultingStatus ? (
                  <p className='mt-0.5 text-xs text-gray-500'>
                    {a.previousStatus ?? '—'} → {a.resultingStatus ?? '—'}
                    {a.details ? ` · ${a.details}` : ''}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className='text-[11px] text-gray-400'>
        Participation is read from the same stores the other admin screens use (§15); the server owns the
        authoritative history. Group membership records live in the Groups &amp; Circles product (§9).
      </p>

      <GroupContextModal group={contextGroup} onClose={() => setContextGroup(null)} />
    </div>
  )
}

function Stat({ label, value, caption }: { label: string; value: number; caption?: string }) {
  return (
    <div className='rounded-lg bg-gray-50 p-2 text-center'>
      <p className='text-xl font-bold text-gray-900'>{value}</p>
      <p className='text-xs text-gray-500'>{label}</p>
      {caption && <p className='text-[11px] text-gray-400'>{caption}</p>}
    </div>
  )
}

function badgeFor(status: string) {
  if (status === 'resolved') return <Badge variant='success'>resolved</Badge>
  if (status === 'escalated') return <Badge variant='danger'>escalated</Badge>
  return <Badge variant='warning'>{status}</Badge>
}
