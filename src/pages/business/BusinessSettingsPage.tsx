import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, LifeBuoy } from 'lucide-react'
import { businessApi } from '@/services/business.service'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'

export function BusinessSettingsPage() {
  const queryClient = useQueryClient()
  const { user, setUser } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['business', 'dashboard'],
    queryFn: businessApi.getDashboard,
  })

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [cityName, setCityName] = useState('')
  const [areaName, setAreaName] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!data) return
    setName(data.business.name)
    setCategory(data.business.category ?? '')
    setDescription(data.business.description ?? '')
    setCityName(data.business.location?.cityName ?? '')
    setAreaName(data.business.location?.areaName ?? '')
  }, [data])

  const mutation = useMutation({
    mutationFn: () =>
      businessApi.updateBusiness({ name: name.trim(), category: category.trim(), description: description.trim(), cityName: cityName.trim(), areaName: areaName.trim() }),
    onSuccess: () => {
      if (user) setUser({ ...user, name: name.trim(), businessName: name.trim() })
      void queryClient.invalidateQueries({ queryKey: ['business', 'dashboard'] })
      setSaved(true)
    },
  })

  useEffect(() => {
    if (!saved) return
    const t = window.setTimeout(() => setSaved(false), 3000)
    return () => window.clearTimeout(t)
  }, [saved])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    mutation.mutate()
  }

  if (isLoading || !data) {
    return <Skeleton className='h-96 w-full' />
  }

  return (
    <div className='max-w-2xl space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-gray-900'>Business settings</h2>
        <p className='text-sm text-gray-600'>This information appears on your public profile.</p>
      </div>

      <div className='card'>
        <form className='card-content space-y-4' onSubmit={submit}>
          <div className='form-group'>
            <label htmlFor='biz-name' className='label'>
              Business name
            </label>
            <input id='biz-name' className='input-field' value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className='form-group'>
            <label htmlFor='biz-category' className='label'>
              Category
            </label>
            <input
              id='biz-category'
              className='input-field'
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder='e.g. Cafe & Coffee'
            />
          </div>

          <div className='form-group'>
            <label htmlFor='biz-description' className='label'>
              Description
            </label>
            <textarea
              id='biz-description'
              className='textarea-field'
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Tell the community what you do…'
            />
          </div>

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div className='form-group'>
              <label htmlFor='biz-city' className='label'>
                City
              </label>
              <input id='biz-city' className='input-field' value={cityName} onChange={(e) => setCityName(e.target.value)} />
            </div>
            <div className='form-group'>
              <label htmlFor='biz-area' className='label'>
                Area
              </label>
              <input id='biz-area' className='input-field' value={areaName} onChange={(e) => setAreaName(e.target.value)} />
            </div>
          </div>

          <div className='flex items-center justify-end gap-3'>
            {saved && (
              <span className='flex items-center gap-1 text-sm text-green-600'>
                <Check className='h-4 w-4' /> Profile saved
              </span>
            )}
            <Button type='submit' disabled={!name.trim() || mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>

      {/* Help & support — the same support surface consumer accounts use (§2.4 parity) */}
      <div className='card'>
        <div className='card-content flex flex-wrap items-center justify-between gap-3'>
          <div className='min-w-0'>
            <h3 className='flex items-center gap-1.5 text-sm font-semibold text-gray-900'>
              <LifeBuoy className='h-4 w-4 text-primary-600' /> Help & support
            </h3>
            <p className='mt-0.5 text-sm text-gray-600'>
              Answers on posting, moderation, sharing and attribution — and the form to report a problem.
            </p>
          </div>
          <Link to='/community/help' className='btn-secondary btn-sm shrink-0'>
            Open Help & Support
          </Link>
        </div>
      </div>
    </div>
  )
}
