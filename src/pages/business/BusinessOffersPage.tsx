import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Pencil, Plus, Trash2 } from 'lucide-react'
import { businessApi } from '@/services/business.service'
import type { PublicOffer } from '@/types/community-public'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from './helpers'

function toDateInput(value?: string | Date | null): string {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

export function BusinessOffersPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['business', 'dashboard'],
    queryFn: businessApi.getDashboard,
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PublicOffer | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [formError, setFormError] = useState('')

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['business', 'dashboard'] })

  const createMutation = useMutation({
    mutationFn: (input: { title: string; description: string; expiryDate?: string }) => businessApi.createOffer(input),
    onSuccess: () => {
      closeModal()
      void invalidate()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { title: string; description: string; expiryDate?: string } }) =>
      businessApi.updateOffer(id, input),
    onSuccess: () => {
      closeModal()
      void invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => businessApi.deleteOffer(id),
    onSuccess: () => void invalidate(),
  })

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setTitle('')
    setDescription('')
    setExpiryDate('')
    setFormError('')
  }

  const openCreate = () => {
    setEditing(null)
    setTitle('')
    setDescription('')
    setExpiryDate('')
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (offer: PublicOffer) => {
    setEditing(offer)
    setTitle(offer.title)
    setDescription(offer.description ?? '')
    setExpiryDate(toDateInput(offer.expiryDate))
    setFormError('')
    setModalOpen(true)
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return setFormError('Add a title for your offer.')
    const input = {
      title: title.trim(),
      description: description.trim(),
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
    }
    if (editing) updateMutation.mutate({ id: editing.id, input })
    else createMutation.mutate(input)
  }

  const remove = (offer: PublicOffer) => {
    if (window.confirm(`Delete "${offer.title}"?`)) deleteMutation.mutate(offer.id)
  }

  const offers = data?.offers ?? []
  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-bold text-gray-900'>Offers</h2>
          <p className='text-sm text-gray-600'>Deals your community can redeem.</p>
        </div>
        <Button size='sm' icon={<Plus className='h-4 w-4' />} onClick={openCreate}>
          New offer
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className='h-40 w-full' />
      ) : offers.length === 0 ? (
        <div className='card'>
          <EmptyState
            icon={<Package className='h-10 w-10' />}
            title='No offers yet'
            description='Create a special deal to attract local customers.'
            action={<Button onClick={openCreate}>Create your first offer</Button>}
          />
        </div>
      ) : (
        <div className='space-y-3'>
          {offers.map((offer) => {
            const expired = offer.expiryDate && new Date(offer.expiryDate).getTime() < Date.now()
            return (
              <div key={offer.id} className='card'>
                <div className='card-content space-y-2'>
                  <div className='flex items-start justify-between gap-2'>
                    <h3 className='text-sm font-semibold text-gray-900'>{offer.title}</h3>
                    <div className='flex shrink-0 items-center gap-1'>
                      <button onClick={() => openEdit(offer)} className='btn-icon text-gray-500 hover:text-gray-900' aria-label='Edit offer'>
                        <Pencil className='h-4 w-4' />
                      </button>
                      <button
                        onClick={() => remove(offer)}
                        className='btn-icon text-gray-500 hover:text-red-600'
                        aria-label='Delete offer'
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </div>
                  </div>
                  {offer.description && <p className='text-sm text-gray-600'>{offer.description}</p>}
                  <div className='flex items-center gap-2 text-xs text-gray-500'>
                    <span>Expires {formatDate(offer.expiryDate)}</span>
                    {expired && <Badge variant='danger'>Expired</Badge>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit offer' : 'New offer'}>
        <form className='space-y-3' onSubmit={save}>
          <div className='form-group'>
            <label htmlFor='offer-title' className='label'>
              Title
            </label>
            <input
              id='offer-title'
              className='input-field'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g. 20% off weekdays'
            />
          </div>
          <div className='form-group'>
            <label htmlFor='offer-description' className='label'>
              Description
            </label>
            <textarea
              id='offer-description'
              className='textarea-field'
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Describe the deal and how to redeem it…'
            />
          </div>
          <div className='form-group'>
            <label htmlFor='offer-expiry' className='label'>
              Expiry date <span className='font-normal text-gray-400'>(optional)</span>
            </label>
            <input
              id='offer-expiry'
              type='date'
              className='input-field'
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          {formError && <p className='error-text'>{formError}</p>}
          <div className='flex justify-end gap-2'>
            <Button type='button' variant='secondary' size='sm' onClick={closeModal}>
              Cancel
            </Button>
            <Button type='submit' size='sm' disabled={!title.trim() || saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create offer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
