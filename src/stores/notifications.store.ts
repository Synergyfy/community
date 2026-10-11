import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NotificationType = 'comment' | 'follow' | 'group' | 'exchange' | 'campaign' | 'system'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body?: string
  link?: string
  read: boolean
  createdAt: string
}

export interface NewNotification {
  type: NotificationType
  title: string
  body?: string
  link?: string
}

interface NotificationsState {
  items: AppNotification[]
  addNotification: (input: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clear: () => void
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      items: [
        {
          id: 'seed-1',
          type: 'comment',
          title: 'New comment on your post',
          body: 'Priya: Great initiative, count me in!',
          link: '/community/post/p1',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        },
        {
          id: 'seed-2',
          type: 'group',
          title: 'Group request approved',
          body: 'You are now a member of Green Fingers.',
          link: '/community/group/g1',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        },
        {
          id: 'seed-3',
          type: 'follow',
          title: 'Northside Bakery started following you',
          body: 'A new business joined your Community.',
          link: '/community/business/b1',
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
        },
      ],
      addNotification: (input) =>
        set((s) => ({
          items: [
            { ...input, id: `n-${Date.now()}`, read: false, createdAt: new Date().toISOString() },
            ...s.items,
          ],
        })),
      markRead: (id) => set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllRead: () => set((s) => ({ items: s.items.map((n) => ({ ...n, read: true })) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'community_notifications' },
  ),
)
