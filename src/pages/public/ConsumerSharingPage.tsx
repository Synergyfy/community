import { useQuery } from '@tanstack/react-query'
import { Share2 } from 'lucide-react'
import { discoverApi } from '@/services/discover.service'
import { useAuthStore } from '@/stores/auth.store'
import { SharingResults } from '@/components/sharing/SharingResults'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Link, useLocation } from 'react-router-dom'

/** My Sharing for consumer accounts (spec §4.4): links shared and their attributable activity. */
export function ConsumerSharingPage() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const { data: campaigns = [] } = useQuery({
    queryKey: ['discover', 'campaigns'],
    queryFn: () => discoverApi.getFeaturedCampaigns(),
  })

  // Guests get the sign-in handoff with return-to-action, not a blank page (§1).
  if (!user) {
    return (
      <div className='container-page max-w-2xl py-3 sm:py-4'>
        <EmptyState
          icon={<Share2 className='h-10 w-10' />}
          title='Sign in to see your sharing'
          description='The links you share and the activity attributed to them appear here.'
          action={
            <Link to='/auth/login' state={{ from: location }} className='btn-primary'>
              Sign in
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className='container-page max-w-2xl py-3 sm:py-4'>
      <SharingResults
        sharerId={user.id}
        title='My Sharing'
        subtitle='Links you have shared and what they led to.'
        campaigns={campaigns}
        emptyAction={
          <Link to='/community/campaigns'>
            <Button>Discover campaigns</Button>
          </Link>
        }
      />
    </div>
  )
}
