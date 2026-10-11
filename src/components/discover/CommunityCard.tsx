import { Check, MapPin, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { locationLabel } from '@/lib/format'
import type { PublicCommunity } from '@/types/community-public'

interface CommunityCardProps {
  community: PublicCommunity
  isCurrent?: boolean
  onSelect: (community: PublicCommunity) => void
}

export function CommunityCard({ community, isCurrent, onSelect }: CommunityCardProps) {
  return (
    <div className='card flex items-center gap-3 p-3'>
      <Avatar src={community.coverImageUrl} name={community.name} size='lg' className='rounded-xl' />
      <div className='min-w-0 flex-1'>
        <p className='truncate text-sm font-semibold text-gray-900'>{community.name}</p>
        <div className='mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500'>
          {locationLabel(community.location) && (
            <span className='flex items-center gap-0.5'>
              <MapPin className='h-3 w-3' /> {locationLabel(community.location)}
            </span>
          )}
          {community.memberCount != null && (
            <span className='flex items-center gap-0.5'>
              <Users className='h-3 w-3' /> {community.memberCount.toLocaleString('en-GB')} members
            </span>
          )}
        </div>
      </div>
      {isCurrent ? (
        <Button variant='secondary' size='sm' icon={<Check className='h-4 w-4' />} disabled>
          Current
        </Button>
      ) : (
        <Button size='sm' onClick={() => onSelect(community)}>
          Switch
        </Button>
      )}
    </div>
  )
}
