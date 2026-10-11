import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface EngagementState {
  likedPostIds: string[]
  savedPostIds: string[]
  hiddenPostIds: string[]
  reportedPostIds: string[]
  likedCommentIds: string[]
  toggleLikePost: (id: string) => void
  toggleSavePost: (id: string) => void
  hidePost: (id: string) => void
  unhidePost: (id: string) => void
  reportPost: (id: string) => void
  toggleLikeComment: (id: string) => void
}

export const useEngagementStore = create<EngagementState>()(
  persist(
    (set) => ({
      likedPostIds: [],
      savedPostIds: [],
      hiddenPostIds: [],
      reportedPostIds: [],
      likedCommentIds: [],
      toggleLikePost: (id) =>
        set((s) => ({
          likedPostIds: s.likedPostIds.includes(id)
            ? s.likedPostIds.filter((i) => i !== id)
            : [...s.likedPostIds, id],
        })),
      toggleSavePost: (id) =>
        set((s) => ({
          savedPostIds: s.savedPostIds.includes(id)
            ? s.savedPostIds.filter((i) => i !== id)
            : [...s.savedPostIds, id],
        })),
      hidePost: (id) =>
        set((s) => ({ hiddenPostIds: s.hiddenPostIds.includes(id) ? s.hiddenPostIds : [...s.hiddenPostIds, id] })),
      unhidePost: (id) => set((s) => ({ hiddenPostIds: s.hiddenPostIds.filter((i) => i !== id) })),
      reportPost: (id) =>
        set((s) => ({
          reportedPostIds: s.reportedPostIds.includes(id) ? s.reportedPostIds : [...s.reportedPostIds, id],
        })),
      toggleLikeComment: (id) =>
        set((s) => ({
          likedCommentIds: s.likedCommentIds.includes(id)
            ? s.likedCommentIds.filter((i) => i !== id)
            : [...s.likedCommentIds, id],
        })),
    }),
    { name: 'community_engagement' },
  ),
)
