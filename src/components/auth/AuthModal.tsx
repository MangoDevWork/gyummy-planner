import { useState, useRef } from 'react';
import type { UserProfile } from '../../types';
import { Home, Check, ArrowRight, Camera, Trash2, LogOut, KeyRound, Loader2, UserPlus, X } from 'lucide-react';
import { compressImage } from '../../services/imageUtils';
import { EasterEggModal } from '../common/EasterEggModal';
import { LegalTermsModal } from '../common/LegalTermsModal';
import { verifyOrCreateFamily, DEFAULT_FAMILY_PIN } from '../../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  currentProfile: UserProfile | null;
  familyMembers: string[];
  onSelectProfile: (profile: UserProfile, updatedMembers: string[], cloudData?: any) => void;
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
  const [pin, setPin] = useState(currentProfile?.pin || (currentProfile ? DEFAULT_FAMILY_PIN : ''));
  const [avatarUrl, setAvatarUrl] = useState(currentProfile?.avatarUrl || '');
  const [newMemberInput, setNewMemberInput] = useState('');
  const [isCreatingNewFamily, setIsCreatingNewFamily] = useState(!currentProfile);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Easter Egg State
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
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
    } catch {
      setErrorMsg('Failed to process image file.');
    }
  };

  const handleAddNewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newMemberInput.trim();
    if (!clean) return;

    if (familyMembers.includes(clean)) {
      setErrorMsg(`"${clean}" is already in this family.`);
      return;
    }

    if (!currentProfile) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const activePin = currentProfile.pin || DEFAULT_FAMILY_PIN;
      const authResult = await verifyOrCreateFamily(
        currentProfile.familyName,
        activePin,
        clean,
        true
      );

      if (!authResult.success) {
        setErrorMsg(authResult.error || 'Failed to add member.');
        setIsLoading(false);
        return;
      }

      const updated = [...familyMembers, clean];
      onSelectProfile(
        {
          familyName: currentProfile.familyName,
          memberName: clean,
          pin: activePin,
          avatarUrl: undefined
        },
        updated,
        authResult.cloudData
      );

      setNewMemberInput('');
      if (onClose) onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add member.';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterOrLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFamily = familyName.trim();
    const cleanMember = memberName.trim();
    const cleanPin = pin.trim();

    if (!cleanFamily || !cleanMember) {
      setErrorMsg('Family Name and Member Name are required.');
      return;
    }

    if (!/^\d{4}$/.test(cleanPin)) {
      setErrorMsg('PIN must be exactly 4 digits.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const authResult = await verifyOrCreateFamily(cleanFamily, cleanPin, cleanMember, true);

      if (!authResult.success) {
        setErrorMsg(authResult.error || 'Invalid PIN for this family space.');
        setIsLoading(false);
        return;
      }

      const membersSet = new Set(authResult.members || (currentProfile?.familyName === cleanFamily ? familyMembers : []));
      membersSet.add(cleanMember);
      const updatedMembers = Array.from(membersSet);

      const profile: UserProfile = {
        familyName: cleanFamily,
        memberName: cleanMember,
        pin: cleanPin,
        avatarUrl: avatarUrl || undefined
      };

      if (/nat/i.test(cleanMember)) {
        setPendingProfileData({ profile, updatedMembers });
        setShowEasterEgg(true);
        setIsLoading(false);
        return;
      }

      onSelectProfile(profile, updatedMembers, authResult.cloudData);
      if (onClose) onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEasterEggConfirm = () => {
    setShowEasterEgg(false);
    if (pendingProfileData) {
      onSelectProfile(pendingProfileData.profile, pendingProfileData.updatedMembers);
      setPendingProfileData(null);
      if (onClose) onClose();
    }
  };

  const handleQuickSwitchMember = (selectedMember: string) => {
    if (!currentProfile) return;
    onSelectProfile(
      {
        familyName: currentProfile.familyName,
        memberName: selectedMember,
        pin: currentProfile.pin || DEFAULT_FAMILY_PIN,
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-[#252220] w-full max-w-sm rounded-3xl shadow-2xl border border-[#EDE8DF] dark:border-[#38332E] overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="p-5 text-center relative bg-[#FAF7F2] dark:bg-[#1E1B18] border-b border-[#EDE8DF] dark:border-[#38332E]">
            <div className="w-10 h-10 bg-[#FFD13B] border border-[#2D2640]/10 text-[#2D2640] rounded-full flex items-center justify-center mx-auto mb-2 shadow-xs font-black text-base">
              🍲
            </div>
            <h2 className="text-base font-black text-[#2D2640] dark:text-[#F0EDE8] tracking-tight">Gyummy Family Space</h2>
            <p className="text-xs text-[#7A6E64] dark:text-[#9A9088] mt-0.5">
              {currentProfile
                ? `Active: ${currentProfile.memberName} (${currentProfile.familyName})`
                : 'Manage family members and sync space'}
            </p>

            {!isMandatory && onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-[#7A6E64] dark:text-[#9A9088] hover:text-[#2D2640] dark:hover:text-[#F0EDE8] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] rounded-full p-1.5 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-white dark:bg-[#252220]">
            {errorMsg && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-bold">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* If already in a family, show member switcher & removal */}
            {currentProfile && !isCreatingNewFamily ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A6E64] dark:text-[#9A9088]">
                    Active Family
                  </span>
                  <span className="text-xs font-black text-[#2D2640] dark:text-[#F0EDE8] flex items-center gap-1.5 bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#EDE8DF] dark:border-[#38332E] px-3 py-1 rounded-full shadow-xs">
                    <Home className="w-3.5 h-3.5 text-[#FFD13B]" />
                    {currentProfile.familyName}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-extrabold text-[#2D2640] dark:text-[#F0EDE8]">
                      Family Members ({familyMembers.length}):
                    </label>
                    <span className="text-[10px] text-[#9A8A7E] dark:text-[#7A6E64]">Tap to switch user</span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {familyMembers.map((member) => {
                      const isActive = member === currentProfile.memberName;
                      return (
                        <div
                          key={member}
                          onClick={() => handleQuickSwitchMember(member)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#FAF7F2] dark:bg-[#1E1B18] border-[#FFD13B] ring-2 ring-[#FFD13B]/30 text-[#2D2640] dark:text-[#F0EDE8] shadow-xs'
                              : 'bg-white dark:bg-[#252220] border-[#EDE8DF] dark:border-[#38332E] text-[#7A6E64] dark:text-[#9A9088] hover:border-[#FFD13B] hover:bg-[#FAF7F2] dark:hover:bg-[#1E1B18]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 border ${
                                isActive
                                  ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10'
                                  : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border-[#EDE8DF] dark:border-[#38332E]'
                              }`}
                            >
                              {member.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="truncate block font-black text-[#2D2640] dark:text-[#F0EDE8]">{member}</span>
                              {isActive && (
                                <span className="text-[9px] text-[#2D6A4A] dark:text-[#4CAF82] font-extrabold uppercase tracking-wider block">
                                  ● Active Profile
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isActive ? (
                              <Check className="w-4 h-4 text-[#2D2640] dark:text-[#FFD13B] stroke-[3]" />
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteMember(e, member)}
                                className="p-1.5 text-[#B8AFA4] dark:text-[#5A5450] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
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
                <form onSubmit={handleAddNewMember} className="pt-2 border-t border-[#EDE8DF] dark:border-[#38332E]">
                  <label className="block text-xs font-extrabold text-[#2D2640] dark:text-[#F0EDE8] mb-1.5">
                    + Add New Member
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Natalie, Dad, Mom"
                      value={newMemberInput}
                      onChange={(e) => setNewMemberInput(e.target.value)}
                      className="flex-1 px-3.5 py-2 text-xs font-bold rounded-xl border border-[#E8E0D5] dark:border-[#38332E] bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] focus:outline-none focus:border-[#2D2640] dark:focus:border-[#F0EDE8]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] border border-[#2D2640]/10 rounded-xl text-xs font-extrabold flex items-center gap-1 shrink-0 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>
                </form>

                {/* Actions: Switch Family or Log Out */}
                <div className="pt-3 border-t border-[#EDE8DF] dark:border-[#38332E] space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewFamily(true);
                      setFamilyName('');
                      setMemberName('');
                      setPin(DEFAULT_FAMILY_PIN);
                      setAvatarUrl('');
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-extrabold text-[#2D2640] dark:text-[#D0C8C0] bg-[#F5F0E8] dark:bg-[#2E2A26] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] transition cursor-pointer"
                  >
                    + Join or Create Another Family
                  </button>

                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      <span>Log Out of {currentProfile.familyName}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Create or Join Family Form */
              <form onSubmit={handleRegisterOrLogin} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#2D2640] dark:text-[#F0EDE8] mb-1 uppercase tracking-wider">
                    Family Space Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Miller Family or Gilbert & Nat"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-[#E8E0D5] dark:border-[#38332E] bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] focus:outline-none focus:border-[#2D2640] dark:focus:border-[#F0EDE8] shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-[#2D2640] dark:text-[#F0EDE8] mb-1 uppercase tracking-wider">
                    Your Member Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gilbert"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-[#E8E0D5] dark:border-[#38332E] bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] focus:outline-none focus:border-[#2D2640] dark:focus:border-[#F0EDE8] shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-[#2D2640] dark:text-[#F0EDE8] mb-1 uppercase tracking-wider">
                    Family 4-Digit PIN *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 absolute left-3.5 top-3 text-[#9A8A7E] dark:text-[#7A6E64]" />
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]{4}"
                      maxLength={4}
                      required
                      placeholder="••••"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full pl-9 pr-4 py-2 text-sm font-black rounded-xl border border-[#E8E0D5] dark:border-[#38332E] bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] tracking-widest focus:outline-none focus:border-[#2D2640] dark:focus:border-[#F0EDE8] shadow-xs"
                    />
                  </div>
                </div>

                {/* Profile Photo (Optional) */}
                <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] p-2.5 rounded-xl border border-[#EDE8DF] dark:border-[#38332E] space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-[#7A6E64] dark:text-[#9A9088] uppercase tracking-wider">
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
                          className="w-9 h-9 rounded-full object-cover border border-[#EDE8DF] dark:border-[#38332E]"
                        />
                        <button
                          type="button"
                          onClick={() => setAvatarUrl('')}
                          className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700 transition cursor-pointer"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] font-bold flex items-center justify-center text-xs">
                        {memberName ? memberName.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="px-3 py-1 bg-white dark:bg-[#252220] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] rounded-xl text-xs font-bold hover:bg-[#FAF7F2] dark:hover:bg-[#1E1B18] flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#2D2640] dark:text-[#D0C8C0]" />
                      <span>{avatarUrl ? 'Change' : '+ Add Photo'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  {currentProfile && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewFamily(false)}
                      className="w-1/3 py-2.5 rounded-xl border border-[#EDE8DF] dark:border-[#38332E] bg-[#F5F0E8] dark:bg-[#2E2A26] text-xs font-bold text-[#2D2640] dark:text-[#D0C8C0] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] transition cursor-pointer"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2.5 bg-[#FFD13B] hover:bg-[#FFC200] border border-[#2D2640]/10 text-[#2D2640] rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-center text-[#9A8A7E] dark:text-[#7A6E64] pt-1">
                  By continuing, you agree to Gyummy's{' '}
                  <button
                    type="button"
                    onClick={() => setShowLegalModal(true)}
                    className="underline font-semibold text-[#2D2640] dark:text-[#F0EDE8] hover:text-[#FFD13B] cursor-pointer"
                  >
                    Terms & Health Disclaimer
                  </button>
                </p>
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

      {/* Legal Terms & Health Disclaimer Modal */}
      <LegalTermsModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        initialTab="allergies"
      />
    </>
  );
}
