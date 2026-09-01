import React, { useState, useRef } from 'react';
import type { AppData, MealScheduleConfig, UserProfile } from '../../types';
import { getInitialAppData, DEFAULT_PANTRY_INGREDIENTS, DEFAULT_MEAL_SCHEDULES } from '../../services/seedData';
import {
  RotateCcw,
  CheckCircle2,
  Camera,
  Trash2,
  Save,
  Plus,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  Lock,
  RefreshCw,
  AlertTriangle,
  Check,
  ChevronRight
} from 'lucide-react';
import { updateFamilyPinFromSettings, fetchFamilyCloudData } from '../../services/firebase';
import { mergeAppData } from '../../services/mergeSyncService';
import { MealScheduleSettingsModal } from './MealScheduleSettingsModal';
import { PersonalisationModal } from '../personalisation/PersonalisationModal';
import { getAllergenById } from '../../services/personalisationService';
import { compressImage } from '../../services/imageUtils';
import { EasterEggModal } from '../common/EasterEggModal';
import { getCachedSystemRecipes, mergeSystemWithUserDishes } from '../../services/systemRecipesService';
import { saveDarkModePreference } from '../../services/darkMode';
import { useLanguage } from '../../i18n/LanguageContext';

interface SettingsViewProps {
  appData: AppData;
  onUpdateAppData: (data: AppData) => void;
  onOpenProfileModal: () => void;
  onLogout?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: (val: boolean) => void;
}

