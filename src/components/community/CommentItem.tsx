import { useState } from 'react'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/format'
import type { PublicComment } from '@/types/community-public'

interface CommentItemProps {
  comment: PublicComment
  liked?: boolean
  canDelete?: boolean
  onLike?: (comment: PublicComment) => void
  onDelete?: (comment: PublicComment) => void
  onReply?: (comment: PublicComment) => void
}

export function CommentItem({ comment, liked, canDelete, onLike, onDelete, onReply }: CommentItemProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className='flex items-start gap-2.5'>
      <Avatar src={comment.author.avatarUrl} name={comment.author.name} size='sm' />
      <div className='min-w-0 flex-1'>
        <div className='rounded-2xl bg-gray-100 px-3 py-2'>
          <p className='text-xs font-semibold text-gray-900'>{comment.author.name}</p>
          <p className='text-sm text-gray-800 whitespace-pre-line break-words'>{comment.content}</p>
        </div>
        <div className='mt-1 flex items-center gap-3 pl-1 text-xs text-gray-500'>
          <span>{timeAgo(comment.createdAt)}</span>
          <button onClick={() => onLike?.(comment)} className={cn('font-medium', liked ? 'text-red-500' : 'hover:text-gray-700')}>
            Like{comment.likeCount ? ` · ${comment.likeCount}` : ''}
          </button>
          {onReply && (
            <button onClick={() => onReply(comment)} className='font-medium hover:text-gray-700'>
              Reply
            </button>
          )}
          {(canDelete || onDelete) && (
            <div className='relative'>
              <button onClick={() => setMenuOpen((o) => !o)} className='hover:text-gray-700' aria-label='Comment options'>
                <MoreHorizontal className='h-3.5 w-3.5' />
              </button>
              {menuOpen && canDelete && (
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete?.(comment)
                  }}
                  className='absolute left-0 z-10 mt-1 flex items-center gap-1 whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-red-600 shadow-sm'
                >
                  <Trash2 className='h-3 w-3' /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
