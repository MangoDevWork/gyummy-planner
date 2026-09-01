import React, { useState, useRef } from 'react';
import type { AppData, MealScheduleConfig, UserProfile } from '../../types';
import { getInitialAppData, DEFAULT_PANTRY_INGREDIENTS, DEFAULT_MEAL_SCHEDULES } from '../../services/seedData';
import {
  Share2,
  RotateCcw,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  Download,
  Users,
  Sliders,
  Camera,
  Trash2,
  Save,
  UserPlus,
  LogOut,
  UserCheck,
  Moon,
  Sun,
  Globe,
  KeyRound,
  RefreshCw,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { updateFamilyPinFromSettings, fetchFamilyCloudData } from '../../services/firebase';
import { mergeAppData } from '../../services/mergeSyncService';
import { exportToZip, parseUploadedDataFile, mergeImportedData } from '../../services/zipExportService';
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

export const SettingsView: React.FC<SettingsViewProps> = ({
  appData,
  onUpdateAppData,
  onOpenProfileModal,
  onLogout,
  isDarkMode = false,
  onToggleDarkMode
}) => {
  const { language, setLanguage, t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isScheduleSettingsOpen, setIsScheduleSettingsOpen] = useState(false);
  const [isPersonalisationOpen, setIsPersonalisationOpen] = useState(false);

  // Profile Edit State
  const [editFamilyName, setEditFamilyName] = useState(appData.currentProfile?.familyName || 'Family');
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

  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const currentMember = appData.currentProfile?.memberName || '';

  // Dark mode toggle — saves per-member preference to localStorage
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
    } catch (err) {
      showToast('❌ Upload failed');
    }
  };

  // Save Profile Edits
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFamily = editFamilyName.trim();
    const cleanMember = editMemberName.trim();

    if (!cleanFamily || !cleanMember) {
      showToast('⚠️ Names required');
      return;
    }

    const updatedProfile: UserProfile = {
      familyName: cleanFamily,
      memberName: cleanMember,
      avatarUrl: editAvatarUrl || undefined
    };

    // Check Easter Egg: contains "Nat" (case-insensitive)
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

    onUpdateAppData({
      ...appData,
      currentProfile: profile,
      familyMembers: Array.from(membersSet)
    });

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
  const handleUpdateFamilyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPinInput || !newPinInput) return;
    if (!/^\d{4}$/.test(newPinInput.trim())) {
      setPinChangeMsg({ text: 'New PIN must be exactly 4 digits.', isError: true });
      return;
    }

    const fam = appData.currentProfile?.familyName || editFamilyName;
    const res = await updateFamilyPinFromSettings(fam, currentPinInput, newPinInput);
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

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newMemberNameInput.trim();
    if (!clean) return;

    if (appData.familyMembers.some((m) => m.toLowerCase() === clean.toLowerCase())) {
      showToast(`⚠️ "${clean}" already exists.`);
      return;
    }

    const updatedMembers = [...appData.familyMembers, clean];
    onUpdateAppData({
      ...appData,
      familyMembers: updatedMembers
    });

    setNewMemberNameInput('');
    showToast(`✅ Added "${clean}"`);
  };

  // Remove a family member (prevent removing current active member)
  const handleRemoveMember = (memberToRemove: string) => {
    if (memberToRemove === currentMember) {
      showToast('⚠️ Cannot remove current user');
      return;
    }

    if (window.confirm(`Remove "${memberToRemove}"?`)) {
      const updatedMembers = appData.familyMembers.filter((m) => m !== memberToRemove);
      
      const updatedDishes = appData.dishes.map((dish) => {
        if (dish.favoritedByMembers && dish.favoritedByMembers.includes(memberToRemove)) {
          return {
            ...dish,
            favoritedByMembers: dish.favoritedByMembers.filter((m) => m !== memberToRemove)
          };
        }
        return dish;
      });

      onUpdateAppData({
        ...appData,
        familyMembers: updatedMembers,
        dishes: updatedDishes
      });

      showToast(`🗑️ Removed "${memberToRemove}"`);
    }
  };

  // Export Full Backup Zip
  const handleExportFullZip = async () => {
    try {
      const filename = await exportToZip(editFamilyName, 'FullBackup', appData);
      showToast(`📦 Exported ${filename}`);
    } catch (err: any) {
      showToast(`❌ Export failed: ${err.message}`);
    }
  };

  // Import Zip / JSON
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await parseUploadedDataFile(file);
    if (!res.success || !res.data) {
      setImportStatus({ type: 'error', message: res.message });
      return;
    }

    const { updatedData, summary } = mergeImportedData(
      appData,
      res.type || 'full',
      res.data
    );

    onUpdateAppData(updatedData);
    setImportStatus({
      type: 'success',
      message: `Imported: ${summary}`
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save customized meal schedules
  const handleSaveMealSchedules = (schedules: MealScheduleConfig[]) => {
    onUpdateAppData({
      ...appData,
      mealSchedules: schedules
    });
    showToast('✅ Saved meal schedules');
  };

  // Reset to Starter Data (preserves auth profile, members, settings, and full 3,000+ recipe library)
  const handleResetSampleData = () => {
    if (
      window.confirm(
        'Restore defaults for meal plan, grocery list, and starter recipes? Your profile and members will remain intact.'
      )
    ) {
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
      setImportStatus({ type: 'success', message: 'Restored defaults.' });
    }
  };

  return (
    <div className="flex-1 pb-28 pt-3 px-4 space-y-4 max-w-md mx-auto w-full bg-[#F7F4EF] dark:bg-[#1A1714]">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#2D2640] dark:bg-[#F0EDE8] text-white dark:text-[#2D2640] text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#FFD13B] dark:text-[#2D2640]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Edit Profile & Photo Avatar Card */}
      <form onSubmit={handleSaveProfile} className="bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#38332E] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#EDE8DF] dark:border-[#38332E]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#3D3530] dark:text-[#D0C8C0]" />
            <h3 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] uppercase tracking-wider">
              {language === 'zh-CN' ? '个人档案与空间' : 'Profile'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="text-[11px] font-semibold text-[#7A6E64] dark:text-[#9A9088] hover:text-[#2D2640] dark:hover:text-[#F0EDE8] hover:underline cursor-pointer"
          >
            {t('settings.switchMemberBtn')}
          </button>
        </div>

        {/* Member Photo Avatar Upload */}
        <div className="flex items-center gap-4">
          <input
            type="file"
            ref={avatarInputRef}
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />

          <div className="relative shrink-0">
            {editAvatarUrl ? (
              <img
                src={editAvatarUrl}
                alt="Member Avatar"
                className="w-14 h-14 rounded-2xl object-cover border border-[#EDE8DF] dark:border-[#38332E] shadow-xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#F0EDE8] font-bold text-lg flex items-center justify-center border border-[#EDE8DF] dark:border-[#38332E] shadow-xs">
                {editMemberName.charAt(0).toUpperCase()}
              </div>
            )}
            
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-1.5 bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] border border-[#2D2640]/10 rounded-xl shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              title={language === 'zh-CN' ? '上传头像' : 'Upload Photo'}
            >
              <Camera className="w-3 h-3" />
            </button>
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="text-xs font-semibold bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] rounded-xl hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] transition cursor-pointer px-3 py-1"
              >
                {language === 'zh-CN' ? '上传头像' : 'Upload Photo'}
              </button>
              {editAvatarUrl && (
                <button
                  type="button"
                  onClick={() => setEditAvatarUrl('')}
                  className="p-1.5 text-[#B8AFA4] dark:text-[#5A5450] hover:text-rose-600 rounded-lg transition cursor-pointer"
                  title="Remove photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Family & Member Name Inputs */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] font-bold text-[#7A6E64] dark:text-[#9A9088] uppercase tracking-wider mb-1">
              {t('settings.currentFamily')}
            </label>
            <input
              type="text"
              required
              value={editFamilyName}
              onChange={(e) => setEditFamilyName(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-[#E8E0D5] dark:border-[#38332E] bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] focus:outline-none focus:border-[#2D2640] dark:focus:border-[#F0EDE8] shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#7A6E64] dark:text-[#9A9088] uppercase tracking-wider mb-1">
              {t('settings.currentMember')}
            </label>
            <input
              type="text"
              required
              value={editMemberName}
              onChange={(e) => setEditMemberName(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-[#E8E0D5] dark:border-[#38332E] bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] focus:outline-none focus:border-[#2D2640] dark:focus:border-[#F0EDE8] shadow-2xs"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2 bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] font-extrabold border border-[#2D2640]/10 rounded-xl shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{t('common.save')}</span>
        </button>
      </form>

      {/* Family Members Management Card */}
      <div className="bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#38332E] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#EDE8DF] dark:border-[#38332E]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#3D3530] dark:text-[#D0C8C0]" />
            <h3 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] uppercase tracking-wider">
              {language === 'zh-CN' ? `家庭成员 (${appData.familyMembers.length})` : `Family Members (${appData.familyMembers.length})`}
            </h3>
          </div>
        </div>

        {/* Member List */}
        <div className="space-y-2">
          {appData.familyMembers.map((member) => {
            const isCurrentUser = member === currentMember;
            return (
              <div
                key={member}
                className="flex items-center justify-between p-2 rounded-xl bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#EDE8DF] dark:border-[#38332E]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isCurrentUser ? 'bg-[#FFD13B] text-[#2D2640] shadow-sm' : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#F0EDE8]'
                    }`}
                  >
                    {member.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] block truncate">{member}</span>
                    {isCurrentUser && (
                      <span className="text-[9px] text-[#2D6A4A] dark:text-[#4CAF82] font-bold flex items-center gap-1">
                        <UserCheck className="w-2.5 h-2.5" />
                        {language === 'zh-CN' ? '当前登录' : 'Active User'}
                      </span>
                    )}
                  </div>
                </div>

                {!isCurrentUser && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member)}
                    className="p-1 text-[#B8AFA4] dark:text-[#5A5450] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                    title={`Remove ${member}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Member Form */}
        <form onSubmit={handleAddMember} className="pt-1 flex gap-2">
          <input
            type="text"
            placeholder={language === 'zh-CN' ? '输入新成员姓名...' : 'Add family member...'}
            value={newMemberNameInput}
            onChange={(e) => setNewMemberNameInput(e.target.value)}
            className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#E8E0D5] dark:border-[#38332E] text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] focus:outline-none focus:border-[#2D2640] dark:focus:border-[#F0EDE8] shadow-2xs"
          />
          <button
            type="submit"
            disabled={!newMemberNameInput.trim()}
            className="px-3.5 py-2 bg-[#FFD13B] hover:bg-[#FFC200] disabled:opacity-40 text-[#2D2640] font-extrabold border border-[#2D2640]/10 rounded-xl shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Family Personalisation & Allergies Card */}
      <div className="bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#38332E] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#EDE8DF] dark:border-[#38332E]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] uppercase tracking-wider">
              {language === 'zh-CN' ? '个性化口味与全家过敏保护' : 'Personalisation & Allergies'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsPersonalisationOpen(true)}
            className="text-xs font-bold bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] rounded-xl hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] transition cursor-pointer px-3 py-1 flex items-center gap-1 shadow-2xs"
          >
            <Sliders className="w-3 h-3 text-[#7A6E64] dark:text-[#9A9088]" />
            <span>{language === 'zh-CN' ? '设置' : 'Configure'}</span>
          </button>
        </div>

        <div className="space-y-2">
          {appData.familyMembers.map((member) => {
            const prefs = appData.memberProfiles?.[member];
            const allergies = prefs?.allergies || [];
            const cuisines = prefs?.favoriteCuisines || [];

            return (
              <div
                key={member}
                className="p-2.5 rounded-xl bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#EDE8DF] dark:border-[#38332E] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] flex items-center gap-1.5">
                    <span>👤 {member}</span>
                    {member === currentMember && (
                      <span className="text-[10px] text-[#9A8A7E] dark:text-[#7A6E64] font-normal">({language === 'zh-CN' ? '当前' : 'You'})</span>
                    )}
                  </span>
                  {allergies.length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                      ⚠️ {allergies.length} {language === 'zh-CN' ? '项忌口' : 'Allergies'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-[#E8F5ED] dark:bg-[#0D2E1A] text-[#2D6A4A] dark:text-[#4CAF82] border border-[#A8D8BC] dark:border-[#1D4A2A] px-2 py-0.5 rounded-full">
                      ✓ {language === 'zh-CN' ? '无过敏' : 'No Allergies'}
                    </span>
                  )}
                </div>

                {allergies.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {allergies.map((algId) => {
                      const def = getAllergenById(algId);
                      return (
                        <span
                          key={algId}
                          className="text-[10px] font-bold bg-white dark:bg-[#252220] text-[#2D2640] dark:text-[#F0EDE8] border border-[#EDE8DF] dark:border-[#38332E] px-2 py-0.5 rounded-lg shadow-2xs"
                        >
                          {def?.emoji || '⚠️'} {language === 'zh-CN' ? def?.nameZh || algId : def?.nameEn || algId}
                        </span>
                      );
                    })}
                  </div>
                )}

                {cuisines.length > 0 && (
                  <div className="text-[10px] text-[#9A8A7E] dark:text-[#7A6E64] truncate">
                    <span>{language === 'zh-CN' ? '偏好菜系: ' : 'Tastes: '}</span>
                    <span className="font-semibold text-[#3D3530] dark:text-[#D0C8C0]">{cuisines.join(', ')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Family Safe Mode Status Indicator */}
        <div className="bg-gradient-to-r from-amber-50 to-[#E8F5ED] p-2.5 rounded-xl border border-amber-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2D6A4A] dark:text-[#4CAF82] shrink-0" />
            <span className="text-[11px] font-bold text-[#2D2640] dark:text-[#F0EDE8]">
              {appData.familyPersonalisation?.strictAllergyFilter !== false
                ? (language === 'zh-CN' ? '全家安全模式已开启（自动隐藏过敏菜）' : 'Family Safety Mode Active')
                : (language === 'zh-CN' ? '安全模式已关闭' : 'Safety Mode Off')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsPersonalisationOpen(true)}
            className="text-[10px] font-bold text-[#3D3530] dark:text-[#D0C8C0] hover:underline cursor-pointer"
          >
            {language === 'zh-CN' ? '调整' : 'Change'}
          </button>
        </div>
      </div>

      {/* Family PIN & Cloud Sync Security Card */}
      <div className="bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#38332E] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#EDE8DF] dark:border-[#38332E]">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#3D3530] dark:text-[#D0C8C0]" />
            <h3 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] uppercase tracking-wider">
              {language === 'zh-CN' ? '家庭 PIN 码与云同步' : 'Family PIN & Cloud Sync'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsChangingPin(!isChangingPin);
              setPinChangeMsg(null);
            }}
            className="text-xs font-semibold bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] rounded-xl hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] transition cursor-pointer px-2.5 py-1"
          >
            {isChangingPin ? (language === 'zh-CN' ? '取消' : 'Cancel') : (language === 'zh-CN' ? '修改 PIN' : 'Change PIN')}
          </button>
        </div>

        <p className="text-xs text-[#9A8A7E] dark:text-[#7A6E64]">
          {language === 'zh-CN'
            ? '所有家庭成员使用相同的 4 位数字 PIN 码同步菜谱和计划。'
            : 'All family members use your 4-digit PIN to sync recipes and meal plans.'}
        </p>

        {pinChangeMsg && (
          <div
            className={`p-2.5 rounded-xl text-xs font-semibold ${
              pinChangeMsg.isError
                ? 'bg-rose-50 border border-rose-200 text-rose-700'
                : 'bg-[#E8F5ED] dark:bg-[#0D2E1A] text-[#2D6A4A] dark:text-[#4CAF82] border border-[#A8D8BC] dark:border-[#1D4A2A]'
            }`}
          >
            {pinChangeMsg.text}
          </div>
        )}

        {isChangingPin && (
          <form onSubmit={handleUpdateFamilyPin} className="space-y-2.5 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-[#7A6E64] dark:text-[#9A9088] uppercase mb-1">
                  {language === 'zh-CN' ? '当前 PIN' : 'Current PIN'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  required
                  placeholder="e.g. 1234"
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#E8E0D5] dark:border-[#38332E] text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] focus:outline-none focus:border-[#2D2640] dark:focus:border-[#F0EDE8] tracking-widest"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#7A6E64] dark:text-[#9A9088] uppercase mb-1">
                  {language === 'zh-CN' ? '新 PIN' : 'New PIN'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  required
                  placeholder="e.g. 1234"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#E8E0D5] dark:border-[#38332E] text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] focus:outline-none focus:border-[#2D2640] dark:focus:border-[#F0EDE8] tracking-widest"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!currentPinInput || !newPinInput}
              className="w-full py-2 bg-[#FFD13B] hover:bg-[#FFC200] disabled:opacity-40 text-[#2D2640] font-extrabold border border-[#2D2640]/10 rounded-xl shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{language === 'zh-CN' ? '保存新 PIN 码' : 'Update Family PIN'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Meal Schedule Customization Trigger */}
      <div className="bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#38332E] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#3D3530] dark:text-[#D0C8C0]" />
            <h3 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] uppercase tracking-wider">
              {t('planner.manageSchedules')}
            </h3>
          </div>
          <button
            onClick={() => setIsScheduleSettingsOpen(true)}
            className="text-xs font-semibold bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] rounded-xl hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] transition cursor-pointer px-3 py-1.5 active:scale-95"
          >
            {language === 'zh-CN' ? '设置餐段' : 'Configure'}
          </button>
        </div>
        <p className="text-xs text-[#9A8A7E] dark:text-[#7A6E64]">
          {language === 'zh-CN' ? '自定义每日餐饮餐段 (如早/午/晚/加餐) 及生效星期。' : 'Configure weekday and weekend meals.'}
        </p>
      </div>

      {/* Backup & Restore Section */}
      <div className="bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#38332E] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-[#3D3530] dark:text-[#D0C8C0]" />
          <h3 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] uppercase tracking-wider">
            {t('settings.backupRestoreTitle')}
          </h3>
        </div>
        <p className="text-xs text-[#9A8A7E] dark:text-[#7A6E64]">
          {language === 'zh-CN' ? '导出或导入家庭全套菜谱、排餐计划及储藏室数据。' : 'Export or import your family meal plans and recipes.'}
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleExportFullZip}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] font-extrabold border border-[#2D2640]/10 rounded-xl shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('settings.exportZipBtn')}</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept=".zip,.json"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] rounded-xl hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] transition cursor-pointer text-xs font-semibold active:scale-95"
          >
            <FileArchive className="w-3.5 h-3.5 text-[#9A8A7E] dark:text-[#7A6E64]" />
            <span>{t('settings.importZipBtn')}</span>
          </button>
        </div>

        {/* Import Feedback */}
        {importStatus.type && (
          <div
            className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              importStatus.type === 'success'
                ? 'bg-[#E8F5ED] dark:bg-[#0D2E1A] text-[#2D6A4A] dark:text-[#4CAF82] border border-[#A8D8BC] dark:border-[#1D4A2A]'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {importStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#2D6A4A] dark:text-[#4CAF82] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{importStatus.message}</span>
          </div>
        )}
      </div>

      {/* PWA Home Screen Instructions */}
      <div className="bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#38332E] rounded-2xl p-4 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-[#3D3530] dark:text-[#D0C8C0]" />
          <h3 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] uppercase tracking-wider">
            {language === 'zh-CN' ? '添加到手机主屏幕' : 'Install App'}
          </h3>
        </div>
        <div className="text-xs text-[#9A8A7E] dark:text-[#7A6E64] space-y-1">
          <p>• <strong>iPhone (Safari)</strong>: {language === 'zh-CN' ? '分享按钮 → "添加到主屏幕"' : 'Share → "Add to Home Screen"'}</p>
          <p>• <strong>Android (Chrome)</strong>: {language === 'zh-CN' ? '右上角菜单 ⋮ → "安装应用"' : 'Menu ⋮ → "Install App"'}</p>
        </div>
      </div>

      {/* Account & Logout Card */}
      <div className="bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#38332E] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-[#3D3530] dark:text-[#D0C8C0]" />
            <h3 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] uppercase tracking-wider">
              {language === 'zh-CN' ? '账号与退出' : 'Account'}
            </h3>
          </div>
          <span className="text-[10px] font-bold text-[#9A8A7E] dark:text-[#7A6E64] bg-[#F5F0E8] dark:bg-[#2E2A26] px-2 py-0.5 rounded-md">
            {editFamilyName}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
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
            className="py-2.5 bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] rounded-xl hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] transition cursor-pointer text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#7A6E64] dark:text-[#9A9088]" />
            <span>{language === 'zh-CN' ? '从云端强制同步' : 'Force Sync'}</span>
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(language === 'zh-CN' ? `确定要退出 ${editFamilyName} 吗？` : `Log out of ${editFamilyName}?`)) {
                  onLogout();
                }
              }}
              className="py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>{language === 'zh-CN' ? '退出登录' : 'Log Out'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Language Preferences — user-specific */}
      <div className="bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#38332E] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#3D3530] dark:text-[#D0C8C0]" />
            <h3 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] uppercase tracking-wider">
              {t('settings.languageTitle')}
            </h3>
          </div>
          <span className="text-[10px] font-semibold text-[#9A8A7E] dark:text-[#7A6E64] bg-[#F5F0E8] dark:bg-[#2E2A26] px-2 py-0.5 rounded-md">
            {t('common.justForYou')}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#2D2640] dark:text-[#F0EDE8]">
              {language === 'zh-CN' ? '🇨🇳 简体中文' : '🇺🇸 English'}
            </p>
            <p className="text-[11px] text-[#9A8A7E] dark:text-[#7A6E64] mt-0.5">
              {t('settings.languageDesc')}
            </p>
          </div>

          <div className="flex items-center p-1 bg-[#F5F0E8] dark:bg-[#2E2A26] rounded-xl border border-[#EDE8DF] dark:border-[#38332E] gap-1">
            <button
              type="button"
              onClick={() => {
                setLanguage('en');
                showToast('Language switched to English');
              }}
              className={`text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                language === 'en'
                  ? 'bg-white dark:bg-[#252220] text-[#2D2640] dark:text-[#F0EDE8] shadow-sm border border-[#EDE8DF] dark:border-[#38332E]'
                  : 'text-[#9A8A7E] dark:text-[#7A6E64] hover:text-[#2D2640] dark:hover:text-[#F0EDE8]'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => {
                setLanguage('zh-CN');
                showToast('语言已切换为简体中文');
              }}
              className={`text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                language === 'zh-CN'
                  ? 'bg-white dark:bg-[#252220] text-[#2D2640] dark:text-[#F0EDE8] shadow-sm border border-[#EDE8DF] dark:border-[#38332E]'
                  : 'text-[#9A8A7E] dark:text-[#7A6E64] hover:text-[#2D2640] dark:hover:text-[#F0EDE8]'
              }`}
            >
              中文
            </button>
          </div>
        </div>
      </div>

      {/* Display Preferences — user-specific */}
      <div className="bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#38332E] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDarkMode ? (
              <Moon className="w-4 h-4 text-[#3D3530] dark:text-[#D0C8C0]" />
            ) : (
              <Sun className="w-4 h-4 text-[#3D3530] dark:text-[#D0C8C0]" />
            )}
            <h3 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] uppercase tracking-wider">
              {t('settings.displayTitle')}
            </h3>
          </div>
          <span className="text-[10px] font-semibold text-[#9A8A7E] dark:text-[#7A6E64] bg-[#F5F0E8] dark:bg-[#2E2A26] px-2 py-0.5 rounded-md">
            {t('common.justForYou')}
          </span>
        </div>

        {/* Dark Mode Toggle Row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#2D2640] dark:text-[#F0EDE8]">
              {isDarkMode ? t('settings.darkModeTitle') : t('settings.lightModeTitle')}
            </p>
            <p className="text-[11px] text-[#9A8A7E] dark:text-[#7A6E64] mt-0.5">
              {isDarkMode ? t('settings.darkModeDesc') : t('settings.lightModeDesc')}
            </p>
          </div>

          {/* Toggle Switch with Centered Sun / Moon Icon */}
          <button
            type="button"
            role="switch"
            aria-checked={isDarkMode}
            onClick={handleToggleDarkMode}
            className={`relative inline-flex items-center h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
              isDarkMode
                ? 'bg-[#FFD13B] border-[#FFD13B]'
                : 'bg-[#F5F0E8] dark:bg-[#2E2A26] border-[#EDE8DF] dark:border-[#38332E]'
            }`}
          >
            <span
              className={`pointer-events-none flex h-5 w-5 items-center justify-center rounded-full shadow-md transition-transform duration-200 ease-in-out ${
                isDarkMode
                  ? 'translate-x-5.5 bg-[#2D2640]'
                  : 'translate-x-0.5 bg-white dark:bg-[#252220]'
              }`}
            >
              {isDarkMode ? (
                <Moon className="w-3 h-3 text-[#FFD13B] shrink-0" />
              ) : (
                <Sun className="w-3 h-3 text-amber-500 shrink-0" />
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Reset Defaults */}
      <div className="bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#38332E] rounded-2xl p-4 shadow-sm space-y-2">
        <h3 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] uppercase tracking-wider">
          {t('settings.resetTitle')}
        </h3>
        <p className="text-xs text-[#9A8A7E] dark:text-[#7A6E64]">
          {t('settings.resetDesc')}
        </p>
        <button
          onClick={handleResetSampleData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F0E8] dark:bg-[#2E2A26] hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-700 dark:hover:text-rose-400 text-[#7A6E64] dark:text-[#9A9088] text-xs font-semibold transition-colors active:scale-95 cursor-pointer border border-[#EDE8DF] dark:border-[#38332E]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('settings.resetBtn')}</span>
        </button>
      </div>

      {/* Family Personalisation Modal */}
      <PersonalisationModal
        isOpen={isPersonalisationOpen}
        onClose={() => setIsPersonalisationOpen(false)}
        currentMember={currentMember}
        familyMembers={appData.familyMembers}
        memberProfiles={appData.memberProfiles || {}}
        familyPersonalisation={
          appData.familyPersonalisation || {
            strictAllergyFilter: true,
            householdAllergies: [],
            householdCuisines: [],
            householdCategories: []
          }
        }
        onSavePersonalisation={(updatedProfiles, updatedFamilyPers) => {
          onUpdateAppData({
            ...appData,
            memberProfiles: updatedProfiles,
            familyPersonalisation: updatedFamilyPers
          });
          showToast(language === 'zh-CN' ? '✅ 个性化设置已保存' : '✅ Personalisation saved');
        }}
        onAddFamilyMember={(name) => {
          if (!appData.familyMembers.includes(name)) {
            onUpdateAppData({
              ...appData,
              familyMembers: [...appData.familyMembers, name]
            });
          }
        }}
      />

      {/* Meal Schedule Settings Modal */}
      <MealScheduleSettingsModal
        isOpen={isScheduleSettingsOpen}
        onClose={() => setIsScheduleSettingsOpen(false)}
        mealSchedules={appData.mealSchedules}
        onSaveMealSchedules={handleSaveMealSchedules}
      />

      {/* Easter Egg Modal */}
      <EasterEggModal
        isOpen={showEasterEgg}
        onConfirm={handleEasterEggConfirm}
      />
    </div>
  );
};
