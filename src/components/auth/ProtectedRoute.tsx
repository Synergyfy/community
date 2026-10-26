import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { managersService } from '@/services/managers.service'
import { forceSignInHome, peekForcedSignInHome } from '@/lib/pending-navigation'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { AccessDeniedPage } from '@/components/ui/AccessDeniedPage'

/**
 * The home surface for an account — where sign-in lands by default. An
 * account holding an active Community Hub Manager appointment lands on the
 * manager dashboard (their membership home stays one click away inside it).
 */
export function homeForUser(userType?: string | null, userId?: string | null): string {
  if (userType === 'admin') return '/admin'
  if (userId && managersService.getActiveForUser(userId)) return '/manager'
  if (userType === 'business') return '/business/dashboard'
  return '/community'
}

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

export function GuestRoute({ redirectTo }: GuestRouteProps) {
  const { user, authStatus } = useAuthStore()
  const location = useLocation()

  // A demo shortcut may force its destination (e.g. Admin → control centre).
  // Consume it once, on first authenticated render, then let the role default
  // apply to subsequent guest visits.
  const forced = peekForcedSignInHome()
  const from = forced ?? (location.state as any)?.from?.pathname ?? redirectTo ?? homeForUser(user?.userType, user?.id)

  useEffect(() => {
    if (authStatus === 'authenticated') forceSignInHome(null)
  }, [authStatus])

  if (authStatus === 'initializing') {
    return <LoadingScreen />
  }

  if (authStatus === 'authenticated' && user) {
    return <Navigate to={from} replace />
  }

  return <Outlet />
}
