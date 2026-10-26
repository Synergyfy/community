import { useQuery } from '@tanstack/react-query'
import { businessApi } from '@/services/business.service'
import { useAuthStore } from '@/stores/auth.store'
import { SharingResults } from '@/components/sharing/SharingResults'
import { Button } from '@/components/ui/Button'
import { Link } from 'react-router-dom'

/** My Sharing Results for business accounts (spec §3.5). */
export function BusinessSharingPage() {
  const user = useAuthStore((s) => s.user)
  const { data } = useQuery({
    queryKey: ['business', 'dashboard'],
    queryFn: businessApi.getDashboard,
  })

  if (!user) return null

  return (
    <SharingResults
      sharerId={user.id}
      title='My Sharing Results'
      subtitle='What happened after your links were shared.'
      campaigns={data?.campaigns ?? []}
      emptyAction={
        (data?.campaigns?.length ?? 0) > 0 ? (
          <Link to='/business/campaigns'>
            <Button>Share a campaign</Button>
          </Link>
        ) : (
          <Link to='/business/campaigns'>
            <Button>Create a campaign first</Button>
          </Link>
        )
      }
    />
  )
}
