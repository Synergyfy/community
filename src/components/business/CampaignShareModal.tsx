import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, Copy, Download, Link2, QrCode, Share2, TrendingUp } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { sharingApi } from '@/services/sharing.service'
import { attributionApi } from '@/services/attribution.service'
import { useAuthStore } from '@/stores/auth.store'
import type { PublicCampaign, ShareCreateResult } from '@/types/community-public'
import { formatDate } from '@/pages/business/helpers'

/**
 * Share & Promote screen for a single campaign (spec §3.5): campaign name and
 * status, the business's attributed link, Copy Link / native share / QR,
 * instructions, attribution status with a link to results, and a warning
 * when the campaign is no longer eligible for sharing.
 */

interface CampaignShareModalProps {
  campaign: PublicCampaign
  onClose: () => void
}

export function CampaignShareModal({ campaign, onClose }: CampaignShareModalProps) {
  const user = useAuthStore((s) => s.user)
  const [result, setResult] = useState<ShareCreateResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const ended = campaign.status ? campaign.status !== 'active' : false
  const expired = campaign.endDate ? new Date(campaign.endDate).getTime() < Date.now() : false
  const notEligible = ended || expired

  useEffect(() => {
    if (notEligible) return
    let active = true
    setLoading(true)
    setError(false)
    sharingApi
      .createShare({ targetType: 'campaign', targetId: campaign.id })
      .then(async (res) => {
        if (!active) return
        setResult(res)
        // Record the share so My Sharing Results can report on it (demo store).
        if (user) {
          await attributionApi.recordShareCreated({
            sharerId: user.id,
            sharerType: user.userType === 'business' ? 'business' : user.userType === 'consumer' ? 'consumer' : 'admin',
            targetType: 'campaign',
            targetId: campaign.id,
            targetTitle: campaign.title,
            trackingCode: res.trackingCode,
            shareUrl: res.shareUrl,
            shareType: 'link',
            qrCodeUrl: res.qrCodeUrl ?? null,
          })
        }
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [campaign.id, campaign.title, attempt, notEligible, user])

  const shareUrl = result?.shareUrl

  const copy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const nativeShare = async () => {
    if (!shareUrl) return
    if (navigator.share) {
      try {
        await navigator.share({ title: campaign.title, url: shareUrl })
      } catch {
        /* cancelled */
      }
    } else {
      void copy()
    }
  }

  const downloadQr = async () => {
    if (!result?.qrCodeUrl) return
    try {
      const res = await fetch(result.qrCodeUrl)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `community-share-${result.trackingCode}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      /* ignore download errors */
    }
  }

  return (
    <Modal isOpen onClose={onClose} title='Share & promote'>
      <div className='space-y-4'>
        {/* Campaign identity + status */}
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <h3 className='truncate text-sm font-semibold text-gray-900'>{campaign.title}</h3>
            <p className='mt-0.5 text-xs text-gray-500'>
              {campaign.endDate ? `Ends ${formatDate(campaign.endDate)}` : 'No end date'}
            </p>
          </div>
          <Badge variant={campaign.status === 'active' ? 'success' : 'neutral'}>{campaign.status ?? 'active'}</Badge>
        </div>

        {notEligible && (
          <div className='flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800'>
            <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
            This campaign is no longer eligible for sharing. Existing links keep working, but new
            shares may not count towards results.
          </div>
        )}

        {/* Instructions */}
        <div className='rounded-lg bg-gray-50 p-3 text-xs text-gray-600'>
          <p className='font-semibold text-gray-800'>How sharing works</p>
          <ol className='mt-1 list-inside list-decimal space-y-0.5'>
            <li>Copy your unique link or share the QR code.</li>
            <li>When someone opens your link, the visit is recorded.</li>
            <li>If they take a qualifying action, it is attributed to this campaign and to you.</li>
          </ol>
          <p className='mt-1.5 text-gray-500'>
            Visits show immediately. Confirmed outcomes appear once the server has processed and
            qualified them.
          </p>
        </div>

        {loading && <p className='text-sm text-gray-500'>Creating your attributed link…</p>}

        {error && (
          <div className='rounded-lg bg-red-50 p-3 text-sm text-red-700'>
            We couldn't create your share link.
            <button className='ml-2 underline' onClick={() => setAttempt((a) => a + 1)}>
              Try again
            </button>
          </div>
        )}

        {shareUrl && (
          <>
            <div className='flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2'>
              <Link2 className='h-4 w-4 shrink-0 text-gray-400' />
              <span className='flex-1 truncate text-xs text-gray-700'>{shareUrl}</span>
              <button onClick={copy} className='btn-icon text-gray-600' aria-label='Copy link'>
                {copied ? <Check className='h-4 w-4 text-secondary-600' /> : <Copy className='h-4 w-4' />}
              </button>
            </div>

            <div className='grid grid-cols-2 gap-2'>
              <Button variant='secondary' icon={<Copy className='h-4 w-4' />} onClick={copy}>
                {copied ? 'Link copied' : 'Copy Link'}
              </Button>
              <Button variant='secondary' icon={<Share2 className='h-4 w-4' />} onClick={nativeShare}>
                Share
              </Button>
            </div>

            {result?.qrCodeUrl && (
              <div className='flex flex-col items-center gap-2 pt-1'>
                <div className='flex items-center gap-1 text-xs text-gray-500'>
                  <QrCode className='h-4 w-4' /> Scan to open
                </div>
                <img src={result.qrCodeUrl} alt='QR code' className='h-32 w-32 rounded-lg border border-gray-200' />
                <Button variant='ghost' size='sm' icon={<Download className='h-4 w-4' />} onClick={downloadQr}>
                  Download QR
                </Button>
              </div>
            )}

            {/* Attribution status + link to results */}
            <div className='flex items-center justify-between rounded-lg border border-gray-200 p-3'>
              <div className='min-w-0 text-xs text-gray-600'>
                <p className='font-medium text-gray-900'>Attribution status</p>
                <p className='mt-0.5'>Visits and qualifying actions for this link appear in your results.</p>
              </div>
              <Link
                to='/business/sharing'
                onClick={onClose}
                className='flex shrink-0 items-center gap-1 text-sm font-medium text-primary-600 hover:underline'
              >
                <TrendingUp className='h-4 w-4' /> Results
              </Link>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
