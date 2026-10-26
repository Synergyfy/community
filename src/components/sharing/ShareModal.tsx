import { useEffect, useState } from 'react'
import { Check, Copy, Download, Link2, QrCode, Share2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { ShareTargetType } from '@/lib/constants'
import { sharingApi } from '@/services/sharing.service'
import { attributionApi } from '@/services/attribution.service'
import { useAuthStore } from '@/stores/auth.store'
import type { ShareCreateResult } from '@/types/community-public'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  targetType: ShareTargetType
  targetId?: string
  title?: string
}

export function ShareModal({ isOpen, onClose, targetType, targetId, title }: ShareModalProps) {
  const [result, setResult] = useState<ShareCreateResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!isOpen) {
      setResult(null)
      setError(false)
      setCopied(false)
      return
    }
    let active = true
    setLoading(true)
    setError(false)
    sharingApi
      .createShare({ targetType, targetId })
      .then(async (res) => {
        if (active) setResult(res)
        // Remember this share so the sharer's results view can report on it.
        const user = useAuthStore.getState().user
        if (user) {
          await attributionApi.recordShareCreated({
            sharerId: user.id,
            sharerType: user.userType === 'business' ? 'business' : user.userType === 'consumer' ? 'consumer' : 'admin',
            targetType,
            targetId: targetId ?? null,
            targetTitle: title ?? null,
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
  }, [isOpen, targetType, targetId, attempt])

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
        await navigator.share({ title: title || 'Check this out', url: shareUrl })
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
    <Modal isOpen={isOpen} onClose={onClose} title='Share'>
      <div className='space-y-4'>
        <p className='text-sm text-gray-600'>
          Share {title ? <span className='font-medium text-gray-900'>{title}</span> : 'this'} with your Community
        </p>

        {loading && <p className='text-sm text-gray-500'>Creating your share link…</p>}

        {error && (
          <div className='rounded-lg bg-red-50 p-3 text-sm text-red-700'>
            We couldn&apos;t create your share link.
            <button className='ml-2 underline' onClick={() => setAttempt((a) => a + 1)}>
              Try again
            </button>
          </div>
        )}

        {shareUrl && (
          <>
            <div className='flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2'>
              <Link2 className='h-4 w-4 text-gray-400' />
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
              <div className='flex flex-col items-center gap-2 pt-2'>
                <div className='flex items-center gap-1 text-xs text-gray-500'>
                  <QrCode className='h-4 w-4' /> Scan to open
                </div>
                <img src={result.qrCodeUrl} alt='QR code' className='h-36 w-36 rounded-lg border border-gray-200' />
                <Button variant='ghost' size='sm' icon={<Download className='h-4 w-4' />} onClick={downloadQr}>
                  Download QR
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
