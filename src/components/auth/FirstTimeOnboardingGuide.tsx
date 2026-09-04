import React, { useState } from 'react';
import { ArrowRight, Sparkles, ShoppingCart, Check } from 'lucide-react';
import { MealScheduleSettingsModal } from '../settings/MealScheduleSettingsModal';
import { PersonalisationModal } from '../personalisation/PersonalisationModal';
import { LegalTermsModal } from '../common/LegalTermsModal';
import type { MealScheduleConfig, MemberPreferences, FamilyPersonalisation } from '../../types';

interface FirstTimeOnboardingGuideProps {
  isOpen: boolean;
  currentMember: string;
  familyMembers: string[];
  memberProfiles: Record<string, MemberPreferences>;
  familyPersonalisation: FamilyPersonalisation;
  mealSchedules: MealScheduleConfig[];
  onSavePersonalisation: (
    profiles: Record<string, MemberPreferences>,
    familyPersonalisation: FamilyPersonalisation
  ) => void;
  onAddFamilyMember?: (name: string) => void;
  onSaveMealSchedules: (schedules: MealScheduleConfig[]) => void;
  onCompleteOnboarding: () => void;
  onGoToRecipeLibrary: () => void;
}

export const FirstTimeOnboardingGuide: React.FC<FirstTimeOnboardingGuideProps> = ({
  isOpen,
  currentMember,
  familyMembers,
  memberProfiles,
  familyPersonalisation,
  mealSchedules,
  onSavePersonalisation,
  onAddFamilyMember,
  onSaveMealSchedules,
  onCompleteOnboarding,
  onGoToRecipeLibrary
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);

  // Express Setup State
  const [expressSpice, setExpressSpice] = useState<'none' | 'mild' | 'medium' | 'spicy'>(
    familyPersonalisation?.spiceTolerance || 'mild'
  );
  const [expressKids, setExpressKids] = useState<boolean>(
    Boolean(familyPersonalisation?.cookingForKids)
  );
  const [showDetailedAllergyModal, setShowDetailedAllergyModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  if (!isOpen) return null;

  const handleFinishPersonalisation = (
    updatedProfiles: Record<string, MemberPreferences>,
    updatedFamilyPersonalisation: FamilyPersonalisation
  ) => {
    onSavePersonalisation(updatedProfiles, updatedFamilyPersonalisation);
    setShowDetailedAllergyModal(false);
    setIsScheduleModalOpen(true);
    setStep(2);
  };

  const handleExpressContinue = () => {
    const updatedFamily: FamilyPersonalisation = {
      ...familyPersonalisation,
      spiceTolerance: expressSpice,
      cookingForKids: expressKids,
      strictAllergyFilter: familyPersonalisation?.strictAllergyFilter ?? true
    };
    onSavePersonalisation(memberProfiles, updatedFamily);
    setIsScheduleModalOpen(true);
    setStep(2);
  };

  const handleFinishScheduleStep = (schedules: MealScheduleConfig[]) => {
    onSaveMealSchedules(schedules);
    setIsScheduleModalOpen(false);
    setStep(3);
  };

  const handleFinishAll = () => {
    onCompleteOnboarding();
    onGoToRecipeLibrary();
  };

  return (
    <>
      {/* Step 1: Express Kitchen Setup Card */}
      {step === 1 && (
        <>
          {showDetailedAllergyModal ? (
            <PersonalisationModal
              isOpen={true}
              onClose={() => setShowDetailedAllergyModal(false)}
              currentMember={currentMember}
              familyMembers={familyMembers}
              memberProfiles={memberProfiles}
              familyPersonalisation={{
                ...familyPersonalisation,
                spiceTolerance: expressSpice,
                cookingForKids: expressKids
              }}
              onSavePersonalisation={handleFinishPersonalisation}
              onAddFamilyMember={onAddFamilyMember}
            />
          ) : (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#252220] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-[#EDE8DF] dark:border-[#38332E] space-y-4 text-center relative animate-in zoom-in-95 duration-300">
                {/* Onboarding Step Badge */}
                <div className="inline-flex items-center gap-1.5 bg-[#FFD13B] text-[#2D2640] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border border-[#2D2640]/10">
                  <Sparkles className="w-3 h-3 fill-[#2D2640]" />
                  <span>Step 1 of 4: Family Kitchen Setup</span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#2D2640] dark:text-[#F0EDE8] leading-snug">
                    Welcome to Gyummy! 🍲
                  </h3>
                  <p className="text-xs text-[#7A6E64] dark:text-[#9A9088]">
                    Set up your family kitchen in 15 seconds.
                  </p>
                </div>

                {/* Form Controls */}
                <div className="space-y-3 text-left">
                  {/* Spice Level */}
                  <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] p-3 rounded-2xl border border-[#EDE8DF] dark:border-[#38332E] space-y-1.5">
                    <label className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] block">
                      🌶️ Household Spice Preference
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'mild', label: 'Mild / None', emoji: '🟢' },
                        { id: 'medium', label: 'Medium', emoji: '🟡' },
                        { id: 'spicy', label: 'Spicy 🔥', emoji: '🔴' }
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setExpressSpice(s.id as any)}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                            expressSpice === s.id
                              ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10 shadow-xs'
                              : 'bg-white dark:bg-[#252220] text-[#7A6E64] dark:text-[#9A9088] border-[#EDE8DF] dark:border-[#38332E]'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cooking for Kids */}
                  <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] p-3 rounded-2xl border border-[#EDE8DF] dark:border-[#38332E] space-y-1.5">
                    <label className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] block">
                      👶 Cooking for children / kids?
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setExpressKids(true)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                          expressKids
                            ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10 shadow-xs'
                            : 'bg-white dark:bg-[#252220] text-[#7A6E64] dark:text-[#9A9088] border-[#EDE8DF] dark:border-[#38332E]'
                        }`}
                      >
                        👶 Yes, Kid-Friendly
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpressKids(false)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                          !expressKids
                            ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10 shadow-xs'
                            : 'bg-white dark:bg-[#252220] text-[#7A6E64] dark:text-[#9A9088] border-[#EDE8DF] dark:border-[#38332E]'
                        }`}
                      >
                        🧑 Adults Only
                      </button>
                    </div>
                  </div>

                  {/* Medical Allergies Choice */}
                  <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] p-3 rounded-2xl border border-[#EDE8DF] dark:border-[#38332E] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8]">
                        🛡️ Food Allergies?
                      </p>
                      <p className="text-[10.5px] text-[#9A8A7E] dark:text-[#7A6E64]">
                        {Object.values(memberProfiles).some((p) => p?.allergies && p.allergies.length > 0)
                          ? `${Object.values(memberProfiles).reduce((acc, p) => acc + (p.allergies?.length || 0), 0)} allergies set`
                          : 'None declared yet'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDetailedAllergyModal(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-[#252220] text-[#2D2640] dark:text-[#F0EDE8] border border-[#EDE8DF] dark:border-[#38332E] hover:border-[#FFD13B] transition cursor-pointer shadow-2xs"
                    >
                      + Manage
                    </button>
                  </div>
                </div>

                {/* Friendly Note for Detailed Personalisation */}
                <div className="bg-[#FFF8E6] dark:bg-[#2A1E00] border border-[#FFD13B]/40 rounded-xl p-2.5 text-left">
                  <p className="text-[10.5px] text-[#7A5C00] dark:text-[#FFD13B] leading-relaxed">
                    💡 <strong>Tip:</strong> You can fine-tune member tastes, hated ingredients (like cilantro or mushrooms) & dietary goals anytime in <strong>Settings &gt; Personalisation</strong>.
                  </p>
                </div>

                {/* Effortless Terms & Health Disclaimer Agreement */}
                <div className="flex items-start gap-2 text-left pt-0.5 px-0.5">
                  <input
                    type="checkbox"
                    id="onboarding-agree-terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded accent-[#FFD13B] cursor-pointer text-[#2D2640]"
                  />
                  <label htmlFor="onboarding-agree-terms" className="text-[10.5px] text-[#7A6E64] dark:text-[#9A8A7E] leading-tight cursor-pointer select-none">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowLegalModal(true);
                      }}
                      className="text-[#2D2640] dark:text-[#F0EDE8] font-bold underline hover:text-[#7A5C00] cursor-pointer"
                    >
                      Terms of Service
                    </button>{' '}
                    &{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowLegalModal(true);
                      }}
                      className="text-[#2D2640] dark:text-[#F0EDE8] font-bold underline hover:text-[#7A5C00] cursor-pointer"
                    >
                      Health Disclaimer
                    </button>.
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleExpressContinue}
                  className="w-full py-2.5 bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] text-xs font-extrabold rounded-2xl shadow-sm border border-[#2D2640]/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continue to Meal Schedule ➔</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Step 2: Meal Schedule Settings Modal */}
      {step === 2 && (
        <MealScheduleSettingsModal
          isOpen={isScheduleModalOpen}
          onClose={() => {
            setIsScheduleModalOpen(false);
            setStep(3);
          }}
          mealSchedules={mealSchedules}
          onSaveMealSchedules={handleFinishScheduleStep}
        />
      )}

      {/* Step 3: Recipe Library & Family Cookbook Guide */}
      {step === 3 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#252220] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-[#EDE8DF] dark:border-[#38332E] space-y-4 text-center relative animate-in zoom-in-95 duration-300">

            {/* Onboarding Badge */}
            <div className="inline-flex items-center gap-1.5 bg-[#FFD13B] text-[#2D2640] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border border-[#2D2640]/10">
              <Sparkles className="w-3 h-3 fill-[#2D2640]" />
              <span>Step 3 of 4: Build Your Cookbook</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#2D2640] dark:text-[#F0EDE8] leading-snug">
                Explore 3,000+ Recipes 📖
              </h3>
            </div>

            {/* Illustrated Steps */}
            <div className="space-y-2 text-left">
              <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] p-3 rounded-2xl border border-[#EDE8DF] dark:border-[#38332E] flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#FFD13B] text-[#2D2640] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-[#2D2640]/10">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8]">Browse Recipe Library</h4>
                  <p className="text-[11px] text-[#9A8A7E] dark:text-[#7A6E64]">
                    Explore 3,000+ curated dishes from top food creators.
                  </p>
                </div>
              </div>

              <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] p-3 rounded-2xl border border-[#EDE8DF] dark:border-[#38332E] flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#E8F5ED] dark:bg-[#0D2E1A] text-[#2D6A4A] dark:text-[#4CAF82] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-[#A8D8BC] dark:border-[#1D4A2A]">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8]">Tap "+ Cookbook"</h4>
                  <p className="text-[11px] text-[#9A8A7E] dark:text-[#7A6E64]">
                    Save dishes to your family collection with 1 tap.
                  </p>
                </div>
              </div>

              <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] p-3 rounded-2xl border border-[#EDE8DF] dark:border-[#38332E] flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#FFD13B] text-[#2D2640] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-[#2D2640]/10">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8]">Plan Your Week</h4>
                  <p className="text-[11px] text-[#9A8A7E] dark:text-[#7A6E64]">
                    Assign meals to your rolling calendar.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(4)}
              className="w-full py-2.5 bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] text-xs font-extrabold rounded-2xl shadow-sm border border-[#2D2640]/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Next: Smart Pantry</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: "In My Pantry" Smart Stocking Guide */}
      {step === 4 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#252220] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-[#EDE8DF] dark:border-[#38332E] space-y-4 text-center relative animate-in zoom-in-95 duration-300">

            {/* Onboarding Badge */}
            <div className="inline-flex items-center gap-1.5 bg-[#FFD13B] text-[#2D2640] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border border-[#2D2640]/10">
              <Sparkles className="w-3 h-3 fill-[#2D2640]" />
              <span>Step 4 of 4: Smart Pantry</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#2D2640] dark:text-[#F0EDE8] leading-snug">
                Smart Pantry & Substitutions 🏡
              </h3>
            </div>

            {/* Pantry Feature Showcase Card */}
            <div className="space-y-2 text-left">
              <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] p-3 rounded-2xl border border-[#EDE8DF] dark:border-[#38332E] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8]">Pre-loaded Staples</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2D6A4A] dark:text-[#4CAF82] bg-[#E8F5ED] dark:bg-[#0D2E1A] border border-[#A8D8BC] dark:border-[#1D4A2A] px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" />
                    In Pantry
                  </span>
                </div>
                <p className="text-[11px] text-[#9A8A7E] dark:text-[#7A6E64]">
                  Rice, Soy Sauce, Cooking Oil, Salt, and Pepper are ready in your pantry.
                </p>
              </div>

              <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] p-3 rounded-2xl border border-[#EDE8DF] dark:border-[#38332E] flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#FFD13B] text-[#2D2640] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-[#2D2640]/10">
                  <ShoppingCart className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8]">
                    Smart Substitution
                  </h4>
                  <p className="text-[11px] text-[#9A8A7E] dark:text-[#7A6E64]">
                    If a recipe needs <em>Olive Oil</em>, Gyummy marks it covered by your Cooking Oil at home.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleFinishAll}
              className="w-full py-2.5 bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] text-xs font-extrabold rounded-2xl shadow-sm border border-[#2D2640]/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Get Started 🚀</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-[10.5px] text-[#9A8A7E] dark:text-[#7A6E64] pt-1">
              By using Gyummy, you agree to our{' '}
              <button
                type="button"
                onClick={() => setShowLegalModal(true)}
                className="underline font-bold text-[#2D2640] dark:text-[#FFD13B] hover:text-amber-600 cursor-pointer"
              >
                Terms of Service & Health Disclaimer
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Legal Terms & Health Disclaimer Modal */}
      <LegalTermsModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        initialTab="allergies"
      />
    </>
  );
};
