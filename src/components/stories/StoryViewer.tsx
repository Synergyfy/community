import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Heart, MessageCircle, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import type { PublicStory } from '@/types/community-public'

interface StoryViewerProps {
  stories: PublicStory[]
  startIndex: number
  onClose: () => void
  onAction?: (action: 'like' | 'comment' | 'share', story: PublicStory) => void
  onOpenRelated?: (story: PublicStory) => void
  viewedIds?: string[]
  onViewed?: (id: string) => void
}

export function StoryViewer({ stories, startIndex, onClose, onAction, onOpenRelated, viewedIds = [], onViewed }: StoryViewerProps) {
  const [index, setIndex] = useState(startIndex)
  const [paused, setPaused] = useState(false)
  const story = stories[index]

  useEffect(() => {
    if (!story || !onViewed) return
    if (!viewedIds.includes(story.id)) onViewed(story.id)
  }, [index, story, onViewed, viewedIds])

  useEffect(() => {
    if (!story || paused) return
    const timer = setTimeout(() => {
      if (index < stories.length - 1) setIndex((i) => i + 1)
      else onClose()
    }, 5000)
    return () => clearTimeout(timer)
  }, [index, story, paused, stories.length, onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && index < stories.length - 1) setIndex((i) => i + 1)
      if (e.key === 'ArrowLeft' && index > 0) setIndex((i) => i - 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [index, stories.length, onClose])

  if (!story) return null

  const relatedLabels: Record<string, string> = {
    business: 'View Business',
    campaign: 'View Campaign',
    offer: 'View Offer',
    reward: 'View Reward',
    group: 'View Group',
  }
  const relatedLabel = story.relatedType ? relatedLabels[story.relatedType] : null

  return (
    <div className='fixed inset-0 z-50 bg-black flex items-center justify-center' onClick={() => setPaused((p) => !p)}>
      <div className='relative w-full max-w-md h-full max-h-[90vh] bg-gray-900 rounded-lg overflow-hidden' onClick={(e) => e.stopPropagation()}>
        <div className='flex gap-1 p-2 absolute top-0 inset-x-0 z-10'>
          {stories.map((s, i) => (
            <div key={s.id} className='flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden'>
              <div
                className={cn(
                  'h-full bg-white transition-all',
                  i < index ? 'w-full' : i === index && !paused ? 'w-full duration-[5000ms]' : i === index ? 'w-1/3' : 'w-0',
                )}
              />
            </div>
          ))}
        </div>
        <div className='absolute top-6 inset-x-0 flex items-center justify-between px-4 z-10'>
          <div className='flex items-center gap-2'>
            <Avatar src={story.author.avatarUrl} name={story.author.name} size='sm' />
            <span className='text-white text-sm font-medium'>{story.author.name}</span>
          </div>
          <button onClick={onClose} className='text-white p-1'>
            <X className='h-6 w-6' />
          </button>
        </div>
        <div className='w-full h-full flex items-center justify-center'>
          {story.imageUrl ? (
            <img src={story.imageUrl} alt={story.label || 'story'} className='w-full h-full object-cover' />
          ) : story.videoUrl ? (
            <video src={story.videoUrl} className='w-full h-full object-cover' autoPlay muted playsInline />
          ) : (
            <div className='text-gray-400'>Story</div>
          )}
        </div>
        <button
          className='absolute left-2 top-1/2 -translate-y-1/2 text-white p-2'
          onClick={(e) => { e.stopPropagation(); if (index > 0) setIndex(index - 1) }}
        >
          <ChevronLeft className='h-6 w-6' />
        </button>
        <button
          className='absolute right-2 top-1/2 -translate-y-1/2 text-white p-2'
          onClick={(e) => { e.stopPropagation(); if (index < stories.length - 1) setIndex(index + 1); else onClose() }}
        >
          <ChevronRight className='h-6 w-6' />
        </button>
        <div className='absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/70 to-transparent flex items-center gap-4' onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onAction?.('like', story)} className='text-white flex items-center gap-1'><Heart className='h-6 w-6' /></button>
          <button onClick={() => onAction?.('comment', story)} className='text-white'><MessageCircle className='h-6 w-6' /></button>
          {relatedLabel && (
            <button onClick={() => onOpenRelated?.(story)} className='ml-auto text-white text-sm bg-white/20 rounded-full px-3 py-1'>
              {relatedLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
