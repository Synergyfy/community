import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { authApi } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { forceSignInHome } from '@/lib/pending-navigation'
import { homeForUser } from '@/components/auth/ProtectedRoute'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const signIn = useAuthStore((s) => s.signIn)
  // Return to the action the user was attempting (spec §2.1); sign-in falls
  // back to the account's own home when opened directly.
  const attemptedAction = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname

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
      // Return to the attempted action (§2.1); otherwise the account's home
      // (active Community Hub Managers land on their manager dashboard).
      navigate(attemptedAction || homeForUser(user.userType, user.id), { replace: true })
    } catch {
      setError('We could not sign you in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const demoSignIn = async (role: 'business' | 'admin' | 'consumer' | 'manager') => {
    setError('')
    setSubmitting(true)
    try {
      const { user, accessToken, refreshToken } = await authApi.login(`${role}@demo.com`, 'demo123')
      // A demo button means "show me this role's dashboard" — force the role
      // home so a pending return-to-action cannot pull the demo elsewhere
      // (GuestRoute reads this during its render and clears it after).
      const destination = role === 'manager' ? '/manager' : homeForUser(role)
      forceSignInHome(destination)
      signIn(user, accessToken, refreshToken)
      navigate(destination, { replace: true })
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

          <div className='border-t border-gray-100 pt-4'>
            <p className='mb-3 text-center text-xs font-medium uppercase tracking-wide text-gray-400'>
              Quick demo sign-in
            </p>
            <div className='grid grid-cols-4 gap-2'>
              {(['business', 'admin', 'consumer', 'manager'] as const).map((role) => (
                <Button
                  key={role}
                  type='button'
                  variant='secondary'
                  size='sm'
                  onClick={() => demoSignIn(role)}
                  disabled={submitting}
                  className='capitalize'
                >
                  {role}
                </Button>
              ))}
            </div>
            <p className='text-center text-xs text-gray-400'>
              Manager opens the Community Manager Dashboard — a staff role overlaying an ordinary CHS account, not a
              membership.
            </p>
          </div>

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
