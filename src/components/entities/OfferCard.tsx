import { Link } from 'react-router-dom'
import { CalendarClock, MapPin } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { locationLabel, timeUntil } from '@/lib/format'
import type { PublicOffer } from '@/types/community-public'

interface OfferCardProps {
  offer: PublicOffer
}

export function OfferCard({ offer }: OfferCardProps) {
  return (
    <Link to={`/community/offer/${offer.id}`} className='card flex gap-3 overflow-hidden p-3 transition hover:shadow-md'>
      {offer.imageUrl && (
        <img src={offer.imageUrl} alt={offer.title} loading='lazy' className='h-20 w-20 shrink-0 rounded-lg object-cover' />
      )}
      <div className='min-w-0 flex-1'>
        <div className='flex items-start justify-between gap-2'>
          <p className='line-clamp-2 text-sm font-semibold text-gray-900'>{offer.title}</p>
          <Badge variant='primary' className='shrink-0'>
            Offer
          </Badge>
        </div>
        {offer.business && (
          <div className='mt-1 flex items-center gap-1.5'>
            <Avatar src={offer.business.logoUrl} name={offer.business.name} size='sm' className='h-4 w-4' />
            <span className='truncate text-xs text-gray-500'>{offer.business.name}</span>
          </div>
        )}
        <div className='mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500'>
          {offer.expiryDate && (
            <span className='flex items-center gap-0.5'>
              <CalendarClock className='h-3 w-3' /> {timeUntil(offer.expiryDate)}
            </span>
          )}
          {locationLabel(offer.location) && (
            <span className='flex items-center gap-0.5'>
              <MapPin className='h-3 w-3' /> {locationLabel(offer.location)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
