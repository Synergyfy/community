import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ src, alt, name, size = 'md', className }: AvatarProps) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' }
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?'

  if (src) {
    return <img src={src} alt={alt || name || 'avatar'} className={cn('rounded-full object-cover', sizes[size], className)} />
  }
  return (
    <div className={cn('rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-medium', sizes[size], className)}>
      {initials}
    </div>
  )
}
