import { useAuthStore } from '@/stores/auth.store'
import { demoBusinesses, demoCampaigns, demoExchanges, demoGroups, demoPosts } from '@/data/demo-public'
import type { NotificationEventDef, NotificationEventTemplate } from '@/types/community-public'

/**
 * Notification event inventory + template configuration store (spec §10).
 *
 * Two separate concerns, deliberately kept honest:
 *
 * 1. **Inventory (factual).** `NOTIFICATION_EVENTS` documents the notification
 *    events that exist in this codebase today — where each is emitted, the
 *    in-app bell type it uses and the destination it sends members to. The
 *    destination checks verify each link against the routes registered in
 *    App.tsx and against the demo records the links point at, so the admin
 *    surface reports real verification results instead of claims (§10).
 *
 * 2. **Templates (configuration records).** Per-event message text and channel
 *    toggles are stored, displayed and audited (§13, §14). Which events
 *    trigger a notification, and whether in-app/email delivery applies, is an
 *    open decision (§9-8) — emitters keep their built-in text until that
 *    decision lands; nothing here silently changes behaviour (§16).
 */

// ---------------------------------------------------------------------------
// Event inventory (§10)
// ---------------------------------------------------------------------------

export const NOTIFICATION_EVENTS: NotificationEventDef[] = [
  {
    id: 'follow_confirmed',
    label: 'Follow confirmed',
    inAppType: 'follow',
    emittedAt: 'FollowButton (member surfaces)',
    destination: null,
    frontendWired: true,
  },
  {
    id: 'new_follower',
    label: 'New follower',
    inAppType: 'follow',
    emittedAt: 'Backend follower events (demo seed only)',
    destination: '/community/business/:id',
    frontendWired: false,
    demoSeedOnly: true,
  },
  {
    id: 'comment_on_post',
    label: 'New comment on your post',
    inAppType: 'comment',
    emittedAt: 'Backend comment events (demo seed only)',
    destination: '/community/post/:id',
    frontendWired: false,
    demoSeedOnly: true,
  },
  {
    id: 'group_request_sent',
    label: 'Group join request sent',
    inAppType: 'group',
    emittedAt: 'GroupDetailPage — Request to join',
    destination: '/community/group/:id',
    frontendWired: true,
  },
  {
    id: 'group_request_approved',
    label: 'Group request approved',
    inAppType: 'group',
    emittedAt: 'Backend group events (demo seed only)',
    destination: '/community/group/:id',
    frontendWired: false,
    demoSeedOnly: true,
  },
  {
    id: 'exchange_request_sent',
    label: 'Exchange request sent',
    inAppType: 'exchange',
    emittedAt: 'ExchangeDetailPage — Send request',
    destination: '/community/exchange/:id',
    frontendWired: true,
  },
  {
    id: 'support_request_received',
    label: 'Support request received',
    inAppType: 'system',
    emittedAt: 'HelpPage — support form',
    destination: '/community/help',
    frontendWired: true,
  },
  {
    id: 'campaign_update_published',
    label: 'Campaign update published',
    inAppType: 'campaign',
    emittedAt: 'Not emitted yet — type reserved in the notification model',
    destination: '/community/campaign/:id',
    frontendWired: false,
  },
]

// ---------------------------------------------------------------------------
// Destination verification (§10)
// ---------------------------------------------------------------------------

/**
 * Community routes registered in App.tsx. Kept as a static mirror because the
 * router table is not introspectable at runtime; the check still catches a
 * destination that drifts away from a real route.
 */
const ROUTE_PATTERNS: string[] = [
  '/community',
  '/community/post/:id',
  '/community/discover',
  '/community/discover/search',
  '/community/discover/exchanges',
  '/community/exchange/:id',
  '/community/saved',
  '/community/activity',
  '/community/profile',
  '/community/campaigns',
  '/community/my-campaigns',
  '/community/sharing',
  '/community/help',
  '/community/notifications',
  '/community/discover/hashtag/:tag',
  '/community/discover/category/:id',
  '/community/business/:id',
  '/community/campaign/:id',
  '/community/offer/:id',
  '/community/reward/:id',
  '/community/group/:id',
]

/** A concrete link per destination-bearing event, used for the record check. */
const EXAMPLE_LINKS: Record<string, string> = {
  new_follower: '/community/business/b1',
  comment_on_post: '/community/post/p1',
  group_request_sent: '/community/group/g1',
  group_request_approved: '/community/group/g1',
  exchange_request_sent: '/community/exchange/e1',
  support_request_received: '/community/help',
  campaign_update_published: '/community/campaign/camp1',
}

function routeMatches(path: string, pattern: string): boolean {
  const pathParts = path.split('/').filter(Boolean)
  const patternParts = pattern.split('/').filter(Boolean)
  if (pathParts.length !== patternParts.length) return false
  return pathParts.every((part, i) => patternParts[i] === part || patternParts[i]?.startsWith(':'))
}

/** Does the concrete link resolve to an existing demo record? */
function recordExists(path: string): boolean | null {
  const parts = path.split('/').filter(Boolean) // ['community', '<area>', '<id>']
  if (parts[0] !== 'community') return null
  const area = parts[1]
  const id = parts[2]
  if (!area || !id) return null // route-only destination (e.g. /community/help)
  switch (area) {
    case 'post':
      return demoPosts.some((p) => p.id === id)
    case 'business':
      return demoBusinesses.some((b) => b.id === id)
    case 'group':
      return demoGroups.some((g) => g.id === id)
    case 'exchange':
      return demoExchanges.some((e) => e.id === id)
    case 'campaign':
      return demoCampaigns.some((c) => c.id === id)
    default:
      return null
  }
}

