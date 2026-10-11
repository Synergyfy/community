import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Gift, Megaphone, Share2 } from 'lucide-react'
import { entitiesApi } from '@/services/entities.service'
import { useAuthGate } from '@/hooks/useAuthGate'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ShareModal } from '@/components/sharing/ShareModal'

export function RewardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { requireAuth } = useAuthGate()
  const [shareOpen, setShareOpen] = useState(false)

  const { data: reward, isLoading, isError } = useQuery({
    queryKey: ['entity', 'reward', id],
    queryFn: () => entitiesApi.getReward(id as string),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className='container-page max-w-2xl py-4'>
        <Skeleton className='h-56 w-full rounded-xl' />
        <Skeleton className='mt-4 h-40 w-full rounded-lg' />
      </div>
    )
  }

  if (isError || !reward) {
    return (
      <div className='container-page max-w-2xl py-10'>
        <EmptyState
          icon={<Gift className='h-10 w-10' />}
          title='Reward not available'
          description='This reward may have ended or been removed.'
          action={<Button onClick={() => navigate('/community/discover')}>Discover rewards</Button>}
        />
      </div>
    )
  }

  return (
    <div className='container-page max-w-2xl py-3 sm:py-4'>
      <button onClick={() => navigate(-1)} className='mb-3 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900'>
        <ArrowLeft className='h-4 w-4' /> Back
      </button>

      <div className='card overflow-hidden'>
        {reward.imageUrl ? (
          <img src={reward.imageUrl} alt={reward.title} className='h-56 w-full object-cover' />
        ) : (
          <div className='flex h-40 items-center justify-center bg-amber-50 text-amber-500'>
            <Gift className='h-12 w-12' />
          </div>
        )}
        <div className='p-4'>
          <div className='flex items-center justify-between gap-2'>
            <span className='badge-warning'>Community Reward</span>
            <Badge variant={reward.status === 'available' ? 'success' : 'neutral'}>
              {reward.status === 'available' ? 'Available' : 'Ended'}
            </Badge>
          </div>
          <h1 className='mt-2 text-lg font-bold text-gray-900'>{reward.title}</h1>
          {reward.valueText && <p className='mt-1 text-sm font-semibold text-amber-700'>{reward.valueText}</p>}
          {reward.description && <p className='mt-3 whitespace-pre-line text-sm text-gray-700'>{reward.description}</p>}

          <div className='mt-4 flex gap-2'>
            {reward.campaignId && (
              <Link to={`/community/campaign/${reward.campaignId}`} className='btn-primary flex-1'>
                <Megaphone className='h-4 w-4' /> Back This Campaign
              </Link>
            )}
            <Button variant='secondary' icon={<Share2 className='h-4 w-4' />} onClick={() => requireAuth(() => setShareOpen(true))}>
              Share
            </Button>
          </div>
        </div>
      </div>

      {reward.howToQualify && (
        <div className='card mt-4 p-4'>
          <h2 className='flex items-center gap-1.5 text-sm font-semibold text-gray-900'>
            <CheckCircle2 className='h-4 w-4 text-secondary-600' /> How to qualify
          </h2>
          <p className='mt-2 text-sm text-gray-700'>{reward.howToQualify}</p>
        </div>
      )}

      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} targetType='reward' targetId={reward.id} title={reward.title} />
    </div>
  )
}
