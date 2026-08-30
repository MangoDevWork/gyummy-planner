import React from 'react';
import type { TabType } from './BottomNav';
import type { UserProfile } from '../types';
import { Home } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface NavbarProps {
  activeTab: TabType;
  currentProfile: UserProfile | null;
  onOpenProfileModal: () => void;
  onOpenDishCreator?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  currentProfile,
  onOpenProfileModal,
  onOpenDishCreator
}) => {
  const { t } = useLanguage();

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'planner':
        return t('header.subtitleMealPlan');
      case 'dishes':
        return t('header.subtitleCookbook');
      case 'ingredients':
        return t('header.subtitlePantry');
      case 'grocery':
        return t('header.subtitleGrocery');
      case 'settings':
        return t('header.subtitleSettings');
    }
  };

  const memberInitial = currentProfile?.memberName ? currentProfile.memberName.charAt(0).toUpperCase() : '?';

  return (
    <header className="sticky top-0 z-30 bg-[#FDFBF7]/90 backdrop-blur-xl border-b border-[#EAE6DF] px-4 py-3 transition-all shadow-xs">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* User Photo Avatar at top left */}
          <button
            onClick={onOpenProfileModal}
            className="relative group shrink-0"
            title="Edit profile & photo"
          >
            {currentProfile?.avatarUrl ? (
              <img
                src={currentProfile.avatarUrl}
                alt={currentProfile.memberName}
                className="w-10 h-10 rounded-2xl object-cover border border-slate-300 shadow-sm active:scale-95 transition-transform"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-[#E2D9CC] text-slate-800 flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 transition-transform">
                {memberInitial}
              </div>
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                Gyummy
              </h1>
              {currentProfile && (
                <button
                  onClick={onOpenProfileModal}
                  className="flex items-center gap-1.5 text-[11px] font-semibold bg-white text-slate-700 border border-[#EAE6DF] px-2.5 py-0.5 rounded-full hover:bg-slate-50 transition active:scale-95 shadow-xs"
                  title="Switch profile or family"
                >
                  <Home className="w-3 h-3 text-slate-500" />
                  <span className="truncate max-w-[90px] font-semibold text-slate-800">{currentProfile.familyName}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-normal text-slate-600 truncate max-w-[70px]">{currentProfile.memberName}</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">{getHeaderTitle()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'dishes' && onOpenDishCreator && (
            <button
              onClick={onOpenDishCreator}
              className="flex items-center gap-1 bg-[#2B2D42] hover:bg-[#1E1F2E] active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <span>+ New Recipe</span>
            </button>
          )}

          {!currentProfile && (
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-1 bg-[#2B2D42] hover:bg-[#1E1F2E] text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
            >
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
