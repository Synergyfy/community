import { Link } from 'react-router-dom'
import { BadgeCheck, MapPin, Tag, Megaphone } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { locationLabel } from '@/lib/format'
import type { PublicBusiness } from '@/types/community-public'

interface BusinessCardProps {
  business: PublicBusiness
}

export function BusinessCard({ business }: BusinessCardProps) {
  return (
    <Link
      to={`/community/business/${business.id}`}
      className='card flex items-center gap-3 p-3 transition hover:shadow-md'
    >
      <Avatar src={business.logoUrl} name={business.name} size='lg' className='rounded-lg' />
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-1'>
          <p className='truncate text-sm font-semibold text-gray-900'>{business.name}</p>
          <BadgeCheck className='h-4 w-4 shrink-0 text-primary-600' />
        </div>
        {business.category && <p className='truncate text-xs text-gray-500'>{business.category}</p>}
        <div className='mt-1 flex items-center gap-2 text-xs text-gray-500'>
          {locationLabel(business.location) && (
            <span className='flex items-center gap-0.5'>
              <MapPin className='h-3 w-3' /> {locationLabel(business.location)}
            </span>
          )}
          {business.hasOffer && (
            <span className='flex items-center gap-0.5 text-primary-600'>
              <Tag className='h-3 w-3' /> Offer
            </span>
          )}
          {business.hasCampaign && (
            <span className='flex items-center gap-0.5 text-secondary-600'>
              <Megaphone className='h-3 w-3' /> Campaign
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
