import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { useNotificationsStore } from '@/stores/notifications.store'
import { cn } from '@/lib/utils'

interface FollowButtonProps {
  targetType: 'business' | 'campaign' | 'group'
  targetId: string
  initialFollowing?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function FollowButton({ targetType, initialFollowing, size = 'md', className }: FollowButtonProps) {
  const addNotification = useNotificationsStore((s) => s.addNotification)
  const [following, setFollowing] = useState(!!initialFollowing)

  const toggle = () => {
    const next = !following
    setFollowing(next)
    if (next) {
      addNotification({ type: 'follow', title: 'Following', body: `You are now following this ${targetType}.` })
    }
  }

  return (
    <button onClick={toggle} className={cn('btn', size === 'sm' && 'btn-sm', following ? 'btn-secondary' : 'btn-primary', className)}>
      {following ? <Check className='h-4 w-4' /> : <Plus className='h-4 w-4' />}
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
