import { useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { attributionApi } from '@/services/attribution.service'
import type { ShareTargetType } from '@/lib/constants'

/**
 * Captures `?ref=<trackingCode>` from shared links when they are opened
 * (Workflow C steps 4–5) and records the visit through the attribution
 * service. Mounted once inside the router; recording is deduplicated per
 * code per session by the service.
 */
export function AttributionCapture() {
  const location = useLocation()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (!ref) return

    const targetParam = searchParams.get('targetType') as ShareTargetType | null
    const targetId = searchParams.get('targetId')

    void attributionApi.recordVisit({
      trackingCode: ref,
      targetType: targetParam ?? undefined,
      targetId,
      source: document.referrer ? 'external' : 'direct',
    })
    // Intentionally keep the `ref` parameter in the URL: it preserves the
    // share context on reloads and client-side navigation. The service
    // deduplicates so repeated opens are not double counted.
  }, [location.pathname, searchParams])

  return null
}
