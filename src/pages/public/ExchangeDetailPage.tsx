import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, Clock, MapPin, Repeat, Share2 } from 'lucide-react'
import { discoverApi } from '@/services/discover.service'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useExchangeRequests } from '@/hooks/useExchangeRequests'
import { useNotificationsStore } from '@/stores/notifications.store'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Modal } from '@/components/ui/Modal'
import { ShareModal } from '@/components/sharing/ShareModal'
import { exchangeTypeLabel } from '@/lib/exchange'
import { locationLabel, timeAgo, timeUntil } from '@/lib/format'

export function ExchangeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { requireAuth } = useAuthGate()
  const { isRequested, requestExchange, cancelRequest } = useExchangeRequests()
  const addNotification = useNotificationsStore((s) => s.addNotification)

  const [shareOpen, setShareOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [message, setMessage] = useState('')

  const { data: exchange, isLoading, isError } = useQuery({
    queryKey: ['community', 'exchange', id],
    queryFn: () => discoverApi.getExchange(id as string),
    enabled: !!id,
  })

  const submitRequest = () => {
    if (!exchange) return
    void discoverApi.requestExchange(exchange.id, message.trim() || undefined)
    requestExchange(exchange.id, message.trim())
    addNotification({
      type: 'exchange',
      title: 'Exchange request sent',
      body: `Your request for “${exchange.title}” is pending.`,
      link: `/community/exchange/${exchange.id}`,
    })
    setRequestOpen(false)
    setMessage('')
  }

  if (isLoading) {
    return (
      <div className='container-page max-w-2xl py-4'>
        <Skeleton className='h-56 w-full rounded-xl' />
        <Skeleton className='mt-4 h-40 w-full rounded-lg' />
      </div>
    )
  }

  if (isError || !exchange) {
    return (
      <div className='container-page max-w-2xl py-10'>
        <EmptyState
          icon={<Repeat className='h-10 w-10' />}
          title='Exchange not available'
          description='This exchange may have been completed or removed.'
          action={<button className='btn-primary' onClick={() => navigate('/community/discover/exchanges')}>Browse exchanges</button>}
        />
      </div>
    )
  }

  return (
    <div className='container-page max-w-2xl py-3 sm:py-4'>
      <button onClick={() => navigate(-1)} className='mb-3 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900'>
        <ArrowLeft className='h-4 w-4' /> Back
      </button>

      <article className='card overflow-hidden'>
        {exchange.images && exchange.images.length > 0 ? (
          <img src={exchange.images[0]} alt={exchange.title} className='h-56 w-full object-cover' />
        ) : (
          <div className='flex h-32 items-center justify-center bg-primary-50 text-primary-600'>
            <Repeat className='h-10 w-10' />
          </div>
        )}

        <div className='p-4'>
          <div className='flex items-start justify-between gap-2'>
            <div className='min-w-0'>
              <span className='badge-primary'>{exchangeTypeLabel(exchange.exchangeType)}</span>
              <h1 className='mt-2 text-xl font-bold text-gray-900'>{exchange.title}</h1>
            </div>
            <span className='badge-neutral shrink-0 capitalize'>{exchange.status}</span>
          </div>

          <div className='mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500'>
            <span className='flex items-center gap-1.5'>
              <Avatar src={exchange.creator.avatarUrl} name={exchange.creator.name} size='sm' className='h-5 w-5' />
              {exchange.creator.name}
            </span>
            {locationLabel(exchange.location) && (
              <span className='flex items-center gap-0.5'>
                <MapPin className='h-3.5 w-3.5' /> {locationLabel(exchange.location)}
              </span>
            )}
            <span className='text-gray-400'>{timeAgo(exchange.createdAt)}</span>
            {exchange.expiresAt && (
              <span className='flex items-center gap-0.5'>
                <Clock className='h-3.5 w-3.5' /> {timeUntil(exchange.expiresAt)}
              </span>
            )}
          </div>

          {exchange.description && <p className='mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700'>{exchange.description}</p>}

          <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <div className='rounded-lg border border-gray-200 p-3'>
              <p className='text-xs font-medium uppercase tracking-wide text-gray-400'>Offering</p>
              <p className='mt-1 text-sm text-gray-800'>{exchange.offering}</p>
            </div>
            <div className='rounded-lg border border-gray-200 p-3'>
              <p className='text-xs font-medium uppercase tracking-wide text-gray-400'>Seeking</p>
              <p className='mt-1 text-sm text-gray-800'>{exchange.seeking}</p>
            </div>
          </div>

          <div className='mt-4 flex gap-2'>
            {isRequested(exchange.id) ? (
              <Button
                className='flex-1'
                variant='secondary'
                icon={<Check className='h-4 w-4' />}
                onClick={() => cancelRequest(exchange.id)}
              >
                Request pending · Cancel
              </Button>
            ) : (
              <Button
                className='flex-1'
                icon={<Repeat className='h-4 w-4' />}
                onClick={() => requireAuth(() => setRequestOpen(true))}
                disabled={exchange.status !== 'active'}
              >
                Request an exchange
              </Button>
            )}
            <Button variant='secondary' icon={<Share2 className='h-4 w-4' />} onClick={() => requireAuth(() => setShareOpen(true))}>
              Share
            </Button>
          </div>

          {isRequested(exchange.id) && (
            <p className='mt-2 text-xs text-amber-600'>Your request has been sent. You will be notified when it is accepted.</p>
          )}
        </div>
      </article>

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        targetType='exchange'
        targetId={exchange.id}
        title={exchange.title}
      />

      <Modal isOpen={requestOpen} onClose={() => setRequestOpen(false)} title='Request an exchange'>
        <div className='space-y-4'>
          <p className='text-sm text-gray-600'>
            Send a short message to {exchange.creator.name} about what you can offer.
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            autoFocus
            placeholder='Hi! I can help with…'
            className='textarea-field w-full'
          />
          <div className='flex justify-end gap-2'>
            <Button variant='secondary' onClick={() => setRequestOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitRequest}>Send request</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
