import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { FileText, Flag, Home, LayoutDashboard, Lock, Menu, Megaphone, Repeat, ScrollText, X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { managersService } from '@/services/managers.service'
import { homeForUser } from '@/components/auth/ProtectedRoute'
import type { ManagerPermissions } from '@/types/community-public'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'

interface ManagerNavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
}

/**
 * Route → required permission. The nav only lists sections the appointment
 * grants, but a deep link (or a stale bookmark) can still land on one it does
 * not — that gets the denied panel below, never a page behind a hidden button.
 * (§2.5b: permissions decide, not the route.)
 */
const ROUTE_PERMISSIONS: Record<string, { key: keyof ManagerPermissions; label: string }> = {
  '/manager/content': { key: 'viewReviewContent', label: 'Content review' },
  '/manager/reports': { key: 'moderateReports', label: 'Reports moderation' },
  '/manager/exchange': { key: 'moderateExchange', label: '#Exchange moderation' },
  '/manager/announcements': { key: 'publishAnnouncements', label: 'Announcements publishing' },
}

/**
 * Community Manager Dashboard shell (Community Hub Manager spec §8): a
 * dedicated area at `/manager`, separate from the Admin dashboard. Sections
 * are filtered by the manager's own permissions — a manager only sees the
 * pages they are authorised for. The sections read the SAME stores as the
 * admin pages (one set of records), and every action goes through the same
 * audited service methods.
 *
 * The staff role overlays the person's CHS account: a link back to their
 * membership home (business dashboard or community) is always available.
 */