export interface DestinationVerification {
  eventId: string
  /** Destination pattern from the inventory (`null` = none configured). */
  destination: string | null
  /** Route in App.tsx the destination resolves against, or `null`. */
  matchedRoute: string | null
  /** Route check passed (or no destination to check). */
  routeOk: boolean
  /** Concrete link used for the record check (`null` = no example). */
  exampleLink: string | null
  /** Does the example link point at an existing record? `null` = route-only. */
  recordOk: boolean | null
}

/** Verify one event's destination against the route table and demo records. */
export function verifyDestination(eventId: string): DestinationVerification {
  const event = NOTIFICATION_EVENTS.find((e) => e.id === eventId)
  const destination = event?.destination ?? null

  if (!destination) {
    return { eventId, destination: null, matchedRoute: null, routeOk: true, exampleLink: null, recordOk: null }
  }

  const matchedRoute = ROUTE_PATTERNS.find((p) => routeMatches(destination, p)) ?? null
  const exampleLink = EXAMPLE_LINKS[eventId] ?? null

  return {
    eventId,
    destination,
    matchedRoute,
    routeOk: matchedRoute !== null,
    exampleLink,
    recordOk: exampleLink ? recordExists(exampleLink) : null,
  }
}

// ---------------------------------------------------------------------------
// Template configuration store (§13, §14)
// ---------------------------------------------------------------------------

const TEMPLATES_KEY = 'community_notification_templates'

/**
 * Default message text — mirrors the strings emitters and demo seeds use
 * today, so the stored configuration describes current behaviour rather than
 * inventing new copy.
 */
const DEFAULT_TEXT: Record<string, { title: string; body: string }> = {
  follow_confirmed: { title: 'Following', body: 'You are now following this {target}.' },
  new_follower: { title: '{name} started following you', body: 'A new account joined your Community.' },
  comment_on_post: { title: 'New comment on your post', body: '{author}: {excerpt}' },
  group_request_sent: { title: 'Request sent', body: 'Your request to join {group} is pending approval.' },
  group_request_approved: { title: 'Group request approved', body: 'You are now a member of {group}.' },
  exchange_request_sent: { title: 'Exchange request sent', body: 'Your request for “{item}” is pending.' },
  support_request_received: { title: 'Support request received', body: 'Our team will look at your {topic}.' },
  campaign_update_published: { title: 'Campaign update', body: 'There is a new update on {campaign}.' },
}

function currentName(): string {
  return useAuthStore.getState().user?.name ?? 'Central Hub'
}

function defaultTemplates(): NotificationEventTemplate[] {
  const at = new Date().toISOString()
  return NOTIFICATION_EVENTS.map((event) => ({
    eventId: event.id,
    inAppEnabled: true,
    emailEnabled: false,
    titleTemplate: DEFAULT_TEXT[event.id]?.title ?? event.label,
    bodyTemplate: DEFAULT_TEXT[event.id]?.body ?? '',
    updatedAt: at,
    updatedBy: null,
    source: 'demo' as const,
  }))
}

function readAll(): NotificationEventTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    if (raw) {
      const stored = JSON.parse(raw) as NotificationEventTemplate[]
      if (Array.isArray(stored) && stored.length) {
        // Seed any event added to the inventory after the first write.
        const known = new Map(stored.map((t) => [t.eventId, t]))
        const merged = NOTIFICATION_EVENTS.map((e) => known.get(e.id))
        if (merged.every(Boolean)) return merged as NotificationEventTemplate[]
        return [
          ...merged.filter((t): t is NotificationEventTemplate => Boolean(t)),
          ...defaultTemplates().filter((t) => !known.has(t.eventId)),
        ]
      }
    }
  } catch {
    /* ignore */
  }
  return seed()
}

function seed(): NotificationEventTemplate[] {
  const defaults = defaultTemplates()
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(defaults))
  } catch {
    /* ignore */
  }
  return defaults
}

function writeAll(templates: NotificationEventTemplate[]): void {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
  } catch {
    /* ignore */
  }
}

export const notificationConfigService = {
  listEvents(): NotificationEventDef[] {
    return NOTIFICATION_EVENTS
  },

  getTemplates(): NotificationEventTemplate[] {
    return readAll()
  },

  getTemplate(eventId: string): NotificationEventTemplate {
    return (
      readAll().find((t) => t.eventId === eventId) ??
      defaultTemplates().find((t) => t.eventId === eventId)!
    )
  },

  /** Persist one event's template configuration; flips `source` to `user` (§16). */
  saveTemplate(
    eventId: string,
    patch: Partial<Pick<NotificationEventTemplate, 'inAppEnabled' | 'emailEnabled' | 'titleTemplate' | 'bodyTemplate'>>,
  ): NotificationEventTemplate {
    const templates = readAll()
    const index = templates.findIndex((t) => t.eventId === eventId)
    const base: NotificationEventTemplate =
      (index >= 0 ? templates[index] : undefined) ??
      defaultTemplates().find((t) => t.eventId === eventId)!
    const next: NotificationEventTemplate = {
      ...base,
      ...patch,
      eventId,
      updatedAt: new Date().toISOString(),
      updatedBy: currentName(),
      source: 'user',
    }
    if (index >= 0) templates[index] = next
    else templates.push(next)
    writeAll(templates)
    return next
  },
}
