import { Bookmark, Heart, MessageCircle, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PostActionsProps {
  likeCount?: number
  commentCount?: number
  shareCount?: number
  liked?: boolean
  saved?: boolean
  onLike?: () => void
  onComment?: () => void
  onShare?: () => void
  onSave?: () => void
}

export function PostActions({
  likeCount = 0,
  commentCount = 0,
  shareCount = 0,
  liked,
  saved,
  onLike,
  onComment,
  onShare,
  onSave,
}: PostActionsProps) {
  return (
    <div className='flex items-center gap-5 pt-2'>
      <button onClick={onLike} className={cn('flex items-center gap-1.5 text-sm', liked ? 'text-red-500' : 'text-gray-600 hover:text-red-500')}>
        <Heart className={cn('h-5 w-5', liked && 'fill-red-500')} />
        <span>{likeCount}</span>
      </button>
      <button onClick={onComment} className='flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600'>
        <MessageCircle className='h-5 w-5' />
        <span>{commentCount}</span>
      </button>
      <button onClick={onShare} className='flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600'>
        <Share2 className='h-5 w-5' />
        <span>{shareCount}</span>
      </button>
      {onSave && (
        <button onClick={onSave} className={cn('ml-auto text-gray-600 hover:text-primary-600', saved && 'text-primary-600')}>
          <Bookmark className={cn('h-5 w-5', saved && 'fill-primary-600')} />
        </button>
      )}
    </div>
  )
}
