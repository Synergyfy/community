import type { CommunityAdminConfig, ExchangeTypeConfig, PublicHashtag, ReportReason } from '@/types/community-public'

/**
 * Community admin configuration store (spec §5.3, §3.6, §13).
 *
 * A single source of truth consumed by admin screens AND public-facing
 * components (e.g. report reasons in the report modal), so configuration is
 * never duplicated as hardcoded frontend lists that can conflict with admin
 * settings (§13, §16).
 */

const CONFIG_KEY = 'community_admin_config'

/**
 * Default report reasons — drawn from the reason groups the spec names
 * (§3.6: spam, harassment, misleading information, other). Admins can
 * reconfigure the list; the frontend consumes whatever is configured.
 */
export const DEFAULT_REPORT_REASONS: ReportReason[] = [
  { id: 'spam', label: 'Spam or misleading' },
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate', label: 'Hate speech' },
  { id: 'violence', label: 'Violence or dangerous content' },
  { id: 'misinformation', label: 'False information' },
  { id: 'other', label: 'Something else' },
]

function defaultConfig(): CommunityAdminConfig {
  return {
    exchangeTypes: {
      offer_request: { enabled: true, whoCanCreate: 'both', requiresApproval: false },
      swap: { enabled: true, whoCanCreate: 'business', requiresApproval: true },
      trade: { enabled: true, whoCanCreate: 'both', requiresApproval: false },
      service: { enabled: true, whoCanCreate: 'both', requiresApproval: false },
      other: { enabled: false, whoCanCreate: 'admin', requiresApproval: true },
    },
    reportReasons: DEFAULT_REPORT_REASONS,
    hashtagFlags: {},
  }
}

export const adminConfigService = {
  getConfig(): CommunityAdminConfig {
    try {
      const raw = localStorage.getItem(CONFIG_KEY)
      if (raw) {
        const stored = JSON.parse(raw) as Partial<CommunityAdminConfig>
        const base = defaultConfig()
        return {
          ...base,
          ...stored,
          // Back-compat with configs saved before report reasons existed.
          reportReasons: stored.reportReasons?.length ? stored.reportReasons : base.reportReasons,
          // Back-compat with configs saved before hashtag flags existed.
          hashtagFlags: stored.hashtagFlags ?? {},
        }
      }
    } catch {
      /* ignore */
    }
    return defaultConfig()
  },

  setConfig(next: CommunityAdminConfig): void {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  },

  setExchangeTypeConfig(type: string, config: ExchangeTypeConfig): CommunityAdminConfig {
    const current = adminConfigService.getConfig()
    const next: CommunityAdminConfig = {
      ...current,
      exchangeTypes: { ...current.exchangeTypes, [type]: config },
    }
    adminConfigService.setConfig(next)
    return next
  },

  setReportReasons(reasons: ReportReason[]): CommunityAdminConfig {
    const next: CommunityAdminConfig = { ...adminConfigService.getConfig(), reportReasons: reasons }
    adminConfigService.setConfig(next)
    return next
  },

  /** Configured reasons for the report modal (§3.6). */
  listReportReasons(): ReportReason[] {
    return adminConfigService.getConfig().reportReasons
  },

  /**
   * Persist hashtag admin flags by slug (§3.3). Keeps the flag on the record
   * across reloads, so the audit entry and the hashtag never disagree (§15).
   */
  setHashtagFlags(slug: string, patch: Partial<{ featured: boolean; restricted: boolean }>): void {
    const current = adminConfigService.getConfig()
    const existing = current.hashtagFlags?.[slug] ?? { featured: false, restricted: false }
    const next: CommunityAdminConfig = {
      ...current,
      hashtagFlags: { ...current.hashtagFlags, [slug]: { ...existing, ...patch } },
    }
    adminConfigService.setConfig(next)
  },

  /** Apply persisted flags onto the shared demo hashtag records before read. */
  applyHashtagFlags(records: PublicHashtag[]): void {
    const flags = adminConfigService.getConfig().hashtagFlags ?? {}
    for (const h of records) {
      const f = flags[h.slug]
      if (!f) continue
      h.featured = f.featured
      h.restricted = f.restricted
      h.status = f.restricted ? 'restricted' : 'active'
    }
  },
}
