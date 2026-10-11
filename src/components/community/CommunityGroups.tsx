import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, Clock, MapPin, Users, UserPlus } from 'lucide-react'
import { entitiesApi } from '@/services/entities.service'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useGroupRequests } from '@/hooks/useGroupRequests'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { locationLabel } from '@/lib/format'
import type { PublicGroup } from '@/types/community-public'

interface CommunityGroupsProps {
  location?: string
}

export function CommunityGroups({ location }: CommunityGroupsProps) {
  const { requireAuth } = useAuthGate()
  const { isRequested, requestJoin, cancelRequest } = useGroupRequests()

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['community', 'groups', location],
    queryFn: () => entitiesApi.getGroups(location),
  })

  if (isLoading) {
    return (
      <div className='space-y-3'>
        {[0, 1].map((i) => (
          <Skeleton key={i} className='h-28 w-full rounded-lg' />
        ))}
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={<Users className='h-10 w-10' />}
        title='No groups yet'
        description='Community groups will appear here as they are added.'
      />
    )
  }

  return (
    <div className='space-y-3'>
      <p className='text-xs text-gray-500'>Groups near you — see what people are doing and request to join.</p>
      {groups.map((group) => (
        <GroupFeedCard
          key={group.id}
          group={group}
          requested={isRequested(group.id)}
          onRequest={() => requireAuth(() => requestJoin(group.id))}
          onCancel={() => cancelRequest(group.id)}
        />
      ))}
    </div>
  )
}

interface GroupFeedCardProps {
  group: PublicGroup
  requested: boolean
  onRequest: () => void
  onCancel: () => void
}

function GroupFeedCard({ group, requested, onRequest, onCancel }: GroupFeedCardProps) {
  return (
    <article className='card overflow-hidden'>
      {group.imageUrl && <img src={group.imageUrl} alt={group.name} loading='lazy' className='h-32 w-full object-cover' />}
      <div className='p-3'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0'>
            <Link to={`/community/group/${group.id}`} className='truncate text-sm font-semibold text-gray-900 hover:underline'>
              {group.name}
            </Link>
            <div className='mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500'>
              {group.memberCount != null && (
                <span className='flex items-center gap-0.5'>
                  <Users className='h-3 w-3' /> {group.memberCount.toLocaleString('en-GB')} members
                </span>
              )}
              {locationLabel(group.location) && (
                <span className='flex items-center gap-0.5'>
                  <MapPin className='h-3 w-3' /> {locationLabel(group.location)}
                </span>
              )}
            </div>
          </div>
          {requested ? (
            <Button variant='secondary' size='sm' icon={<Clock className='h-4 w-4' />} onClick={onCancel}>
              Requested
            </Button>
          ) : (
            <Button size='sm' icon={<UserPlus className='h-4 w-4' />} onClick={onRequest}>
              Request to join
            </Button>
          )}
        </div>
        {group.description && <p className='mt-2 line-clamp-2 text-xs text-gray-600'>{group.description}</p>}
        <div className='mt-2 flex items-center gap-3 text-xs'>
          <Link to={`/community/group/${group.id}`} className='font-medium text-primary-600 hover:underline'>
            View group activity
          </Link>
          {requested && (
            <span className='flex items-center gap-0.5 text-secondary-600'>
              <Check className='h-3 w-3' /> Request sent
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
