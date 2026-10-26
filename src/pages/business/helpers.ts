export function formatDate(value?: string | Date | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatPence(pence?: number | null): string {
  if (pence === undefined || pence === null) return '£0'
  return `£${(pence / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
}
