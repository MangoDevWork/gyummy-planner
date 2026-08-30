import React, { useState } from 'react';
import { ArrowRight, Sparkles, ShoppingCart, Check } from 'lucide-react';
import { MealScheduleSettingsModal } from '../settings/MealScheduleSettingsModal';
import type { MealScheduleConfig } from '../../types';

interface FirstTimeOnboardingGuideProps {
  isOpen: boolean;
  mealSchedules: MealScheduleConfig[];
  onSaveMealSchedules: (schedules: MealScheduleConfig[]) => void;
  onCompleteOnboarding: () => void;
  onGoToRecipeLibrary: () => void;
}

export const FirstTimeOnboardingGuide: React.FC<FirstTimeOnboardingGuideProps> = ({
  isOpen,
  mealSchedules,
  onSaveMealSchedules,
  onCompleteOnboarding,
  onGoToRecipeLibrary
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(true);

  const handleFinishScheduleStep = (schedules: MealScheduleConfig[]) => {
    onSaveMealSchedules(schedules);
    setIsScheduleModalOpen(false);
    setStep(2);
  };

  const handleFinishAll = () => {
    onCompleteOnboarding();
    onGoToRecipeLibrary();
  };

  return (
    <>
      {/* Step 1: Meal Schedule Settings Modal */}
      {step === 1 && (
        <MealScheduleSettingsModal
          isOpen={isScheduleModalOpen}
          onClose={() => {
            setIsScheduleModalOpen(false);
            setStep(2);
          }}
          mealSchedules={mealSchedules}
          onSaveMealSchedules={handleFinishScheduleStep}
        />
      )}

      {/* Step 2: Recipe Library & Family Cookbook Guide */}
      {step === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-[#EAE6DF] space-y-4 text-center relative animate-in zoom-in-95 duration-300">
            
            {/* Onboarding Badge */}
            <div className="inline-flex items-center gap-1.5 bg-[#2B2D42] text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
              <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
              <span>Step 2 of 3: Build Your Cookbook</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                Explore 3,000+ Recipes 📖
              </h3>
            </div>

            {/* Illustrated Steps */}
            <div className="space-y-2 text-left">
              <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE6DF] flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#2B2D42] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Browse Recipe Library</h4>
                  <p className="text-[11px] text-slate-500">
                    Explore 3,000+ curated dishes from top food creators.
                  </p>
                </div>
              </div>

              <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE6DF] flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Tap "+ Cookbook"</h4>
                  <p className="text-[11px] text-slate-500">
                    Save dishes to your family collection with 1 tap.
                  </p>
                </div>
              </div>

              <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE6DF] flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#2B2D42] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Plan Your Week</h4>
                  <p className="text-[11px] text-slate-500">
                    Assign meals to your rolling calendar.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full py-2.5 bg-[#2B2D42] hover:bg-[#1E1F2E] text-white text-xs font-bold rounded-2xl shadow-md active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Next: Smart Pantry</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: "In My Pantry" Smart Stocking Guide */}
      {step === 3 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-[#EAE6DF] space-y-4 text-center relative animate-in zoom-in-95 duration-300">
            
            {/* Onboarding Badge */}
            <div className="inline-flex items-center gap-1.5 bg-[#2B2D42] text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
              <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
              <span>Step 3 of 3: Smart Pantry</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                Smart Pantry & Substitutions 🏡
              </h3>
            </div>

            {/* Pantry Feature Showcase Card */}
            <div className="space-y-2 text-left">
              <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE6DF] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Pre-loaded Staples</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" />
                    In Pantry
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Rice, Soy Sauce, Cooking Oil, Salt, and Pepper are ready in your pantry.
                </p>
              </div>

              <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE6DF] flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  <ShoppingCart className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Smart Substitution
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    If a recipe needs <em>Olive Oil</em>, Gyummy marks it covered by your Cooking Oil at home.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleFinishAll}
              className="w-full py-2.5 bg-[#2B2D42] hover:bg-[#1E1F2E] text-white text-xs font-bold rounded-2xl shadow-md active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Get Started 🚀</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
