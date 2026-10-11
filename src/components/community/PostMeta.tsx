import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { timeAgo, locationLabel } from '@/lib/format'
import type { PublicPost } from '@/types/community-public'

interface PostMetaProps {
  post: PublicPost
  subtitle?: string
  className?: string
}

export function PostMeta({ post, subtitle, className }: PostMetaProps) {
  const who =
    post.author.userType === 'business' ? 'Business' : post.author.userType === 'admin' ? 'Admin' : 'Consumer'
  const variant = who === 'Business' ? 'primary' : who === 'Admin' ? 'warning' : 'neutral'
  const loc = locationLabel(post.location)

  return (
    <div className={cn('flex items-center gap-1.5 text-xs text-gray-500', className)}>
      <Badge variant={variant} className='px-1.5 py-0 text-[10px]'>
        {who}
      </Badge>
      {post.author.isVerified && <span className='text-primary-600'>✓</span>}
      {loc && <span>· {loc}</span>}
      <span>· {timeAgo(post.createdAt)}</span>
      {subtitle && <span className='truncate'>· {subtitle}</span>}
    </div>
  )
}
