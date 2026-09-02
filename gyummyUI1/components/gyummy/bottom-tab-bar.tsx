'use client'

import { Calendar, Home, Settings, ShoppingCart, UtensilsCrossed } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type TabId = 'planner' | 'recipes' | 'pantry' | 'grocery' | 'settings'

const TABS: { id: TabId; label: string; icon: LucideIcon; badge?: number }[] = [
  { id: 'planner', label: 'Planner', icon: Calendar },
  { id: 'recipes', label: 'Recipes', icon: UtensilsCrossed },
  { id: 'pantry', label: 'Pantry', icon: Home },
  { id: 'grocery', label: 'Grocery', icon: ShoppingCart, badge: 5 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function BottomTabBar({
  active,
  onChange,
}: {
  active: TabId
  onChange: (id: TabId) => void
}) {
  return (
    <nav className="sticky bottom-0 z-30 border-t border-[#EDE8DF]/80 bg-white/95 backdrop-blur-md dark:border-[#3A332C]/80 dark:bg-[#28231E]/95">
      <div className="flex items-stretch justify-between px-2 pb-2 pt-2">
        {TABS.map((tab) => {
          const isActive = tab.id === active
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="flex flex-1 flex-col items-center gap-1 py-1"
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                  isActive ? 'bg-[#FFD13B]' : 'bg-transparent'
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] ${
                    isActive ? 'text-[#2D2640]' : 'text-[#B8AFA4] dark:text-[#9A8A7E]'
                  }`}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                {tab.badge ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FFD13B] px-1 text-[10px] font-bold text-[#2D2640] ring-2 ring-white dark:ring-[#28231E]">
                    {tab.badge}
                  </span>
                ) : null}
              </span>
              <span
                className={`text-[10.5px] ${
                  isActive
                    ? 'font-bold text-[#2D2640] dark:text-[#F0EDE8]'
                    : 'font-medium text-[#B8AFA4] dark:text-[#9A8A7E]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
