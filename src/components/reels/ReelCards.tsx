import { ChevronRight } from 'lucide-react'
import type { PublicReel } from '@/types/community-public'
import { ReelCard } from './ReelCard'

interface ReelCardsProps {
  reels: PublicReel[]
  onReelClick: (reel: PublicReel, index: number) => void
  onViewAll?: () => void
}

export function ReelCards({ reels, onReelClick, onViewAll }: ReelCardsProps) {
  if (reels.length === 0) return null
  return (
    <section className='py-2'>
      <div className='flex items-center justify-between mb-2'>
        <h3 className='text-base font-semibold text-gray-900'>Community Reels</h3>
        {onViewAll && (
          <button onClick={onViewAll} className='text-sm text-primary-600 flex items-center gap-0.5'>
            View all <ChevronRight className='h-4 w-4' />
          </button>
        )}
      </div>
      <div className='flex gap-3 overflow-x-auto scrollbar-hide py-1'>
        {reels.map((reel, index) => (
          <ReelCard key={reel.id} reel={reel} onClick={() => onReelClick(reel, index)} />
        ))}
      </div>
    </section>
  )
}
