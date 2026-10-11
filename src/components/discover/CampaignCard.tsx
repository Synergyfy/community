import { Link } from 'react-router-dom'
import { MapPin, Users } from 'lucide-react'
import { formatGBP, percent, locationLabel } from '@/lib/format'
import type { PublicCampaign } from '@/types/community-public'

interface CampaignCardProps {
  campaign: PublicCampaign
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const pct = percent(campaign.raisedAmountPence, campaign.goalAmountPence)
  return (
    <Link to={`/community/campaign/${campaign.id}`} className='card overflow-hidden transition hover:shadow-md'>
      {campaign.imageUrl && (
        <img src={campaign.imageUrl} alt={campaign.title} loading='lazy' className='h-36 w-full object-cover' />
      )}
      <div className='p-3'>
        <p className='line-clamp-2 text-sm font-semibold text-gray-900'>{campaign.title}</p>
        <div className='mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100'>
          <div className='h-full bg-secondary-500' style={{ width: `${pct}%` }} />
        </div>
        <div className='mt-1.5 flex items-center justify-between text-xs'>
          <span className='font-semibold text-gray-900'>{formatGBP(campaign.raisedAmountPence)}</span>
          <span className='text-gray-500'>of {formatGBP(campaign.goalAmountPence)}</span>
        </div>
        <div className='mt-1 flex items-center gap-3 text-xs text-gray-500'>
          {campaign.supporterCount != null && (
            <span className='flex items-center gap-0.5'>
              <Users className='h-3 w-3' /> {campaign.supporterCount}
            </span>
          )}
          {locationLabel(campaign.location) && (
            <span className='flex items-center gap-0.5'>
              <MapPin className='h-3 w-3' /> {locationLabel(campaign.location)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
