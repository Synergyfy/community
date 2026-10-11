import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface ComingSoonModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  ctaLabel?: string
}

export function ComingSoonModal({ isOpen, onClose, title, message, ctaLabel = 'Got it' }: ComingSoonModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className='space-y-4'>
        <p className='text-sm text-gray-600'>{message}</p>
        <Button className='w-full' onClick={onClose}>
          {ctaLabel}
        </Button>
      </div>
    </Modal>
  )
}
