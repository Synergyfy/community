import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'
import type { PublicHashtag } from '@/types/community-public'

interface HashtagChipsProps {
  hashtags: PublicHashtag[]
  title?: string
}

export function HashtagChips({ hashtags, title = 'Trending in your Community' }: HashtagChipsProps) {
  if (hashtags.length === 0) return null
  return (
    <section>
      <div className='mb-2 flex items-center gap-1.5'>
        <Flame className='h-4 w-4 text-orange-500' />
        <h2 className='text-sm font-semibold text-gray-900'>{title}</h2>
      </div>
      <div className='flex flex-wrap gap-2'>
        {hashtags.map((tag) => (
          <Link
            key={tag.slug}
            to={`/community/discover/hashtag/${tag.slug}`}
            className='rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200'
          >
            #{tag.tag}
            <span className='ml-1.5 text-xs text-gray-400'>{tag.usageCount}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
