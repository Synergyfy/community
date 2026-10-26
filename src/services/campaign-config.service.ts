import { useAuthStore } from '@/stores/auth.store'
import type { CampaignShareConfig } from '@/types/community-public'

/**
 * Per-campaign sharing/referral/leaderboard configuration store (spec §5
 * item 6, §7.4, §13).
 *
 * A single source of truth holding the *actual configured values* — referral
 * criteria text, attribution window, leaderboard metric — so the frontend
 * never hardcodes qualification rules or ranking logic that could conflict
 * with what a campaign actually configured (§13, §16). Enforcement of
 * qualification, windows and deduplication remains the backend's job
 * (§17-3/§17-4); this store only records and displays configuration.
 */

const CONFIGS_KEY = 'community_campaign_configs'
const SEED_FLAG_KEY = 'community_campaign_configs_seeded'

function readAll(): Record<string, CampaignShareConfig> {
  try {
    const raw = localStorage.getItem(CONFIGS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, CampaignShareConfig>) : {}
  } catch {
    return {}
  }
}

function writeAll(map: Record<string, CampaignShareConfig>): void {
  try {
    localStorage.setItem(CONFIGS_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

function currentAdminName(): string {
  const user = useAuthStore.getState().user
  return user?.name ?? 'Central Hub'
}

/**
 * Default configuration for a campaign with no stored config. Conservative:
 * sharing on (matches the public share buttons), referral/leaderboard off
 * until someone configures them — nothing qualification-related is invented.
 */
function defaultFor(campaignId: string): CampaignShareConfig {
  return {
    campaignId,
    sharingEnabled: true,
    referralEnabled: false,
    referralCriteria: null,
    referralWindowDays: null,
    leaderboardEnabled: false,
    leaderboardMetric: 'qualified',
    updatedAt: new Date().toISOString(),
    updatedBy: null,
    source: 'user',
  }
}

/**
 * Seed one demo config (labelled `source: 'demo'`) so the referral criteria
 * display, leaderboard and QR record have a configured exhibit — the same
 * approach as draft/pending demo posts and the Phase E funnel seed. The
 * criteria text below is *demo configuration data*, not a frontend rule:
 * qualification is still decided by the backend (§17-4).
 */
function seedDemo(): void {
  try {
    if (localStorage.getItem(SEED_FLAG_KEY)) return
    localStorage.setItem(SEED_FLAG_KEY, '1')
  } catch {
    return
  }
  const all = readAll()
  if (!all['camp1']) {
    all['camp1'] = {
      campaignId: 'camp1',
      sharingEnabled: true,
      referralEnabled: true,
      referralCriteria:
        'A referred person must create an account through the share link and confirm their email. Duplicate signups from the same person do not count. Qualification is decided by the server against these criteria.',
      referralWindowDays: 30,
      leaderboardEnabled: true,
      leaderboardMetric: 'qualified',
      updatedAt: new Date().toISOString(),
      updatedBy: 'Central Hub',
      source: 'demo',
    }
    writeAll(all)
  }
}

export const campaignConfigService = {
  /** Ensure the demo seed exists (idempotent, §16 labels). */
  ensureSeeded(): void {
    seedDemo()
  },

  getConfig(campaignId: string): CampaignShareConfig {
    seedDemo()
    const stored = readAll()[campaignId]
    return stored ?? defaultFor(campaignId)
  },

  saveConfig(campaignId: string, patch: Partial<Omit<CampaignShareConfig, 'campaignId'>>): CampaignShareConfig {
    seedDemo()
    const all = readAll()
    const next: CampaignShareConfig = {
      ...(all[campaignId] ?? defaultFor(campaignId)),
      ...patch,
      campaignId,
      updatedAt: new Date().toISOString(),
      updatedBy: currentAdminName(),
      // An admin edit turns a demo-seeded config into a real configured one.
      source: 'user',
    }
    all[campaignId] = next
    writeAll(all)
    return next
  },
}
