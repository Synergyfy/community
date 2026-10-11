import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { saveLocation } from '@/lib/location'

interface LocationSelectorProps {
  isOpen: boolean
  onClose: () => void
}

export function LocationSelector({ isOpen, onClose }: LocationSelectorProps) {
  const handleSelect = (city: string) => {
    saveLocation({ cityName: city, citySlug: city.toLowerCase() })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='Select Community Location'>
      <div className='space-y-2'>
        {['Worcester', 'Birmingham', 'London', 'Manchester'].map((city) => (
          <button key={city} onClick={() => handleSelect(city)} className='w-full text-left px-3 py-2 rounded hover:bg-gray-100'>
            {city}
          </button>
        ))}
        <div className='pt-4'>
          <Button variant='secondary' onClick={onClose} className='w-full'>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}
