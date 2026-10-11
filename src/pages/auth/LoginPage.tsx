import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { authApi } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const signIn = useAuthStore((s) => s.signIn)
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/community'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(email)) return setError('Enter a valid email address.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    setError('')
    setSubmitting(true)
    try {
      const { user, accessToken, refreshToken } = await authApi.login(email.trim(), password)
      void refreshToken
      signIn(user, accessToken, refreshToken)
      navigate(from, { replace: true })
    } catch {
      setError('We could not sign you in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='container-page max-w-md py-10'>
      <div className='card'>
        <div className='card-content space-y-5'>
          <div>
            <h1 className='text-xl font-bold text-gray-900'>Welcome back</h1>
            <p className='mt-1 text-sm text-gray-600'>Sign in to your Community.</p>
          </div>

          <form className='space-y-3' onSubmit={submit} noValidate>
            <div className='form-group'>
              <label htmlFor='login-email' className='label'>
                Email
              </label>
              <div className='relative flex items-center'>
                <Mail className='pointer-events-none absolute left-3 h-4 w-4 text-gray-400' />
                <Input
                  id='login-email'
                  type='email'
                  autoComplete='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='you@example.com'
                  className='pl-9'
                />
              </div>
            </div>

            <div className='form-group'>
              <label htmlFor='login-password' className='label'>
                Password
              </label>
              <div className='relative flex items-center'>
                <Lock className='pointer-events-none absolute left-3 h-4 w-4 text-gray-400' />
                <Input
                  id='login-password'
                  type='password'
                  autoComplete='current-password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='••••••••'
                  className='pl-9'
                />
              </div>
            </div>

            {error && <p className='error-text'>{error}</p>}

            <Button type='submit' className='w-full' disabled={!email || !password || submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className='text-center text-xs text-gray-500'>
            Demo mode: any valid email and a 6+ character password will sign you in.
          </p>

          <p className='text-center text-sm text-gray-600'>
            New here?{' '}
            <Link to='/auth/register' className='font-medium text-primary-600 hover:underline'>
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
