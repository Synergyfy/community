import { Skeleton } from '@/components/ui/Skeleton'

export function ReelSkeleton() {
  return (
    <div className='my-3'>
      <div className='mb-2 flex items-center justify-between'>
        <Skeleton className='h-4 w-24' />
        <Skeleton className='h-3 w-16' />
      </div>
      <div className='flex gap-3 overflow-hidden'>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className='h-56 w-32 shrink-0 rounded-xl' />
        ))}
      </div>
    </div>
  )
}
