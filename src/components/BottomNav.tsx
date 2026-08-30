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
    {
      id: 'planner' as TabType,
      label: t('nav.planner'),
      icon: Calendar,
      badge: null
    },
    {
      id: 'dishes' as TabType,
      label: t('nav.recipes'),
      icon: UtensilsCrossed,
      badge: null
    },
    {
      id: 'ingredients' as TabType,
      label: t('nav.pantry'),
      icon: Home,
      badge: null
    },
    {
      id: 'grocery' as TabType,
      label: t('nav.grocery'),
      icon: ShoppingCart,
      badge: groceryPendingCount > 0 ? groceryPendingCount : null
    },
    {
      id: 'settings' as TabType,
      label: t('nav.settings'),
      icon: Settings,
      badge: null
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#FDFBF7]/95 backdrop-blur-xl border-t border-[#EAE6DF] pb-safe shadow-md">
      <div className="max-w-md mx-auto grid grid-cols-5 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 cursor-pointer ${
                isActive ? 'text-[#2B2D42] font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.2] text-[#2B2D42]' : 'stroke-[1.6]'
                  }`}
                />
                {tab.badge !== null && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#2B2D42] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow-xs">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate px-1">{tab.label}</span>
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 bg-[#2B2D42] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
