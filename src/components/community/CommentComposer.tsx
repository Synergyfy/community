import { useState } from 'react'
import { Send } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/stores/auth.store'
import { useAuthGate } from '@/hooks/useAuthGate'
import { cn } from '@/lib/utils'

interface CommentComposerProps {
  onSubmit: (content: string) => Promise<unknown> | void
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

export function CommentComposer({ onSubmit, placeholder = 'Add a comment…', autoFocus, className }: CommentComposerProps) {
  const { user } = useAuthStore()
  const { isAuthenticated, requireAuth } = useAuthGate()
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    const content = value.trim()
    if (!content || submitting) return
    setSubmitting(true)
    try {
      await onSubmit(content)
      setValue('')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => requireAuth(() => undefined)}
        className={cn('w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-sm text-gray-500 hover:bg-gray-100', className)}
      >
        Log in to comment
      </button>
    )
  }

  return (
    <div className={cn('flex items-start gap-2', className)}>
      <Avatar src={user?.avatarUrl} name={user?.name || 'You'} size='sm' />
      <div className='flex-1 rounded-2xl border border-gray-200 focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-400 bg-white'>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={1}
          className='w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-gray-400'
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void submit()
            }
          }}
        />
      </div>
      <button
        onClick={() => void submit()}
        disabled={!value.trim() || submitting}
        className='btn-icon rounded-full bg-primary-600 text-white disabled:opacity-40'
        aria-label='Post comment'
      >
        <Send className='h-4 w-4' />
      </button>
    </div>
  )
}
