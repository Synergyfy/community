import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      <div className='absolute inset-0 bg-black/50' onClick={onClose} />
      <div className={cn('relative bg-white rounded-lg shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-auto', className)}>
        {title && (
          <div className='flex items-center justify-between px-4 py-3 border-b border-gray-200'>
            <h2 className='text-lg font-semibold'>{title}</h2>
            <button className='btn-icon' onClick={onClose}>
              <X className='h-5 w-5' />
            </button>
          </div>
        )}
        <div className='p-4'>{children}</div>
      </div>
    </div>
  )
}
