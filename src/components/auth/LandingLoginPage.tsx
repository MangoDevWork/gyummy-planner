import React, { useState, useRef } from 'react';
import type { UserProfile } from '../../types';
import { Camera, KeyRound, Loader2, Check, X } from 'lucide-react';
import { compressImage } from '../../services/imageUtils';
import { EasterEggModal } from '../common/EasterEggModal';
import { verifyOrCreateFamily, resetFamilyPinWithRecovery, DEFAULT_FAMILY_PIN } from '../../services/firebase';

interface LandingLoginPageProps {
  currentProfile: UserProfile | null;
  familyMembers: string[];
  onLogin: (profile: UserProfile, updatedMembers: string[], cloudData?: any) => void;
}

/* ─────────────────────────────────────────────────────────────
   Inline SVG Illustrations
───────────────────────────────────────────────────────────── */

/** Weekly meal planner calendar with food-coded day cells — app's unique icon */
const GyummyCalendarIllustration: React.FC<{ className?: string }> = ({ className = 'w-48 h-48' }) => (
  <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Calendar body */}
    <rect x="16" y="52" width="168" height="130" rx="16" fill="white" stroke="#2D2640" strokeWidth="4"/>
    {/* Header bar */}
    <rect x="16" y="52" width="168" height="36" rx="16" fill="#FFD13B" stroke="#2D2640" strokeWidth="4"/>
    <rect x="16" y="70" width="168" height="18" fill="#FFD13B"/>
    <line x1="20" y1="88" x2="180" y2="88" stroke="#2D2640" strokeWidth="4"/>

    {/* Calendar ring holes */}
    <circle cx="62" cy="46" r="10" fill="#FFFBF5" stroke="#2D2640" strokeWidth="3.5"/>
    <circle cx="100" cy="46" r="10" fill="#FFFBF5" stroke="#2D2640" strokeWidth="3.5"/>
    <circle cx="138" cy="46" r="10" fill="#FFFBF5" stroke="#2D2640" strokeWidth="3.5"/>

    {/* Row 1 — food colour coded cells */}
    {[['#A8D8A8','#F4A6A0','#FFD13B','#FFB347','#A8D8A8'],
      ['#FFB347','#FFD13B','#F4A6A0','#A8D8A8','#FFD13B'],
      ['#A8D8A8','#FFB347','#FFD13B','#F4A6A0','#A8D8A8']].map((row, ri) =>
      row.map((fill, ci) => (
        <rect
          key={`${ri}-${ci}`}
          x={22 + ci * 33}
          y={97 + ri * 28}
          width={26}
          height={21}
          rx={6}
          fill={fill}
          stroke="#2D2640"
          strokeWidth={2.5}
        />
      ))
    )}

    {/* Fork — tilted left */}
    <g transform="rotate(-16 68 34) translate(60, 8)">
      <rect x="3" y="22" width="6" height="26" rx="3" fill="#2D2640"/>
      <rect x="1" y="6" width="2.5" height="14" rx="1.5" fill="#2D2640"/>
      <rect x="5" y="5" width="2.5" height="15" rx="1.5" fill="#2D2640"/>
      <rect x="9" y="6" width="2.5" height="14" rx="1.5" fill="#2D2640"/>
      <path d="M1 20 C1 25 12 25 12 20 L12 18 L1 18 Z" fill="#2D2640"/>
    </g>

    {/* Spoon — tilted right */}
    <g transform="rotate(16 130 34) translate(118, 4)">
      <rect x="3" y="22" width="6" height="26" rx="3" fill="#2D2640"/>
      <ellipse cx="6" cy="13" rx="8" ry="10" fill="#FFD13B" stroke="#2D2640" strokeWidth="3"/>
      <ellipse cx="4" cy="10" rx="2" ry="2.5" fill="white" opacity="0.4"/>
    </g>

    {/* Heart between fork & spoon */}
    <path d="M97 22 C97 17 100 14 100 14 C100 14 103 17 103 22 C103 27 100 30 100 30 C100 30 97 27 97 22Z" fill="#F4A6A0" stroke="#2D2640" strokeWidth="2"/>
  </svg>
);

