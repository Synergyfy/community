import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Flag, Pencil, Plus, Share2, Trash2 } from 'lucide-react'
import { businessApi } from '@/services/business.service'
import type { PublicCampaign } from '@/types/community-public'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { CampaignShareModal } from '@/components/business/CampaignShareModal'
import { formatDate, formatPence } from './helpers'

function toDateInput(value?: string | Date | null): string {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

const STATUS_VARIANT = { active: 'success', ended: 'neutral', upcoming: 'primary' } as const

export function BusinessCampaignsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['business', 'dashboard'],
    queryFn: businessApi.getDashboard,
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PublicCampaign | null>(null)
  const [sharing, setSharing] = useState<PublicCampaign | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [endDate, setEndDate] = useState('')
  const [formError, setFormError] = useState('')

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['business', 'dashboard'] })

  const createMutation = useMutation({
    mutationFn: (input: { title: string; description: string; endDate?: string }) => businessApi.createCampaign(input),
    onSuccess: () => {
      closeModal()
      void invalidate()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { title: string; description: string; endDate?: string } }) =>
      businessApi.updateCampaign(id, input),
    onSuccess: () => {
      closeModal()
      void invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => businessApi.deleteCampaign(id),
    onSuccess: () => void invalidate(),
  })

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setTitle('')
    setDescription('')
    setEndDate('')
    setFormError('')
  }

  const openCreate = () => {
    setEditing(null)
    setTitle('')
    setDescription('')
    setEndDate('')
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (campaign: PublicCampaign) => {
    setEditing(campaign)
    setTitle(campaign.title)
    setDescription(campaign.description ?? '')
    setEndDate(toDateInput(campaign.endDate))
    setFormError('')
    setModalOpen(true)
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return setFormError('Add a title for your campaign.')
    const input = {
      title: title.trim(),
      description: description.trim(),
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    }
    if (editing) updateMutation.mutate({ id: editing.id, input })
    else createMutation.mutate(input)
  }

  const remove = (campaign: PublicCampaign) => {
    if (window.confirm(`Delete "${campaign.title}"?`)) deleteMutation.mutate(campaign.id)
  }

  const campaigns = data?.campaigns ?? []
  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-bold text-gray-900'>Campaigns</h2>
          <p className='text-sm text-gray-600'>Fundraisers and community initiatives you run.</p>
        </div>
        <Button size='sm' icon={<Plus className='h-4 w-4' />} onClick={openCreate}>
          New campaign
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className='h-40 w-full' />
      ) : campaigns.length === 0 ? (
        <div className='card'>
          <EmptyState
            icon={<Flag className='h-10 w-10' />}
            title='No campaigns yet'
            description='Start a campaign to rally your community around a cause.'
            action={<Button onClick={openCreate}>Create your first campaign</Button>}
          />
        </div>
      ) : (
        <div className='space-y-3'>
          {campaigns.map((campaign) => {
            const goal = campaign.goalAmountPence ?? 0
            const raised = campaign.raisedAmountPence ?? 0
            const progress = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0
            return (
              <div key={campaign.id} className='card'>
                <div className='card-content space-y-3'>
                  <div className='flex items-start justify-between gap-2'>
                    <div className='min-w-0'>
                      <h3 className='text-sm font-semibold text-gray-900'>{campaign.title}</h3>
                      {campaign.description && <p className='mt-1 text-sm text-gray-600'>{campaign.description}</p>}
                    </div>
                    <div className='flex shrink-0 items-center gap-1'>
                      <button
                        onClick={() => setSharing(campaign)}
                        className='btn-icon text-gray-500 hover:text-primary-600'
                        aria-label='Share campaign'
                        title='Share & promote'
                      >
                        <Share2 className='h-4 w-4' />
                      </button>
                      <button
                        onClick={() => openEdit(campaign)}
                        className='btn-icon text-gray-500 hover:text-gray-900'
                        aria-label='Edit campaign'
                      >
                        <Pencil className='h-4 w-4' />
                      </button>
                      <button
                        onClick={() => remove(campaign)}
                        className='btn-icon text-gray-500 hover:text-red-600'
                        aria-label='Delete campaign'
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </div>
                  </div>
                  {goal > 0 && (
                    <div>
                      <div className='h-2 w-full overflow-hidden rounded-full bg-gray-100'>
                        <div className='h-full rounded-full bg-primary-600' style={{ width: `${progress}%` }} />
                      </div>
                      <p className='mt-1.5 text-xs text-gray-500'>
                        {formatPence(raised)} raised of {formatPence(goal)} goal ({progress}%)
                      </p>
                    </div>
                  )}
                  <div className='flex items-center gap-2 text-xs text-gray-500'>
                    <Badge variant={STATUS_VARIANT[campaign.status ?? 'active'] ?? 'neutral'}>
                      {campaign.status ?? 'active'}
                    </Badge>
                    <span>Ends {formatDate(campaign.endDate)}</span>
                    {campaign.supporterCount !== undefined && <span>{campaign.supporterCount} supporters</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {sharing && <CampaignShareModal campaign={sharing} onClose={() => setSharing(null)} />}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit campaign' : 'New campaign'}>
        <form className='space-y-3' onSubmit={save}>
          <div className='form-group'>
            <label htmlFor='campaign-title' className='label'>
              Title
            </label>
            <input
              id='campaign-title'
              className='input-field'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g. Winter Warmth Appeal'
            />
          </div>
          <div className='form-group'>
            <label htmlFor='campaign-description' className='label'>
              Description
            </label>
            <textarea
              id='campaign-description'
              className='textarea-field'
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='What is the campaign about and how will funds be used?'
            />
          </div>
          <div className='form-group'>
            <label htmlFor='campaign-end' className='label'>
              End date <span className='font-normal text-gray-400'>(optional)</span>
            </label>
            <input
              id='campaign-end'
              type='date'
              className='input-field'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {formError && <p className='error-text'>{formError}</p>}
          <div className='flex justify-end gap-2'>
            <Button type='button' variant='secondary' size='sm' onClick={closeModal}>
              Cancel
            </Button>
            <Button type='submit' size='sm' disabled={!title.trim() || saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create campaign'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
