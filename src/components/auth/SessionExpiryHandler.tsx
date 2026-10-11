import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SESSION_EXPIRED_EVENT } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth.store'

export function SessionExpiryHandler() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    const handler = () => {
      logout()
      navigate('/auth/login', { replace: true })
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handler)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler)
  }, [navigate, logout])

  return null
}
