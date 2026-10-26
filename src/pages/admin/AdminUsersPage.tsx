import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, ShieldOff, ShieldCheck } from 'lucide-react'
import { adminApi, businessNameFor } from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth.store'
import { canAdmin } from '@/lib/permissions'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'

/**
 * Users & Access (spec §5.5): searchable account list with identity, account
 * type, business association, status and moderation controls. Suspension is
 * an audited admin action; real enforcement sits with the server — a hidden
 * menu or disabled button is not a security boundary.
 */
export function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const me = useAuthStore((s) => s.user)
  // Status controls are gated by the manage_users action (§14); the server
  // enforces the same rule (§5.5).
  const canManage = canAdmin(me, 'manage_users')

  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin', 'users'], queryFn: adminApi.listUsers })
  const { data: posts = [] } = useQuery({ queryKey: ['admin', 'posts'], queryFn: adminApi.listPosts })

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' }) => adminApi.setUserStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.userType.includes(q) ||
        (u.businessName ?? '').toLowerCase().includes(q) ||
        (businessNameFor(u.businessId) ?? '').toLowerCase().includes(q),
    )
  }, [users, query])

  const postCountFor = (id: string) => posts.filter((p) => p.authorId === id).length

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-gray-900'>Users & Access</h2>
        <p className='text-sm text-gray-600'>Accounts, roles and restrictions. Enforcement is server-side.</p>
      </div>

      <div className='relative'>
        <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
        <input
          type='search'
          className='input-field pl-9'
          placeholder='Search by name, account type or business…'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label='Search users'
        />
      </div>

      {isLoading ? (
        <Skeleton className='h-40 w-full' />
      ) : visible.length === 0 ? (
        <div className='card'>
          <EmptyState title='No matching accounts' description='Try a different search.' />
        </div>
      ) : (
        <div className='space-y-3'>
          {visible.map((user) => {
            const suspended = user.accountStatus === 'suspended'
            const business = businessNameFor(user.businessId) ?? user.businessName ?? null
            return (
              <div key={user.id} className='card'>
                <div className='card-content flex flex-wrap items-center gap-3'>
                  <Avatar src={user.avatarUrl} name={user.name} size='md' />
                  <div className='min-w-0 flex-1'>
                    <p className='flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900'>
                      {user.name}
                      <Badge variant={user.userType === 'business' ? 'primary' : user.userType === 'admin' ? 'warning' : 'neutral'}>
                        {user.userType}
                      </Badge>
                      {suspended && <Badge variant='danger'>Suspended</Badge>}
                      {user.isVerified && !suspended && <Badge variant='success'>Verified</Badge>}
                    </p>
                    <p className='mt-0.5 text-xs text-gray-500'>
                      {business ? `${business} · ` : ''}
                      {postCountFor(user.id)} post(s) in the demo store
                    </p>
                  </div>
                  {user.userType !== 'admin' && canManage && (
                    suspended ? (
                      <Button
                        size='sm'
                        variant='secondary'
                        icon={<ShieldCheck className='h-4 w-4' />}
                        onClick={() => setStatus.mutate({ id: user.id, status: 'active' })}
                        disabled={setStatus.isPending}
                      >
                        Reactivate
                      </Button>
                    ) : (
                      <Button
                        size='sm'
                        variant='ghost'
                        className='text-red-600 hover:bg-red-50'
                        icon={<ShieldOff className='h-4 w-4' />}
                        onClick={() => {
                          if (window.confirm(`Suspend ${user.name}? They will lose Community access until reactivated.`)) {
                            setStatus.mutate({ id: user.id, status: 'suspended' })
                          }
                        }}
                        disabled={setStatus.isPending}
                      >
                        Suspend
                      </Button>
                    )
                  )}
                  <Link
                    to={`/admin/users/${user.id}`}
                    className='btn btn-secondary btn-sm'
                    aria-label={`View participation for ${user.name}`}
                  >
                    Participation
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
