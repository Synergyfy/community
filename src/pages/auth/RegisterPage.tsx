import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export function RegisterPage() {
  const navigate = useNavigate()
  const { signIn } = useAuthStore()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userType, setUserType] = useState<'consumer' | 'business'>('consumer')
  const [businessName, setBusinessName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return setError('Please enter your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Please enter a valid email address.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (userType === 'business' && businessName.trim().length < 2) return setError('Please enter your business name.')

    setError('')
    setSubmitting(true)
    try {
      const result = await authApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
        userType,
        businessName: userType === 'business' ? businessName.trim() : undefined,
      })
      signIn(result.user, result.accessToken, result.refreshToken)
      navigate('/community', { replace: true })
    } catch {
      setError('We could not create your account right now. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='container-page py-8 sm:py-10 max-w-md'>
      <div className='card'>
        <div className='card-content space-y-4'>
          <div>
            <h1 className='text-xl font-semibold'>Create Account</h1>
            <p className='mt-1 text-sm text-gray-600'>Join your local Community</p>
          </div>

          <div className='grid grid-cols-2 gap-2'>
            {(['consumer', 'business'] as const).map((type) => (
              <button
                key={type}
                type='button'
                onClick={() => setUserType(type)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-medium capitalize transition',
                  userType === type
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                )}
              >
                {type === 'consumer' ? 'Consumer' : 'Business'}
              </button>
            ))}
          </div>

          <div className='form-group'>
            <label className='label' htmlFor='reg-name'>
              {userType === 'business' ? 'Your name' : 'Full name'}
            </label>
            <Input id='reg-name' value={name} onChange={(e) => setName(e.target.value)} placeholder='Jane Doe' autoComplete='name' />
          </div>

          {userType === 'business' && (
            <div className='form-group'>
              <label className='label' htmlFor='reg-business'>
                Business name
              </label>
              <Input
                id='reg-business'
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder='MCOM Coffee House'
                autoComplete='organization'
              />
            </div>
          )}

          <div className='form-group'>
            <label className='label' htmlFor='reg-email'>
              Email
            </label>
            <Input
              id='reg-email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='you@example.com'
              autoComplete='email'
            />
          </div>

          <div className='form-group'>
            <label className='label' htmlFor='reg-password'>
              Password
            </label>
            <Input
              id='reg-password'
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='At least 6 characters'
              autoComplete='new-password'
            />
          </div>

          {error && <p className='error-text'>{error}</p>}

          <Button type='button' className='w-full' disabled={submitting} onClick={submit}>
            {submitting ? 'Creating account…' : 'Create Account'}
          </Button>

          <p className='text-center text-sm text-gray-600'>
            Already have an account?{' '}
            <Link to='/auth/login' className='font-medium text-primary-600 hover:underline'>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
