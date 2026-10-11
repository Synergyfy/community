import { Skeleton } from '@/components/ui/Skeleton'

export function PostSkeleton() {
  return (
    <div className='card p-3 sm:p-4'>
      <div className='flex items-center gap-3'>
        <Skeleton className='h-10 w-10 rounded-full' />
        <div className='flex-1 space-y-2'>
          <Skeleton className='h-3.5 w-32' />
          <Skeleton className='h-3 w-24' />
        </div>
      </div>
      <div className='mt-3 space-y-2'>
        <Skeleton className='h-3.5 w-full' />
        <Skeleton className='h-3.5 w-5/6' />
      </div>
      <Skeleton className='mt-3 h-48 w-full rounded-lg' />
      <div className='mt-3 flex gap-4'>
        <Skeleton className='h-5 w-12' />
        <Skeleton className='h-5 w-12' />
        <Skeleton className='h-5 w-12' />
      </div>
    </div>
  )
}

export function FeedSkeleton() {
  return (
    <div className='space-y-4'>
      {[0, 1, 2].map((i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  )
}
