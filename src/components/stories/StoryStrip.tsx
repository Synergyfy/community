import type { PublicStory } from '@/types/community-public'
import { StoryItem } from './StoryItem'

interface StoryStripProps {
  stories: PublicStory[]
  onStoryClick: (story: PublicStory, index: number) => void
  viewedIds?: string[]
}

export function StoryStrip({ stories, onStoryClick, viewedIds = [] }: StoryStripProps) {
  return (
    <div className='flex gap-3 overflow-x-auto scrollbar-hide py-2 px-1'>
      {stories.map((s, i) => (
        <StoryItem key={s.id} story={s} onClick={() => onStoryClick(s, i)} isViewed={viewedIds.includes(s.id)} />
      ))}
    </div>
  )
}
