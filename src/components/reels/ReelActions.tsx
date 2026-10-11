import { Bookmark, Heart, MessageCircle, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PublicReel } from '@/types/community-public'

interface ReelActionsProps {
  reel: PublicReel
  liked?: boolean
  saved?: boolean
  onLike?: () => void
  onComment?: () => void
  onShare?: () => void
  onSave?: () => void
}

export function ReelActions({ reel, liked, saved, onLike, onComment, onShare, onSave }: ReelActionsProps) {
  return (
    <div className='flex flex-col items-center gap-4'>
      <button onClick={onLike} className='flex flex-col items-center text-white'>
        <Heart className={cn('h-7 w-7', liked && 'fill-red-500 text-red-500')} />
        <span className='text-xs'>{reel.likeCount ?? 0}</span>
      </button>
      <button onClick={onComment} className='flex flex-col items-center text-white'>
        <MessageCircle className='h-7 w-7' />
        <span className='text-xs'>{reel.commentCount ?? 0}</span>
      </button>
      <button onClick={onShare} className='flex flex-col items-center text-white'>
        <Share2 className='h-7 w-7' />
        <span className='text-xs'>{reel.shareCount ?? 0}</span>
      </button>
      <button onClick={onSave} className='text-white'>
        <Bookmark className={cn('h-7 w-7', saved && 'fill-white')} />
      </button>
    </div>
  )
}
