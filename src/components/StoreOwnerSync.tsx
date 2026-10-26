import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { useEngagementStore } from '@/stores/engagement.store'
import { useNotificationsStore } from '@/stores/notifications.store'

/**
 * Keeps the per-account stores pointed at the signed-in account.
 *
 * Reactions (likes/saves/hides/reports/joined campaigns) and notifications
 * belong to exactly one account. As soon as the visitor signs in or out, both
 * stores swap to that account's records, so accounts sharing one browser never
 * see each other's activity (spec §6 — one viewer, own records only).
 *
 * It also resets the TanStack Query cache on every owner change — the demo
 * services resolve visibility against the *current* viewer, so data cached
 * under one account must never be reused under another (or as a guest).
 * Renders nothing.
 */
export function StoreOwnerSync() {
  const authStatus = useAuthStore((s) => s.authStatus)
  const user = useAuthStore((s) => s.user)
  const setEngagementOwner = useEngagementStore((s) => s.setOwner)
  const setNotificationsOwner = useNotificationsStore((s) => s.setOwner)
  const queryClient = useQueryClient()

  const ownerId = authStatus === 'authenticated' && user ? user.id : 'guest'

  useEffect(() => {
    // Wait for auth bootstrap so a restored session is never mistaken for a guest.
    if (authStatus === 'initializing') return
    setEngagementOwner(ownerId)
    setNotificationsOwner(ownerId)
    // Reset the query cache so the next mount refetches with the new viewer —
    // every demo query resolves against the *current* viewer (feed visibility,
    // announcements, campaigns, …), so the previous viewer's data must never
    // leak across an account switch or a sign-out.
    queryClient.resetQueries()
  }, [authStatus, ownerId, setEngagementOwner, setNotificationsOwner, queryClient])

  return null
}
