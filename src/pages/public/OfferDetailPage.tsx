import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BadgeCheck, CalendarClock, MapPin, Share2, Tag } from 'lucide-react'
import { entitiesApi } from '@/services/entities.service'
import { useAuthGate } from '@/hooks/useAuthGate'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { FollowButton } from '@/components/entities/FollowButton'
import { ComingSoonModal } from '@/components/entities/ComingSoonModal'
import { ShareModal } from '@/components/sharing/ShareModal'
import { locationLabel, timeUntil } from '@/lib/format'
import { Link } from 'react-router-dom'

export function OfferDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { requireAuth } = useAuthGate()
  const [shareOpen, setShareOpen] = useState(false)
  const [redeemOpen, setRedeemOpen] = useState(false)

  const { data: offer, isLoading, isError } = useQuery({
    queryKey: ['entity', 'offer', id],
    queryFn: () => entitiesApi.getOffer(id as string),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className='container-page max-w-2xl py-4'>
        <Skeleton className='h-56 w-full rounded-xl' />
        <Skeleton className='mt-4 h-40 w-full rounded-lg' />
      </div>
    )
  }

  if (isError || !offer) {
    return (
      <div className='container-page max-w-2xl py-10'>
        <EmptyState
          icon={<Tag className='h-10 w-10' />}
          title='Offer not available'
          description='This offer may have expired or been removed.'
          action={<Button onClick={() => navigate('/community/discover')}>Discover offers</Button>}
        />
      </div>
    )
  }

  return (
    <div className='container-page max-w-2xl py-3 sm:py-4'>
      <button onClick={() => navigate(-1)} className='mb-3 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900'>
        <ArrowLeft className='h-4 w-4' /> Back
      </button>

      <div className='card overflow-hidden'>
        {offer.imageUrl && <img src={offer.imageUrl} alt={offer.title} className='h-56 w-full object-cover' />}
        <div className='p-4'>
          <span className='badge-primary'>Offer</span>
          <h1 className='mt-2 text-lg font-bold text-gray-900'>{offer.title}</h1>

          <div className='mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500'>
            {offer.expiryDate && (
              <span className='flex items-center gap-0.5 font-medium text-primary-700'>
                <CalendarClock className='h-3.5 w-3.5' /> {timeUntil(offer.expiryDate)}
              </span>
            )}
            {locationLabel(offer.location) && (
              <span className='flex items-center gap-0.5'>
                <MapPin className='h-3.5 w-3.5' /> {locationLabel(offer.location)}
              </span>
            )}
          </div>

          {offer.description && <p className='mt-3 whitespace-pre-line text-sm text-gray-700'>{offer.description}</p>}

          <div className='mt-4 flex gap-2'>
            <Button className='flex-1' icon={<Tag className='h-4 w-4' />} onClick={() => requireAuth(() => setRedeemOpen(true))}>
              Redeem Offer
            </Button>
            <Button variant='secondary' icon={<Share2 className='h-4 w-4' />} onClick={() => requireAuth(() => setShareOpen(true))}>
              Share
            </Button>
          </div>
        </div>
      </div>

      {offer.business && (
        <div className='card mt-4 p-4'>
          <p className='mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400'>Offered by</p>
          <div className='flex items-center justify-between gap-3'>
            <Link to={`/community/business/${offer.business.id}`} className='flex min-w-0 items-center gap-3'>
              <Avatar src={offer.business.logoUrl} name={offer.business.name} size='md' />
              <div className='min-w-0'>
                <div className='flex items-center gap-1'>
                  <span className='truncate text-sm font-semibold text-gray-900'>{offer.business.name}</span>
                  <BadgeCheck className='h-4 w-4 shrink-0 text-primary-600' />
                </div>
                {offer.business.category && <span className='text-xs text-gray-500'>{offer.business.category}</span>}
              </div>
            </Link>
            <FollowButton targetType='business' targetId={offer.business.id} size='sm' />
          </div>
        </div>
      )}

      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} targetType='offer' targetId={offer.id} title={offer.title} />
      <ComingSoonModal
        isOpen={redeemOpen}
        onClose={() => setRedeemOpen(false)}
        title='Redeem this offer'
        message='In-store redemption and offer tracking are being connected. Soon you will be able to claim this offer and show a redemption code.'
      />
    </div>
  )
}
