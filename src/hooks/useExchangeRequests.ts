import { useEffect, useState } from 'react'

const KEY = 'community_exchange_requests'
export const EXCHANGE_REQUESTS_EVENT = 'community-exchange-requests-changed'

type RequestMap = Record<string, string>

function read(): RequestMap {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as RequestMap) : {}
  } catch {
    return {}
  }
}

function write(map: RequestMap): void {
  localStorage.setItem(KEY, JSON.stringify(map))
  window.dispatchEvent(new Event(EXCHANGE_REQUESTS_EVENT))
}

export function useExchangeRequests() {
  const [requests, setRequests] = useState<RequestMap>(() => read())

  useEffect(() => {
    const handler = () => setRequests(read())
    window.addEventListener('storage', handler)
    window.addEventListener(EXCHANGE_REQUESTS_EVENT, handler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener(EXCHANGE_REQUESTS_EVENT, handler)
    }
  }, [])

  const requestExchange = (exchangeId: string, message = '') => {
    setRequests((prev) => {
      const next = { ...prev, [exchangeId]: message }
      write(next)
      return next
    })
  }

  const cancelRequest = (exchangeId: string) => {
    setRequests((prev) => {
      const next = { ...prev }
      delete next[exchangeId]
      write(next)
      return next
    })
  }

  return {
    requests,
    isRequested: (id: string) => id in requests,
    requestExchange,
    cancelRequest,
  }
}
