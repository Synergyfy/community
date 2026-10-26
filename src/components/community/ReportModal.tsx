import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { reportsService } from '@/services/reports.service'
import { adminConfigService } from '@/services/admin-config.service'
import { cn } from '@/lib/utils'
import type { ReportTargetType } from '@/types/community-public'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  /** Post target id — kept for existing call sites (implies `post`). */
  postId?: string
  /** Explicit target for comment/exchange/user reports (§3.6). */
  targetType?: ReportTargetType
  targetId?: string
  targetLabel?: string | null
  onSubmitted?: (targetId: string) => void
}

export function ReportModal({
  isOpen,
  onClose,
  postId,
  targetType = 'post',
  targetId,
  targetLabel,
  onSubmitted,
}: ReportModalProps) {
  const [reason, setReason] = useState<string>('')
  const [details, setDetails] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Reasons are admin-configurable data (§3.6), not a hardcoded frontend list.
  const [reasons] = useState(() => adminConfigService.listReportReasons())

  const resolvedType: ReportTargetType = postId && !targetId ? 'post' : targetType
  const resolvedId = targetId ?? postId ?? ''
  const noun = resolvedType === 'post' ? 'post' : resolvedType === 'comment' ? 'comment' : resolvedType === 'exchange' ? 'exchange item' : 'account'

  const close = () => {
    onClose()
    setTimeout(() => {
      setReason('')
      setDetails('')
      setSubmitted(false)
    }, 200)
  }

  const submit = async () => {
    if (!reason || submitting || !resolvedId) return
    setSubmitting(true)
    try {
      await reportsService.submitReport({
        targetType: resolvedType,
        targetId: resolvedId,
        targetLabel: targetLabel ?? null,
        reasonCode: reason,
        details: details.trim() || null,
      })
      onSubmitted?.(resolvedId)
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title={submitted ? 'Thank you' : `Report this ${noun}`}>
      {submitted ? (
        <div className='space-y-4'>
          <p className='text-sm text-gray-600'>
            Thanks for letting us know. Our team will review this report and take action if it breaks our Community rules.
          </p>
          <Button className='w-full' onClick={close}>
            Done
          </Button>
        </div>
      ) : (
        <div className='space-y-4'>
          <p className='text-sm text-gray-600'>Why are you reporting this {noun}?</p>
          <div className='space-y-1'>
            {reasons.map((r) => (
              <button
                key={r.id}
                onClick={() => setReason(r.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm',
                  reason === r.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50',
                )}
              >
                <span
                  className={cn(
                    'h-4 w-4 rounded-full border',
                    reason === r.id ? 'border-primary-600 bg-primary-600 ring-2 ring-primary-200' : 'border-gray-300',
                  )}
                />
                {r.label}
              </button>
            ))}
          </div>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder='Add any details (optional)'
            rows={3}
            className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400'
          />
          <div className='flex gap-2'>
            <Button variant='secondary' className='flex-1' onClick={close}>
              Cancel
            </Button>
            <Button className='flex-1' disabled={!reason || submitting} onClick={() => void submit()}>
              {submitting ? 'Submitting…' : 'Submit report'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
