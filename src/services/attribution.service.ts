import { api } from '@/lib/api'
import type { ShareEventType, ShareEventStatus, ShareTargetType } from '@/lib/constants'
import type { AttributionEvent, ReferralRecord, ShareRecord } from '@/types/community-public'

/**
 * Client side of the sharing/attribution engine (spec §5.4, Workflow C).
 *
 * The front end records candidate events (link visits) and keeps the pending
 * attribution context; it never declares that a contribution, referral or
 * reward has occurred — qualification is decided by the server against the
 * approved campaign rules.
 */

const DEMO_EVENTS_KEY = 'community_share_events'
const DEMO_SHARES_KEY = 'community_shares'
const DEMO_SEEDED_KEY = 'community_shares_seeded'
const PENDING_REF_KEY = 'community_pending_ref'
const RECORDED_REFS_KEY = 'community_recorded_refs'

/**
 * Seed funnel data (labelled `source: 'demo'`) so the §6.6 journey and the
 * referral table have records in every vocabulary state — the same approach
 * as draft/pending demo posts and completed/expired demo exchanges. Seeded
 * into the same store as user-created shares, deduped by id.
 */
function seedDemoFunnel(): void {
  try {
    if (localStorage.getItem(DEMO_SEEDED_KEY)) return
    localStorage.setItem(DEMO_SEEDED_KEY, '1')
  } catch {
    return
  }

  const now = Date.now()
  const iso = (minsAgo: number) => new Date(now - minsAgo * 60 * 1000).toISOString()
  const code = (c: string) => `demo-${c}`

  const shares: ShareRecord[] = [
    {
      id: 'share-demofunnel1',
      sharerId: 'b1',
      sharerType: 'business',
      targetType: 'campaign',
      targetId: 'camp1',
      targetTitle: 'Winter Warmth Appeal',
      shareType: 'link',
      trackingCode: code('fulljourney'),
      shareUrl: `${window.location.origin}/community/campaign/camp1?ref=${code('fulljourney')}`,
      createdAt: iso(2880),
      visitCount: 0,
      qualifiedCount: 0,
      campaignId: 'camp1',
      campaignTitle: 'Winter Warmth Appeal',
      productId: null,
      productTitle: null,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        `${window.location.origin}/community/campaign/camp1?ref=${code('fulljourney')}`,
      )}`,
      uniqueVisitCount: 1,
      source: 'demo',
    },
    {
      id: 'share-demofunnel2',
      sharerId: 'c1',
      sharerType: 'consumer',
      targetType: 'campaign',
      targetId: 'camp1',
      targetTitle: 'Winter Warmth Appeal',
      shareType: 'social',
      trackingCode: code('earlystage'),
      shareUrl: `${window.location.origin}/community/campaign/camp1?ref=${code('earlystage')}`,
      createdAt: iso(1440),
      visitCount: 0,
      qualifiedCount: 0,
      campaignId: 'camp1',
      campaignTitle: 'Winter Warmth Appeal',
      productId: null,
      productTitle: null,
      qrCodeUrl: null,
      uniqueVisitCount: null,
      source: 'demo',
    },
    {
      id: 'share-demofunnel3',
      sharerId: 'b2',
      sharerType: 'business',
      targetType: 'campaign',
      targetId: 'camp1',
      targetTitle: 'Winter Warmth Appeal',
      shareType: 'link',
      trackingCode: code('declined'),
      shareUrl: `${window.location.origin}/community/campaign/camp1?ref=${code('declined')}`,
      createdAt: iso(720),
      visitCount: 0,
      qualifiedCount: 0,
      campaignId: 'camp1',
      campaignTitle: 'Winter Warmth Appeal',
      productId: null,
      productTitle: null,
      qrCodeUrl: null,
      uniqueVisitCount: null,
      source: 'demo',
    },
  ]

  const ev = (
    id: string,
    trackingCode: string,
    eventType: ShareEventType,
    status: ShareEventStatus,
    minsAgo: number,
    extra: Partial<AttributionEvent> = {},
  ): AttributionEvent => ({
    id,
    shareId: `demo-${trackingCode}`,
    trackingCode,
    targetType: 'campaign',
    targetId: 'camp1',
    campaignId: 'camp1',
    eventType,
    status,
    occurredAt: iso(minsAgo),
    attributedToUserId: null,
    attributedToAccountType: null,
    source: 'link',
    meta: null,
    isDemo: true,
    ...extra,
  })

  const events: AttributionEvent[] = [
    // Full journey (b1): visit ×2, registration attributed, join + contribution qualified.
    ev('evt-demov1', 'demo-fulljourney', 'visit', 'pending', 2870),
    ev('evt-demov2', 'demo-fulljourney', 'visit', 'pending', 2800, { source: 'external' }),
    ev(
      'evt-demos1',
      'demo-fulljourney',
      'signup',
      'attributed',
      2700,
      {
        attributedToUserId: 'b1',
        attributedToAccountType: 'business',
        meta: { referredLabel: 'New resident (demo)', attributionWindowDays: 30 },
      },
    ),
    ev('evt-demoj1', 'demo-fulljourney', 'campaign_join', 'qualified', 2600, { attributedToUserId: 'b1', attributedToAccountType: 'business' }),
    ev(
      'evt-demoq1',
      'demo-fulljourney',
      'contribution',
      'qualified',
      2500,
      { attributedToUserId: 'b1', attributedToAccountType: 'business', meta: { recordedBy: 'fundraising service' } },
    ),
    // Early stage (c1): visit + unconfirmed registration.
    ev('evt-demov3', 'demo-earlystage', 'visit', 'pending', 1400),
    ev('evt-demos2', 'demo-earlystage', 'signup', 'pending', 1300, { meta: { referredLabel: 'Community member (demo)' } }),
    // Declined registration (b2): rejected by the backend rules.
    ev('evt-demov4', 'demo-declined', 'visit', 'pending', 700),
    ev('evt-demos3', 'demo-declined', 'signup', 'rejected', 600, { meta: { referredLabel: 'Repeat signup (demo)', rejectionReason: 'Outside the attribution window — decided by backend rules' } }),
  ]

  try {
    const existingShares = readDemoShares()
    const existingIds = new Set(existingShares.map((s) => s.id))
    writeDemoShares([...shares.filter((s) => !existingIds.has(s.id)), ...existingShares])
    const existingEvents = readDemoEvents()
    const existingEventIds = new Set(existingEvents.map((e) => e.id))
    writeDemoEvents([...events.filter((e) => !existingEventIds.has(e.id)), ...existingEvents])
  } catch {
    /* storage unavailable — ignore */
  }
}

function readDemoEvents(): AttributionEvent[] {
  try {
    const raw = localStorage.getItem(DEMO_EVENTS_KEY)
    return raw ? (JSON.parse(raw) as AttributionEvent[]) : []
  } catch {
    return []
  }
}

function writeDemoEvents(events: AttributionEvent[]): void {
  try {
    localStorage.setItem(DEMO_EVENTS_KEY, JSON.stringify(events))
  } catch {
    /* storage unavailable — ignore */
  }
}

function readDemoShares(): ShareRecord[] {
  try {
    const raw = localStorage.getItem(DEMO_SHARES_KEY)
    return raw ? (JSON.parse(raw) as ShareRecord[]) : []
  } catch {
    return []
  }
}

function writeDemoShares(shares: ShareRecord[]): void {
  try {
    localStorage.setItem(DEMO_SHARES_KEY, JSON.stringify(shares))
  } catch {
    /* storage unavailable — ignore */
  }
}

/** Attribution context from the last tracked link opened this session. */
export function getPendingRef(): string | null {
  try {
    return sessionStorage.getItem(PENDING_REF_KEY)
  } catch {
    return null
  }
}

export function setPendingRef(trackingCode: string): void {
  try {
    sessionStorage.setItem(PENDING_REF_KEY, trackingCode)
  } catch {
    /* ignore */
  }
}

export function clearPendingRef(): void {
  try {
    sessionStorage.removeItem(PENDING_REF_KEY)
  } catch {
    /* ignore */
  }
}

function alreadyRecordedThisSession(trackingCode: string): boolean {
  try {
    const raw = sessionStorage.getItem(RECORDED_REFS_KEY)
    const codes: string[] = raw ? JSON.parse(raw) : []
    if (codes.includes(trackingCode)) return true
    codes.push(trackingCode)
    sessionStorage.setItem(RECORDED_REFS_KEY, JSON.stringify(codes))
    return false
  } catch {
    return false
  }
}

/** Ensure the demo funnel seed exists (idempotent, §16 labels). */
function ensureSeeded(): void {
  seedDemoFunnel()
}

export interface RecordVisitInput {
  trackingCode: string
  targetType?: ShareTargetType
  targetId?: string | null
  source?: string | null
  meta?: Record<string, unknown> | null
}

export const attributionApi = {
  /**
   * Record that a shared link was opened. Deduplicated per tracking code per
   * browser session (spec §7 — duplicate actions must not double count).
   * Returns true when a new visit event was recorded.
   */
  async recordVisit(input: RecordVisitInput): Promise<boolean> {
    ensureSeeded()
    const { trackingCode, targetType, targetId, source, meta } = input
    if (!trackingCode || alreadyRecordedThisSession(trackingCode)) return false

    const done = await (async () => {
      try {
        await api.post('/community/track/visit', {
          trackingCode,
          targetType,
          targetId,
          source,
          meta,
        })
        return true
      } catch {
        return false
      }
    })()

    if (!done) {
      // Demo fallback: persist a pending visit event locally.
      const event: AttributionEvent = {
        id: `evt-${Date.now()}`,
        shareId: `demo-${trackingCode}`,
        trackingCode,
        targetType: targetType ?? ('post' as ShareTargetType),
        targetId: targetId ?? null,
        campaignId: null,
        eventType: 'visit' as ShareEventType,
        status: 'pending' as ShareEventStatus,
        occurredAt: new Date().toISOString(),
        attributedToUserId: null,
        attributedToAccountType: null,
        source: source ?? 'link',
        meta: meta ?? null,
      }
      writeDemoEvents([event, ...readDemoEvents()])
    }

    setPendingRef(trackingCode)
    return true
  },

  /** Demo-store reader for future "My Sharing" and Admin attribution views. */
  listDemoEvents(): AttributionEvent[] {
    ensureSeeded()
    return readDemoEvents()
  },

  /**
   * Remember a share created by this account (spec §3.5, §4.4) so the
   * sharer's results view can report on it. One record per tracking code.
   * Related campaign/product and the QR record travel with the share
   * (spec §6.6); unique clicks are only carried when a backend supplies
   * them — never computed here.
   */
  async recordShareCreated(input: {
    sharerId: string
    sharerType: 'business' | 'consumer' | 'admin'
    targetType: ShareTargetType
    targetId?: string | null
    targetTitle?: string | null
    trackingCode: string
    shareUrl: string
    shareType?: string | null
    qrCodeUrl?: string | null
  }): Promise<void> {
    ensureSeeded()
    const shares = readDemoShares()
    if (shares.some((s) => s.trackingCode === input.trackingCode)) return
    // A campaign share carries its own campaign as the related campaign (§6.6).
    const isCampaign = input.targetType === 'campaign'
    shares.unshift({
      id: `share-${input.trackingCode}`,
      sharerId: input.sharerId,
      sharerType: input.sharerType,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      targetTitle: input.targetTitle ?? null,
      shareType: input.shareType ?? 'link',
      trackingCode: input.trackingCode,
      shareUrl: input.shareUrl,
      createdAt: new Date().toISOString(),
      visitCount: 0,
      qualifiedCount: 0,
      campaignId: isCampaign ? input.targetId ?? null : null,
      campaignTitle: isCampaign ? input.targetTitle ?? null : null,
      productId: null,
      productTitle: null,
      qrCodeUrl: input.qrCodeUrl ?? null,
      uniqueVisitCount: null,
      source: 'user',
    })
    writeDemoShares(shares)
  },

  /** Shares created by one account, with visit/qualified counts from events. */
  listSharesFor(sharerId: string): ShareRecord[] {
    ensureSeeded()
    const events = readDemoEvents()
    return readDemoShares()
      .filter((s) => s.sharerId === sharerId)
      .map((s) => {
        const forCode = events.filter((e) => e.trackingCode === s.trackingCode)
        return {
          ...s,
          visitCount: forCode.filter((e) => e.eventType === 'visit').length,
          // Only server-confirmed qualified outcomes are counted — pending
          // events are NOT reported as qualified (spec §4.4, §3.5).
          qualifiedCount: forCode.filter((e) => e.status === 'qualified').length,
        }
      })
  },

  /** Tracked events behind one share (for the per-share detail view). */
  listEventsFor(trackingCode: string): AttributionEvent[] {
    ensureSeeded()
    return readDemoEvents().filter((e) => e.trackingCode === trackingCode)
  },

  /** All shares created by any account (admin attribution view, §5.4). */
  listAllShares(): ShareRecord[] {
    ensureSeeded()
    return readDemoShares()
  },

  /**
   * Referral candidates derived from registration events (spec §6.6, §17-4).
   * One row per registration recorded against a share; statuses and window
   * values are backend decisions, surfaced as recorded.
   */
  listReferrals(): ReferralRecord[] {
    ensureSeeded()
    const shares = readDemoShares()
    const byCode = new Map(shares.map((s) => [s.trackingCode, s]))
    return readDemoEvents()
      .filter((e) => e.eventType === 'signup')
      .map((e) => {
        const share = byCode.get(e.trackingCode)
        const meta = (e.meta ?? {}) as Record<string, unknown>
        return {
          id: e.id,
          trackingCode: e.trackingCode,
          sharerId: share?.sharerId ?? e.attributedToUserId ?? '',
          sharerType: share?.sharerType ?? 'consumer',
          campaignId: e.campaignId ?? share?.campaignId ?? null,
          campaignTitle: share?.campaignTitle ?? null,
          referredLabel: typeof meta.referredLabel === 'string' ? meta.referredLabel : null,
          status: e.status,
          occurredAt: e.occurredAt,
          attributionWindowDays: typeof meta.attributionWindowDays === 'number' ? meta.attributionWindowDays : null,
          source: e.isDemo ? ('demo' as const) : ('user' as const),
        }
      })
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
  },

  /**
   * Campaign-scoped attribution view (spec §7.4): the shares, events and
   * referral candidates recorded against one campaign. Same underlying
   * records as the global ledger — scoped, never duplicated (§15).
   */
  listForCampaign(campaignId: string): {
    shares: ShareRecord[]
    events: AttributionEvent[]
    referrals: ReferralRecord[]
  } {
    ensureSeeded()
    const shares = readDemoShares().filter((s) => s.campaignId === campaignId)
    const codes = new Set(shares.map((s) => s.trackingCode))
    const events = readDemoEvents().filter((e) => e.campaignId === campaignId || codes.has(e.trackingCode))
    const referrals = this.listReferrals().filter((r) => r.campaignId === campaignId)
    return { shares, events, referrals }
  },
}
