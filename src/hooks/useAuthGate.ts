import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

export function useAuthGate() {
  const { authStatus, user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const isAuthenticated = authStatus === 'authenticated' && !!user

  const requireAuth = useCallback(
    (action: () => void) => {
      if (isAuthenticated) {
        action()
      } else {
        navigate('/auth/login', { state: { from: location } })
      }
    },
    [isAuthenticated, navigate, location],
  )

  return { isAuthenticated, requireAuth }
}
