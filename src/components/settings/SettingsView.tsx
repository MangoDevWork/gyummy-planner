import React, { useState, useRef } from 'react';
import type { AppData, MealScheduleConfig, UserProfile } from '../../types';
import { clearAllAppData } from '../../services/storage';
import { getInitialAppData } from '../../services/seedData';
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
  UserCheck
} from 'lucide-react';
import { exportToZip, parseUploadedDataFile, mergeImportedData } from '../../services/zipExportService';
import { MealScheduleSettingsModal } from './MealScheduleSettingsModal';
import { compressImage } from '../../services/imageUtils';
import { EasterEggModal } from '../common/EasterEggModal';
import { getCachedSystemRecipes, mergeSystemWithUserDishes } from '../../services/systemRecipesService';

interface SettingsViewProps {
  appData: AppData;
  onUpdateAppData: (data: AppData) => void;
  onOpenProfileModal: () => void;
  onLogout?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  appData,
  onUpdateAppData,
  onOpenProfileModal,
  onLogout
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isScheduleSettingsOpen, setIsScheduleSettingsOpen] = useState(false);

  // Profile Edit State
  const [editFamilyName, setEditFamilyName] = useState(appData.currentProfile?.familyName || 'Family');
  const [editMemberName, setEditMemberName] = useState(appData.currentProfile?.memberName || 'Member');
  const [editAvatarUrl, setEditAvatarUrl] = useState(appData.currentProfile?.avatarUrl || '');
  const [newMemberNameInput, setNewMemberNameInput] = useState('');

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

  // Avatar Upload Handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 400, 400, 0.8);
      setEditAvatarUrl(compressed);
      showToast('📷 Photo uploaded!');
    } catch (err) {
      showToast('❌ Image upload failed');
    }
  };

  // Save Profile Edits
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFamily = editFamilyName.trim();
    const cleanMember = editMemberName.trim();

    if (!cleanFamily || !cleanMember) {
      showToast('⚠️ Family and Member names are required');
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

    showToast('✅ Profile updated!');
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
      showToast(`⚠️ "${clean}" is already in this family.`);
      return;
    }

    const updatedMembers = [...appData.familyMembers, clean];
    onUpdateAppData({
      ...appData,
      familyMembers: updatedMembers
    });

    setNewMemberNameInput('');
    showToast(`✅ Added member "${clean}"!`);
  };

  // Remove a family member (prevent removing current active member)
  const handleRemoveMember = (memberToRemove: string) => {
    if (memberToRemove === currentMember) {
      showToast('⚠️ You cannot remove the currently active logged-in user.');
      return;
    }

    if (window.confirm(`Are you sure you want to remove "${memberToRemove}" from this family?`)) {
      const updatedMembers = appData.familyMembers.filter((m) => m !== memberToRemove);
      
      // Clean up favorites
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

      showToast(`🗑️ Removed "${memberToRemove}" from family.`);
    }
  };

  // Export Full Backup Zip
  const handleExportFullZip = async () => {
    try {
      const filename = await exportToZip(editFamilyName, 'FullBackup', appData);
      showToast(`📦 Exported full backup ${filename}`);
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
      message: `Successfully imported data: ${summary}`
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save customized meal schedules
  const handleSaveMealSchedules = (schedules: MealScheduleConfig[]) => {
    onUpdateAppData({
      ...appData,
      mealSchedules: schedules
    });
    showToast('✅ Saved Meal Schedules configuration');
  };

  // Reset to Starter Data (preserves full 3,000+ system recipe library)
  const handleResetSampleData = () => {
    if (
      window.confirm(
        'Reset Family Cookbook to starter recipes? Custom plans will be cleared. The 3,000+ System Recipe Library will remain completely intact.'
      )
    ) {
      clearAllAppData();
      const fresh = getInitialAppData(appData.currentProfile);
      const systemDishes = getCachedSystemRecipes();
      const mergedDishes = mergeSystemWithUserDishes(fresh.dishes, systemDishes);

      onUpdateAppData({
        ...fresh,
        dishes: mergedDishes
      });
      setImportStatus({ type: 'success', message: 'Restored starter family recipes. System Library (3,000+ recipes) preserved.' });
    }
  };

  return (
    <div className="flex-1 pb-28 pt-3 px-4 space-y-4 max-w-md mx-auto w-full">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Edit Profile & Photo Avatar Card */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl p-4 border border-[#EAE6DF] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#F4F1EA]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Profile & Member Photo
            </h3>
          </div>
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
          >
            Switch User
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
                className="w-16 h-16 rounded-2xl object-cover border border-[#EAE6DF] shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#E2D9CC] text-slate-800 font-bold text-xl flex items-center justify-center border border-[#D5CAB9] shadow-xs">
                {editMemberName.charAt(0).toUpperCase()}
              </div>
            )}
            
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-1.5 bg-[#2B2D42] text-white rounded-xl shadow-sm hover:bg-[#1E1F2E] transition cursor-pointer"
              title="Upload Photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="text-xs font-semibold text-slate-800 bg-[#F4F1EA] hover:bg-[#EAE6DF] border border-[#EAE6DF] px-3 py-1.5 rounded-xl transition cursor-pointer"
              >
                Upload User Photo
              </button>
              {editAvatarUrl && (
                <button
                  type="button"
                  onClick={() => setEditAvatarUrl('')}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                  title="Remove photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500">
              Photo is displayed at the top left as your user icon.
            </p>
          </div>
        </div>

        {/* Family & Member Name Inputs */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Family Name
            </label>
            <input
              type="text"
              required
              value={editFamilyName}
              onChange={(e) => setEditFamilyName(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Member Name
            </label>
            <input
              type="text"
              required
              value={editMemberName}
              onChange={(e) => setEditMemberName(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-500 shadow-2xs"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-[#2B2D42] hover:bg-[#1E1F2E] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Profile Changes</span>
        </button>
      </form>

      {/* Family Members Management Card */}
      <div className="bg-white rounded-2xl p-4 border border-[#EAE6DF] shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#F4F1EA]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Family Members ({appData.familyMembers.length})
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">Manage household</span>
        </div>

        {/* Member List */}
        <div className="space-y-2">
          {appData.familyMembers.map((member) => {
            const isCurrentUser = member === currentMember;
            return (
              <div
                key={member}
                className="flex items-center justify-between p-2.5 rounded-xl border border-[#EAE6DF] bg-[#FAF8F5]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isCurrentUser ? 'bg-[#2B2D42] text-white' : 'bg-[#E2D9CC] text-slate-800'
                    }`}
                  >
                    {member.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 block truncate">{member}</span>
                    {isCurrentUser ? (
                      <span className="text-[9px] text-emerald-700 font-bold flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        Active Logged-In User
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 block">Family Member</span>
                    )}
                  </div>
                </div>

                {!isCurrentUser && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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
            placeholder="Add new family member..."
            value={newMemberNameInput}
            onChange={(e) => setNewMemberNameInput(e.target.value)}
            className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl border border-[#EAE6DF] bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-500 shadow-2xs"
          />
          <button
            type="submit"
            className="px-3.5 py-2 bg-[#2B2D42] hover:bg-[#1E1F2E] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>
      </div>

      {/* Meal Schedule Customization Trigger */}
      <div className="bg-white rounded-2xl p-4 border border-[#EAE6DF] shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Meal Schedule Configuration
            </h3>
          </div>
          <button
            onClick={() => setIsScheduleSettingsOpen(true)}
            className="text-xs font-semibold text-slate-800 bg-[#F4F1EA] hover:bg-[#EAE6DF] border border-[#EAE6DF] px-3 py-1.5 rounded-xl transition active:scale-95 cursor-pointer"
          >
            Customize
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Set different meal schedules for Weekdays (Mon-Fri) vs Weekends (Sat-Sun).
        </p>
      </div>

      {/* Share & Backup Section */}
      <div className="bg-white rounded-2xl p-4 border border-[#EAE6DF] shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-slate-700" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Family Data Sharing (Zip)
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Export or import complete family meal plans, recipes, and master ingredients as easy-to-email Zip files.
        </p>

        <div className="space-y-2 pt-1">
          <button
            onClick={handleExportFullZip}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2B2D42] hover:bg-[#1E1F2E] text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Complete Family Backup (.zip)</span>
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
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl active:scale-95 transition-all border border-[#EAE6DF] cursor-pointer shadow-2xs"
          >
            <FileArchive className="w-4 h-4 text-slate-500" />
            <span>Import Data from Zip or JSON</span>
          </button>
        </div>

        {/* Import Feedback */}
        {importStatus.type && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              importStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {importStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{importStatus.message}</span>
          </div>
        )}
      </div>

      {/* PWA Home Screen Instructions */}
      <div className="bg-white rounded-2xl p-4 border border-[#EAE6DF] shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-slate-700" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Install on Mobile (Pixel & iPhone)
          </h3>
        </div>
        <div className="space-y-1.5 text-xs text-slate-500">
          <p>
            • <strong className="text-slate-800">iPhone (Safari)</strong>: Tap the <span className="font-semibold text-slate-700">Share</span> icon, then choose <span className="font-semibold text-slate-900">"Add to Home Screen"</span>.
          </p>
          <p>
            • <strong className="text-slate-800">Pixel 9 Pro XL (Chrome)</strong>: Tap the <span className="font-semibold text-slate-700">Three Dots</span> menu, then choose <span className="font-semibold text-slate-900">"Install app"</span>.
          </p>
        </div>
      </div>

      {/* Account & Logout Card */}
      <div className="bg-white rounded-2xl p-4 border border-[#EAE6DF] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Account & Session
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-[#F4F1EA] px-2 py-0.5 rounded-md">
            {editFamilyName}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Log out to switch to another family household or member account.
        </p>

        {onLogout && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Log out of ${editFamilyName}?`)) {
                onLogout();
              }
            }}
            className="w-full py-2.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out of Family</span>
          </button>
        )}
      </div>

      {/* Reset Family Cookbook Data */}
      <div className="bg-white rounded-2xl p-4 border border-[#EAE6DF] shadow-sm space-y-2">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Reset Family Cookbook
        </h3>
        <p className="text-xs text-slate-500">
          Restore starter curated home recipes to your Family Cookbook and reset custom meal plans. All 3,000+ System Library recipes will remain completely preserved and accessible.
        </p>
        <button
          onClick={handleResetSampleData}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F4F1EA] hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-semibold transition-colors active:scale-95 cursor-pointer border border-[#EAE6DF]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restore Starter Family Recipes</span>
        </button>
      </div>

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
