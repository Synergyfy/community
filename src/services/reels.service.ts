import { api } from '@/lib/api'
import type { PublicReel } from '@/types/community-public'
import { demoReels } from '@/data/demo-public'

export const reelsApi = {
  async getReels(): Promise<PublicReel[]> {
    try {
      const res = await api.get('/community/reels')
      return (res.data?.data as PublicReel[]) || []
    } catch {
      return demoReels
    }
  },
}
