import React from 'react';
import { Calendar, UtensilsCrossed, Home, ShoppingCart, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export type TabType = 'planner' | 'dishes' | 'ingredients' | 'grocery' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  groceryPendingCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  groceryPendingCount
}) => {
  const { t } = useLanguage();

  const tabs: { id: TabType; label: string; icon: LucideIcon; badge?: number | null }[] = [
    { id: 'planner', label: t('nav.planner'), icon: Calendar },
    { id: 'dishes', label: t('nav.recipes'), icon: UtensilsCrossed },
    { id: 'ingredients', label: t('nav.pantry'), icon: Home },
    { id: 'grocery', label: t('nav.grocery'), icon: ShoppingCart, badge: groceryPendingCount > 0 ? groceryPendingCount : null },
    { id: 'settings', label: t('nav.settings'), icon: Settings }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#EDE8DF]/80 bg-white/95 backdrop-blur-md dark:border-[#3A332C]/80 dark:bg-[#28231E]/95 pb-safe shadow-xs">
      <div className="max-w-md mx-auto flex items-stretch justify-between px-2 pb-2 pt-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-1 flex-col items-center gap-1 py-1 cursor-pointer transition-transform active:scale-95"
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
                    {tab.badge > 99 ? '99+' : tab.badge}
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
          );
        })}
      </div>
    </nav>
  );
};
