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
  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md max-h-[85vh] sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col overflow-hidden border border-[#EAE6DF] animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4F1EA] bg-[#FDFBF7]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2B2D42] text-white flex items-center justify-center shadow-xs">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Copy Meal Schedule</h2>
              <p className="text-xs text-slate-500">Duplicate schedules across weeks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F4F1EA] hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto bg-[#FDFBF7]">
          {/* Preset Options */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Choose Copy Action:
            </label>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setCopyMode('to_next')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  copyMode === 'to_next'
                    ? 'border-slate-800 bg-white ring-1 ring-slate-800 shadow-xs'
                    : 'border-[#EAE6DF] bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Copy This Week → Into Next Week
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-600" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Duplicates current 7 days of meals ({currentMealCount} meals) directly to next week.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCopyMode('from_prev')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  copyMode === 'from_prev'
                    ? 'border-slate-800 bg-white ring-1 ring-slate-800 shadow-xs'
                    : 'border-[#EAE6DF] bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Copy Last Week → Into This Week
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-600" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Re-applies all meal schedules from the previous week into this week.
                </p>
              </button>
            </div>
          </div>

          {/* Merge Mode Toggle */}
          <div className="bg-white p-3.5 rounded-xl border border-[#EAE6DF] flex items-center justify-between shadow-2xs">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 block">Overwrite Existing Meals</span>
              <span className="text-[11px] text-slate-500 block">
                {overwriteExisting
                  ? 'Will replace already planned meals'
                  : 'Keeps already scheduled meals safe'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setOverwriteExisting(!overwriteExisting)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                overwriteExisting ? 'bg-[#2B2D42]' : 'bg-slate-200'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  overwriteExisting ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#F4F1EA] bg-white flex items-center justify-end gap-2 pb-safe">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#EAE6DF] text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleExecuteCopy}
            className="px-5 py-2.5 rounded-xl bg-[#2B2D42] hover:bg-[#1E1F2E] text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
          >
            Execute Copy
          </button>
        </div>
      </div>
    </div>
  );
};
