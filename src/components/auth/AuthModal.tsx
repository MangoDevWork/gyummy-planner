import { useState, useRef } from 'react';
import type { UserProfile } from '../../types';
import { Users, UserPlus, Home, Check, ArrowRight, Camera, Trash2 } from 'lucide-react';
import { compressImage } from '../../services/imageUtils';
import { EasterEggModal } from '../common/EasterEggModal';

interface AuthModalProps {
  isOpen: boolean;
  currentProfile: UserProfile | null;
  familyMembers: string[];
  onSelectProfile: (profile: UserProfile, updatedMembers: string[]) => void;
  onClose?: () => void;
  isMandatory?: boolean;
}

export function AuthModal({
  isOpen,
  currentProfile,
  familyMembers,
  onSelectProfile,
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
                ? `Active user: ${currentProfile.memberName}`
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

            {/* If already in a family, show member switcher */}
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
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Switch Active Member:
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {familyMembers.map((member) => {
                      const isActive = member === currentProfile.memberName;
                      return (
                        <button
                          key={member}
                          onClick={() => handleQuickSwitchMember(member)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#F4F1EA] border-slate-700 text-slate-900 shadow-2xs'
                              : 'bg-white border-[#EAE6DF] text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                isActive ? 'bg-[#2B2D42] text-white' : 'bg-[#E2D9CC] text-slate-800'
                              }`}
                            >
                              {member.charAt(0).toUpperCase()}
                            </div>
                            <span>{member}</span>
                          </div>
                          {isActive && <Check className="w-4 h-4 text-slate-800 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Add member form */}
                <form onSubmit={handleAddNewMember} className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Add Family Member
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

                {/* Switch Family toggle */}
                <div className="pt-3 border-t border-[#F4F1EA] text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewFamily(true);
                      setFamilyName('');
                      setMemberName('');
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold hover:underline cursor-pointer"
                  >
                    Switch or Register a Different Family →
                  </button>
                </div>
              </div>
            ) : (
              /* Register / Setup Family Form */
              <form onSubmit={handleRegisterOrLogin} className="space-y-4">
                {/* Photo Avatar Picker */}
                <div className="text-center">
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Member Photo (Optional)
                  </label>

                  <div className="flex items-center justify-center gap-3">
                    <input
                      type="file"
                      ref={photoInputRef}
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />

                    {avatarUrl ? (
                      <div className="relative">
                        <img
                          src={avatarUrl}
                          alt="Avatar Preview"
                          className="w-16 h-16 rounded-2xl object-cover border border-[#EAE6DF] shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setAvatarUrl('')}
                          className="absolute -top-1 -right-1 p-1 bg-rose-600 text-white rounded-full shadow-md cursor-pointer"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="w-16 h-16 rounded-2xl bg-[#FDFBF7] border-2 border-dashed border-slate-300 text-slate-500 hover:border-slate-500 flex flex-col items-center justify-center transition cursor-pointer"
                      >
                        <Camera className="w-5 h-5 text-slate-400" />
                        <span className="text-[9px] font-semibold mt-0.5">Upload</span>
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    1. Family Name <span className="text-slate-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. The Smiths, Gilbert & Co"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#EAE6DF] focus:outline-hidden focus:border-slate-500 bg-[#FDFBF7] text-slate-900 placeholder:text-slate-400 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    2. Your Member Name <span className="text-slate-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gilbert, Nat"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#EAE6DF] focus:outline-hidden focus:border-slate-500 bg-[#FDFBF7] text-slate-900 placeholder:text-slate-400 shadow-2xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#2B2D42] hover:bg-[#1E1F2E] text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 mt-2 cursor-pointer active:scale-95"
                >
                  <span>Continue to Planner</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {currentProfile && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewFamily(false)}
                    className="w-full text-center text-xs text-slate-500 hover:text-slate-900 font-medium mt-2 cursor-pointer"
                  >
                    ← Back to Current Family ({currentProfile.familyName})
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Nat Easter Egg Modal */}
      <EasterEggModal
        isOpen={showEasterEgg}
        onConfirm={handleEasterEggConfirm}
      />
    </>
  );
}
