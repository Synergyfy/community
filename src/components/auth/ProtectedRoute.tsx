import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { AccessDeniedPage } from '@/components/ui/AccessDeniedPage'

export interface ProtectedRouteProps {
  requiredUserTypes?: ('public' | 'business' | 'consumer' | 'admin')[]
  redirectTo?: string
}

export function ProtectedRoute({ requiredUserTypes, redirectTo = '/auth/login' }: ProtectedRouteProps) {
  const { user, authStatus } = useAuthStore()
  const location = useLocation()

  if (authStatus === 'initializing') {
    return <LoadingScreen />
  }

  if (authStatus === 'unauthenticated' || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  if (requiredUserTypes && requiredUserTypes.length > 0) {
    if (!requiredUserTypes.includes(user.userType as any)) {
      return <AccessDeniedPage />
    }
  }

  return <Outlet />
}

export interface GuestRouteProps {
  redirectTo?: string
}

export function GuestRoute({ redirectTo = '/community' }: GuestRouteProps) {
  const { user, authStatus } = useAuthStore()
  const location = useLocation()

  if (authStatus === 'initializing') {
    return <LoadingScreen />
  }

  if (authStatus === 'authenticated' && user) {
    const from = (location.state as any)?.from?.pathname || redirectTo
    return <Navigate to={from} replace />
  }

  return <Outlet />
}
