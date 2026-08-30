import { useState, useRef } from 'react';
import type { UserProfile } from '../../types';
import { Users, UserPlus, Home, Check, ArrowRight, Camera, Trash2, LogOut } from 'lucide-react';
import { compressImage } from '../../services/imageUtils';
import { EasterEggModal } from '../common/EasterEggModal';

interface AuthModalProps {
  isOpen: boolean;
  currentProfile: UserProfile | null;
  familyMembers: string[];
  onSelectProfile: (profile: UserProfile, updatedMembers: string[]) => void;
  onRemoveMember?: (memberName: string) => void;
  onLogout?: () => void;
  onClose?: () => void;
  isMandatory?: boolean;
}

export function AuthModal({
  isOpen,
  currentProfile,
  familyMembers,
  onSelectProfile,
  onRemoveMember,
  onLogout,
  onClose,
  isMandatory = false
}: AuthModalProps) {
  const [familyName, setFamilyName] = useState(currentProfile?.familyName || '');
  const [memberName, setMemberName] = useState(currentProfile?.memberName || '');
  const [avatarUrl, setAvatarUrl] = useState(currentProfile?.avatarUrl || '');
  const [newMemberInput, setNewMemberInput] = useState('');
  const [isCreatingNewFamily, setIsCreatingNewFamily] = useState(!currentProfile);
  const [errorMsg, setErrorMsg] = useState('');

  // Easter Egg State
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [pendingProfileData, setPendingProfileData] = useState<{
    profile: UserProfile;
    updatedMembers: string[];
  } | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 400, 400, 0.8);
      setAvatarUrl(compressed);
    } catch (err: any) {
      setErrorMsg('Failed to process image file.');
    }
  };

  const handleRegisterOrLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFamily = familyName.trim();
    const cleanMember = memberName.trim();

    if (!cleanFamily) {
      setErrorMsg('Please enter a Family Name');
      return;
    }
    if (!cleanMember) {
      setErrorMsg("Please enter the Member's Name");
      return;
    }

    const membersSet = new Set(familyMembers);
    membersSet.add(cleanMember);
    const updatedMembers = Array.from(membersSet);

    const newProfile: UserProfile = {
      familyName: cleanFamily,
      memberName: cleanMember,
      avatarUrl
    };

    // Check Easter Egg: contains "Nat" (case-insensitive)
    if (/nat/i.test(cleanMember)) {
      setPendingProfileData({ profile: newProfile, updatedMembers });
      setShowEasterEgg(true);
      return;
    }

    onSelectProfile(newProfile, updatedMembers);
    setErrorMsg('');
  };

  const handleAddNewMember = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNew = newMemberInput.trim();
    if (!cleanNew) return;
    if (!currentProfile) return;

    const membersSet = new Set(familyMembers);
    membersSet.add(cleanNew);
    const updatedMembers = Array.from(membersSet);

    const newProfile: UserProfile = {
      familyName: currentProfile.familyName,
      memberName: cleanNew
    };

    setNewMemberInput('');

    // Check Easter Egg: contains "Nat" (case-insensitive)
    if (/nat/i.test(cleanNew)) {
      setPendingProfileData({ profile: newProfile, updatedMembers });
      setShowEasterEgg(true);
      return;
    }

    onSelectProfile(newProfile, updatedMembers);
  };

  const handleEasterEggConfirm = () => {
    setShowEasterEgg(false);
    if (pendingProfileData) {
      onSelectProfile(pendingProfileData.profile, pendingProfileData.updatedMembers);
      setPendingProfileData(null);
    }
  };

  const handleQuickSwitchMember = (selectedMember: string) => {
    if (!currentProfile) return;
    onSelectProfile(
      {
        familyName: currentProfile.familyName,
        memberName: selectedMember,
        avatarUrl: selectedMember === currentProfile.memberName ? currentProfile.avatarUrl : undefined
      },
      familyMembers
    );
    if (onClose) onClose();
  };

  const handleDeleteMember = (e: React.MouseEvent, memberToDelete: string) => {
    e.stopPropagation();
    if (memberToDelete === currentProfile?.memberName) {
      alert('You cannot delete the active logged-in member. Switch to another user or log out first.');
      return;
    }

    if (window.confirm(`Are you sure you want to remove "${memberToDelete}" from ${currentProfile?.familyName || 'the family'}?`)) {
      if (onRemoveMember) {
        onRemoveMember(memberToDelete);
      } else {
        const updated = familyMembers.filter((m) => m !== memberToDelete);
        if (currentProfile) {
          onSelectProfile(currentProfile, updated);
        }
      }
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-[#EAE6DF] overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="p-6 text-center relative bg-[#FDFBF7] border-b border-[#F4F1EA]">
            <div className="w-12 h-12 bg-[#2B2D42] text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Gyummy Family</h2>
            <p className="text-xs text-slate-500 mt-1">
              {currentProfile
                ? `Logged in as: ${currentProfile.memberName} (${currentProfile.familyName})`
                : 'A mindful meal planner where you feel at home'}
            </p>

            {!isMandatory && onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 text-sm font-medium cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-white">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* If already in a family, show member switcher & removal */}
            {currentProfile && !isCreatingNewFamily ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Active Family
                  </span>
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 bg-[#F4F1EA] border border-[#EAE6DF] px-3 py-1 rounded-full">
                    <Home className="w-3.5 h-3.5 text-slate-600" />
                    {currentProfile.familyName}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Family Members ({familyMembers.length}):
                    </label>
                    <span className="text-[10px] text-slate-400">Tap to switch user</span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {familyMembers.map((member) => {
                      const isActive = member === currentProfile.memberName;
                      return (
                        <div
                          key={member}
                          onClick={() => handleQuickSwitchMember(member)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#F4F1EA] border-slate-700 text-slate-900 shadow-2xs'
                              : 'bg-white border-[#EAE6DF] text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                isActive ? 'bg-[#2B2D42] text-white' : 'bg-[#E2D9CC] text-slate-800'
                              }`}
                            >
                              {member.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="truncate block font-bold">{member}</span>
                              {isActive && (
                                <span className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider block">
                                  ● Active User
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isActive ? (
                              <Check className="w-4 h-4 text-slate-800 stroke-[3]" />
                            ) : (
                              /* Remove Member Button (Disabled for active user) */
                              <button
                                type="button"
                                onClick={(e) => handleDeleteMember(e, member)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title={`Remove ${member}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add member form */}
                <form onSubmit={handleAddNewMember} className="pt-2 border-t border-[#F4F1EA]">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    + Add New Member
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Natalie, Dad, Mom"
                      value={newMemberInput}
                      onChange={(e) => setNewMemberInput(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl border border-[#EAE6DF] focus:outline-hidden focus:border-slate-500 bg-[#FDFBF7] text-slate-900 placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-[#2B2D42] text-white rounded-xl text-xs font-bold hover:bg-[#1E1F2E] flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>
                </form>

                {/* Actions: Switch Family or Log Out */}
                <div className="pt-3 border-t border-[#F4F1EA] space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewFamily(true);
                      setFamilyName('');
                      setMemberName('');
                      setAvatarUrl('');
                    }}
                    className="w-full py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-[#F4F1EA] hover:bg-[#EAE6DF] transition cursor-pointer"
                  >
                    + Join or Create Another Family
                  </button>

                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      <span>Log Out of {currentProfile.familyName}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Create or Join Family Form */
              <form onSubmit={handleRegisterOrLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Family / Household Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Miller Family or Gilbert & Nat"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#EAE6DF] focus:outline-hidden focus:border-slate-500 bg-[#FDFBF7] text-slate-900 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Your Member Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gilbert"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#EAE6DF] focus:outline-hidden focus:border-slate-500 bg-[#FDFBF7] text-slate-900 shadow-2xs"
                  />
                </div>

                {/* Profile Photo (Optional) */}
                <div className="bg-[#FDFBF7] p-3 rounded-xl border border-[#EAE6DF] space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Member Photo (Optional)
                  </label>
                  
                  <input
                    type="file"
                    ref={photoInputRef}
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  <div className="flex items-center gap-3">
                    {avatarUrl ? (
                      <div className="relative">
                        <img
                          src={avatarUrl}
                          alt="Avatar preview"
                          className="w-12 h-12 rounded-xl object-cover border border-[#EAE6DF]"
                        />
                        <button
                          type="button"
                          onClick={() => setAvatarUrl('')}
                          className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#E2D9CC] text-slate-700 font-bold flex items-center justify-center text-lg border border-[#D5CAB9]">
                        {memberName ? memberName.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white text-slate-800 border border-[#EAE6DF] rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Camera className="w-3.5 h-3.5 text-slate-600" />
                      <span>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  {currentProfile && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewFamily(false)}
                      className="w-1/3 py-2.5 rounded-xl border border-[#EAE6DF] text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#2B2D42] text-white rounded-xl text-xs font-bold hover:bg-[#1E1F2E] flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Easter Egg Trigger Modal */}
      <EasterEggModal
        isOpen={showEasterEgg}
        onConfirm={handleEasterEggConfirm}
      />
    </>
  );
}
