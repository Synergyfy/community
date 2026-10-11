import { Users, Target } from 'lucide-react'
import { formatGBP, percent } from '@/lib/format'
import { cn } from '@/lib/utils'

interface CampaignProgressProps {
  raisedAmountPence?: number | null
  goalAmountPence?: number | null
  supporterCount?: number | null
  className?: string
  showLabels?: boolean
}

export function CampaignProgress({
  raisedAmountPence,
  goalAmountPence,
  supporterCount,
  className,
  showLabels = true,
}: CampaignProgressProps) {
  const pct = percent(raisedAmountPence, goalAmountPence)
  return (
    <div className={cn('w-full', className)}>
      {showLabels && (
        <div className='flex items-baseline justify-between'>
          <span className='text-lg font-bold text-gray-900'>{formatGBP(raisedAmountPence)}</span>
          <span className='text-sm text-gray-500'>of {formatGBP(goalAmountPence)}</span>
        </div>
      )}
      <div className='mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-gray-100'>
        <div
          className='h-full rounded-full bg-secondary-500 transition-all'
          style={{ width: `${pct}%` }}
          role='progressbar'
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className='mt-1.5 flex items-center gap-4 text-xs text-gray-500'>
        <span className='font-medium text-secondary-700'>{pct}% funded</span>
        {supporterCount != null && (
          <span className='flex items-center gap-1'>
            <Users className='h-3.5 w-3.5' /> {supporterCount} supporters
          </span>
        )}
        {goalAmountPence != null && (
          <span className='flex items-center gap-1'>
            <Target className='h-3.5 w-3.5' /> Goal {formatGBP(goalAmountPence)}
          </span>
        )}
      </div>
    </div>
  )
}
