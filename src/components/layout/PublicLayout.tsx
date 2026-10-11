import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, Bookmark, Compass, Home, LogOut, Plus, Repeat, Search, User } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { OPEN_COMPOSER_EVENT } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { SkipToContent } from '@/components/ui/SkipToContent'
import { Avatar } from '@/components/ui/Avatar'
import { CommunityContextBadge } from '@/components/location/CommunityContextBadge'

export function PublicLayout() {
  const navigate = useNavigate()
  const { user, authStatus, logout } = useAuthStore()
  const unread = useNotificationsStore((s) => s.items.filter((n) => !n.read).length)
  const [menuOpen, setMenuOpen] = useState(false)

  const openComposer = () => {
    if (window.location.pathname !== '/community') navigate('/community')
    setTimeout(() => window.dispatchEvent(new Event(OPEN_COMPOSER_EVENT)), 60)
  }

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/community')
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px]',
      isActive ? 'text-primary-600' : 'text-gray-500',
    )

  return (
    <div className='min-h-screen bg-gray-50'>
      <SkipToContent />

      <header className='sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur'>
        <div className='container-page flex h-14 items-center justify-between gap-2'>
          <div className='flex min-w-0 items-center gap-2 sm:gap-3'>
            <Link to='/community' className='text-base font-bold text-gray-900'>
              Community
            </Link>
            <CommunityContextBadge />
          </div>

          <div className='flex items-center gap-1'>
            <button onClick={() => navigate('/community/discover/search')} className='btn-icon text-gray-600' aria-label='Search'>
              <Search className='h-5 w-5' />
            </button>

            <Link to='/community/notifications' className='btn-icon relative text-gray-600' aria-label='Notifications'>
              <Bell className='h-5 w-5' />
              {unread > 0 && (
                <span className='absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white'>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>

            {user && authStatus === 'authenticated' ? (
              <div className='relative'>
                <button onClick={() => setMenuOpen((o) => !o)} className='ml-1' aria-label='Account menu'>
                  <Avatar src={user.avatarUrl} name={user.name} size='sm' />
                </button>
                {menuOpen && (
                  <>
                    <div className='fixed inset-0 z-20' onClick={() => setMenuOpen(false)} />
                    <div className='absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg'>
                      <div className='border-b border-gray-100 px-3 py-2'>
                        <p className='truncate text-sm font-semibold text-gray-900'>{user.name}</p>
                        <p className='truncate text-xs capitalize text-gray-500'>{user.userType}</p>
                      </div>
                      <Link
                        to='/community/activity'
                        onClick={() => setMenuOpen(false)}
                        className='flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50'
                      >
                        <User className='h-4 w-4' /> Your activity
                      </Link>
                      <Link
                        to='/community/saved'
                        onClick={() => setMenuOpen(false)}
                        className='flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50'
                      >
                        <Bookmark className='h-4 w-4' /> Saved
                      </Link>
                      <button
                        onClick={handleLogout}
                        className='flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50'
                      >
                        <LogOut className='h-4 w-4' /> Log out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link to='/auth/login' className='btn-primary btn-sm ml-1'>
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main id='main' className='pb-20'>
        <Outlet />
      </main>

      <nav className='fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white md:hidden'>
        <div className='mx-auto flex max-w-2xl items-stretch justify-around'>
          <NavLink to='/community' end className={navLinkClass}>
            <Home className='h-5 w-5' />
            <span>Home</span>
          </NavLink>
          <NavLink to='/community/discover' className={navLinkClass}>
            <Compass className='h-5 w-5' />
            <span>Discover</span>
          </NavLink>
          <button onClick={openComposer} className='flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] text-gray-500'>
            <Plus className='h-5 w-5 rounded-full bg-primary-600 p-0.5 text-white' />
            <span>Create</span>
          </button>
          <NavLink to='/community/discover/exchanges' className={navLinkClass}>
            <Repeat className='h-5 w-5' />
            <span>Exchange</span>
          </NavLink>
          {user && authStatus === 'authenticated' ? (
            <NavLink to='/community/activity' className={navLinkClass}>
              <User className='h-5 w-5' />
              <span>Activity</span>
            </NavLink>
          ) : (
            <NavLink to='/auth/login' className={navLinkClass}>
              <User className='h-5 w-5' />
              <span>Sign in</span>
            </NavLink>
          )}
        </div>
      </nav>
    </div>
  )
}