/** Basil + rosemary bottom-left decoration */
const HerbsLeft: React.FC<{ className?: string }> = ({ className = 'w-28 h-20' }) => (
  <svg viewBox="0 0 120 85" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 70 C5 52 14 32 34 24 C54 16 55 40 40 55 C28 68 10 70 10 70Z" fill="#8DC99A" stroke="#2D2640" strokeWidth="2.5"/>
    <path d="M11 68 C25 55 34 36 34 24" stroke="#2D2640" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M20 52 C32 50 40 55 40 55" stroke="#2D2640" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M35 75 C55 65 80 60 100 65" stroke="#2D2640" strokeWidth="2" strokeLinecap="round"/>
    <path d="M42 68 C44 54 50 48 50 48" stroke="#7BBF88" strokeWidth="2" strokeLinecap="round"/>
    <path d="M52 65 C54 51 60 45 60 45" stroke="#7BBF88" strokeWidth="2" strokeLinecap="round"/>
    <path d="M62 63 C64 49 70 43 70 43" stroke="#7BBF88" strokeWidth="2" strokeLinecap="round"/>
    <path d="M72 62 C74 48 80 42 80 42" stroke="#7BBF88" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="108" cy="60" r="5" fill="#FFFBF5" stroke="#2D2640" strokeWidth="2"/>
    <circle cx="95" cy="72" r="4" fill="#FFFBF5" stroke="#2D2640" strokeWidth="2"/>
  </svg>
);

/** Garlic + chilli bottom-right decoration */
const HerbsRight: React.FC<{ className?: string }> = ({ className = 'w-28 h-20' }) => (
  <svg viewBox="0 0 120 85" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Big basil leaf */}
    <path d="M110 70 C115 52 106 32 86 24 C66 16 65 40 80 55 C92 68 110 70 110 70Z" fill="#8DC99A" stroke="#2D2640" strokeWidth="2.5"/>
    <path d="M109 68 C95 55 86 36 86 24" stroke="#2D2640" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M100 52 C88 50 80 55 80 55" stroke="#2D2640" strokeWidth="1.5" strokeLinecap="round"/>
    {/* Rosemary stems */}
    <path d="M85 75 C65 65 40 60 20 65" stroke="#2D2640" strokeWidth="2" strokeLinecap="round"/>
    <path d="M78 68 C76 54 70 48 70 48" stroke="#7BBF88" strokeWidth="2" strokeLinecap="round"/>
    <path d="M68 65 C66 51 60 45 60 45" stroke="#7BBF88" strokeWidth="2" strokeLinecap="round"/>
    <path d="M58 63 C56 49 50 43 50 43" stroke="#7BBF88" strokeWidth="2" strokeLinecap="round"/>
    {/* Garlic cloves */}
    <path d="M18 58 C12 48 14 35 24 30 C30 27 32 30 30 36 C28 44 22 56 18 58Z" fill="white" stroke="#2D2640" strokeWidth="2.5"/>
    <path d="M24 30 C26 34 25 44 22 55" stroke="#E5C7D4" strokeWidth="1.5" strokeLinecap="round"/>
    {/* Small chilli */}
    <path d="M30 20 C26 14 30 6 36 8 C40 10 40 16 36 22 C34 26 30 20 30 20Z" fill="#F87171" stroke="#2D2640" strokeWidth="2"/>
    <line x1="33" y1="8" x2="33" y2="2" stroke="#2D2640" strokeWidth="2" strokeLinecap="round"/>
    <path d="M33 2 C36 0 40 0 40 4" stroke="#8DC99A" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

/* ─────────────────────────────────────────────────────────────
   Input field component — open, clean, no card container
───────────────────────────────────────────────────────────── */
const Field: React.FC<{
  label: string;
  valid?: boolean;
  children: React.ReactNode;
  right?: React.ReactNode;
}> = ({ label, valid, children, right }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between px-1">
      <label className="text-[11px] font-extrabold text-[#5A4A42] uppercase tracking-wider">{label}</label>
      {right}
    </div>
    <div className="relative">
      {children}
      {valid && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#FFD13B] border border-[#2D2640] flex items-center justify-center shadow-sm pointer-events-none">
          <Check className="w-3 h-3 stroke-[3] text-[#2D2640]" />
        </div>
      )}
    </div>
  </div>
);

