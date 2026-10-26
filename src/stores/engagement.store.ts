import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Every reaction record (likes, saves, hides, reports, joined campaigns)
 * belongs to exactly one account — a signed-out visitor owns the 'guest'
 * bucket. One browser may host several accounts; each only ever reads its own
 * records (spec §6: records are per account, never mixed).
 */
export interface EngagementRecords {
  likedPostIds: string[]
  savedPostIds: string[]
  hiddenPostIds: string[]
  reportedPostIds: string[]
  likedCommentIds: string[]
  /** Campaigns this account followed/joined — recorded events backing My Campaigns (spec §4.3). */
  joinedCampaignIds: string[]
}

const emptyRecords: EngagementRecords = {
  likedPostIds: [],
  savedPostIds: [],
  hiddenPostIds: [],
  reportedPostIds: [],
  likedCommentIds: [],
  joinedCampaignIds: [],
}

interface EngagementState extends EngagementRecords {
  /** The account the live records above belong to ('guest' when signed out). */
  ownerId: string
  /** Records of the other accounts signed in on this browser, kept out of the live lists. */
  archive: Record<string, EngagementRecords>
  /** Move to another account's records (sign-in/sign-out) — no cross-account leakage. */
  setOwner: (ownerId: string) => void
  toggleLikePost: (id: string) => void
  toggleSavePost: (id: string) => void
  hidePost: (id: string) => void
  unhidePost: (id: string) => void
  reportPost: (id: string) => void
  toggleLikeComment: (id: string) => void
  toggleJoinCampaign: (id: string) => void
}

export const useEngagementStore = create<EngagementState>()(
  persist(
    (set) => ({
      ...emptyRecords,
      ownerId: 'guest',
      archive: {},
      setOwner: (ownerId) =>
        set((s) => {
          if (s.ownerId === ownerId) return {}
          // Park the current account's records, then load the incoming
          // account's records (or start empty for a first-time visitor).
          const current: EngagementRecords = {
            likedPostIds: s.likedPostIds,
            savedPostIds: s.savedPostIds,
            hiddenPostIds: s.hiddenPostIds,
            reportedPostIds: s.reportedPostIds,
            likedCommentIds: s.likedCommentIds,
            joinedCampaignIds: s.joinedCampaignIds,
          }
          const next = s.archive[ownerId] ?? emptyRecords
          return {
            ownerId,
            archive: { ...s.archive, [s.ownerId]: current },
            likedPostIds: next.likedPostIds,
            savedPostIds: next.savedPostIds,
            hiddenPostIds: next.hiddenPostIds,
            reportedPostIds: next.reportedPostIds,
            likedCommentIds: next.likedCommentIds,
            joinedCampaignIds: next.joinedCampaignIds,
          }
        }),
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
      toggleJoinCampaign: (id) =>
        set((s) => ({
          joinedCampaignIds: s.joinedCampaignIds.includes(id)
            ? s.joinedCampaignIds.filter((i) => i !== id)
            : [...s.joinedCampaignIds, id],
        })),
    }),
    { name: 'community_engagement' },
  ),
)
