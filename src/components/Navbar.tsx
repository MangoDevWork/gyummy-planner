import React from 'react';
import type { TabType } from './BottomNav';
import type { UserProfile } from '../types';
import { CloudUpload, CloudOff, AlertCircle, Plus, Check } from 'lucide-react';
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
  const { language } = useLanguage();

  const memberInitial = currentProfile?.memberName
    ? currentProfile.memberName.charAt(0).toUpperCase()
    : 'G';

  const renderSyncBadge = () => {
    if (!currentProfile) return null;

    switch (cloudSyncStatus) {
      case 'syncing':
        return (
          <button
            type="button"
            onClick={onForceSync}
            className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 animate-pulse cursor-pointer"
            title="Syncing… Tap to force refresh"
          >
            <CloudUpload className="h-3.5 w-3.5 animate-bounce" />
            <span>{language === 'zh-CN' ? '同步中...' : 'Syncing'}</span>
          </button>
        );
      case 'offline':
        return (
          <button
            type="button"
            onClick={onForceSync}
            className="inline-flex items-center gap-1 rounded-full border border-[#EDE8DF] bg-[#FAF7F2] px-2.5 py-1 text-[11px] font-semibold text-[#8A7A70] dark:border-[#3A332C] dark:bg-[#201C18] dark:text-[#9A8A7E] cursor-pointer"
            title="Offline. Tap to connect & sync"
          >
            <CloudOff className="h-3.5 w-3.5" />
            <span>{language === 'zh-CN' ? '离线' : 'Offline'}</span>
          </button>
        );
      case 'error':
        return (
          <button
            type="button"
            onClick={onForceSync}
            className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-[#E05050] dark:border-rose-500/25 dark:bg-rose-500/10 cursor-pointer"
            title="Sync error. Tap to retry"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{language === 'zh-CN' ? '重试' : 'Retry'}</span>
          </button>
        );
      case 'synced':
      default:
        return (
          <button
            type="button"
            onClick={onForceSync}
            className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 transition-transform active:scale-95 cursor-pointer"
            title="All family data synced. Tap to refresh."
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
            <span>{language === 'zh-CN' ? '已同步' : 'Synced'}</span>
          </button>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#EDE8DF]/80 bg-white/90 backdrop-blur-md dark:border-[#3A332C]/80 dark:bg-[#28231E]/90">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
        {/* Left: Avatar + branding */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="relative shrink-0 transition-transform active:scale-95 cursor-pointer"
            title="Edit profile & photo"
          >
            {currentProfile?.avatarUrl ? (
              <img
                src={currentProfile.avatarUrl}
                alt={currentProfile.memberName}
                className="h-9 w-9 rounded-full object-cover border border-[#EDE8DF] dark:border-[#3A332C]"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFD13B] text-sm font-bold text-[#2D2640]">
                {memberInitial}
              </div>
            )}
          </button>

          <div className="leading-tight">
            <p className="text-[15px] font-bold text-[#2D2640] dark:text-[#F0EDE8]">Gyummy</p>
            {currentProfile ? (
              <button
                type="button"
                onClick={onOpenProfileModal}
                className="mt-0.5 inline-flex items-center rounded-full bg-[#FAF7F2] px-2 py-0.5 text-[11px] font-medium text-[#8A7A70] dark:bg-[#201C18] dark:text-[#9A8A7E] hover:text-[#2D2640] transition cursor-pointer"
              >
                <span className="truncate max-w-[80px] font-semibold">{currentProfile.familyName}</span>
                <span className="mx-1">•</span>
                <span className="truncate max-w-[70px]">{currentProfile.memberName}</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Right: sync badge + action buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'dishes' && onOpenDishCreator ? (
            <button
              type="button"
              onClick={onOpenDishCreator}
              className="inline-flex items-center gap-1 rounded-xl border border-[#2D2640]/10 bg-[#FFD13B] px-3 py-2 text-[12px] font-semibold text-[#2D2640] transition-transform active:scale-95 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              <span>{language === 'zh-CN' ? '新菜谱' : 'New Recipe'}</span>
            </button>
          ) : (
            renderSyncBadge()
          )}

          {!currentProfile && (
            <button
              type="button"
              onClick={onOpenProfileModal}
              className="inline-flex items-center gap-1 rounded-xl border border-[#2D2640]/10 bg-[#FFD13B] px-3 py-1.5 text-[12px] font-semibold text-[#2D2640] transition-transform active:scale-95 cursor-pointer shadow-xs"
            >
              <span>{language === 'zh-CN' ? '登录' : 'Login'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
