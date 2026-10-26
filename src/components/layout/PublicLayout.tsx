import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Bookmark, Compass, Home, LogOut, Repeat, Search, User } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { cn } from '@/lib/utils'
import { SkipToContent } from '@/components/ui/SkipToContent'
import { Avatar } from '@/components/ui/Avatar'

/**
 * Shared front-facing navigation (spec §2.2): compact mobile bottom nav with
 * exactly five primary destinations — Home, Discover, #Exchange, Activity,
 * Profile. Secondary features live inside their screens (composer on the
 * feed and profile). Permission-aware: guests are handed to CHS sign-in and
 * returned to the action they attempted (spec §2.1); business accounts get
 * their dashboard as Profile, consumers get the profile screen.
 */
export function PublicLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, authStatus, logout } = useAuthStore()
  const unread = useNotificationsStore((s) => s.items.filter((n) => !n.read).length)
  const [menuOpen, setMenuOpen] = useState(false)

  const isAuthenticated = authStatus === 'authenticated' && !!user
  const isBusiness = user?.userType === 'business'

  /** Sign-in handoff: after authentication the user lands on the tab they tapped. */
  const openSignIn = (target: string) => {
    navigate('/auth/login', { state: { from: { pathname: target } } })
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

  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-lg px-3 py-1.5 text-sm font-medium transition',
      isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50',
    )

  const guestButtonClass =
    'flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] text-gray-500'

  const activityTo = '/community/notifications'
  const profileTo = isBusiness ? '/business/dashboard' : '/community/profile'

  return (
    <div className='min-h-screen bg-gray-50'>
      <SkipToContent />

      <header className='sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur'>
        <div className='container-page flex h-14 items-center justify-between gap-2'>
          <div className='flex min-w-0 items-center gap-2 sm:gap-3'>
            <Link to='/community' className='text-base font-bold text-gray-900'>
              CHS
            </Link>
            {/* Desktop primary nav — the bottom nav is mobile-only */}
            <nav className='hidden items-center gap-1 md:flex' aria-label='Primary'>
              <NavLink to='/community' end className={desktopLinkClass}>
                Home
              </NavLink>
              <NavLink to='/community/discover' className={desktopLinkClass}>
                Discover
              </NavLink>
              <NavLink to='/community/discover/exchanges' className={desktopLinkClass}>
                #Exchange
              </NavLink>
              <NavLink to={activityTo} className={desktopLinkClass}>
                Activity
              </NavLink>
            </nav>
          </div>

          <div className='flex items-center gap-1'>
            <button onClick={() => navigate('/community/discover/search')} className='btn-icon text-gray-600' aria-label='Search'>
              <Search className='h-5 w-5' />
            </button>

            <Link to='/community/notifications' className='btn-icon relative text-gray-600' aria-label='Notifications'>
              <Bell className='h-5 w-5' />
              {/* Only a signed-in account has its own notifications — no counts on guest surfaces. */}
              {isAuthenticated && unread > 0 && (
                <span className='absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white'>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className='relative'>
                <button onClick={() => setMenuOpen((o) => !o)} className='ml-1' aria-label='Account menu'>
                  <Avatar src={user!.avatarUrl} name={user!.name} size='sm' />
                </button>
                {menuOpen && (
                  <>
                    <div className='fixed inset-0 z-20' onClick={() => setMenuOpen(false)} />
                    <div className='absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg'>
                      <div className='border-b border-gray-100 px-3 py-2'>
                        <p className='truncate text-sm font-semibold text-gray-900'>{user!.name}</p>
                        <p className='truncate text-xs capitalize text-gray-500'>{user!.userType}</p>
                      </div>
                      <Link
                        to={profileTo}
                        onClick={() => setMenuOpen(false)}
                        className='flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50'
                      >
                        <User className='h-4 w-4' /> Profile
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
              <Link to='/auth/login' state={{ from: location }} className='btn-primary btn-sm ml-1'>
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
          <NavLink to='/community/discover/exchanges' className={navLinkClass}>
            <Repeat className='h-5 w-5' />
            <span>#Exchange</span>
          </NavLink>
          {isAuthenticated ? (
            <NavLink to={activityTo} className={navLinkClass}>
              <span className='relative'>
                <Bell className='h-5 w-5' />
                {unread > 0 && (
                  <span className='absolute -right-1.5 -top-1 flex h-3 min-w-3 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-semibold text-white'>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </span>
              <span>Activity</span>
            </NavLink>
          ) : (
            <button onClick={() => openSignIn(activityTo)} className={guestButtonClass}>
              <Bell className='h-5 w-5' />
              <span>Activity</span>
            </button>
          )}
          {isAuthenticated ? (
            <NavLink to={profileTo} className={navLinkClass}>
              <User className='h-5 w-5' />
              <span>Profile</span>
            </NavLink>
          ) : (
            <button onClick={() => openSignIn(profileTo)} className={guestButtonClass}>
              <User className='h-5 w-5' />
              <span>Profile</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  )
}
