import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart2,
  CreditCard,
  FileText,
  Flag,
  Gift,
  LayoutDashboard,
  Lock,
  Menu,
  Megaphone,
  PieChart,
  Radio,
  Repeat,
  ScrollText,
  Settings,
  ShieldAlert,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { adminApi } from '@/services/admin.service'
import { ADMIN_ACTIONS, canAdmin, type AdminAction } from '@/lib/permissions'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const NAV_ITEMS: Array<{ to: string; label: string; icon: typeof LayoutDashboard; end?: boolean; action: AdminAction }> = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true, action: 'view_audit' },
  { to: '/admin/content', label: 'Content', icon: Megaphone, action: 'moderate_content' },
  { to: '/admin/moderation', label: 'Moderation', icon: ShieldAlert, action: 'moderate_content' },
  { to: '/admin/reports', label: 'Reports', icon: FileText, action: 'manage_reports' },
  { to: '/admin/announcements', label: 'Announcements', icon: Radio, action: 'manage_announcements' },
  { to: '/admin/exchange', label: '#Exchange', icon: Repeat, action: 'manage_exchange' },
  { to: '/admin/users', label: 'Users & Access', icon: Users, action: 'manage_users' },
  { to: '/admin/campaigns', label: 'Campaigns', icon: Flag, action: 'configure_campaigns' },
  { to: '/admin/managers', label: 'Community Managers', icon: UserCog, action: 'manage_managers' },
  { to: '/admin/sharing', label: 'Sharing & Attribution', icon: BarChart2, action: 'view_attribution' },
  { to: '/admin/rewards', label: 'Rewards & Notifications', icon: Gift, action: 'manage_rewards' },
  { to: '/admin/analytics', label: 'Analytics & Reporting', icon: PieChart, action: 'view_analytics' },
  { to: '/admin/config', label: 'Configuration', icon: Settings, action: 'configure_platform' },
  { to: '/admin/membership', label: 'Membership & Access', icon: CreditCard, action: 'configure_membership' },
  { to: '/admin/audit', label: 'Audit Log', icon: ScrollText, action: 'view_audit' },
]

/** Sections that get a mobile bottom-nav slot; the rest live behind "More". */
const MOBILE_PRIMARY = new Set(['/admin', '/admin/moderation', '/admin/reports', '/admin/exchange'])

/**
 * Admin control-centre shell (spec §5, §8):
 * - Desktop (md+): persistent left side menu with every permitted section.
 * - Mobile: slim header + fixed bottom nav (Overview, Moderation, Reports,
 *   #Exchange, More) — the More sheet lists all remaining sections plus
 *   View Community, mirroring the member bottom-nav pattern (§2.2).
 * Sections are filtered through the admin action matrix (§14, §17-6 pending
 * role assignments); access is guarded by ProtectedRoute, and the server
 * remains the authority (§5.5).
 */
