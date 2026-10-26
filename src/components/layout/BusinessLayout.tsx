import { NavLink, Outlet } from 'react-router-dom'
import { ChevronRight, Flag, LayoutDashboard, Megaphone, Package, Settings, TrendingUp } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/business/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/business/posts', label: 'Posts', icon: Megaphone },
  { to: '/business/offers', label: 'Offers', icon: Package },
  { to: '/business/campaigns', label: 'Campaigns', icon: Flag },
  { to: '/business/sharing', label: 'Sharing results', icon: TrendingUp },
  { to: '/business/settings', label: 'Settings', icon: Settings },
]

export function BusinessLayout() {
  const businessName = useAuthStore((s) => s.user?.businessName || s.user?.name || 'your business')

  return (
    <div>
      <div className='border-b border-gray-200 bg-white'>
        <div className='container-page py-4'>
          <h1 className='text-xl font-bold text-gray-900'>Business Dashboard</h1>
          <p className='mt-0.5 text-sm text-gray-600'>{businessName}</p>
        </div>
      </div>
      <div className='container-page space-y-6 py-6'>
        <nav className='card' aria-label='Dashboard sections'>
          <ul className='divide-y divide-gray-100'>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-3 text-sm',
                      isActive ? 'bg-primary-50 font-semibold text-primary-700' : 'text-gray-700 hover:bg-gray-50',
                    )
                  }
                >
                  <item.icon className='h-4 w-4 shrink-0' />
                  <span className='flex-1'>{item.label}</span>
                  <ChevronRight className='h-4 w-4 shrink-0 text-gray-400' />
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <Outlet />
      </div>
    </div>
  )
}
