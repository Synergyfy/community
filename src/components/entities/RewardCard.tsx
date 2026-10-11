import { Link } from 'react-router-dom'
import { Gift } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { PublicReward } from '@/types/community-public'

interface RewardCardProps {
  reward: PublicReward
}

export function RewardCard({ reward }: RewardCardProps) {
  return (
    <Link to={`/community/reward/${reward.id}`} className='card flex gap-3 overflow-hidden p-3 transition hover:shadow-md'>
      {reward.imageUrl ? (
        <img src={reward.imageUrl} alt={reward.title} loading='lazy' className='h-20 w-20 shrink-0 rounded-lg object-cover' />
      ) : (
        <span className='flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600'>
          <Gift className='h-7 w-7' />
        </span>
      )}
      <div className='min-w-0 flex-1'>
        <div className='flex items-start justify-between gap-2'>
          <p className='line-clamp-2 text-sm font-semibold text-gray-900'>{reward.title}</p>
          <Badge variant={reward.status === 'available' ? 'success' : 'neutral'} className='shrink-0'>
            {reward.status === 'available' ? 'Available' : 'Ended'}
          </Badge>
        </div>
        {reward.valueText && <p className='mt-1 text-xs font-medium text-amber-700'>{reward.valueText}</p>}
        {reward.description && <p className='mt-1 line-clamp-2 text-xs text-gray-500'>{reward.description}</p>}
      </div>
    </Link>
  )
}
