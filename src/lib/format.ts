export function timeAgo(input: string | Date | null | undefined): string {
  if (!input) return ''
  const date = typeof input === 'string' ? new Date(input) : input
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function timeUntil(input: string | Date | null | undefined): string {
  if (!input) return ''
  const date = typeof input === 'string' ? new Date(input) : input
  const seconds = Math.floor((date.getTime() - Date.now()) / 1000)
  if (seconds <= 0) return 'Ended'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m left`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h left`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d left`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function formatGBP(pence: number | undefined | null): string {
  if (pence == null) return '£0'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(pence / 100)
}

export function percent(raised?: number | null, goal?: number | null): number {
  if (!raised || !goal) return 0
  return Math.min(100, Math.round((raised / goal) * 100))
}

export function locationLabel(loc?: { areaName?: string; cityName?: string } | null): string {
  if (!loc) return ''
  return loc.areaName || loc.cityName || ''
}
