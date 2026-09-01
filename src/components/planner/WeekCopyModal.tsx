import React, { useState } from 'react';
import type { MealPlan } from '../../types';
import { X, Copy, ArrowRight } from 'lucide-react';

interface WeekCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeekStartISO: string; // Monday YYYY-MM-DD
  mealPlan: MealPlan;
  onApplyCopy: (updatedPlan: MealPlan) => void;
  onShowToast?: (msg: string) => void;
}

export const WeekCopyModal: React.FC<WeekCopyModalProps> = ({
  isOpen,
  onClose,
  currentWeekStartISO,
  mealPlan,
  onApplyCopy,
  onShowToast
}) => {
  const [copyMode, setCopyMode] = useState<'to_next' | 'from_prev'>('to_next');
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  const addDays = (isoDate: string, days: number): string => {
    const d = new Date(isoDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const getWeekDays = (startISO: string) => {
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(startISO, i));
    }
    return days;
  };

  const currentWeekDays = getWeekDays(currentWeekStartISO);

  // Count planned meals in source week
  const countMealsInWeek = (days: string[]) => {
    let count = 0;
    days.forEach((day) => {
      if (mealPlan[day]) {
        count += Object.values(mealPlan[day] || {}).filter((e) => (e?.dishIds && e.dishIds.length > 0) || e?.dishId || e?.customText).length;
      }
    });
    return count;
  };

  const currentMealCount = countMealsInWeek(currentWeekDays);

  const handleExecuteCopy = () => {
    let sourceDays: string[] = [];
    let targetDays: string[] = [];

    if (copyMode === 'to_next') {
      sourceDays = currentWeekDays;
      targetDays = getWeekDays(addDays(currentWeekStartISO, 7));
    } else {
      sourceDays = getWeekDays(addDays(currentWeekStartISO, -7));
      targetDays = currentWeekDays;
    }

    const sourceMealsCount = countMealsInWeek(sourceDays);
    if (sourceMealsCount === 0) {
      if (onShowToast) onShowToast('⚠️ Source week has no planned meals to copy.');
      onClose();
      return;
    }

    const updatedPlan: MealPlan = { ...mealPlan };
    let copiedCount = 0;

    for (let i = 0; i < 7; i++) {
      const srcDate = sourceDays[i];
      const dstDate = targetDays[i];

      const srcDay = updatedPlan[srcDate] || {};
      const dstDay = updatedPlan[dstDate] ? { ...updatedPlan[dstDate] } : {};

      Object.keys(srcDay).forEach((scheduleId) => {
        const entry = srcDay[scheduleId];
        if (entry && ((entry.dishIds && entry.dishIds.length > 0) || entry.dishId || entry.customText)) {
          if (overwriteExisting || !dstDay[scheduleId]) {
            dstDay[scheduleId] = { ...entry };
            copiedCount++;
          }
        }
      });

      updatedPlan[dstDate] = dstDay;
    }

    onApplyCopy(updatedPlan);
    if (onShowToast) onShowToast(`✅ Copied ${copiedCount} meal schedules!`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#252220] w-full max-w-md max-h-[85vh] sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col overflow-hidden border border-[#EDE8DF] dark:border-[#38332E] animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0EAE0] dark:border-[#38332E] bg-[#FAF7F2] dark:bg-[#1E1B18]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFD13B] text-[#2D2640] flex items-center justify-center shadow-sm">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#2D2640] dark:text-[#F0EDE8]">Copy Meal Schedule</h2>
              <p className="text-xs text-[#7A6E64] dark:text-[#9A9088]">Duplicate schedules across weeks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F0E8] dark:bg-[#2E2A26] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto bg-white dark:bg-[#252220]">
          {/* Preset Options */}
          <div className="space-y-2">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#7A6E64] dark:text-[#9A9088]">
              Choose Copy Action:
            </label>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setCopyMode('to_next')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  copyMode === 'to_next'
                    ? 'border-[#FFD13B] ring-2 ring-[#FFD13B]/30 bg-[#FAF7F2] dark:bg-[#1E1B18] shadow-sm'
                    : 'border-[#EDE8DF] dark:border-[#38332E] bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#7A6E64] dark:text-[#9A9088] hover:border-[#FFD13B]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8]">
                    Copy This Week → Into Next Week
                  </span>
                  <ArrowRight className={`w-4 h-4 ${copyMode === 'to_next' ? 'text-[#2D2640] dark:text-[#F0EDE8]' : 'text-[#7A6E64] dark:text-[#9A9088]'}`} />
                </div>
                <p className="text-[11px] text-[#7A6E64] dark:text-[#9A9088] mt-1">
                  Duplicates current 7 days of meals ({currentMealCount} meals) directly to next week.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCopyMode('from_prev')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  copyMode === 'from_prev'
                    ? 'border-[#FFD13B] ring-2 ring-[#FFD13B]/30 bg-[#FAF7F2] dark:bg-[#1E1B18] shadow-sm'
                    : 'border-[#EDE8DF] dark:border-[#38332E] bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#7A6E64] dark:text-[#9A9088] hover:border-[#FFD13B]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8]">
                    Copy Last Week → Into This Week
                  </span>
                  <ArrowRight className={`w-4 h-4 ${copyMode === 'from_prev' ? 'text-[#2D2640] dark:text-[#F0EDE8]' : 'text-[#7A6E64] dark:text-[#9A9088]'}`} />
                </div>
                <p className="text-[11px] text-[#7A6E64] dark:text-[#9A9088] mt-1">
                  Re-applies all meal schedules from the previous week into this week.
                </p>
              </button>
            </div>
          </div>

          {/* Merge Mode Toggle */}
          <div className="bg-[#FAF7F2] dark:bg-[#1E1B18] p-3.5 rounded-xl border border-[#EDE8DF] dark:border-[#38332E] flex items-center justify-between shadow-xs">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] block">Overwrite Existing Meals</span>
              <span className="text-[11px] text-[#7A6E64] dark:text-[#9A9088] block">
                {overwriteExisting
                  ? 'Will replace already planned meals'
                  : 'Keeps already scheduled meals safe'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setOverwriteExisting(!overwriteExisting)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer border border-[#2D2640]/10 ${
                overwriteExisting ? 'bg-[#FFD13B]' : 'bg-[#EDE8DF] dark:bg-[#38332E]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full transition-transform absolute top-0.5 shadow-xs ${
                  overwriteExisting ? 'left-[22px] bg-[#2D2640]' : 'left-1 bg-white dark:bg-[#D0C8C0]'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#F0EAE0] dark:border-[#38332E] bg-[#FAF7F2] dark:bg-[#1E1B18] flex items-center justify-end gap-2 pb-safe">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleExecuteCopy}
            className="px-5 py-2.5 rounded-xl bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] font-extrabold border border-[#2D2640]/10 shadow-sm active:scale-[0.98] text-xs transition-all cursor-pointer"
          >
            Execute Copy
          </button>
        </div>
      </div>
    </div>
  );
};
