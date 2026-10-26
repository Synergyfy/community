import { useAuthStore } from '@/stores/auth.store'
import type { MembershipConfig, MembershipException, MembershipFeature, MembershipPlan } from '@/types/community-public'

/**
 * Membership & Feature Access — centralized plan entitlements.
 *
 * This store holds the *configured* member-facing rules: which membership
 * plans may use each feature, usage limits, expiry rules, suspension rules,
 * onboarding requirements and the access message shown when a feature is
 * unavailable. Every change is auditable.
 *
 * Two hard boundaries:
 * - Membership rules grant MEMBER-FACING features only. They never grant
 *   administrative or moderation permissions (those live in the admin action
 *   matrix and manager appointments) — enforced here by restricting the
 *   feature vocabulary to member features, and stated in the UI.
 * - The rules are configuration data. Actual enforcement of membership state
 *   (which plan a person holds, expiry, suspension) remains the backend's
 *   job; this front end reflects the same rules for the demo experience.
 */

const CONFIG_KEY = 'community_membership_config'
const SEED_FLAG_KEY = 'community_membership_seeded'

/**
 * Member-facing feature vocabulary. This list deliberately excludes every
 * administrative and moderation capability — membership rules cannot be used
 * to grant an admin or manager action (Community Hub Manager spec §5).
 */
const FEATURE_LABELS: Record<string, string> = {
  posts_create: 'Create posts',
  exchange_create: 'Create #Exchange items',
  campaigns_create: 'Create campaigns',
  sharing_attribution: 'Share & attribution tracking',
  stories: 'Stories',
  groups: 'Groups & Circles',
}

function readConfigRaw(): MembershipConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? (JSON.parse(raw) as MembershipConfig) : null
  } catch {
    return null
  }
}

function writeConfig(config: MembershipConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch {
    /* ignore */
  }
}

function currentUserName(): string {
  return useAuthStore.getState().user?.name ?? 'Central Hub'
}

function now(): string {
  return new Date().toISOString()
}

/** Seed configuration — labelled `source: 'demo'` until an admin saves real rules. */
function seedDemo(): void {
  try {
    if (localStorage.getItem(SEED_FLAG_KEY)) return
    localStorage.setItem(SEED_FLAG_KEY, '1')
  } catch {
    return
  }
  if (readConfigRaw()) return
  const plans: MembershipPlan[] = [
    { id: 'business-free', label: 'Business Free', kind: 'business', priceText: 'Free' },
    { id: 'business-pro', label: 'Business Pro', kind: 'business', priceText: '£19/mo' },
    { id: 'consumer-free', label: 'Consumer Free', kind: 'consumer', priceText: 'Free' },
    { id: 'consumer-supporter', label: 'Consumer Supporter', kind: 'consumer', priceText: '£5/mo' },
  ]
  const features: MembershipFeature[] = [
    {
      id: 'posts_create',
      label: FEATURE_LABELS.posts_create!,
      description: 'Publish posts to the community feed.',
      allowedPlanIds: plans.map((p) => p.id),
      usageLimit: null,
      expiryRule: 'downgrade_to_free',
      suspensionRule: 'block',
      onboardingRequired: false,
      accessMessage: {
        message: 'Creating posts is not included in your current membership.',
        nextStep: 'Upgrade your plan to start posting, or contact support if you think this is a mistake.',
      },
      exceptions: [],
    },
    {
      id: 'exchange_create',
      label: FEATURE_LABELS.exchange_create!,
      description: 'Post offers, requests and swaps on #Exchange.',
      allowedPlanIds: ['business-pro', 'consumer-supporter'],
      usageLimit: 10,
      expiryRule: 'revoke',
      suspensionRule: 'block',
      onboardingRequired: true,
      accessMessage: {
        message: 'You need an active membership that includes #Exchange to post items.',
        nextStep: 'Upgrade your plan or complete your profile to unlock #Exchange.',
      },
      exceptions: [],
    },
    {
      id: 'campaigns_create',
      label: FEATURE_LABELS.campaigns_create!,
      description: 'Create and manage campaigns.',
      allowedPlanIds: ['business-pro'],
      usageLimit: null,
      expiryRule: 'read_only',
      suspensionRule: 'read_only',
      onboardingRequired: true,
      accessMessage: {
        message: 'Campaigns are available on the Business Pro membership.',
        nextStep: 'Upgrade to Business Pro to create campaigns.',
      },
      exceptions: [],
    },
    {
      id: 'sharing_attribution',
      label: FEATURE_LABELS.sharing_attribution!,
      description: 'Track shares and see attributed results.',
      allowedPlanIds: plans.map((p) => p.id),
      usageLimit: null,
      expiryRule: 'keep',
      suspensionRule: 'allow',
      onboardingRequired: false,
      accessMessage: {
        message: 'Share tracking is not available right now.',
        nextStep: 'Contact support if you believe this is an error.',
      },
      exceptions: [],
    },
    {
      id: 'stories',
      label: FEATURE_LABELS.stories!,
      description: 'Publish short-lived story updates.',
      allowedPlanIds: ['business-pro', 'consumer-supporter'],
      usageLimit: null,
      expiryRule: 'downgrade_to_free',
      suspensionRule: 'block',
      onboardingRequired: false,
      accessMessage: {
        message: 'Stories are available on selected memberships.',
        nextStep: 'Upgrade your plan to publish stories.',
      },
      exceptions: [],
    },
    {
      id: 'groups',
      label: FEATURE_LABELS.groups!,
      description: 'Join and participate in groups.',
      allowedPlanIds: plans.map((p) => p.id),
      usageLimit: null,
      expiryRule: 'keep',
      suspensionRule: 'read_only',
      onboardingRequired: false,
      accessMessage: {
        message: 'Group participation is not available on your membership.',
        nextStep: 'Contact support for help with group access.',
      },
      exceptions: [],
    },
  ]
  const config: MembershipConfig = {
    plans,
    features,
    updatedAt: now(),
    updatedBy: 'Central Hub',
    source: 'demo',
  }
  writeConfig(config)
}

export const membershipService = {
  ensureSeeded(): void {
    seedDemo()
  },

  getConfig(): MembershipConfig {
    seedDemo()
    return readConfigRaw() ?? { plans: [], features: [], updatedAt: now(), updatedBy: null, source: 'demo' }
  },

  saveConfig(patch: Partial<Pick<MembershipConfig, 'plans' | 'features'>>): MembershipConfig {
    seedDemo()
    const base = readConfigRaw() ?? { plans: [] as MembershipPlan[], features: [] as MembershipFeature[], updatedAt: now(), updatedBy: null, source: 'demo' as const }
    const next: MembershipConfig = {
      ...base,
      ...patch,
      updatedAt: now(),
      updatedBy: currentUserName(),
      source: 'user',
    }
    writeConfig(next)
    return next
  },
}

/** Labels for the expiry and suspension rule selects. */
export const EXPIRY_RULE_LABELS: Record<string, string> = {
  keep: 'Keep access',
  downgrade_to_free: 'Downgrade to free tier',
  revoke: 'Revoke access',
  read_only: 'Read-only access',
}

export const SUSPENSION_RULE_LABELS: Record<string, string> = {
  block: 'Block the feature',
  read_only: 'Read-only access',
  allow: 'Allow full access',
}

export type { MembershipException }
