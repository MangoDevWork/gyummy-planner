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
  ChevronRight,
  Scale
} from 'lucide-react';
import { updateFamilyPinFromSettings, fetchFamilyCloudData, deleteFamilyAccountAndData } from '../../services/firebase';
import { purgeFamilyLocalStorage } from '../../services/storage';
import { mergeAppData } from '../../services/mergeSyncService';
import { MealScheduleSettingsModal } from './MealScheduleSettingsModal';
import { PersonalisationModal } from '../personalisation/PersonalisationModal';
import { LegalTermsModal } from '../common/LegalTermsModal';
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
    <section className="rounded-2xl border border-[#EDE8DF] bg-white p-4 shadow-xs dark:border-[#3D362E] dark:bg-[#2A2520]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#786F66] dark:text-[#A39C90]">
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
  const [activePersonalisationMember, setActivePersonalisationMember] = useState<string>('');

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

  // Legal Terms Modal State
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalInitialTab, setLegalInitialTab] = useState<'allergies' | 'recipes' | 'terms' | 'privacy'>('allergies');

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletePinInput, setDeletePinInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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
  const handleRemoveMember = (memberToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  // Statutory Account & Data Deletion (GDPR Art. 17 / APP 11 / CCPA)
  const handleDeleteAccount = async () => {
    if (!deletePinInput || !/^\d{4}$/.test(deletePinInput.trim())) {
      setDeleteError(language === 'zh-CN' ? '请输入4位家庭PIN码以确认' : 'Enter 4-digit PIN to confirm');
      return;
    }

    setIsDeletingAccount(true);
    setDeleteError('');

    try {
      const res = await deleteFamilyAccountAndData(familyName, deletePinInput);
      if (!res.success) {
        setDeleteError(res.error || (language === 'zh-CN' ? 'PIN码错误，注销失败' : 'Incorrect PIN. Failed to delete account.'));
        setIsDeletingAccount(false);
        return;
      }

      // Irrevocably purge local storage & caches
      purgeFamilyLocalStorage(familyName);

      alert(
        language === 'zh-CN'
          ? '您的家庭空间及所有关联云端与本地数据已被永久注销和删除。'
          : 'Your family account and all associated cloud and local data have been permanently deleted.'
      );

      setShowDeleteAccountModal(false);
      if (onLogout) {
        onLogout();
      } else {
        window.location.reload();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deletion error';
      setDeleteError(msg);
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="flex-1 pb-32 pt-4 px-4 space-y-4 max-w-md mx-auto w-full">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#1E1B2E] dark:bg-[#F5F2EB] text-white dark:text-[#1E1B2E] text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#FFD13B] dark:text-[#1E1B2E]" />
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
            className="inline-flex items-center gap-0.5 rounded-lg bg-[#FAF8F5] dark:bg-[#221E1A] border border-[#EDE8DF] dark:border-[#3D362E] px-2.5 py-1 text-[11px] font-bold text-[#1E1B2E] dark:text-[#F5F2EB] transition cursor-pointer"
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
                  className="h-12 w-12 rounded-full object-cover border border-[#EDE8DF] dark:border-[#3D362E]"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFD13B] text-lg font-bold text-[#1E1B2E]">
                  {editMemberName.charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-0.5 -right-0.5 p-1 bg-[#1E1B2E] text-white rounded-full shadow-xs hover:opacity-90 transition cursor-pointer"
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
                className="w-full text-[14px] font-bold px-3 py-1.5 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] text-[#1E1B2E] placeholder:text-[#A89F95] focus:outline-none focus:border-[#FFD13B] dark:border-[#3D362E] dark:bg-[#221E1A] dark:text-[#F5F2EB]"
              />
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-block rounded-full bg-[#FAF8F5] px-2 py-0.5 text-[11px] font-semibold text-[#786F66] dark:bg-[#221E1A] dark:text-[#A39C90] border border-[#EDE8DF] dark:border-[#3D362E]">
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
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#1E1B2E]/10 bg-[#FFD13B] py-2 text-[12.5px] font-bold text-[#1E1B2E] transition-transform active:scale-95 cursor-pointer shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t('common.save')}</span>
          </button>
        </form>
      </SectionCard>

      {/* ─── Family & Allergies (Click card opens Configure) ─── */}
      <SectionCard
        title={language === 'zh-CN' ? `家庭成员与过敏保护 (${appData.familyMembers.length})` : `Family & Allergies (${appData.familyMembers.length} members)`}
      >
        <p className="text-[11px] text-[#A89F95] mb-2">
          {language === 'zh-CN' ? '点击任意成员卡片即可配置其口味偏好与食物忌口：' : 'Tap any member to configure tastes, diets & allergies:'}
        </p>

        <div className="space-y-2">
          {appData.familyMembers.map((m) => {
            const isUser = m === currentMember;
            const prefs = appData.memberProfiles?.[m];
            const allergies = prefs?.allergies || [];
            const allergyCount = allergies.length;

            return (
              <div
                key={m}
                onClick={() => {
                  setActivePersonalisationMember(m);
                  setIsPersonalisationOpen(true);
                }}
                className="flex items-center justify-between rounded-xl bg-[#FAF8F5] p-3 dark:bg-[#221E1A] border border-[#F0ECE1] dark:border-[#383129] cursor-pointer hover:border-[#FFD13B]/60 transition-all group active:scale-99"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#1E1B2E] dark:bg-[#2A2520] dark:text-[#F5F2EB] shrink-0 border border-[#EDE8DF] dark:border-[#3D362E]">
                    {m.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[13.5px] font-bold text-[#1E1B2E] dark:text-[#F5F2EB] truncate">
                        {m}
                      </span>
                      {isUser && (
                        <span className="rounded-full bg-[#FFD13B] px-1.5 py-0.2 text-[10px] font-extrabold text-[#1E1B2E]">
                          {language === 'zh-CN' ? '当前' : 'You'}
                        </span>
                      )}
                    </div>
                    {allergies.length > 0 ? (
                      <p className="text-[10.5px] text-[#786F66] dark:text-[#A39C90] truncate mt-0.5">
                        {allergies.slice(0, 3).map((id) => {
                          const def = getAllergenById(id);
                          return language === 'zh-CN' ? def?.nameZh || id : def?.nameEn || id;
                        }).join(', ')}
                        {allergies.length > 3 && ` +${allergies.length - 3}`}
                      </p>
                    ) : (
                      <p className="text-[10px] text-[#A89F95] mt-0.5">
                        {language === 'zh-CN' ? '点击配置偏好' : 'Tap to customize'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {allergyCount > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-[#E05050] dark:bg-rose-950/40">
                      <AlertTriangle className="h-3 w-3" />
                      {allergyCount} {language === 'zh-CN' ? '项忌口' : allergyCount === 1 ? 'allergy' : 'allergies'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F5ED] px-2 py-0.5 text-[11px] font-bold text-[#2D6A4A] dark:bg-[#1E2E24] dark:text-[#5ECB8D]">
                      <Check className="h-3 w-3" strokeWidth={3} />
                      {language === 'zh-CN' ? '无过敏' : 'No allergies'}
                    </span>
                  )}

                  {!isUser && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveMember(m, e)}
                      className="p-1 text-[#A89F95] hover:text-rose-600 rounded-lg transition cursor-pointer"
                      title={`Remove ${m}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <ChevronRight className="w-4 h-4 text-[#A89F95] group-hover:translate-x-0.5 transition-transform" />
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
            className="flex-1 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2 text-[13px] text-[#1E1B2E] placeholder:text-[#A89F95] focus:border-[#FFD13B] focus:outline-none dark:border-[#3D362E] dark:bg-[#221E1A] dark:text-[#F5F2EB]"
          />
          <button
            type="submit"
            disabled={!newMemberNameInput.trim()}
            className="flex items-center gap-1 rounded-xl border border-[#1E1B2E]/10 bg-[#FFD13B] px-3.5 py-2 text-[12px] font-bold text-[#1E1B2E] transition-transform active:scale-95 disabled:opacity-40 cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" strokeWidth={2.6} />
            <span>{language === 'zh-CN' ? '添加' : 'Add'}</span>
          </button>
        </form>

        {/* Safety Mode Banner */}
        <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-[#E8F5ED] p-3 dark:from-amber-950/20 dark:to-[#1E2E24] border border-[#EDE8DF] dark:border-[#3D362E]">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#2D6A4A] dark:text-[#5ECB8D]" />
          <p className="text-[12px] font-medium text-[#1E1B2E] dark:text-[#F5F2EB] flex-1">
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
            className="inline-flex items-center gap-0.5 rounded-lg bg-[#FAF8F5] dark:bg-[#221E1A] border border-[#EDE8DF] dark:border-[#3D362E] px-2.5 py-1 text-[11px] font-bold text-[#1E1B2E] dark:text-[#F5F2EB] transition cursor-pointer"
          >
            <span>{language === 'zh-CN' ? '配置餐段' : 'Configure'}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        }
      >
        <p className="text-[13px] text-[#786F66] dark:text-[#A39C90]">
          {language === 'zh-CN' ? '自定义每日餐饮餐段 (如早/午/晚/加餐) 及生效星期。' : 'Choose which meal slots appear on your planner each day.'}
        </p>
      </SectionCard>

      {/* ─── Family PIN & Cloud Sync ─── */}
      <SectionCard title={language === 'zh-CN' ? '家庭 PIN 码与云同步' : 'Family PIN & Cloud Sync'}>
        <p className="mb-3 text-[13px] text-[#786F66] dark:text-[#A39C90]">
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
                <label className="block text-[10px] font-semibold text-[#786F66] uppercase mb-1">{language === 'zh-CN' ? '当前 PIN' : 'Current PIN'}</label>
                <input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required placeholder="1234"
                  value={currentPinInput} onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] tracking-widest text-[#1E1B2E] dark:border-[#3D362E] dark:bg-[#221E1A] dark:text-[#F5F2EB]" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#786F66] uppercase mb-1">{language === 'zh-CN' ? '新 PIN' : 'New PIN'}</label>
                <input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required placeholder="5678"
                  value={newPinInput} onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] tracking-widest text-[#1E1B2E] dark:border-[#3D362E] dark:bg-[#221E1A] dark:text-[#F5F2EB]" />
              </div>
            </div>
            <button type="submit" disabled={!currentPinInput || !newPinInput}
              className="w-full py-2 bg-[#FFD13B] border border-[#1E1B2E]/10 disabled:opacity-40 text-[#1E1B2E] font-bold text-xs rounded-xl shadow-xs transition cursor-pointer">
              <span>{language === 'zh-CN' ? '保存新 PIN 码' : 'Update Family PIN'}</span>
            </button>
          </form>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setIsChangingPin(!isChangingPin); setPinChangeMsg(null); }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#EDE8DF] bg-[#FAF8F5] py-2.5 text-[12.5px] font-bold text-[#1E1B2E] dark:border-[#3D362E] dark:bg-[#221E1A] dark:text-[#F5F2EB] transition cursor-pointer"
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
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#1E1B2E]/10 bg-[#FFD13B] py-2.5 text-[12.5px] font-bold text-[#1E1B2E] transition-transform active:scale-95 cursor-pointer shadow-xs"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{language === 'zh-CN' ? '立即同步' : 'Force Sync'}</span>
          </button>
        </div>
      </SectionCard>

      {/* ─── Language ─── */}
      <SectionCard title={t('settings.languageTitle')}>
        <div className="flex rounded-full border border-[#EDE8DF] bg-[#FAF8F5] p-1 dark:border-[#3D362E] dark:bg-[#221E1A]">
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
              className={`flex-1 rounded-full py-1.5 text-[12.5px] font-bold transition-all cursor-pointer ${
                language === lang.id
                  ? 'bg-[#FFD13B] text-[#1E1B2E] shadow-xs'
                  : 'text-[#786F66] dark:text-[#A39C90]'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* ─── Display / Dark Mode with fixed switch alignment ─── */}
      <SectionCard title={t('settings.displayTitle')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isDarkMode ? (
              <Moon className="h-4 w-4 text-amber-400" />
            ) : (
              <Sun className="h-4 w-4 text-amber-500" />
            )}
            <div>
              <p className="text-[13.5px] font-bold text-[#1E1B2E] dark:text-[#F5F2EB]">
                {isDarkMode ? t('settings.darkModeTitle') : t('settings.lightModeTitle')}
              </p>
              <p className="text-[11px] text-[#A89F95]">
                {isDarkMode ? (language === 'zh-CN' ? '已开启温馨暗色模式' : 'Warm evening dark mode') : (language === 'zh-CN' ? '已开启清爽明亮模式' : 'Crisp bright light mode')}
              </p>
            </div>
          </div>
          
          {/* Fixed switch knob alignment */}
          <button
            type="button"
            role="switch"
            aria-checked={isDarkMode}
            onClick={handleToggleDarkMode}
            className={`relative inline-flex items-center h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ${
              isDarkMode ? 'bg-[#FFD13B]' : 'bg-[#E0D8CB] dark:bg-[#3D362E]'
            }`}
          >
            <span
              className={`pointer-events-none flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                isDarkMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            >
              {isDarkMode ? <Moon className="w-3.5 h-3.5 text-[#1E1B2E]" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
            </span>
          </button>
        </div>
      </SectionCard>

      {/* ─── Legal & Disclaimers ─── */}
      <SectionCard title={language === 'zh-CN' ? '法律条款与免责声明' : 'Legal & Disclaimers'}>
        <div>
          <button
            type="button"
            onClick={() => {
              setLegalInitialTab('terms');
              setIsLegalModalOpen(true);
            }}
            className="flex w-full items-center justify-between rounded-xl border border-[#EDE8DF] bg-[#FAF8F5] p-3 text-left transition hover:border-[#FFD13B]/70 dark:border-[#3D362E] dark:bg-[#221E1A] cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Scale className="h-4 w-4 text-[#FFD13B]" />
              <div>
                <p className="text-[13px] font-bold text-[#1E1B2E] dark:text-[#F5F2EB]">
                  {language === 'zh-CN' ? '服务条款、隐私与免责声明' : 'Terms of Service, Privacy & Health Disclaimer'}
                </p>
                <p className="text-[11px] text-[#A89F95]">
                  {language === 'zh-CN' ? '算法估算说明、食品安全、澳大利亚及国际适用责任限制' : 'Algorithmic estimations, food safety, Australian & international terms'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#A89F95]" />
          </button>
        </div>
      </SectionCard>

      {/* ─── Account & Privacy ─── */}
      <SectionCard title={language === 'zh-CN' ? '账号与隐私管理' : 'Account & Privacy'}>
        <div className="space-y-2.5">
          {onLogout && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(language === 'zh-CN' ? `确定要退出 ${familyName} 吗？` : `Log out of ${familyName}?`)) {
                  onLogout();
                }
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#EDE8DF] bg-[#FAF8F5] dark:border-[#3D362E] dark:bg-[#221E1A] py-2.5 text-[13px] font-bold text-[#2D2640] dark:text-[#F0EDE8] hover:bg-[#EDE8DF] transition cursor-pointer"
            >
              <LogOut className="h-4 w-4 text-[#7A6E64]" />
              <span>{language === 'zh-CN' ? `退出登录 (${familyName})` : `Log Out (${familyName})`}</span>
            </button>
          )}

          {/* Statutory Right of Deletion (GDPR / CCPA / Australian Privacy Principles) */}
          <div className="pt-2 border-t border-[#EDE8DF] dark:border-[#3D362E]">
            <button
              type="button"
              onClick={() => {
                setDeletePinInput('');
                setDeleteError('');
                setShowDeleteAccountModal(true);
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 dark:border-rose-950 dark:bg-rose-950/20 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{language === 'zh-CN' ? '永久注销账号与删除家庭数据' : 'Delete Account & Family Data'}</span>
            </button>
            <p className="text-[10px] text-center text-[#9A8A7E] dark:text-[#7A6E64] mt-1">
              {language === 'zh-CN'
                ? '符合隐私法规要求：立即且永久清空云端和设备上的所有家庭资料'
                : 'Fulfills GDPR / APP 11 statutory rights: permanently purges all cloud and local records.'}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ─── Reset Defaults ─── */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={handleResetSampleData}
          className="inline-flex items-center gap-1 text-[11px] text-[#A89F95] hover:text-rose-500 transition cursor-pointer"
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
        currentMember={activePersonalisationMember || currentMember}
        familyMembers={appData.familyMembers}
        memberProfiles={appData.memberProfiles || {}}
        familyPersonalisation={appData.familyPersonalisation ?? { strictAllergyFilter: true }}
        onSavePersonalisation={(profiles, familyPrefs) => {
          onUpdateAppData({ ...appData, memberProfiles: profiles, familyPersonalisation: familyPrefs });
          showToast('✅ Personalisation saved');
        }}
      />

      <EasterEggModal isOpen={showEasterEgg} onConfirm={handleEasterEggConfirm} />

      <LegalTermsModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalInitialTab}
      />

      {/* ─── Delete Account Confirmation Modal ─── */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-950 dark:bg-[#201C18] space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="text-base font-bold">
                {language === 'zh-CN' ? '确认注销家庭账号？' : 'Delete Family Account?'}
              </h3>
            </div>

            <p className="text-xs leading-relaxed text-[#7A6E64] dark:text-[#9A9088]">
              {language === 'zh-CN'
                ? `此操作将立即并永久删除家庭空间“${familyName}”的所有排餐日程、自定义菜谱、储藏室清单及成员档案。云端和本地数据将被彻底清除，无法恢复。`
                : `This will permanently and irreversibly erase the "${familyName}" family space, custom recipes, meal schedules, and member profiles from Google Cloud and this device.`}
            </p>

            {deleteError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                ⚠️ {deleteError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2D2640] dark:text-[#F0EDE8]">
                {language === 'zh-CN' ? '输入4位家庭PIN码确认' : 'Enter 4-Digit Family PIN to Confirm'}
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoFocus
                placeholder="••••"
                value={deletePinInput}
                onChange={(e) => setDeletePinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-3 py-2 text-center text-lg font-black tracking-widest rounded-xl border border-[#EDE8DF] dark:border-[#3D362E] bg-[#FAF8F5] dark:bg-[#28231E] text-[#2D2640] dark:text-[#F0EDE8] focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#EDE8DF] dark:border-[#3D362E] bg-[#F5F0E8] dark:bg-[#2E2A26] text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] hover:bg-[#EDE8DF] cursor-pointer"
              >
                {language === 'zh-CN' ? '取消' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeletingAccount || deletePinInput.length !== 4}
                onClick={handleDeleteAccount}
                className="flex-1 py-2.5 rounded-xl border border-rose-600 bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeletingAccount
                  ? (language === 'zh-CN' ? '正在删除...' : 'Deleting...')
                  : (language === 'zh-CN' ? '永久删除所有数据' : 'Permanently Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
