import { Skeleton } from '@/components/ui/Skeleton'

export function StorySkeleton() {
  return (
    <div className='flex gap-3 overflow-hidden py-1'>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className='flex flex-col items-center gap-1.5'>
          <Skeleton className='h-16 w-16 rounded-full' />
          <Skeleton className='h-2.5 w-12' />
        </div>
      ))}
    </div>
  )
}