const inputCls =
  'w-full px-4 py-3 rounded-2xl bg-[#FDF8F5] border border-[#E8D8CF] text-sm font-semibold text-[#2D2640] placeholder:text-[#C4AFA6] focus:outline-none focus:border-[#2D2640] focus:bg-white shadow-sm transition';

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */
export const LandingLoginPage: React.FC<LandingLoginPageProps> = ({
  currentProfile,
  familyMembers,
  onLogin
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [familyName, setFamilyName] = useState(currentProfile?.familyName || '');
  const [memberName, setMemberName] = useState(currentProfile?.memberName || '');
  const [pin, setPin] = useState(currentProfile?.pin || (currentProfile ? DEFAULT_FAMILY_PIN : ''));
  const [avatarUrl, setAvatarUrl] = useState(currentProfile?.avatarUrl || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotFamily, setForgotFamily] = useState('');
  const [recoverySecret, setRecoverySecret] = useState('');
  const [newPin, setNewPin] = useState('');
  const [forgotMsg, setForgotMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<{ profile: UserProfile; members: string[]; cloudData?: any } | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);

  const isNameValid = memberName.trim().length >= 2;
  const isFamilyValid = familyName.trim().length >= 2;
  const isPinValid = /^\d{4}$/.test(pin.trim());

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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFamily = familyName.trim();
    const cleanMember = memberName.trim();
    const cleanPin = pin.trim();

    if (!cleanFamily || !cleanMember) {
      setErrorMsg('Please provide both your Family Name and Member Name.');
      return;
    }
    if (!/^\d{4}$/.test(cleanPin)) {
      setErrorMsg('Please enter a 4-digit numeric PIN.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const authResult = await verifyOrCreateFamily(cleanFamily, cleanPin, cleanMember, authMode === 'register');

      if (!authResult.success) {
        setErrorMsg(authResult.error || 'Authentication failed. Please check your PIN.');
        setIsLoading(false);
        return;
      }

      const membersSet = new Set(authResult.members || familyMembers);
      membersSet.add(cleanMember);
      const updatedMembers = Array.from(membersSet);

      const profile: UserProfile = {
        familyName: cleanFamily,
        memberName: cleanMember,
        pin: cleanPin,
        avatarUrl: avatarUrl || undefined
      };

      if (/nat/i.test(cleanMember)) {
        setPendingProfile({ profile, members: updatedMembers, cloudData: authResult.cloudData });
        setShowEasterEgg(true);
        setIsLoading(false);
        return;
      }

      onLogin(profile, updatedMembers, authResult.cloudData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error logging in';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEasterEggConfirm = () => {
    setShowEasterEgg(false);
    if (pendingProfile) {
      onLogin(pendingProfile.profile, pendingProfile.members, pendingProfile.cloudData);
      setPendingProfile(null);
    }
  };

  const handleQuickSwitchMember = async (member: string) => {
    const fam = familyName || currentProfile?.familyName || 'Family';
    const activePin = pin || currentProfile?.pin || DEFAULT_FAMILY_PIN;
    setIsLoading(true);
    try {
      const authResult = await verifyOrCreateFamily(fam, activePin, member, false);
      if (!authResult.success) {
        setErrorMsg(authResult.error || 'PIN required for this family.');
        setIsLoading(false);
        return;
      }
      onLogin({ familyName: fam, memberName: member, pin: activePin, avatarUrl: member === currentProfile?.memberName ? currentProfile.avatarUrl : undefined }, familyMembers);
    } catch {
      onLogin({ familyName: fam, memberName: member, pin: activePin, avatarUrl: member === currentProfile?.memberName ? currentProfile.avatarUrl : undefined }, familyMembers);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotFamily.trim() || !recoverySecret.trim() || !newPin.trim()) {
      setForgotMsg({ text: 'Please fill in all fields.', isError: true });
      return;
    }
    if (!/^\d{4}$/.test(newPin.trim())) {
      setForgotMsg({ text: 'New PIN must be exactly 4 digits.', isError: true });
      return;
    }
    setIsLoading(true);
    setForgotMsg(null);
    const result = await resetFamilyPinWithRecovery(forgotFamily, newPin, recoverySecret);
    setIsLoading(false);
    if (result.success) {
      setForgotMsg({ text: 'PIN reset! You can now sign in.', isError: false });
      setFamilyName(forgotFamily.trim());
      setPin(newPin.trim());
      setTimeout(() => { setShowForgotModal(false); setForgotMsg(null); }, 1500);
    } else {
      setForgotMsg({ text: result.error || 'Failed to reset PIN.', isError: true });
    }
  };

  return (
    /* Full-screen peach/salmon background — matches reference image aesthetic */
    <div className="min-h-screen w-full flex flex-col overflow-hidden" style={{ backgroundColor: '#FDEAE3' }}>

      {/* ── TOP HALF: branding + illustration ────────────────────── */}
      <div className="flex flex-col items-center pt-12 pb-6 px-6 flex-shrink-0">

        {/* Mode Toggle pill — at top like reference image */}
        <div className="flex items-center bg-white/50 backdrop-blur-sm p-1 rounded-full border border-[#2D2640]/15 shadow-sm mb-8">
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
            className={`text-xs font-extrabold px-5 py-2 rounded-full transition-all cursor-pointer ${
              authMode === 'login'
                ? 'bg-[#FFD13B] text-[#2D2640] shadow-sm'
                : 'text-[#8A6A60] hover:text-[#2D2640]'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
            className={`text-xs font-extrabold px-5 py-2 rounded-full transition-all cursor-pointer ${
              authMode === 'register'
                ? 'bg-[#FFD13B] text-[#2D2640] shadow-sm'
                : 'text-[#8A6A60] hover:text-[#2D2640]'
            }`}
          >
            Sign up
          </button>
        </div>

        {/* Large centered illustration */}
        <div className="transform hover:scale-[1.03] transition-transform duration-300 drop-shadow-md">
          <GyummyCalendarIllustration className="w-44 h-44 sm:w-52 sm:h-52" />
        </div>

        {/* Title & subtitle */}
        <div className="text-center mt-5 space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black text-[#2D2640] tracking-tight">
            {authMode === 'login' ? 'Sign In' : 'Sign Up'}
          </h1>
          <p className="text-sm text-[#9A7A70] font-medium">
            {authMode === 'login'
              ? 'Welcome back to your family meal planner'
              : 'Join the family meal planning community'}
          </p>
        </div>
      </div>

      {/* ── BOTTOM HALF: form panel ───────────────────────────────── */}
      <div
        className="flex-1 rounded-t-[2.5rem] px-6 pt-7 pb-8 flex flex-col relative overflow-hidden"
        style={{ backgroundColor: '#FFFAF8' }}
      >
        {/* Subtle top handle indicator */}
        <div className="w-10 h-1 bg-[#E8D5CC] rounded-full mx-auto -mt-2 mb-6" />

        {/* Error */}
        {errorMsg && (
          <div className="mb-4 px-4 py-2.5 bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold rounded-2xl">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4 flex-1">

          {/* Your Name */}
          <Field label="Your name" valid={isNameValid}>
            <input
              type="text"
              required
              placeholder="e.g. Gilbert"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className={inputCls}
            />
          </Field>

          {/* Family Space Name */}
          <Field label="Family space name" valid={isFamilyValid}>
            <input
              type="text"
              required
              placeholder="e.g. Miller Family"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              className={inputCls}
            />
          </Field>

          {/* PIN */}
          <Field
            label="Family PIN"
            valid={isPinValid}
            right={
              authMode === 'login' ? (
                <button
                  type="button"
                  onClick={() => { setForgotFamily(familyName); setShowForgotModal(true); }}
                  className="text-[10px] font-bold text-[#9A7A70] hover:text-[#2D2640] underline cursor-pointer"
                >
                  Forgot PIN?
                </button>
              ) : undefined
            }
          >
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              required
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className={inputCls + ' tracking-widest text-base'}
            />
          </Field>

          {/* Photo upload — register only */}
          {authMode === 'register' && (
            <div className="flex items-center justify-between bg-[#FDF5F0] px-4 py-2.5 rounded-2xl border border-[#E8D5CC]">
              <input type="file" ref={photoInputRef} accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <div className="flex items-center gap-2.5">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover border-2 border-[#2D2640]" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#F0DDD5] text-[#2D2640] font-bold text-xs flex items-center justify-center border border-[#2D2640]/30">
                    {memberName ? memberName.charAt(0).toUpperCase() : '👤'}
                  </div>
                )}
                <span className="text-xs font-semibold text-[#7A5A52]">Profile photo <span className="text-[#C4AFA6]">(optional)</span></span>
              </div>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="text-[11px] font-bold text-[#2D2640] bg-white border border-[#2D2640]/30 hover:bg-[#FFD13B] px-3 py-1 rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <Camera className="w-3 h-3" />
                {avatarUrl ? 'Change' : '+ Add'}
              </button>
            </div>
          )}

          {/* CTA Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#FFD13B] hover:bg-[#FFC200] active:scale-[0.98] disabled:opacity-50 text-[#2D2640] font-extrabold text-sm rounded-2xl border-2 border-[#2D2640] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting…</span>
                </>
              ) : (
                <span>{authMode === 'login' ? 'Sign In' : 'Sign Up'}</span>
              )}
            </button>
          </div>
        </form>

        {/* Switch mode text link */}
        <div className="text-center pt-3">
          <button
            type="button"
            onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setErrorMsg(''); }}
            className="text-xs font-semibold text-[#9A7A70] hover:text-[#2D2640] underline transition cursor-pointer"
          >
            {authMode === 'login' ? "New to Gyummy? Create a family space" : "I'm already registered — Sign in"}
          </button>
        </div>

        {/* Quick member switcher */}
        {familyMembers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#F0E0D8] space-y-2">
            <p className="text-[10px] font-extrabold text-[#C4AFA6] uppercase tracking-wider text-center">
              Quick switch
            </p>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {familyMembers.map((member) => (
                <button
                  key={member}
                  type="button"
                  onClick={() => handleQuickSwitchMember(member)}
                  className="text-xs font-bold px-3 py-1.5 bg-[#FAF0EC] hover:bg-[#FFD13B] text-[#2D2640] border border-[#E8D5CC] rounded-full transition active:scale-95 cursor-pointer"
                >
                  {member}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Botanical herbs corner decorations */}
        <div className="absolute bottom-0 left-0 pointer-events-none">
          <HerbsLeft className="w-28 h-20 opacity-80" />
        </div>
        <div className="absolute bottom-0 right-0 pointer-events-none">
          <HerbsRight className="w-28 h-20 opacity-80" />
        </div>
      </div>

      {/* ── Forgot PIN Modal ──────────────────────────────────────── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-[#2D2640] space-y-4 relative animate-in zoom-in-95">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-[#FFD13B] border-2 border-[#2D2640] flex items-center justify-center mx-auto">
                <KeyRound className="w-5 h-5 text-[#2D2640]" />
              </div>
              <h3 className="text-base font-black text-[#2D2640]">Reset Family PIN</h3>
              <p className="text-xs text-slate-500">Enter your family name and a member name to verify identity.</p>
            </div>

            {forgotMsg && (
              <div className={`p-2.5 rounded-xl text-xs font-bold ${forgotMsg.isError ? 'bg-rose-50 border border-rose-300 text-rose-700' : 'bg-emerald-50 border border-emerald-300 text-emerald-700'}`}>
                {forgotMsg.text}
              </div>
            )}

            <form onSubmit={handleResetPinSubmit} className="space-y-3">
              {[
                { label: 'Family Name', value: forgotFamily, onChange: setForgotFamily, placeholder: 'e.g. Miller Family', type: 'text' },
                { label: 'Any Member Name', value: recoverySecret, onChange: setRecoverySecret, placeholder: 'e.g. Gilbert', type: 'text' },
                { label: 'New 4-Digit PIN', value: newPin, onChange: (v: string) => setNewPin(v.replace(/\D/g, '').slice(0, 4)), placeholder: '1234', type: 'password' }
              ].map(({ label, value, onChange, placeholder, type }) => (
                <div key={label}>
                  <label className="block text-[10px] font-extrabold text-[#2D2640] uppercase tracking-wider mb-1">{label}</label>
                  <input
                    type={type}
                    required
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border-2 border-[#E0D8F0] bg-[#F7F5FD] focus:outline-none focus:border-[#2D2640]"
                  />
                </div>
              ))}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="flex-1 py-2.5 rounded-full border-2 border-[#2D2640] text-[#2D2640] font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-full bg-[#FFD13B] border-2 border-[#2D2640] text-[#2D2640] font-extrabold text-xs hover:bg-[#FFC200] transition cursor-pointer"
                >
                  {isLoading ? 'Resetting…' : 'Save PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <EasterEggModal isOpen={showEasterEgg} onConfirm={handleEasterEggConfirm} />
    </div>
  );
};
