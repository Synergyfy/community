import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { locationLabel } from '@/lib/format'
import type { PublicGroup } from '@/types/community-public'

interface GroupCardProps {
  group: PublicGroup
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Link to={`/community/group/${group.id}`} className='card overflow-hidden transition hover:shadow-md'>
      {group.imageUrl && (
        <img src={group.imageUrl} alt={group.name} loading='lazy' className='h-28 w-full object-cover' />
      )}
      <div className='p-3'>
        <p className='truncate text-sm font-semibold text-gray-900'>{group.name}</p>
        {group.description && <p className='mt-1 line-clamp-2 text-xs text-gray-500'>{group.description}</p>}
        <div className='mt-2 flex items-center gap-3 text-xs text-gray-500'>
          {group.memberCount != null && (
            <span className='flex items-center gap-1'>
              <Users className='h-3 w-3' /> {group.memberCount} members
            </span>
          )}
          {locationLabel(group.location) && <span>{locationLabel(group.location)}</span>}
        </div>
      </div>
    </Link>
  )
}
