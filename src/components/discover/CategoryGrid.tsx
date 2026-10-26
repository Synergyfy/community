import {
  UtensilsCrossed,
  ShoppingBag,
  HeartPulse,
  Home,
  Wrench,
  Users,
  CalendarDays,
  HandHeart,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { categoriesService } from '@/services/categories.service'

const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed,
  ShoppingBag,
  HeartPulse,
  Home,
  Wrench,
  Users,
  CalendarDays,
  HandHeart,
}

export function CategoryGrid() {
  // Active categories come from the admin-managed store (§3.2) — deactivating
  // a category in Configuration removes it here without a redeploy.
  const categories = categoriesService.listActiveCategories('community')
  return (
    <div className='grid grid-cols-4 gap-3'>
      {categories.map((cat) => {
        const Icon = ICON_MAP[cat.icon ?? ''] ?? Users
        return (
          <Link
            key={cat.id}
            to={`/community/discover/category/${cat.id}`}
            className='flex flex-col items-center gap-1.5 rounded-lg p-2 text-center hover:bg-gray-50'
          >
            <span className='flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600'>
              <Icon className='h-5 w-5' />
            </span>
            <span className='text-[11px] leading-tight text-gray-700'>{cat.name}</span>
          </Link>
        )
      })}
    </div>
  )
}
