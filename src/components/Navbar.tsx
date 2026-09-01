import React from 'react';
import type { TabType } from './BottomNav';
import type { UserProfile } from '../types';
import { Home, CloudCheck, CloudUpload, CloudOff, AlertCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface NavbarProps {
  activeTab: TabType;
  currentProfile: UserProfile | null;
  cloudSyncStatus?: 'synced' | 'syncing' | 'offline' | 'error';
  onOpenProfileModal: () => void;
  onOpenDishCreator?: () => void;
  onForceSync?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  currentProfile,
  cloudSyncStatus = 'synced',
  onOpenProfileModal,
  onOpenDishCreator,
  onForceSync
}) => {
  const { language, t } = useLanguage();

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'planner':     return t('header.subtitleMealPlan');
      case 'dishes':      return t('header.subtitleCookbook');
      case 'ingredients': return t('header.subtitlePantry');
      case 'grocery':     return t('header.subtitleGrocery');
      case 'settings':    return t('header.subtitleSettings');
    }
  };

  const memberInitial = currentProfile?.memberName
    ? currentProfile.memberName.charAt(0).toUpperCase()
    : '?';

  const renderSyncBadge = () => {
    if (!currentProfile) return null;

    const base = 'flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-xl cursor-pointer shadow-xs transition active:scale-95';

    switch (cloudSyncStatus) {
      case 'syncing':
        return (
          <button
            type="button"
            onClick={onForceSync}
            className={`${base} text-amber-800 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse`}
            title="Syncing… Tap to force refresh"
          >
            <CloudUpload className="w-3.5 h-3.5 animate-bounce" />
            <span>{language === 'zh-CN' ? '同步中...' : 'Syncing'}</span>
          </button>
        );
      case 'offline':
        return (
          <button
            type="button"
            onClick={onForceSync}
            className={`${base} text-[#7A6E64] dark:text-[#9A9088] bg-[#F5F0E8] dark:bg-[#2E2A26] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]`}
            title="Offline. Tap to connect & sync"
          >
            <CloudOff className="w-3.5 h-3.5" />
            <span>{language === 'zh-CN' ? '离线 (点此同步)' : 'Offline'}</span>
          </button>
        );
      case 'error':
        return (
          <button
            type="button"
            onClick={onForceSync}
            className={`${base} text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 hover:bg-rose-100`}
            title="Sync error. Tap to retry"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{language === 'zh-CN' ? '重试同步' : 'Retry'}</span>
          </button>
        );
      case 'synced':
      default:
        return (
          <button
            type="button"
            onClick={onForceSync}
            className={`${base} text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50`}
            title="All family data synced. Tap to refresh."
          >
            <CloudCheck className="w-3.5 h-3.5" />
            <span>{language === 'zh-CN' ? '云端同步' : 'Synced'}</span>
          </button>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#1A1714]/90 backdrop-blur-xl border-b border-[#EDE8DF] dark:border-[#38332E] px-4 py-3 transition-all shadow-xs">
      <div className="max-w-md mx-auto flex items-center justify-between">

        {/* Left: Avatar + branding */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenProfileModal}
            className="relative group shrink-0"
            title="Edit profile & photo"
          >
            {currentProfile?.avatarUrl ? (
              <img
                src={currentProfile.avatarUrl}
                alt={currentProfile.memberName}
                className="w-10 h-10 rounded-2xl object-cover border border-[#EDE8DF] dark:border-[#38332E] shadow-sm active:scale-95 transition-transform"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-[#F5E6D5] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#F0EDE8] flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 transition-transform">
                {memberInitial}
              </div>
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-[#2D2640] dark:text-[#F0EDE8] tracking-tight leading-none">
                Gyummy
              </h1>
              {currentProfile && (
                <button
                  onClick={onOpenProfileModal}
                  className="flex items-center gap-1.5 text-[11px] font-semibold bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] px-2.5 py-0.5 rounded-full hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] transition active:scale-95 shadow-xs"
                  title="Switch profile or family"
                >
                  <Home className="w-3 h-3 text-[#9A8A7E] dark:text-[#7A6E64]" />
                  <span className="truncate max-w-[90px] font-bold text-[#2D2640] dark:text-[#D0C8C0]">
                    {currentProfile.familyName}
                  </span>
                  <span className="text-[#C4B8A8] dark:text-[#5A5450]">•</span>
                  <span className="font-normal text-[#7A6E64] dark:text-[#9A9088] truncate max-w-[70px]">
                    {currentProfile.memberName}
                  </span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#9A8A7E] dark:text-[#7A6E64] font-medium mt-0.5">{getHeaderTitle()}</p>
          </div>
        </div>

        {/* Right: sync badge + action buttons */}
        <div className="flex items-center gap-2">
          {renderSyncBadge()}

          {activeTab === 'dishes' && onOpenDishCreator && (
            <button
              onClick={onOpenDishCreator}
              className="flex items-center gap-1 bg-[#FFD13B] hover:bg-[#FFC200] active:scale-95 text-[#2D2640] text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer border border-[#2D2640]/10"
            >
              <span>{language === 'zh-CN' ? '+ 新建菜谱' : '+ New Recipe'}</span>
            </button>
          )}

          {!currentProfile && (
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-1 bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] text-xs font-extrabold px-3.5 py-1.5 rounded-xl shadow-xs transition cursor-pointer border border-[#2D2640]/10"
            >
              <span>{language === 'zh-CN' ? '登录 / 注册' : 'Login'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
