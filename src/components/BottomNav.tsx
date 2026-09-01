import React from 'react';
import { Calendar, UtensilsCrossed, Home, ShoppingCart, Settings } from 'lucide-react';
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

  const tabs = [
    { id: 'planner' as TabType,     label: t('nav.planner'),  icon: Calendar,         badge: null },
    { id: 'dishes' as TabType,      label: t('nav.recipes'),  icon: UtensilsCrossed,  badge: null },
    { id: 'ingredients' as TabType, label: t('nav.pantry'),   icon: Home,             badge: null },
    {
      id: 'grocery' as TabType,
      label: t('nav.grocery'),
      icon: ShoppingCart,
      badge: groceryPendingCount > 0 ? groceryPendingCount : null
    },
    { id: 'settings' as TabType,    label: t('nav.settings'), icon: Settings,         badge: null }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1A1714]/95 backdrop-blur-xl border-t border-[#EDE8DF] dark:border-[#38332E] pb-safe shadow-sm">
      <div className="max-w-md mx-auto grid grid-cols-5 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 active:scale-95 cursor-pointer ${
                isActive
                  ? 'text-[#2D2640] dark:text-[#F0EDE8]'
                  : 'text-[#B8AFA4] dark:text-[#5A5450] hover:text-[#7A6E64] dark:hover:text-[#9A9088]'
              }`}
            >
              {/* Icon pill — yellow background when active */}
              <div
                className={`relative flex items-center justify-center w-11 h-6 rounded-full transition-all duration-200 ${
                  isActive ? 'bg-[#FFD13B]' : ''
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.6]'
                  }`}
                />
                {tab.badge !== null && (
                  <span className="absolute -top-1.5 -right-2 bg-[#FFD13B] text-[#2D2640] text-[10px] font-extrabold px-1.5 py-px rounded-full min-w-[18px] text-center shadow-sm border border-[#2D2640]/10">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] tracking-tight truncate px-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
