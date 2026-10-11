import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 border-b border-gray-200 overflow-x-auto scrollbar-hide', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={isActive ? 'tab-active' : 'tab-inactive'}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={cn('ml-1 rounded-full px-1.5 py-0.5 text-xs', isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600')}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