export function ManagerLayout() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  const record = managersService.getAnyForUser(user?.id)

  if (!record) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='mx-auto max-w-md px-4 py-16 text-center'>
          <div className='card'>
            <div className='card-content space-y-3'>
              <h1 className='text-lg font-bold text-gray-900'>Not a Community Manager</h1>
              <p className='text-sm text-gray-600'>
                This dashboard is for appointed Community Hub Managers. If you believe you should have a manager role,
                ask a central Admin to appoint you.
              </p>
              <Link to={homeForUser(user?.userType, user?.id)} className='btn btn-primary btn-sm'>
                Back to my dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (record.status !== 'active') {
    const notice =
      record.status === 'invited'
        ? 'Your manager invitation is pending — activate it through CHS sign-up, or contact the central Admin.'
        : record.status === 'suspended'
          ? 'Your Community Hub Manager access is currently suspended. Contact the central Admin.'
          : 'Your Community Hub Manager role has been removed. Your CHS account is unaffected.'
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='mx-auto max-w-md px-4 py-16 text-center'>
          <div className='card'>
            <div className='card-content space-y-3'>
              <h1 className='text-lg font-bold text-gray-900'>Manager access {record.status}</h1>
              <p className='text-sm text-gray-600'>{notice}</p>
              <Link to={homeForUser(user?.userType, user?.id)} className='btn btn-primary btn-sm'>
                Back to my dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const items: ManagerNavItem[] = [{ to: '/manager', label: 'Overview', icon: LayoutDashboard, end: true }]
  if (record.permissions.viewReviewContent) items.push({ to: '/manager/content', label: 'Content', icon: Megaphone })
  if (record.permissions.moderateReports) items.push({ to: '/manager/reports', label: 'Reports', icon: FileText })
  if (record.permissions.moderateExchange) items.push({ to: '/manager/exchange', label: '#Exchange', icon: Repeat })
  if (record.permissions.publishAnnouncements) items.push({ to: '/manager/announcements', label: 'Announcements', icon: Flag })
  items.push({ to: '/manager/appointment', label: 'My appointment', icon: ScrollText })

  // Deep links bypass the filtered nav — a section the appointment does not
  // grant shows the denied panel instead of the page (§2.5b).
  const denied = ROUTE_PERMISSIONS[location.pathname]
  const sectionAllowed = !denied || record.permissions[denied.key]

  const primaryMobile = items.slice(0, 3)
  const moreItems = items.slice(3)
  const moreActive = moreItems.some((item) => location.pathname === item.to)

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn('flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px]', isActive ? 'text-primary-600' : 'text-gray-500')

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='mx-auto flex min-h-screen'>
        {/* Desktop side menu */}
        <aside className='sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white md:flex'>
          <div className='border-b border-gray-100 px-5 py-4'>
            <Link to='/manager' className='text-base font-bold text-gray-900'>
              Community Manager
            </Link>
            <p className='mt-0.5 text-xs text-gray-500'>{record.name} · staff dashboard</p>
          </div>
          <nav className='flex-1 overflow-y-auto px-3 py-4' aria-label='Manager sections'>
            <ul className='space-y-0.5'>
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                        isActive ? 'bg-primary-50 font-semibold text-primary-700' : 'text-gray-700 hover:bg-gray-50',
                      )
                    }
                  >
                    <item.icon className='h-4 w-4 shrink-0' />
                    <span className='flex-1 truncate'>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className='space-y-2 border-t border-gray-100 px-3 py-3 text-xs text-gray-500'>
            <p>Staff role — not a membership. Your CHS account and memberships are unchanged.</p>
            <Link
              to={homeForUser(user?.userType, user?.id)}
              className='flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-primary-600 hover:bg-primary-50'
            >
              <Home className='h-4 w-4' /> My CHS home
            </Link>
          </div>
        </aside>

        <div className='min-w-0 flex-1'>
          {/* Mobile header */}
          <div className='border-b border-gray-200 bg-white md:hidden'>
            <div className='flex items-center justify-between gap-2 px-4 py-3'>
              <div className='min-w-0'>
                <h1 className='truncate text-base font-bold text-gray-900'>Community Manager</h1>
                <p className='truncate text-xs text-gray-500'>{record.name} · staff dashboard</p>
              </div>
              <Badge variant='success'>active</Badge>
            </div>
          </div>

          <main className='container-page space-y-6 py-6 pb-24 md:pb-6'>
            {sectionAllowed ? (
              <Outlet />
            ) : (
              /* Mirror of the Admin shell's SectionDenied — appointment
                 permissions are granted by an Admin, not self-editable, so
                 there is no "restore" button here. */
              <div className='card mx-auto max-w-lg p-8 text-center'>
                <Lock className='mx-auto h-10 w-10 text-gray-300' />
                <h2 className='mt-3 text-lg font-semibold text-gray-900'>You don't have access to this section</h2>
                <p className='mt-1 text-sm text-gray-600'>
                  {denied?.label} requires the <span className='font-medium'>{denied?.key}</span> permission on your
                  manager appointment, which it does not currently grant. Ask a Community Admin to update your
                  appointment. Your CHS account is unaffected.
                </p>
                <div className='mt-4 flex justify-center gap-2'>
                  <Link to='/manager' className='btn btn-secondary btn-sm'>
                    Back to Overview
                  </Link>
                  <Link to='/manager/appointment' className='btn btn-secondary btn-sm'>
                    My appointment
                  </Link>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className='fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white md:hidden' aria-label='Manager sections'>
        <div className='flex'>
          {primaryMobile.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={mobileLinkClass}>
              <item.icon className='h-5 w-5' />
              <span>{item.label}</span>
            </NavLink>
          ))}
          {moreItems.length > 0 && (
            <button
              onClick={() => setMoreOpen(true)}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px]',
                moreActive ? 'text-primary-600' : 'text-gray-500',
              )}
              aria-expanded={moreOpen}
            >
              <Menu className='h-5 w-5' />
              <span>More</span>
            </button>
          )}
        </div>
      </nav>

      {moreOpen && (
        <>
          <div className='fixed inset-0 z-30 bg-black/40 md:hidden' onClick={() => setMoreOpen(false)} />
          <div
            className='fixed inset-x-0 bottom-0 z-40 rounded-t-2xl bg-white pb-24 pt-3 md:hidden'
            role='dialog'
            aria-label='All manager sections'
          >
            <div className='mb-1 flex items-center justify-between px-4'>
              <p className='text-sm font-semibold text-gray-900'>All sections</p>
              <button onClick={() => setMoreOpen(false)} className='btn-icon text-gray-500' aria-label='Close'>
                <X className='h-5 w-5' />
              </button>
            </div>
            <ul className='max-h-[60vh] space-y-0.5 overflow-y-auto px-2'>
              {moreItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-4 py-3 text-sm',
                        isActive ? 'bg-primary-50 font-semibold text-primary-700' : 'text-gray-700 hover:bg-gray-50',
                      )
                    }
                  >
                    <item.icon className='h-4 w-4' />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
              <li>
                <Link
                  to={homeForUser(user?.userType, user?.id)}
                  onClick={() => setMoreOpen(false)}
                  className='flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50'
                >
                  <Home className='h-4 w-4' /> My CHS home
                </Link>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
