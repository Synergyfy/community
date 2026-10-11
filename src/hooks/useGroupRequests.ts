import { useEffect, useState } from 'react'

const KEY = 'community_group_requests'
const EVENT = 'community-group-requests-changed'

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function useGroupRequests() {
  const [requestedIds, setIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as string[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    const handler = () => setIds(read())
    window.addEventListener('storage', handler)
    window.addEventListener('community-group-requests-changed', handler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('community-group-requests-changed', handler)
    }
  }, [])

  const requestJoin = (groupId: string) => {
    setIds((prev) => {
      const next = prev.includes(groupId) ? prev : [...prev, groupId]
      localStorage.setItem(KEY, JSON.stringify(next))
      window.dispatchEvent(new Event(EVENT))
      return next
    })
  }

  const cancelRequest = (groupId: string) => {
    setIds((prev) => {
      const next = prev.filter((id) => id !== groupId)
      localStorage.setItem(KEY, JSON.stringify(next))
      window.dispatchEvent(new Event(EVENT))
      return next
    })
  }

  const isRequested = (groupId: string) => requestedIds.includes(groupId)

  return { requestedIds, isRequested, requestJoin, cancelRequest }
}
