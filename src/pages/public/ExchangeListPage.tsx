import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MapPin, Plus, Repeat } from 'lucide-react'
import { discoverApi } from '@/services/discover.service'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useCommunityLocation } from '@/hooks/useCommunityLocation'
import { useAuthStore } from '@/stores/auth.store'
import { EXCHANGE_TYPE_OPTIONS, exchangeTypeLabel } from '@/lib/exchange'
import { ExchangeType } from '@/lib/constants'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { locationLabel, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ExchangeType as ExchangeTypeValue } from '@/lib/constants'
import type { PublicExchange } from '@/types/community-public'

type TypeFilter = 'all' | ExchangeTypeValue

const FILTERS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  ...EXCHANGE_TYPE_OPTIONS.map((o) => ({ id: o.id as TypeFilter, label: o.label })),
]

export function ExchangeListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { requireAuth } = useAuthGate()
  const { user } = useAuthStore()
  const location = useCommunityLocation()

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [composerOpen, setComposerOpen] = useState(false)

  const [exchangeType, setExchangeType] = useState<ExchangeTypeValue>(ExchangeType.OFFER_REQUEST)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [offering, setOffering] = useState('')
  const [seeking, setSeeking] = useState('')

  const { data: exchanges = [], isLoading } = useQuery({
    queryKey: ['community', 'exchanges', location?.cityName],
    queryFn: () => discoverApi.getExchanges(location?.cityName),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      discoverApi.createExchange({
        exchangeType,
        title: title.trim(),
        description: description.trim(),
        offering: offering.trim(),
        seeking: seeking.trim(),
        location: location,
        author: user ?? { id: 'me', name: 'You', userType: 'consumer', avatarUrl: null },
      }),
    onSuccess: (exchange) => {
      void queryClient.invalidateQueries({ queryKey: ['community', 'exchanges'] })
      reset()
      setComposerOpen(false)
      navigate(`/community/exchange/${exchange.id}`)
    },
  })

  const reset = () => {
    setExchangeType(ExchangeType.OFFER_REQUEST)
    setTitle('')
    setDescription('')
    setOffering('')
    setSeeking('')
  }

  const canSubmit =
    title.trim().length > 2 && offering.trim().length > 0 && seeking.trim().length > 0 && !createMutation.isPending

  const filtered = typeFilter === 'all' ? exchanges : exchanges.filter((e) => e.exchangeType === typeFilter)

  const openComposer = () => requireAuth(() => setComposerOpen(true))

  return (
    <div className='container-page max-w-2xl space-y-4 py-3 sm:py-4'>
      <button onClick={() => navigate(-1)} className='flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900'>
        <ArrowLeft className='h-4 w-4' /> Back
      </button>

      <div className='flex items-start justify-between gap-3'>
        <header className='space-y-1'>
          <h1 className='flex items-center gap-2 text-xl font-bold text-gray-900'>
            <Repeat className='h-5 w-5 text-primary-600' /> #Exchange
          </h1>
          <p className='text-sm text-gray-600'>
            Swap, trade and share resources with neighbours in {location?.cityName || 'your Community'}.
          </p>
        </header>
        <Button size='sm' icon={<Plus className='h-4 w-4' />} onClick={openComposer}>
          Post
        </Button>
      </div>

      <div className='flex gap-1 overflow-x-auto border-b border-gray-200 scrollbar-hide'>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setTypeFilter(f.id)}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              typeFilter === f.id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-800',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className='space-y-3'>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className='h-24 w-full rounded-lg' />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Repeat className='h-10 w-10' />}
          title={typeFilter === 'all' ? 'No exchanges near you yet' : 'No exchanges of this type'}
          description='When neighbours post items to swap or trade, they will appear here.'
          action={<Button onClick={openComposer}>Post an exchange</Button>}
        />
      ) : (
        <div className='space-y-3'>
          {filtered.map((exchange) => (
            <ExchangeRow key={exchange.id} exchange={exchange} />
          ))}
        </div>
      )}

      <Modal isOpen={composerOpen} onClose={() => setComposerOpen(false)} title='Post an exchange'>
        <div className='space-y-4'>
          <div className='flex gap-1.5 overflow-x-auto scrollbar-hide'>
            {EXCHANGE_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type='button'
                onClick={() => setExchangeType(opt.id)}
                className={cn(
                  'whitespace-nowrap rounded-full border px-3 py-1.5 text-sm',
                  exchangeType === opt.id
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder='What is this exchange about?' />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder='Add any details…'
            className='textarea-field w-full'
          />

          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <div className='form-group'>
              <label className='label'>Offering</label>
              <Input value={offering} onChange={(e) => setOffering(e.target.value)} placeholder='e.g. Meeting space' />
            </div>
            <div className='form-group'>
              <label className='label'>Seeking</label>
              <Input value={seeking} onChange={(e) => setSeeking(e.target.value)} placeholder='e.g. Marketing help' />
            </div>
          </div>

          <div className='flex justify-end gap-2'>
            <Button variant='secondary' onClick={() => setComposerOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!canSubmit} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? 'Posting…' : 'Post exchange'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ExchangeRow({ exchange }: { exchange: PublicExchange }) {
  return (
    <Link to={`/community/exchange/${exchange.id}`} className='card block p-3 transition hover:shadow-md'>
      <div className='flex items-start gap-3'>
        <span className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600'>
          <Repeat className='h-4 w-4' />
        </span>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center justify-between gap-2'>
            <p className='truncate text-sm font-semibold text-gray-900'>{exchange.title}</p>
            <span className='badge-neutral shrink-0'>{exchangeTypeLabel(exchange.exchangeType)}</span>
          </div>
          <p className='mt-0.5 line-clamp-2 text-xs text-gray-600'>{exchange.description}</p>
          <div className='mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500'>
            <span>
              Offering: <span className='text-gray-700'>{exchange.offering}</span>
            </span>
            <span>
              Seeking: <span className='text-gray-700'>{exchange.seeking}</span>
            </span>
          </div>
          <div className='mt-1 flex items-center gap-3 text-xs text-gray-400'>
            <span>by {exchange.creator.name} · {timeAgo(exchange.createdAt)}</span>
            {locationLabel(exchange.location) && (
              <span className='flex items-center gap-0.5'>
                <MapPin className='h-3 w-3' /> {locationLabel(exchange.location)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
