import { api } from '@/lib/api'
import type { PublicStory } from '@/types/community-public'
import { demoStories } from '@/data/demo-public'

export const storiesApi = {
  async getStories(): Promise<PublicStory[]> {
    try {
      const res = await api.get('/community/stories')
      return (res.data?.data as PublicStory[]) || []
    } catch {
      return demoStories
    }
  },
}
