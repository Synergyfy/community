import { ExchangeType } from '@/lib/constants'

export const EXCHANGE_LABELS: Record<ExchangeType, string> = {
  [ExchangeType.OFFER_REQUEST]: 'Offer / Request',
  [ExchangeType.SWAP]: 'Swap',
  [ExchangeType.TRADE]: 'Trade',
  [ExchangeType.SERVICE]: 'Service',
  [ExchangeType.OTHER]: 'Other',
}

export function exchangeTypeLabel(type: string): string {
  return EXCHANGE_LABELS[type as ExchangeType] || type
}

export const EXCHANGE_TYPE_OPTIONS = [
  { id: ExchangeType.OFFER_REQUEST, label: 'Offer / Request' },
  { id: ExchangeType.SWAP, label: 'Swap' },
  { id: ExchangeType.TRADE, label: 'Trade' },
  { id: ExchangeType.SERVICE, label: 'Service' },
  { id: ExchangeType.OTHER, label: 'Other' },
] as const