export function AdminLayout() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const [grantsBump, setGrantsBump] = useState(0)
  const adminName = user?.name || 'Administrator'
  const visibleItems = NAV_ITEMS.filter((item) => canAdmin(user, item.action))

  // Section-level denial (§14, §17-6): a deep link resolves to its nav
  // item's action (detail routes inherit their list's); without the grant the
  // section renders a denied panel instead of the page. grantsBump keeps the
  // panel's "restore defaults" re-rendering without a reload.
  const matchedItem = NAV_ITEMS.filter(
    (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  ).sort((a, b) => b.to.length - a.to.length)[0]
  const requiredAction: AdminAction | undefined = matchedItem?.action
  const sectionAllowed = !requiredAction || canAdmin(user, requiredAction)
  const requiredInfo = requiredAction ? ADMIN_ACTIONS.find((a) => a.id === requiredAction) : undefined

  // Role grants are edited on Configuration; re-render the shell when they
  // change so nav and section access reflect the matrix immediately (§14).
  useEffect(() => {
    const bump = () => setGrantsBump((n) => n + 1)
    window.addEventListener('community-role-grants-changed', bump)
    return () => window.removeEventListener('community-role-grants-changed', bump)
  }, [])

  const primaryMobile = visibleItems.filter((item) => MOBILE_PRIMARY.has(item.to))
  const moreItems = visibleItems.filter((item) => !MOBILE_PRIMARY.has(item.to))
  const moreActive =
    moreItems.some((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)) &&
    !primaryMobile.some((item) => location.pathname === item.to)

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px]',
      isActive ? 'text-primary-600' : 'text-gray-500',
    )

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='mx-auto flex min-h-screen'>
        {/* Desktop side menu */}
        <aside className='sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white md:flex'>
          <div className='border-b border-gray-100 px-5 py-4'>
            <Link to='/admin' className='text-base font-bold text-gray-900'>
              CHS Admin
            </Link>
            <p className='mt-0.5 text-xs text-gray-500'>{adminName} · Community control centre</p>
          </div>
          <nav className='flex-1 overflow-y-auto px-3 py-4' aria-label='Admin sections'>
            <ul className='space-y-0.5'>
              {visibleItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                        isActive
                          ? 'bg-primary-50 font-semibold text-primary-700'
                          : 'text-gray-700 hover:bg-gray-50',
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
          <div className='border-t border-gray-100 px-3 py-3'>
            <Link
              to='/community'
              className='flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50'
            >
              View Community
            </Link>
          </div>
        </aside>

        <div className='min-w-0 flex-1'>
          {/* Mobile header */}
          <div className='border-b border-gray-200 bg-white md:hidden'>
            <div className='flex items-center justify-between gap-2 px-4 py-3'>
              <div className='min-w-0'>
                <h1 className='truncate text-base font-bold text-gray-900'>Admin dashboard</h1>
                <p className='truncate text-xs text-gray-500'>{adminName} · Community control centre</p>
              </div>
              <Link to='/community' className='shrink-0 text-sm font-medium text-primary-600 hover:underline'>
                View Community
              </Link>
            </div>
          </div>

          <main className='container-page space-y-6 py-6 pb-24 md:pb-6'>
            {sectionAllowed ? (
              <Outlet />
            ) : (
              <SectionDenied
                key={grantsBump}
                label={requiredInfo?.label ?? 'this section'}
                permissionLabel={requiredInfo?.label ?? requiredAction ?? ''}
                onRestored={() => setGrantsBump((n) => n + 1)}
              />
            )}
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className='fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white md:hidden'
        aria-label='Admin sections'
      >
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

      {/* Mobile More sheet — every remaining section + View Community */}
      {moreOpen && (
        <>
          <div className='fixed inset-0 z-30 bg-black/40 md:hidden' onClick={() => setMoreOpen(false)} />
          <div
            className='fixed inset-x-0 bottom-0 z-40 rounded-t-2xl bg-white pb-24 pt-3 md:hidden'
            role='dialog'
            aria-label='All admin sections'
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
                    <item.icon className='h-4 w-4 shrink-0' />
                    <span className='flex-1'>{item.label}</span>
                  </NavLink>
                </li>
              ))}
              <li>
                <Link
                  to='/community'
                  onClick={() => setMoreOpen(false)}
                  className='flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50'
                >
                  View Community
                </Link>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Section-level denial (§14, §17-6): the section stays closed when the
 * signed-in admin's grants don't cover it — honest about which permission is
 * missing and why — and the seeded defaults can be restored from here, so a
 * matrix edit can never lock administrators out of the whole dashboard.
 */
function SectionDenied({
  label,
  permissionLabel,
  onRestored,
}: {
  label: string
  permissionLabel: string
  onRestored: () => void
}) {
  const [restoring, setRestoring] = useState(false)
  return (
    <div className='card mx-auto max-w-lg p-8 text-center'>
      <Lock className='mx-auto h-10 w-10 text-gray-300' />
      <h2 className='mt-3 text-lg font-semibold text-gray-900'>You don't have access to this section</h2>
      <p className='mt-1 text-sm text-gray-600'>
        {label} requires the <span className='font-medium'>{permissionLabel}</span> permission, which your account
        doesn't hold. Administrative role assignments are an open product decision (§17-6) — grants live in Community
        Configuration, and the server remains the authority (§5.5).
      </p>
      <div className='mt-4 flex justify-center'>
        <Button
          variant='secondary'
          disabled={restoring}
          onClick={() => {
            setRestoring(true)
            void adminApi.resetRoleGrants().then(() => {
              setRestoring(false)
              onRestored()
            })
          }}
        >
          {restoring ? 'Restoring…' : 'Restore default (admin-only) grants'}
        </Button>
      </div>
      <p className='mt-2 text-[11px] text-gray-400'>Recorded in the Audit Log as “reset role grants”.</p>
    </div>
  )
}
