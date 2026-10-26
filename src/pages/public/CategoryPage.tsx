import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, LayoutGrid } from 'lucide-react'
import { discoverApi } from '@/services/discover.service'
import { categoriesService } from '@/services/categories.service'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { BusinessCard } from '@/components/discover/BusinessCard'

export function CategoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Title comes from the admin-managed category store (§3.2).
  const category = categoriesService.getCategory('community', id ?? '')
  const title = category?.name ?? 'Category'

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['category', id],
    queryFn: () => discoverApi.getCategoryBusinesses(id as string),
    enabled: !!id,
  })

  return (
    <div className='container-page max-w-2xl py-3 sm:py-4'>
      <button onClick={() => navigate(-1)} className='mb-3 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900'>
        <ArrowLeft className='h-4 w-4' /> Back
      </button>

      <div className='mb-4 flex items-center gap-2'>
        <LayoutGrid className='h-5 w-5 text-primary-600' />
        <h1 className='text-lg font-bold text-gray-900'>{title}</h1>
      </div>

      {isLoading ? (
        <div className='space-y-2'>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className='h-20 w-full rounded-lg' />
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className='h-10 w-10' />}
          title={`Nothing in ${title} yet`}
          description='Local businesses in this category will appear here as they join.'
          action={<Button onClick={() => navigate('/community/discover')}>Back to Discover</Button>}
        />
      ) : (
        <div className='space-y-2'>
          {businesses.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </div>
      )}
    </div>
  )
}
