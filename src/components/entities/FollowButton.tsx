import { useEffect, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useEngagementStore } from '@/stores/engagement.store'
import { useAuthGate } from '@/hooks/useAuthGate'
import { cn } from '@/lib/utils'

interface FollowButtonProps {
  targetType: 'business' | 'campaign' | 'group'
  targetId: string
  initialFollowing?: boolean
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Follow action. Requires sign-in (spec §2.1/§4.2 — the auth gate returns the
 * user to this action afterwards). Campaign follows are recorded as real
 * engagement events so they appear truthfully in My Campaigns (spec §4.3);
 * viewing a campaign is never treated as following it.
 */
export function FollowButton({ targetType, targetId, initialFollowing, size = 'md', className }: FollowButtonProps) {
  const addNotification = useNotificationsStore((s) => s.addNotification)
  const { requireAuth } = useAuthGate()
  const joinedCampaignIds = useEngagementStore((s) => s.joinedCampaignIds)
  const toggleJoinCampaign = useEngagementStore((s) => s.toggleJoinCampaign)
  const [following, setFollowing] = useState(
    initialFollowing ?? (targetType === 'campaign' ? joinedCampaignIds.includes(targetId) : false),
  )

  // Keep campaign follows in sync with recorded engagement events.
  useEffect(() => {
    if (targetType !== 'campaign') return
    setFollowing(joinedCampaignIds.includes(targetId))
  }, [joinedCampaignIds, targetId, targetType])

  const toggle = () => {
    requireAuth(() => {
      const next = !following
      setFollowing(next)
      if (targetType === 'campaign') toggleJoinCampaign(targetId)
      if (next) {
        addNotification({ type: 'follow', title: 'Following', body: `You are now following this ${targetType}.` })
      }
    })
  }

  return (
    <button onClick={toggle} className={cn('btn', size === 'sm' && 'btn-sm', following ? 'btn-secondary' : 'btn-primary', className)}>
      {following ? <Check className='h-4 w-4' /> : <Plus className='h-4 w-4' />}
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
