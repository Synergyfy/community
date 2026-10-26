import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ShieldCheck, Plus, X } from 'lucide-react'
import { adminApi } from '@/services/admin.service'
import { EXPIRY_RULE_LABELS, SUSPENSION_RULE_LABELS } from '@/services/membership.service'
import { useAuthStore } from '@/stores/auth.store'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate } from '../business/helpers'
import type { FeatureExpiryRule, FeatureSuspensionRule, MembershipConfig } from '@/types/community-public'

/**
 * Admin → Membership & Feature Access (spec §5 item 5).
 *
 * Centralized plan entitlements: which membership plans may use each feature,
 * usage limits, expiry rules, suspension rules, onboarding requirements and
 * the access message shown when a feature is unavailable.
 *
 * Two hard boundaries stated in the UI and enforced in the service layer:
 * - Membership rules grant MEMBER-FACING features only — they never grant
 *   administrative or moderation permissions.
 * - The backend enforces these rules as well as the UI reflecting them; the
 *   server is the authority on a member's plan, expiry and suspension state.
 */
export function AdminMembershipPage() {
  const queryClient = useQueryClient()
  const { data: config, isLoading } = useQuery({
    queryKey: ['admin', 'membership'],
    queryFn: adminApi.getMembershipConfig,
  })
  const [draft, setDraft] = useState<MembershipConfig | null>(null)
  const [planDraft, setPlanDraft] = useState({ label: '', kind: 'consumer' as 'business' | 'consumer', priceText: '' })
  const [exceptionDraft, setExceptionDraft] = useState<Record<string, { subjectLabel: string; note: string }>>({})

  useEffect(() => {
    if (config && !draft) setDraft(JSON.parse(JSON.stringify(config)))
  }, [config, draft])

  const saveMutation = useMutation({
    mutationFn: () => adminApi.saveMembershipConfig({ plans: draft!.plans, features: draft!.features }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'membership'] }),
  })

  const patchFeature = (id: string, patch: Partial<MembershipConfig['features'][number]>) =>
    setDraft((d) =>
      d ? { ...d, features: d.features.map((f) => (f.id === id ? { ...f, ...patch } : f)) } : d,
    )

  const addPlanMutation = useMutation({
    mutationFn: () => {
      if (!draft || !planDraft.label.trim()) return Promise.resolve()
      const plan = {
        id: `${planDraft.kind}-${planDraft.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        label: planDraft.label.trim(),
        kind: planDraft.kind,
        priceText: planDraft.priceText.trim() || null,
      }
      if (draft.plans.some((p) => p.id === plan.id)) return Promise.resolve()
      return adminApi.saveMembershipConfig({ plans: [...draft.plans, plan], features: draft.features })
    },
    onSuccess: () => {
      setPlanDraft({ label: '', kind: 'consumer', priceText: '' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'membership'] })
    },
  })

  const addExceptionMutation = useMutation({
    mutationFn: (featureId: string) => {
      const entry = exceptionDraft[featureId]
      if (!draft || !entry?.subjectLabel.trim()) return Promise.resolve()
      const me = useAuthStore.getState().user
      return adminApi.saveMembershipConfig({
        plans: draft.plans,
        features: draft.features.map((f) =>
          f.id === featureId
            ? {
                ...f,
                exceptions: [
                  ...(f.exceptions ?? []),
                  {
                    id: `exc-${Date.now().toString(36)}`,
                    subjectLabel: entry.subjectLabel.trim(),
                    note: entry.note.trim() || null,
                    grantedBy: me?.id ?? 'a1',
                    grantedByName: me?.name ?? 'Central Hub',
                    grantedAt: new Date().toISOString(),
                    source: 'user' as const,
                  },
                ],
              }
            : f,
        ),
      })
    },
    onSuccess: (_data, featureId) => {
      setExceptionDraft((d) => ({ ...d, [featureId]: { subjectLabel: '', note: '' } }))
      queryClient.invalidateQueries({ queryKey: ['admin', 'membership'] })
    },
  })

  const removeExceptionMutation = useMutation({
    mutationFn: ({ featureId, exceptionId }: { featureId: string; exceptionId: string }) => {
      if (!draft) return Promise.resolve()
      return adminApi.saveMembershipConfig({
        plans: draft.plans,
        features: draft.features.map((f) =>
          f.id === featureId ? { ...f, exceptions: (f.exceptions ?? []).filter((e) => e.id !== exceptionId) } : f,
        ),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'membership'] }),
  })

  const removePlanMutation = useMutation({
    mutationFn: (planId: string) => {
      if (!draft) return Promise.resolve()
      const plans = draft.plans.filter((p) => p.id !== planId)
      // Drop the plan from every feature's allow-list so no rule points at a
      // plan that no longer exists.
      const features = draft.features.map((f) => ({ ...f, allowedPlanIds: f.allowedPlanIds.filter((id) => id !== planId) }))
      return adminApi.saveMembershipConfig({ plans, features })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'membership'] }),
  })

  if (isLoading || !draft) return <Skeleton className='h-64 w-full' />

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 className='text-lg font-bold text-gray-900'>Membership &amp; Feature Access</h2>
          <p className='text-sm text-gray-600'>
            Configure which membership plans can use each feature, usage limits, expiry and suspension rules, and the
            access message members see when a feature is unavailable.
          </p>
        </div>
        <button className='btn btn-primary' onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <p className='flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800'>
        <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
        Membership rules grant member-facing features only. They never grant administrative or moderation permissions —
        those live in the admin action matrix and Community Hub Manager appointments. The backend enforces these rules
        alongside the interface; the server remains the authority on a member&apos;s plan, expiry and suspension state.
      </p>

      {/* Plans */}
      <div className='card'>
        <div className='card-content space-y-3'>
          <h3 className='text-sm font-semibold text-gray-900'>Membership plans</h3>
          <ul className='divide-y divide-gray-100 rounded-lg border border-gray-100'>
            {draft.plans.map((plan) => (
              <li key={plan.id} className='flex items-center justify-between px-3 py-2 text-sm'>
                <span>
                  <span className='font-medium text-gray-900'>{plan.label}</span>{' '}
                  <Badge variant={plan.kind === 'business' ? 'primary' : 'neutral'}>{plan.kind}</Badge>{' '}
                  <span className='text-xs text-gray-500'>{plan.priceText ?? ''}</span>
                </span>
                <button
                  className='text-gray-400 hover:text-red-600'
                  aria-label={`Remove plan ${plan.label}`}
                  onClick={() => {
                    if (window.confirm(`Remove the ${plan.label} plan? Features will no longer grant it access.`)) {
                      removePlanMutation.mutate(plan.id)
                    }
                  }}
                >
                  <X className='h-4 w-4' />
                </button>
              </li>
            ))}
          </ul>
          <div className='flex flex-wrap items-center gap-2'>
            <input
              className='input-field'
              placeholder='Plan name'
              value={planDraft.label}
              onChange={(e) => setPlanDraft((d) => ({ ...d, label: e.target.value }))}
            />
            <select
              className='input-field w-auto'
              value={planDraft.kind}
              onChange={(e) => setPlanDraft((d) => ({ ...d, kind: e.target.value as 'business' | 'consumer' }))}
            >
              <option value='consumer'>Consumer</option>
              <option value='business'>Business</option>
            </select>
            <input
              className='input-field'
              placeholder='Price (optional)'
              value={planDraft.priceText}
              onChange={(e) => setPlanDraft((d) => ({ ...d, priceText: e.target.value }))}
            />
            <button className='btn btn-secondary btn-sm' disabled={!planDraft.label.trim()} onClick={() => addPlanMutation.mutate()}>
              <Plus className='h-4 w-4' /> Add plan
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className='space-y-3'>
        {draft.features.map((feature) => (
          <div key={feature.id} className='card'>
            <div className='card-content space-y-3'>
              <div>
                <h3 className='text-sm font-semibold text-gray-900'>{feature.label}</h3>
                {feature.description && <p className='text-xs text-gray-500'>{feature.description}</p>}
              </div>

              <div>
                <p className='mb-1 text-xs font-medium text-gray-700'>Plans with access</p>
                <div className='flex flex-wrap gap-3'>
                  {draft.plans.map((plan) => (
                    <label key={plan.id} className='flex items-center gap-1.5 text-sm'>
                      <input
                        type='checkbox'
                        checked={feature.allowedPlanIds.includes(plan.id)}
                        onChange={() =>
                          patchFeature(feature.id, {
                            allowedPlanIds: feature.allowedPlanIds.includes(plan.id)
                              ? feature.allowedPlanIds.filter((id) => id !== plan.id)
                              : [...feature.allowedPlanIds, plan.id],
                          })
                        }
                      />
                      {plan.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                <div>
                  <label className='label' htmlFor={`${feature.id}-limit`}>
                    Usage limit (per period)
                  </label>
                  <input
                    id={`${feature.id}-limit`}
                    type='number'
                    min={0}
                    className='input-field'
                    placeholder='Unlimited'
                    value={feature.usageLimit ?? ''}
                    onChange={(e) => patchFeature(feature.id, { usageLimit: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className='label' htmlFor={`${feature.id}-expiry`}>
                    When membership expires
                  </label>
                  <select
                    id={`${feature.id}-expiry`}
                    className='input-field'
                    value={feature.expiryRule}
                    onChange={(e) => patchFeature(feature.id, { expiryRule: e.target.value as FeatureExpiryRule })}
                  >
                    {Object.entries(EXPIRY_RULE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='label' htmlFor={`${feature.id}-suspension`}>
                    While suspended
                  </label>
                  <select
                    id={`${feature.id}-suspension`}
                    className='input-field'
                    value={feature.suspensionRule}
                    onChange={(e) => patchFeature(feature.id, { suspensionRule: e.target.value as FeatureSuspensionRule })}
                  >
                    {Object.entries(SUSPENSION_RULE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='flex items-end pb-2'>
                  <label className='flex items-center gap-1.5 text-sm'>
                    <input
                      type='checkbox'
                      checked={feature.onboardingRequired}
                      onChange={(e) => patchFeature(feature.id, { onboardingRequired: e.target.checked })}
                    />
                    Requires completed onboarding
                  </label>
                </div>
              </div>

              <div className='grid gap-3 sm:grid-cols-2'>
                <div>
                  <label className='label' htmlFor={`${feature.id}-msg`}>
                    Access message
                  </label>
                  <input
                    id={`${feature.id}-msg`}
                    className='input-field'
                    value={feature.accessMessage.message}
                    onChange={(e) => patchFeature(feature.id, { accessMessage: { ...feature.accessMessage, message: e.target.value } })}
                  />
                </div>
                <div>
                  <label className='label' htmlFor={`${feature.id}-next`}>
                    Next step
                  </label>
                  <input
                    id={`${feature.id}-next`}
                    className='input-field'
                    value={feature.accessMessage.nextStep}
                    onChange={(e) => patchFeature(feature.id, { accessMessage: { ...feature.accessMessage, nextStep: e.target.value } })}
                  />
                </div>
              </div>

              {/* Exceptions */}
              <div>
                <p className='mb-1 text-xs font-medium text-gray-700'>Exceptions (authorized &amp; auditable)</p>
                {feature.exceptions && feature.exceptions.length > 0 && (
                  <ul className='mb-2 space-y-1'>
                    {feature.exceptions.map((exc) => (
                      <li key={exc.id} className='flex items-center justify-between rounded-lg border border-gray-100 px-3 py-1.5 text-xs'>
                        <span>
                          <span className='font-medium text-gray-900'>{exc.subjectLabel}</span>
                          {exc.note && <span className='text-gray-500'> — {exc.note}</span>}
                          <span className='block text-gray-400'>
                            Granted by {exc.grantedByName} · {formatDate(exc.grantedAt)}
                          </span>
                        </span>
                        <button
                          className='text-gray-400 hover:text-red-600'
                          aria-label='Revoke exception'
                          onClick={() => {
                            if (window.confirm('Revoke this exception?')) {
                              removeExceptionMutation.mutate({ featureId: feature.id, exceptionId: exc.id })
                            }
                          }}
                        >
                          <X className='h-4 w-4' />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className='flex flex-wrap items-center gap-2'>
                  <input
                    className='input-field'
                    placeholder='Account or member'
                    value={exceptionDraft[feature.id]?.subjectLabel ?? ''}
                    onChange={(e) =>
                      setExceptionDraft((d) => ({
                        ...d,
                        [feature.id]: { subjectLabel: e.target.value, note: d[feature.id]?.note ?? '' },
                      }))
                    }
                  />
                  <input
                    className='input-field'
                    placeholder='Reason (optional)'
                    value={exceptionDraft[feature.id]?.note ?? ''}
                    onChange={(e) =>
                      setExceptionDraft((d) => ({
                        ...d,
                        [feature.id]: { subjectLabel: d[feature.id]?.subjectLabel ?? '', note: e.target.value },
                      }))
                    }
                  />
                  <button
                    className='btn btn-secondary btn-sm'
                    disabled={!exceptionDraft[feature.id]?.subjectLabel?.trim()}
                    onClick={() => addExceptionMutation.mutate(feature.id)}
                  >
                    Grant
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className='flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600'>
        <ShieldCheck className='mt-0.5 h-4 w-4 shrink-0 text-gray-400' />
        Removing the Community Hub Manager staff role never touches these membership rules — staff permissions and
        membership entitlements are separate systems. Every change on this page is recorded in the audit log.
      </p>
    </div>
  )
}
