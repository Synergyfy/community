import { api } from '@/lib/api'
import type { ShareTargetType } from '@/lib/constants'
import type { ShareCreateResult } from '@/types/community-public'

export interface CreateShareInput {
  targetType: ShareTargetType
  targetId?: string
  shareType?: string
  source?: string
  metadata?: Record<string, unknown>
}

function demoShare(targetType: ShareTargetType, targetId?: string): ShareCreateResult {
  const code = Math.random().toString(36).slice(2, 10)
  const path =
    targetType === 'campaign'
      ? `/community/campaign/${targetId}`
      : targetType === 'business'
        ? `/community/business/${targetId}`
        : targetType === 'offer'
          ? `/community/offer/${targetId}`
          : targetType === 'reward'
            ? `/community/reward/${targetId}`
            : targetType === 'exchange'
              ? `/community/exchange/${targetId}`
              : targetType === 'post'
                ? `/community/post/${targetId}`
                : `/community`

  return {
    shareId: `demo-${code}`,
    trackingCode: code,
    shareUrl: `${window.location.origin}${path}?ref=${code}`,
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      `${window.location.origin}${path}?ref=${code}`,
    )}`,
  }
}

export const sharingApi = {
  async createShare(input: CreateShareInput): Promise<ShareCreateResult> {
    try {
      const res = await api.post('/community/share', input)
      const data = res.data?.data as ShareCreateResult | undefined
      if (data?.shareUrl) return data
      return demoShare(input.targetType, input.targetId)
    } catch {
      return demoShare(input.targetType, input.targetId)
    }
  },
}
