import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import type { PublicReel } from '@/types/community-public'
import { ReelActions } from './ReelActions'

interface ReelViewerProps {
  reels: PublicReel[]
  startIndex: number
  onClose: () => void
  onLike?: (reel: PublicReel) => void
  onComment?: (reel: PublicReel) => void
  onShare?: (reel: PublicReel) => void
  onSave?: (reel: PublicReel) => void
  onOpenRelated?: (reel: PublicReel) => void
  likedIds?: string[]
  savedIds?: string[]
}

export function ReelViewer({
  reels,
  startIndex,
  onClose,
  onLike,
  onComment,
  onShare,
  onSave,
  onOpenRelated,
  likedIds = [],
  savedIds = [],
}: ReelViewerProps) {
  const [index, setIndex] = useState(startIndex)
  const videoRef = useRef<HTMLVideoElement>(null)
  const reel = reels[index]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && index < reels.length - 1) setIndex((i) => i + 1)
      if (e.key === 'ArrowLeft' && index > 0) setIndex((i) => i - 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [index, reels.length, onClose])

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.currentTime = 0
      void video.play().catch(() => {})
    }
  }, [index])

  if (!reel) return null

  const relatedLabels: Record<string, string> = {
    business: 'View Business',
    campaign: 'View Campaign',
    offer: 'View Offer',
    reward: 'View Reward',
    group: 'View Group',
  }
  const relatedLabel = reel.relatedType ? relatedLabels[reel.relatedType] : null

  return (
    <div className='fixed inset-0 z-50 bg-black flex items-center justify-center'>
      <div className='relative w-full max-w-md h-full max-h-[90vh] bg-gray-900 rounded-lg overflow-hidden'>
        <video
          ref={videoRef}
          src={reel.videoUrl}
          className='w-full h-full object-cover'
          autoPlay
          muted
          playsInline
          loop
        />
        <div className='absolute top-3 inset-x-0 flex items-center justify-between px-4 z-10'>
          <div className='flex items-center gap-2'>
            <Avatar src={reel.author.avatarUrl} name={reel.author.name} size='sm' />
            <span className='text-white text-sm font-medium'>{reel.author.name}</span>
          </div>
          <button onClick={onClose} className='text-white p-1'>
            <X className='h-6 w-6' />
          </button>
        </div>
        <div className='absolute right-3 bottom-24'>
          <ReelActions
            reel={reel}
            liked={likedIds.includes(reel.id)}
            saved={savedIds.includes(reel.id)}
            onLike={() => onLike?.(reel)}
            onComment={() => onComment?.(reel)}
            onShare={() => onShare?.(reel)}
            onSave={() => onSave?.(reel)}
          />
        </div>
        <div className='absolute bottom-0 inset-x-0 p-4 pr-16 bg-gradient-to-t from-black/70 to-transparent'>
          {reel.caption && <p className='text-white text-sm'>{reel.caption}</p>}
          {reel.hashtags && reel.hashtags.length > 0 && (
            <p className='text-white/80 text-xs mt-1'>{reel.hashtags.map((h) => `#${h}`).join(' ')}</p>
          )}
          {relatedLabel && (
            <button onClick={() => onOpenRelated?.(reel)} className='mt-2 text-white text-xs bg-white/20 rounded-full px-3 py-1'>
              {relatedLabel}
            </button>
          )}
        </div>
        <button
          className='absolute left-2 top-1/2 -translate-y-1/2 text-white/70 p-2'
          onClick={() => { if (index > 0) setIndex(index - 1) }}
        >
          <ChevronLeft className='h-6 w-6' />
        </button>
        <button
          className='absolute right-2 top-1/2 -translate-y-1/2 text-white/70 p-2'
          onClick={() => { if (index < reels.length - 1) setIndex(index + 1); else onClose() }}
        >
          <ChevronRight className='h-6 w-6' />
        </button>
      </div>
    </div>
  )
}
