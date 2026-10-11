import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, Clock, MapPin, Share2, UserPlus, Users } from 'lucide-react'
import { entitiesApi } from '@/services/entities.service'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useGroupRequests } from '@/hooks/useGroupRequests'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { PostCard } from '@/components/community/PostCard'
import { ShareModal } from '@/components/sharing/ShareModal'
import { locationLabel } from '@/lib/format'
import { useAuthGate } from '@/hooks/useAuthGate'
import type { PublicPost } from '@/types/community-public'

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { requireAuth } = useAuthGate()
  const { isRequested, requestJoin, cancelRequest } = useGroupRequests()
  const addNotification = useNotificationsStore((s) => s.addNotification)
  const [shareOpen, setShareOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['entity', 'group', id],
    queryFn: () => entitiesApi.getGroup(id as string),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className='container-page max-w-2xl py-4'>
        <Skeleton className='h-40 w-full rounded-xl' />
        <Skeleton className='mt-4 h-32 w-full rounded-lg' />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className='container-page max-w-2xl py-10'>
        <EmptyState
          icon={<Users className='h-10 w-10' />}
          title='Group not available'
          description='This group may be private or no longer exists.'
          action={<Button onClick={() => navigate('/community/discover')}>Discover groups</Button>}
        />
      </div>
    )
  }

  const { group, posts } = data
  const onPostComment = (post: PublicPost) => navigate(`/community/post/${post.id}`)
  const requested = isRequested(group.id)

  const requestToJoin = () =>
    requireAuth(() => {
      requestJoin(group.id)
      addNotification({
        type: 'group',
        title: 'Request sent',
        body: `Your request to join ${group.name} is pending approval.`,
        link: `/community/group/${group.id}`,
      })
    })
  const cancel = () => cancelRequest(group.id)

  return (
    <div className='container-page max-w-2xl py-3 sm:py-4'>
      <button onClick={() => navigate(-1)} className='mb-3 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900'>
        <ArrowLeft className='h-4 w-4' /> Back
      </button>

      <div className='card overflow-hidden'>
        {group.coverImageUrl && <img src={group.coverImageUrl} alt={group.name} className='h-36 w-full object-cover' />}
        <div className='p-4'>
          <div className='flex items-start gap-3'>
            {group.imageUrl && <Avatar src={group.imageUrl} name={group.name} size='lg' className='rounded-xl' />}
            <div className='min-w-0 flex-1'>
              <h1 className='text-lg font-bold text-gray-900'>{group.name}</h1>
              <div className='mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500'>
                {group.memberCount != null && (
                  <span className='flex items-center gap-0.5'>
                    <Users className='h-3.5 w-3.5' /> {group.memberCount.toLocaleString('en-GB')} members
                  </span>
                )}
                {locationLabel(group.location) && (
                  <span className='flex items-center gap-0.5'>
                    <MapPin className='h-3.5 w-3.5' /> {locationLabel(group.location)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {group.description && <p className='mt-3 text-sm text-gray-700'>{group.description}</p>}

          <div className='mt-4 flex gap-2'>
            {requested ? (
              <Button
                className='flex-1'
                variant='secondary'
                icon={<Check className='h-4 w-4' />}
                onClick={cancel}
              >
                Request pending · Cancel
              </Button>
            ) : (
              <Button
                className='flex-1'
                icon={<UserPlus className='h-4 w-4' />}
                onClick={requestToJoin}
              >
                Request to join
              </Button>
            )}
            <Button variant='secondary' icon={<Share2 className='h-4 w-4' />} onClick={() => requireAuth(() => setShareOpen(true))}>
              Share
            </Button>
          </div>
          {requested && (
            <p className='mt-2 flex items-center gap-1 text-xs text-amber-600'>
              <Clock className='h-3.5 w-3.5' /> Your request is awaiting admin approval.
            </p>
          )}
        </div>
      </div>

      <h2 className='mb-3 mt-5 text-sm font-semibold text-gray-900'>Group posts</h2>
      {posts.length === 0 ? (
        <EmptyState title='No posts yet' description='Group members have not posted anything yet.' />
      ) : (
        <div className='space-y-4'>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onComment={onPostComment} onShare={() => requireAuth(() => setShareOpen(true))} onMore={() => undefined} />
          ))}
        </div>
      )}

      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} targetType='group' targetId={group.id} title={group.name} />
    </div>
  )
}
