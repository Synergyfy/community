import { Link, useLocation } from 'react-router-dom'
import { Bell, Megaphone, MessageSquare, Repeat, Trash2, UserPlus, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useAuthStore } from '@/stores/auth.store'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/format'

const ICONS: Record<string, ReactNode> = {
  comment: <MessageSquare className='h-4 w-4' />,
  follow: <UserPlus className='h-4 w-4' />,
  group: <Users className='h-4 w-4' />,
  exchange: <Repeat className='h-4 w-4' />,
  campaign: <Megaphone className='h-4 w-4' />,
  system: <Bell className='h-4 w-4' />,
}

export function NotificationsPage() {
  const location = useLocation()
  const { authStatus } = useAuthStore()
  const items = useNotificationsStore((s) => s.items)
  const markRead = useNotificationsStore((s) => s.markRead)
  const markAllRead = useNotificationsStore((s) => s.markAllRead)
  const clear = useNotificationsStore((s) => s.clear)

  const unreadCount = items.filter((n) => !n.read).length

  if (authStatus !== 'authenticated') {
    return (
      <div className='container-page max-w-2xl py-3 sm:py-4'>
        <EmptyState
          icon={<Bell className='h-10 w-10' />}
          title='Sign in to see your activity'
          description='Notifications, replies and invitations will appear here.'
          action={
            <Link to='/auth/login' state={{ from: location }} className='btn-primary'>
              Sign in
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className='container-page max-w-2xl space-y-4 py-3 sm:py-4'>
      <div className='flex items-start justify-between gap-3'>
        <header className='space-y-1'>
          <h1 className='flex items-center gap-2 text-xl font-bold text-gray-900'>
            <Bell className='h-5 w-5 text-primary-600' /> Notifications
          </h1>
          <p className='text-sm text-gray-600'>
            {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up.'}
          </p>
        </header>
        {items.length > 0 && (
          <div className='flex items-center gap-2'>
            <button onClick={markAllRead} className='text-sm font-medium text-primary-700 hover:underline'>
              Mark all read
            </button>
            <button onClick={clear} className='btn-icon text-gray-400 hover:text-red-600' aria-label='Clear all'>
              <Trash2 className='h-4 w-4' />
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Bell className='h-10 w-10' />}
          title='No notifications'
          description='Comments, follows and group updates will show up here.'
        />
      ) : (
        <div className='space-y-2'>
          {items.map((n) => (
            <Link
              key={n.id}
              to={n.link || '/community'}
              onClick={() => markRead(n.id)}
              className={cn(
                'card flex items-start gap-3 p-3 transition hover:shadow-md',
                !n.read && 'border-primary-200 bg-primary-50/40',
              )}
            >
              <span className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600'>
                {ICONS[n.type] ?? <Bell className='h-4 w-4' />}
              </span>
              <div className='min-w-0 flex-1'>
                <p className='text-sm font-medium text-gray-900'>{n.title}</p>
                {n.body && <p className='mt-0.5 text-xs text-gray-600'>{n.body}</p>}
                <p className='mt-1 text-xs text-gray-400'>{timeAgo(n.createdAt)}</p>
              </div>
              {!n.read && <span className='mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-600' aria-label='Unread' />}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
