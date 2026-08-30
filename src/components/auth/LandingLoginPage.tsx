import React, { useState, useRef } from 'react';
import type { UserProfile } from '../../types';
import { ArrowRight, Camera, Sparkles, Calendar, BookOpen, ShoppingBag } from 'lucide-react';
import { compressImage } from '../../services/imageUtils';
import { EasterEggModal } from '../common/EasterEggModal';
import heroImg from '../../assets/hero-landing.jpg';

interface LandingLoginPageProps {
  currentProfile: UserProfile | null;
  familyMembers: string[];
  onLogin: (profile: UserProfile, updatedMembers: string[]) => void;
}

export const LandingLoginPage: React.FC<LandingLoginPageProps> = ({
  currentProfile,
  familyMembers,
  onLogin
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [familyName, setFamilyName] = useState(currentProfile?.familyName || '');
  const [memberName, setMemberName] = useState(currentProfile?.memberName || '');
  const [avatarUrl, setAvatarUrl] = useState(currentProfile?.avatarUrl || '');
  const [errorMsg, setErrorMsg] = useState('');

  // Easter Egg
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<{ profile: UserProfile; members: string[] } | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 400, 400, 0.8);
      setAvatarUrl(compressed);
    } catch {
      setErrorMsg('Failed to process image photo.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFamily = familyName.trim();
    const cleanMember = memberName.trim();

    if (!cleanFamily || !cleanMember) {
      setErrorMsg('Please provide both your Family Name and Member Name.');
      return;
    }

    const membersSet = new Set(familyMembers);
    membersSet.add(cleanMember);
    const updatedMembers = Array.from(membersSet);

    const profile: UserProfile = {
      familyName: cleanFamily,
      memberName: cleanMember,
      avatarUrl: avatarUrl || undefined
    };

    // Check Easter Egg: name contains "Nat"
    if (/nat/i.test(cleanMember)) {
      setPendingProfile( { profile, members: updatedMembers });
      setShowEasterEgg(true);
      return;
    }

    onLogin(profile, updatedMembers);
  };

  const handleEasterEggConfirm = () => {
    setShowEasterEgg(false);
    if (pendingProfile) {
      onLogin(pendingProfile.profile, pendingProfile.members);
      setPendingProfile(null);
    }
  };

  const handleQuickSwitchMember = (member: string) => {
    const fam = familyName || currentProfile?.familyName || 'Family';
    onLogin(
      {
        familyName: fam,
        memberName: member,
        avatarUrl: member === currentProfile?.memberName ? currentProfile.avatarUrl : undefined
      },
      familyMembers
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] flex flex-col justify-between relative overflow-hidden">
      {/* Background Hero Banner using PXL_20260108_091927515.MP.jpg */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImg}
          alt="Delicious Food Header"
          className="w-full h-full object-cover object-center filter brightness-[0.85] contrast-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-slate-900/40 to-[#F4F1EA] z-10" />
      </div>

      {/* Top Header Branding */}
      <header className="relative z-20 pt-8 px-6 text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/40 shadow-sm">
          <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
          <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">
            Mindful Family Meal Planner
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight drop-shadow-md">
          Gyummy Planner
        </h1>
        <p className="text-xs sm:text-sm text-slate-200 font-medium max-w-xs mx-auto drop-shadow-xs">
          Plan meals, discover 3,000+ recipes & build smart grocery lists effortlessly.
        </p>
      </header>

      {/* Main Form Container */}
      <main className="relative z-20 px-4 py-6 max-w-md mx-auto w-full space-y-4">
        
        {/* Sleek Modern Login / Registration Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/60 space-y-5">
          
          {/* Form Mode Selector */}
          <div className="grid grid-cols-2 bg-[#F4F1EA] p-1 rounded-2xl border border-[#EAE6DF]">
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setErrorMsg('');
              }}
              className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                authMode === 'register'
                  ? 'bg-[#2B2D42] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              First Time / Get Started
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMsg('');
              }}
              className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                authMode === 'login'
                  ? 'bg-[#2B2D42] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Returning User Login
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl animate-bounce">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Registration / New Household Form */}
          {authMode === 'register' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Family / Household Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Miller Family or Gilbert & Nat"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-[#EAE6DF] bg-[#FDFBF7] text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-500 shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Your Member Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gilbert"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-[#EAE6DF] bg-[#FDFBF7] text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-500 shadow-2xs"
                />
              </div>

              {/* Photo Upload Section */}
              <div className="bg-[#FDFBF7] p-3 rounded-2xl border border-[#EAE6DF] space-y-2">
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Member Photo Avatar (Optional)
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
                    <img
                      src={avatarUrl}
                      alt="Avatar Preview"
                      className="w-12 h-12 rounded-xl object-cover border border-[#EAE6DF] shadow-xs"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#E2D9CC] text-slate-800 font-bold text-lg flex items-center justify-center border border-[#D5CAB9]">
                      {memberName ? memberName.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="px-3.5 py-2 bg-white text-slate-800 border border-[#EAE6DF] hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-600" />
                    <span>{avatarUrl ? 'Change Photo' : '+ Upload Photo'}</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#2B2D42] hover:bg-[#1E1F2E] text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Get Started & Set Up Schedules</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Existing Member Login Form */
            <div className="space-y-4">
              {familyMembers.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Select Member Account to Log In:
                  </label>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {familyMembers.map((member) => (
                      <button
                        key={member}
                        type="button"
                        onClick={() => handleQuickSwitchMember(member)}
                        className="w-full p-3 rounded-xl border border-[#EAE6DF] bg-[#FDFBF7] hover:bg-[#F4F1EA] flex items-center justify-between text-xs font-bold text-slate-900 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#2B2D42] text-white font-bold flex items-center justify-center text-xs">
                            {member.charAt(0).toUpperCase()}
                          </div>
                          <span>Log in as {member}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-[#F4F1EA]">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Or Log In with Name:
                </label>

                <input
                  type="text"
                  required
                  placeholder="Family Name (e.g. Miller Family)"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-[#EAE6DF] bg-[#FDFBF7] text-slate-900 shadow-2xs"
                />

                <input
                  type="text"
                  required
                  placeholder="Member Name (e.g. Gilbert)"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-[#EAE6DF] bg-[#FDFBF7] text-slate-900 shadow-2xs"
                />

                <button
                  type="submit"
                  className="w-full py-3 bg-[#2B2D42] hover:bg-[#1E1F2E] text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Log In to App</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Feature Highlights Cards */}
        <div className="grid grid-cols-3 gap-2 text-center text-white">
          <div className="bg-black/40 backdrop-blur-md p-2.5 rounded-2xl border border-white/20 space-y-1">
            <Calendar className="w-5 h-5 mx-auto text-amber-300" />
            <span className="text-[10px] font-bold block leading-tight">Rolling 7-Day Plan</span>
          </div>

          <div className="bg-black/40 backdrop-blur-md p-2.5 rounded-2xl border border-white/20 space-y-1">
            <BookOpen className="w-5 h-5 mx-auto text-emerald-300" />
            <span className="text-[10px] font-bold block leading-tight">3,000+ Recipes</span>
          </div>

          <div className="bg-black/40 backdrop-blur-md p-2.5 rounded-2xl border border-white/20 space-y-1">
            <ShoppingBag className="w-5 h-5 mx-auto text-sky-300" />
            <span className="text-[10px] font-bold block leading-tight">Smart Grocery List</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 pb-6 text-center text-white/80 text-[11px] font-medium">
        <span>Gyummy Planner © 2026 • Mindful Home Cooking Made Simple</span>
      </footer>

      {/* Easter Egg Trigger Modal */}
      <EasterEggModal
        isOpen={showEasterEgg}
        onConfirm={handleEasterEggConfirm}
      />
    </div>
  );
};
