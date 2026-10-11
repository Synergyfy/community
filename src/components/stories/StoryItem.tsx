import { Avatar } from '@/components/ui/Avatar'
import type { PublicStory } from '@/types/community-public'
import { cn } from '@/lib/utils'

interface StoryItemProps {
  story: PublicStory
  onClick: () => void
  isViewed?: boolean
}

export function StoryItem({ story, onClick, isViewed }: StoryItemProps) {
  return (
    <button onClick={onClick} className='flex flex-col items-center gap-1 flex-shrink-0 w-16'>
      <div className={cn('p-0.5 rounded-full', isViewed ? 'bg-gray-200' : 'bg-gradient-to-r from-pink-500 to-orange-500')}>
        <div className='bg-white rounded-full p-0.5'>
          <Avatar src={story.author.avatarUrl} name={story.author.name} size='md' />
        </div>
      </div>
      <span className='text-xs text-gray-600 truncate w-full text-center'>{story.label || story.author.name}</span>
    </button>
  )
}
