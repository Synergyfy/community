import { useQuery } from '@tanstack/react-query'
import { MapPin, Megaphone, Pin } from 'lucide-react'
import { announcementsService } from '@/services/announcements.service'
import { useAuthStore } from '@/stores/auth.store'
import { useCommunityLocation } from '@/hooks/useCommunityLocation'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/pages/business/helpers'
import { cn } from '@/lib/utils'
import type { Announcement } from '@/types/community-public'

/**
 * Announcement fan-out strip (spec §4, §15): every surface renders the SAME
 * announcement records through one component — audience, location and group
 * targeting are applied centrally by `announcementsService.isTargetedAt`,
 * never reimplemented per dashboard. Surfaces: Community Home (public +
 * consumer), Business Overview, group pages (group-scoped), and any
 * location-aware view via the viewer's location.
 */

interface AnnouncementStripProps {
  /** Group surface: only announcements scoped to this group are shown. */
  groupId?: string
  heading?: string
  className?: string
}

const AUDIENCE_LABEL: Record<Announcement['audience'], string> = {
  both: 'Everyone',
  business: 'Businesses',
  consumer: 'Consumers',
}

export function AnnouncementStrip({ groupId, heading = 'Announcements', className }: AnnouncementStripProps) {
  const user = useAuthStore((s) => s.user)
  const location = useCommunityLocation()

  const viewer = {
    userType: user?.userType ?? 'public',
    location,
  }

  const { data: items = [] } = useQuery({
    queryKey: ['announcements', 'visible', viewer.userType, location?.cityName ?? null, groupId ?? null],
    queryFn: () => announcementsService.listVisibleFor(viewer, { groupId }),
  })

  if (items.length === 0) return null

  return (
    <section aria-label='Announcements' className={cn('space-y-2', className)}>
      <h2 className='text-sm font-semibold text-gray-900'>{heading}</h2>
      {items.map((a) => (
        <article key={a.id} className='card border-primary-200 bg-primary-50/40 p-3'>
          <p className='flex items-center gap-1.5 text-sm font-semibold text-gray-900'>
            {a.isPinned ? (
              <Pin className='h-3.5 w-3.5 shrink-0 text-primary-600' />
            ) : (
              <Megaphone className='h-3.5 w-3.5 shrink-0 text-primary-600' />
            )}
            {a.title}
          </p>
          <p className='mt-0.5 line-clamp-2 text-sm text-gray-600'>{a.content}</p>
          <div className='mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500'>
            <span className='rounded-full border border-gray-200 bg-white/70 px-2 py-0.5'>{AUDIENCE_LABEL[a.audience]}</span>
            {a.location?.cityName && (
              <span className='flex items-center gap-1 rounded-full border border-gray-200 bg-white/70 px-2 py-0.5'>
                <MapPin className='h-3 w-3' /> {a.location.cityName}
              </span>
            )}
            {a.groupId && <span className='rounded-full border border-gray-200 bg-white/70 px-2 py-0.5'>Group only</span>}
            {a.status === 'published' && a.expiresAt && <span>Expires {formatDate(a.expiresAt)}</span>}
            {a.source === 'demo' && <Badge variant='neutral'>demo</Badge>}
          </div>
        </article>
      ))}
    </section>
  )
}
