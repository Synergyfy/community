import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MediaPreviewProps {
  urls: string[]
  className?: string
}

export function MediaPreview({ urls, className }: MediaPreviewProps) {
  const [errored, setErrored] = useState<Record<number, boolean>>({})
  if (!urls || urls.length === 0) return null

  const gridClass =
    urls.length === 1
      ? 'grid-cols-1'
      : urls.length === 2
        ? 'grid-cols-2'
        : 'grid-cols-2'

  return (
    <div className={cn('grid gap-0.5 rounded-lg overflow-hidden', gridClass, className)}>
      {urls.slice(0, 4).map((url, i) => (
        <div
          key={i}
          className={cn(
            'relative bg-gray-100',
            urls.length === 1 ? 'aspect-[16/10]' : 'aspect-square',
            urls.length === 3 && i === 0 && 'row-span-2 aspect-auto',
          )}
        >
          {errored[i] ? (
            <div className='w-full h-full flex items-center justify-center text-gray-400'>
              <ImageOff className='h-6 w-6' />
            </div>
          ) : (
            <img
              src={url}
              alt=''
              loading='lazy'
              className='w-full h-full object-cover'
              onError={() => setErrored((prev) => ({ ...prev, [i]: true }))}
            />
          )}
          {i === 3 && urls.length > 4 && (
            <div className='absolute inset-0 bg-black/50 text-white flex items-center justify-center text-lg font-semibold'>
              +{urls.length - 4}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
