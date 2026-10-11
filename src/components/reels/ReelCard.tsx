import { Play } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import type { PublicReel } from '@/types/community-public'

interface ReelCardProps {
  reel: PublicReel
  onClick: () => void
}

export function ReelCard({ reel, onClick }: ReelCardProps) {
  return (
    <button onClick={onClick} className='relative flex-shrink-0 w-40 h-56 rounded-lg overflow-hidden bg-gray-200 group'>
      {reel.coverImageUrl ? (
        <img src={reel.coverImageUrl} alt={reel.caption || 'reel'} className='w-full h-full object-cover' />
      ) : (
        <video src={reel.videoUrl} className='w-full h-full object-cover' muted playsInline />
      )}
      <div className='absolute inset-0 bg-gradient-to-t from-black/70 to-transparent' />
      <div className='absolute top-2 left-2'>
        <Avatar src={reel.author.avatarUrl} name={reel.author.name} size='sm' />
      </div>
      <div className='absolute bottom-2 left-2 right-2 text-left'>
        <p className='text-white text-xs font-medium truncate'>{reel.author.name}</p>
        {reel.caption && <p className='text-white/80 text-[11px] line-clamp-2'>{reel.caption}</p>}
      </div>
      <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition'>
        <Play className='h-8 w-8 text-white' />
      </div>
    </button>
  )
}
