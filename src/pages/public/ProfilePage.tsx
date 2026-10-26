import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Bookmark,
  Briefcase,
  ChevronRight,
  Flag,
  LifeBuoy,
  LogOut,
  MapPin,
  MessageSquarePlus,
  Settings,
  Share2,
  ShieldCheck,
  UserCircle,
  Activity as ActivityIcon,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useCommunityLocation } from '@/hooks/useCommunityLocation'
import { OPEN_COMPOSER_EVENT } from '@/lib/constants'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ReactNode } from 'react'

/**
 * Shared Profile destination (spec §2.2: "User profile, settings and account
 * options"). Secondary features live here rather than in the bottom nav.
 * Business-only tools are permission-aware (spec §2.1) — consumers never
 * see them.
 */
export function ProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, authStatus, logout } = useAuthStore()
  const communityLocation = useCommunityLocation()

  const isBusiness = user?.userType === 'business'

  const openComposer = () => {
    if (window.location.pathname !== '/community') navigate('/community')
    setTimeout(() => window.dispatchEvent(new Event(OPEN_COMPOSER_EVENT)), 60)
  }

  const handleSignOut = () => {
    logout()
    navigate('/community')
  }

  if (authStatus !== 'authenticated' || !user) {
    return (
      <div className='container-page max-w-2xl py-3 sm:py-4'>
        <EmptyState
          icon={<UserCircle className='h-10 w-10' />}
          title='Sign in to see your profile'
          description='Your profile, activity and account options live here.'
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
      <header className='card flex items-center gap-3 p-4'>
        <Avatar src={user.avatarUrl} name={user.name} size='lg' />
        <div className='min-w-0 flex-1'>
          <p className='flex items-center gap-1.5 truncate text-base font-bold text-gray-900'>
            {user.name}
            {user.isVerified && <span className='text-primary-600' aria-label='Verified'>✓</span>}
          </p>
          <p className='text-sm capitalize text-gray-500'>{user.userType} account</p>
          {communityLocation?.cityName && (
            <p className='mt-0.5 flex items-center gap-1 text-xs text-gray-500'>
              <MapPin className='h-3 w-3' /> {communityLocation.cityName}
            </p>
          )}
        </div>
      </header>

      <section className='card overflow-hidden' aria-label='Create and activity'>
        <MenuRow icon={<MessageSquarePlus className='h-4 w-4' />} label='Create a post' onClick={openComposer} />
        <MenuRow
          icon={<ActivityIcon className='h-4 w-4' />}
          label='My activity'
          description='Everything you have posted'
          to='/community/activity'
        />
        <MenuRow icon={<Bookmark className='h-4 w-4' />} label='Saved' to='/community/saved' />
        <MenuRow icon={<Bell className='h-4 w-4' />} label='Notifications' to='/community/notifications' />
      </section>

      <section className='card overflow-hidden' aria-label='Campaigns and sharing'>
        <p className='px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400'>Campaigns</p>
        <MenuRow icon={<Flag className='h-4 w-4' />} label='My Campaigns' description='Campaigns you follow and share' to='/community/my-campaigns' />
        <MenuRow icon={<Share2 className='h-4 w-4' />} label='My Sharing' description='Links you shared and their results' to='/community/sharing' />
        <MenuRow icon={<Flag className='h-4 w-4' />} label='Discover campaigns' to='/community/campaigns' />
      </section>

      {isBusiness && (
        <section className='card overflow-hidden' aria-label='Business tools'>
          <p className='px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400'>Business</p>
          <MenuRow icon={<Briefcase className='h-4 w-4' />} label='Business dashboard' to='/business/dashboard' />
          <MenuRow icon={<Settings className='h-4 w-4' />} label='Business settings' to='/business/settings' />
        </section>
      )}

      {user.userType === 'admin' && (
        <section className='card overflow-hidden' aria-label='Admin tools'>
          <p className='px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400'>Administration</p>
          <MenuRow icon={<ShieldCheck className='h-4 w-4' />} label='Admin dashboard' description='Moderation, users, attribution' to='/admin' />
        </section>
      )}

      <section className='card overflow-hidden' aria-label='Support'>
        <MenuRow icon={<LifeBuoy className='h-4 w-4' />} label='Help & Support' description='Report a problem or get answers' to='/community/help' />
        <button
          onClick={handleSignOut}
          className='flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-600 transition hover:bg-red-50'
        >
          <LogOut className='h-4 w-4 shrink-0' />
          <span className='flex-1'>Sign out</span>
        </button>
      </section>
    </div>
  )
}

function MenuRow({
  icon,
  label,
  description,
  to,
  onClick,
}: {
  icon: ReactNode
  label: string
  description?: string
  to?: string
  onClick?: () => void
}) {
  const content = (
    <>
      <span className='mt-0.5 text-gray-500'>{icon}</span>
      <span className='min-w-0 flex-1'>
        <span className='block text-sm font-medium text-gray-900'>{label}</span>
        {description && <span className='block text-xs text-gray-500'>{description}</span>}
      </span>
      <ChevronRight className='h-4 w-4 shrink-0 text-gray-400' />
    </>
  )

  if (to) {
    return (
      <Link to={to} className='flex items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50'>
        {content}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className='flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50'>
      {content}
    </button>
  )
}