function SectionCard({
  title,
  action,
  children
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#EDE8DF] bg-white p-4 shadow-sm dark:border-[#3A332C] dark:bg-[#28231E]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7A70] dark:text-[#9A8A7E]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  appData,
  onUpdateAppData,
  onOpenProfileModal,
  onLogout,
  isDarkMode = false,
  onToggleDarkMode
}) => {
  const { language, setLanguage, t } = useLanguage();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isScheduleSettingsOpen, setIsScheduleSettingsOpen] = useState(false);
  const [isPersonalisationOpen, setIsPersonalisationOpen] = useState(false);

  // Profile Edit State — family name is read-only, only member name is editable
  const [editMemberName, setEditMemberName] = useState(appData.currentProfile?.memberName || 'Member');
  const [editAvatarUrl, setEditAvatarUrl] = useState(appData.currentProfile?.avatarUrl || '');
  const [newMemberNameInput, setNewMemberNameInput] = useState('');

  // Family PIN Management State
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [pinChangeMsg, setPinChangeMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Easter Egg State
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [pendingProfileUpdate, setPendingProfileUpdate] = useState<UserProfile | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const currentMember = appData.currentProfile?.memberName || '';
  const familyName = appData.currentProfile?.familyName || '';

  // Dark mode toggle
  const handleToggleDarkMode = () => {
    const newVal = !isDarkMode;
    if (currentMember) {
      saveDarkModePreference(currentMember, newVal);
    }
    onToggleDarkMode?.(newVal);
  };

  // Avatar Upload Handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 400, 400, 0.8);
      setEditAvatarUrl(compressed);
      showToast('📷 Photo updated');
    } catch {
      showToast('❌ Upload failed');
    }
  };

  // Save Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMember = editMemberName.trim();
    if (!cleanMember) {
      showToast('⚠️ Name required');
      return;
    }

    const updatedProfile: UserProfile = {
      familyName,
      memberName: cleanMember,
      avatarUrl: editAvatarUrl || undefined
    };

    if (/nat/i.test(cleanMember)) {
      setPendingProfileUpdate(updatedProfile);
      setShowEasterEgg(true);
      return;
    }

    applyProfileUpdate(updatedProfile);
  };

  const applyProfileUpdate = (profile: UserProfile) => {
    const membersSet = new Set(appData.familyMembers);
    membersSet.add(profile.memberName);
    onUpdateAppData({ ...appData, currentProfile: profile, familyMembers: Array.from(membersSet) });
    showToast('✅ Profile saved');
  };

  const handleEasterEggConfirm = () => {
    setShowEasterEgg(false);
    if (pendingProfileUpdate) {
      applyProfileUpdate(pendingProfileUpdate);
      setPendingProfileUpdate(null);
    }
  };

  // Add a new family member
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newMemberNameInput.trim();
    if (!clean) return;
    if (appData.familyMembers.some((m) => m.toLowerCase() === clean.toLowerCase())) {
      showToast(`⚠️ "${clean}" already exists.`);
      return;
    }
    onUpdateAppData({ ...appData, familyMembers: [...appData.familyMembers, clean] });
    setNewMemberNameInput('');
    showToast(`✅ Added "${clean}"`);
  };

  // Remove a family member
  const handleRemoveMember = (memberToRemove: string) => {
    if (memberToRemove === currentMember) {
      showToast('⚠️ Cannot remove current user');
      return;
    }
    if (window.confirm(`Remove "${memberToRemove}"?`)) {
      const updatedMembers = appData.familyMembers.filter((m) => m !== memberToRemove);
      const updatedDishes = appData.dishes.map((dish) => {
        if (dish.favoritedByMembers?.includes(memberToRemove)) {
          return { ...dish, favoritedByMembers: dish.favoritedByMembers.filter((m) => m !== memberToRemove) };
        }
        return dish;
      });
      onUpdateAppData({ ...appData, familyMembers: updatedMembers, dishes: updatedDishes });
      showToast(`🗑️ Removed "${memberToRemove}"`);
    }
  };

  // Family PIN
  const handleUpdateFamilyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPinInput || !newPinInput) return;
    if (!/^\d{4}$/.test(newPinInput.trim())) {
      setPinChangeMsg({ text: 'New PIN must be exactly 4 digits.', isError: true });
      return;
    }
    const res = await updateFamilyPinFromSettings(familyName, currentPinInput, newPinInput);
    if (res.success) {
      setPinChangeMsg({ text: '✅ Family PIN updated successfully!', isError: false });
      setCurrentPinInput('');
      setNewPinInput('');
      setIsChangingPin(false);
      showToast('🔒 Family PIN updated');
    } else {
      setPinChangeMsg({ text: res.error || 'Failed to update PIN', isError: true });
    }
  };

  // Save meal schedules
  const handleSaveMealSchedules = (schedules: MealScheduleConfig[]) => {
    onUpdateAppData({ ...appData, mealSchedules: schedules });
    showToast('✅ Saved meal schedules');
  };

  // Reset to Starter Data
  const handleResetSampleData = () => {
    if (window.confirm('Restore defaults for meal plan, grocery list, and starter recipes? Your profile and members will remain intact.')) {
      const fresh = getInitialAppData(appData.currentProfile);
      const systemDishes = getCachedSystemRecipes();
      const mergedDishes = mergeSystemWithUserDishes(fresh.dishes, systemDishes);
      onUpdateAppData({
        ...appData,
        dishes: mergedDishes,
        mealPlan: fresh.mealPlan,
        groceryList: fresh.groceryList,
        pantryIngredients: DEFAULT_PANTRY_INGREDIENTS,
        mealSchedules: DEFAULT_MEAL_SCHEDULES
      });
      showToast('✅ Restored defaults');
    }
  };

  return (
    <div className="flex-1 pb-32 pt-4 px-4 space-y-4 max-w-md mx-auto w-full">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#2D2640] dark:bg-[#F0EDE8] text-white dark:text-[#2D2640] text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#FFD13B] dark:text-[#2D2640]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ─── My Profile ─── */}
      <SectionCard
        title={language === 'zh-CN' ? '个人档案' : 'My Profile'}
        action={
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="inline-flex items-center gap-0.5 rounded-lg bg-[#F5F0E8] px-2.5 py-1 text-[11px] font-semibold text-[#2D2640] dark:bg-[#201C18] dark:text-[#F0EDE8] transition cursor-pointer"
          >
            <span>{t('settings.switchMemberBtn')}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        }
      >
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div className="flex items-center gap-3">
            <input type="file" ref={avatarInputRef} accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            <div className="relative shrink-0">
              {editAvatarUrl ? (
                <img
                  src={editAvatarUrl}
                  alt="Member Avatar"
                  className="h-12 w-12 rounded-full object-cover border border-[#EDE8DF] dark:border-[#3A332C]"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFD13B] text-lg font-bold text-[#2D2640]">
                  {editMemberName.charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-0.5 -right-0.5 p-1 bg-[#2D2640] text-white rounded-full shadow-xs hover:opacity-90 transition cursor-pointer"
                title={language === 'zh-CN' ? '上传头像' : 'Upload Photo'}
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <input
                type="text"
                required
                value={editMemberName}
                onChange={(e) => setEditMemberName(e.target.value)}
                placeholder="Member name"
                className="w-full text-[14px] font-bold px-3 py-1.5 rounded-xl border border-[#E8DDD5] bg-[#FAF7F2] text-[#2D2640] placeholder:text-[#C4B0A5] focus:outline-none focus:border-[#A0867A] dark:border-[#3A332C] dark:bg-[#201C18] dark:text-[#F0EDE8]"
              />
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-block rounded-full bg-[#FAF7F2] px-2 py-0.5 text-[11px] font-medium text-[#8A7A70] dark:bg-[#201C18] dark:text-[#9A8A7E]">
                  {familyName}
                </span>
                {editAvatarUrl && (
                  <button
                    type="button"
                    onClick={() => setEditAvatarUrl('')}
                    className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                  >
                    {language === 'zh-CN' ? '删除照片' : 'Remove photo'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#2D2640]/10 bg-[#FFD13B] py-2 text-[12.5px] font-semibold text-[#2D2640] transition-transform active:scale-95 cursor-pointer shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t('common.save')}</span>
          </button>
        </form>
      </SectionCard>

      {/* ─── Family & Allergies (Merged) ─── */}
      <SectionCard
        title={language === 'zh-CN' ? `家庭成员与过敏保护 (${appData.familyMembers.length})` : `Family & Allergies (${appData.familyMembers.length} members)`}
        action={
          <button
            type="button"
            onClick={() => setIsPersonalisationOpen(true)}
            className="inline-flex items-center gap-0.5 rounded-lg bg-[#F5F0E8] px-2.5 py-1 text-[11px] font-semibold text-[#2D2640] dark:bg-[#201C18] dark:text-[#F0EDE8] transition cursor-pointer"
          >
            <span>{language === 'zh-CN' ? '偏好设置' : 'Configure'}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        }
      >
        <div className="space-y-2">
          {appData.familyMembers.map((m) => {
            const isUser = m === currentMember;
            const prefs = appData.memberProfiles?.[m];
            const allergies = prefs?.allergies || [];
            const allergyCount = allergies.length;

            return (
              <div
                key={m}
                className="flex items-center justify-between rounded-xl bg-[#FAF7F2] px-3 py-2.5 dark:bg-[#201C18]"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#2D2640] dark:bg-[#28231E] dark:text-[#F0EDE8] shrink-0 border border-[#EDE8DF] dark:border-[#3A332C]">
                    {m.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[13.5px] font-medium text-[#4A3F35] dark:text-[#F0EDE8] truncate">
                        {m}
                      </span>
                      {isUser && (
                        <span className="rounded-full bg-[#FFD13B] px-1.5 py-0.2 text-[10px] font-bold text-[#2D2640]">
                          {language === 'zh-CN' ? '当前' : 'You'}
                        </span>
                      )}
                    </div>
                    {allergies.length > 0 && (
                      <p className="text-[10px] text-[#8A7A70] dark:text-[#9A8A7E] truncate mt-0.5">
                        {allergies.slice(0, 3).map((id) => {
                          const def = getAllergenById(id);
                          return language === 'zh-CN' ? def?.nameZh || id : def?.nameEn || id;
                        }).join(', ')}
                        {allergies.length > 3 && ` +${allergies.length - 3}`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {allergyCount > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-[#E05050] dark:bg-rose-500/10">
                      <AlertTriangle className="h-3 w-3" />
                      {allergyCount} {language === 'zh-CN' ? '项忌口' : allergyCount === 1 ? 'allergy' : 'allergies'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF5EE] px-2 py-0.5 text-[11px] font-semibold text-[#4E9E72]">
                      <Check className="h-3 w-3" strokeWidth={3} />
                      {language === 'zh-CN' ? '无过敏' : 'No allergies'}
                    </span>
                  )}

                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m)}
                      className="p-1 text-[#C4B0A5] hover:text-rose-600 rounded-lg transition cursor-pointer"
                      title={`Remove ${m}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Member form */}
        <form onSubmit={handleAddMember} className="mt-3 flex gap-2">
          <input
            placeholder={language === 'zh-CN' ? '添加家庭成员...' : 'Add family member...'}
            value={newMemberNameInput}
            onChange={(e) => setNewMemberNameInput(e.target.value)}
            className="flex-1 rounded-xl border border-[#E8DDD5] bg-[#FAF7F2] px-3 py-2 text-[13px] text-[#2D2640] placeholder:text-[#C4B0A5] focus:border-[#A0867A] focus:outline-none dark:border-[#3A332C] dark:bg-[#201C18] dark:text-[#F0EDE8]"
          />
          <button
            type="submit"
            disabled={!newMemberNameInput.trim()}
            className="flex items-center gap-1 rounded-xl border border-[#2D2640]/10 bg-[#FFD13B] px-3 py-2 text-[12px] font-semibold text-[#2D2640] transition-transform active:scale-95 disabled:opacity-40 cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" strokeWidth={2.6} />
            <span>{language === 'zh-CN' ? '添加' : 'Add'}</span>
          </button>
        </form>

        {/* Safety Mode Banner */}
        <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-[#EBF5EE] px-3 py-2.5 dark:from-amber-500/10 dark:to-[#4E9E72]/10">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#4E9E72]" />
          <p className="text-[12px] font-medium text-[#4A3F35] dark:text-[#F0EDE8] flex-1">
            {appData.familyPersonalisation?.strictAllergyFilter !== false
              ? (language === 'zh-CN' ? '全家安全模式已开启 — 菜谱将自动排除过敏原。' : 'Family Safety Mode is on — allergens are filtered from recipes.')
              : (language === 'zh-CN' ? '安全模式已关闭' : 'Safety Mode Off')}
          </p>
        </div>
      </SectionCard>

      {/* ─── Meal Schedules ─── */}
      <SectionCard
        title={t('planner.manageSchedules')}
        action={
          <button
            type="button"
            onClick={() => setIsScheduleSettingsOpen(true)}
            className="inline-flex items-center gap-0.5 rounded-lg bg-[#F5F0E8] px-2.5 py-1 text-[11px] font-semibold text-[#2D2640] dark:bg-[#201C18] dark:text-[#F0EDE8] transition cursor-pointer"
          >
            <span>{language === 'zh-CN' ? '配置餐段' : 'Configure'}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        }
      >
        <p className="text-[13px] text-[#8A7A70] dark:text-[#9A8A7E]">
          {language === 'zh-CN' ? '自定义每日餐饮餐段 (如早/午/晚/加餐) 及生效星期。' : 'Choose which meal slots appear on your planner each day.'}
        </p>
      </SectionCard>

      {/* ─── Family PIN & Cloud Sync ─── */}
      <SectionCard title={language === 'zh-CN' ? '家庭 PIN 码与云同步' : 'Family PIN & Cloud Sync'}>
        <p className="mb-3 text-[13px] text-[#8A7A70] dark:text-[#9A8A7E]">
          {language === 'zh-CN' ? '所有家庭成员使用相同的 4 位数字 PIN 码同步菜谱和计划。' : 'Protect your family plan with a PIN and keep everything synced across devices.'}
        </p>

        {pinChangeMsg && (
          <div className={`mb-3 p-2.5 rounded-xl text-xs font-semibold ${pinChangeMsg.isError ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
            {pinChangeMsg.text}
          </div>
        )}

        {isChangingPin ? (
          <form onSubmit={handleUpdateFamilyPin} className="space-y-2.5 mb-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-[#8A7A70] uppercase mb-1">{language === 'zh-CN' ? '当前 PIN' : 'Current PIN'}</label>
                <input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required placeholder="1234"
                  value={currentPinInput} onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-[#E8DDD5] bg-[#FAF7F2] tracking-widest text-[#2D2640] dark:border-[#3A332C] dark:bg-[#201C18] dark:text-[#F0EDE8]" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#8A7A70] uppercase mb-1">{language === 'zh-CN' ? '新 PIN' : 'New PIN'}</label>
                <input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required placeholder="5678"
                  value={newPinInput} onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-[#E8DDD5] bg-[#FAF7F2] tracking-widest text-[#2D2640] dark:border-[#3A332C] dark:bg-[#201C18] dark:text-[#F0EDE8]" />
              </div>
            </div>
            <button type="submit" disabled={!currentPinInput || !newPinInput}
              className="w-full py-2 bg-[#FFD13B] border border-[#2D2640]/10 disabled:opacity-40 text-[#2D2640] font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer">
              <span>{language === 'zh-CN' ? '保存新 PIN 码' : 'Update Family PIN'}</span>
            </button>
          </form>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setIsChangingPin(!isChangingPin); setPinChangeMsg(null); }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#E8DDD5] bg-[#F5F0E8] py-2.5 text-[12.5px] font-semibold text-[#2D2640] dark:border-[#3A332C] dark:bg-[#201C18] dark:text-[#F0EDE8] transition cursor-pointer"
          >
            <Lock className="h-4 w-4" />
            <span>{isChangingPin ? (language === 'zh-CN' ? '取消' : 'Cancel') : (language === 'zh-CN' ? '修改 PIN' : 'Change PIN')}</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              showToast('🔄 Syncing with cloud...');
              if (appData.currentProfile?.familyName) {
                try {
                  const cloud = await fetchFamilyCloudData(appData.currentProfile.familyName);
                  if (cloud) {
                    const merged = mergeAppData(appData, cloud);
                    onUpdateAppData(merged);
                    showToast('✅ Cloud sync complete!');
                  } else {
                    showToast('⚠️ No cloud data found');
                  }
                } catch {
                  showToast('❌ Sync failed');
                }
              }
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#2D2640]/10 bg-[#FFD13B] py-2.5 text-[12.5px] font-semibold text-[#2D2640] transition-transform active:scale-95 cursor-pointer shadow-xs"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{language === 'zh-CN' ? '立即同步' : 'Force Sync'}</span>
          </button>
        </div>
      </SectionCard>

      {/* ─── Language ─── */}
      <SectionCard title={t('settings.languageTitle')}>
        <div className="flex rounded-full border border-[#EDE8DF] bg-[#FAF7F2] p-1 dark:border-[#3A332C] dark:bg-[#201C18]">
          {[
            { id: 'en', label: 'English' },
            { id: 'zh-CN', label: '中文' }
          ].map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => {
                setLanguage(lang.id as any);
                showToast(lang.id === 'en' ? 'Language switched to English' : '语言已切换为简体中文');
              }}
              className={`flex-1 rounded-full py-1.5 text-[12.5px] font-semibold transition-colors cursor-pointer ${
                language === lang.id
                  ? 'bg-[#FFD13B] text-[#2D2640]'
                  : 'text-[#8A7A70] dark:text-[#9A8A7E]'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* ─── Display ─── */}
      <SectionCard title={t('settings.displayTitle')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isDarkMode ? (
              <Moon className="h-4 w-4 text-[#8A7A70] dark:text-[#9A8A7E]" />
            ) : (
              <Sun className="h-4 w-4 text-[#8A7A70]" />
            )}
            <span className="text-[13.5px] font-medium text-[#4A3F35] dark:text-[#F0EDE8]">
              {isDarkMode ? t('settings.darkModeTitle') : t('settings.lightModeTitle')}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isDarkMode}
            onClick={handleToggleDarkMode}
            className={`relative h-7 w-12 rounded-full transition-colors cursor-pointer ${
              isDarkMode ? 'bg-[#FFD13B]' : 'bg-[#E0D6CB]'
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                isDarkMode ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </SectionCard>

      {/* ─── Account ─── */}
      <SectionCard title={language === 'zh-CN' ? '账号与退出' : 'Account'}>
        {onLogout && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(language === 'zh-CN' ? `确定要退出 ${familyName} 吗？` : `Log out of ${familyName}?`)) {
                onLogout();
              }
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-[13px] font-semibold text-rose-600 dark:border-rose-500/25 dark:bg-rose-500/10 hover:bg-rose-100 transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>{language === 'zh-CN' ? `退出登录 (${familyName})` : `Log Out (${familyName})`}</span>
          </button>
        )}
      </SectionCard>

      {/* ─── Reset Defaults (Preserves auth & 3000 recipes) ─── */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={handleResetSampleData}
          className="inline-flex items-center gap-1 text-[11px] text-[#B8AFA4] hover:text-rose-500 transition cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{t('settings.resetBtn')}</span>
        </button>
      </div>

      {/* ─── Modals ─── */}
      <MealScheduleSettingsModal
        isOpen={isScheduleSettingsOpen}
        onClose={() => setIsScheduleSettingsOpen(false)}
        mealSchedules={appData.mealSchedules}
        onSaveMealSchedules={handleSaveMealSchedules}
      />

      <PersonalisationModal
        isOpen={isPersonalisationOpen}
        onClose={() => setIsPersonalisationOpen(false)}
        currentMember={currentMember}
        familyMembers={appData.familyMembers}
        memberProfiles={appData.memberProfiles || {}}
        familyPersonalisation={appData.familyPersonalisation ?? { strictAllergyFilter: true }}
        onSavePersonalisation={(profiles, familyPrefs) => {
          onUpdateAppData({ ...appData, memberProfiles: profiles, familyPersonalisation: familyPrefs });
          showToast('✅ Personalisation saved');
        }}
      />

      <EasterEggModal isOpen={showEasterEgg} onConfirm={handleEasterEggConfirm} />
    </div>
  );
};
