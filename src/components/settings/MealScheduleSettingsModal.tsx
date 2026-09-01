import React, { useState } from 'react';
import type { MealScheduleConfig } from '../../types';
import { X, Plus, Trash2, Check, Sliders, CheckCircle2, Calendar } from 'lucide-react';

interface MealScheduleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealSchedules: MealScheduleConfig[];
  onSaveMealSchedules: (schedules: MealScheduleConfig[]) => void;
}

const DAY_NAMES = [
  { dayNum: 1, name: 'Mon' },
  { dayNum: 2, name: 'Tue' },
  { dayNum: 3, name: 'Wed' },
  { dayNum: 4, name: 'Thu' },
  { dayNum: 5, name: 'Fri' },
  { dayNum: 6, name: 'Sat' },
  { dayNum: 0, name: 'Sun' }
];

export const MealScheduleSettingsModal: React.FC<MealScheduleSettingsModalProps> = ({
  isOpen,
  onClose,
  mealSchedules,
  onSaveMealSchedules
}) => {
  const [editableSchedules, setEditableSchedules] = useState<MealScheduleConfig[]>(
    JSON.parse(JSON.stringify(mealSchedules))
  );
  const [newScheduleName, setNewScheduleName] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleToggleEnabled = (id: string) => {
    setEditableSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nextEnabled = !s.defaultEnabled;
        return {
          ...s,
          defaultEnabled: nextEnabled,
          applicableDays: nextEnabled ? [1, 2, 3, 4, 5, 6, 0] : []
        };
      })
    );
  };

  const handleRenameSchedule = (id: string, name: string) => {
    setEditableSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name } : s))
    );
  };

  const handleSetApplicableDaysPreset = (id: string, preset: 'all' | 'weekdays' | 'weekends') => {
    let days: number[] | undefined;
    if (preset === 'weekdays') {
      days = [1, 2, 3, 4, 5];
    } else if (preset === 'weekends') {
      days = [0, 6];
    } else {
      days = [1, 2, 3, 4, 5, 6, 0];
    }

    setEditableSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, defaultEnabled: true, applicableDays: days } : s))
    );
  };

  const handleToggleDayForSchedule = (id: string, dayNum: number) => {
    setEditableSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const currentDays = s.defaultEnabled ? (s.applicableDays || [0, 1, 2, 3, 4, 5, 6]) : [];
        let updated: number[];
        if (currentDays.includes(dayNum)) {
          updated = currentDays.filter((d) => d !== dayNum);
        } else {
          updated = [...currentDays, dayNum];
        }
        const hasDays = updated.length > 0;
        return {
          ...s,
          defaultEnabled: hasDays,
          applicableDays: hasDays ? (updated.length === 7 ? undefined : updated) : []
        };
      })
    );
  };

  const handleAddNewSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newScheduleName.trim();
    if (!clean) return;

    const newId = `schedule_custom_${Date.now()}`;
    const newSchedule: MealScheduleConfig = {
      id: newId,
      name: clean,
      defaultEnabled: true,
      order: editableSchedules.length + 1
    };

    setEditableSchedules([...editableSchedules, newSchedule]);
    setNewScheduleName('');
    showToast(`Added Meal Schedule "${clean}"`);
  };

  const handleDeleteSchedule = (id: string) => {
    setEditableSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSave = () => {
    const valid = editableSchedules.filter((s) => s.name.trim().length > 0);
    onSaveMealSchedules(valid);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#252220] w-full max-w-md max-h-[90vh] sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col overflow-hidden border border-[#EDE8DF] dark:border-[#38332E] animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE8DF] dark:border-[#38332E] bg-white dark:bg-[#252220]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFD13B] text-[#2D2640] font-bold shadow-sm flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#2D2640] dark:text-[#F0EDE8]">Customize Meal Schedules</h2>
              <p className="text-xs text-[#9A8A7E] dark:text-[#7A6E64]">Weekdays (Mon-Fri) vs Weekends (Sat-Sun)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F0E8] dark:bg-[#2E2A26] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] text-[#7A6E64] dark:text-[#9A9088] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-white dark:bg-[#252220]">
          {toastMsg && (
            <div className="p-2.5 bg-[#E8F5ED] dark:bg-[#0D2E1A] text-[#2D6A4A] dark:text-[#4CAF82] text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-[#A8D8BC] dark:border-[#1D4A2A]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4A] dark:text-[#4CAF82]" />
              <span>{toastMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-[11px] font-bold text-[#3D3530] dark:text-[#D0C8C0] uppercase tracking-wider">
              Calendar Meal Schedules ({editableSchedules.length})
            </label>
            <p className="text-[11px] text-[#9A8A7E] dark:text-[#7A6E64]">
              Rename schedules and select which days of the week they apply.
            </p>

            <div className="space-y-2.5 pt-1">
              {editableSchedules.map((schedule) => {
                const isDefaultFixed = ['breakfast', 'lunch', 'dinner', 'snack'].includes(schedule.id);
                const activeDays = schedule.defaultEnabled ? (schedule.applicableDays || [0, 1, 2, 3, 4, 5, 6]) : [];

                const isWeekdaysOnly = activeDays.length === 5 && [1, 2, 3, 4, 5].every((d) => activeDays.includes(d));
                const isWeekendsOnly = activeDays.length === 2 && [0, 6].every((d) => activeDays.includes(d));
                const isAllDays = activeDays.length === 7;

                return (
                  <div
                    key={schedule.id}
                    className="p-3.5 bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#EDE8DF] dark:border-[#38332E] rounded-xl space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(schedule.id)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition shrink-0 cursor-pointer ${
                          schedule.defaultEnabled
                            ? 'bg-[#FFD13B] text-[#2D2640] font-bold shadow-sm'
                            : 'border border-[#EDE8DF] dark:border-[#38332E] bg-white dark:bg-[#252220] text-transparent'
                        }`}
                        title={schedule.defaultEnabled ? 'Schedule enabled' : 'Schedule disabled'}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>

                      <input
                        type="text"
                        value={schedule.name}
                        onChange={(e) => handleRenameSchedule(schedule.id, e.target.value)}
                        className="flex-1 text-xs font-bold bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#E8E0D5] dark:border-[#38332E] rounded-xl text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] focus:outline-none focus:border-[#2D2640] dark:focus:border-[#F0EDE8] px-2.5 py-1.5"
                      />

                      {!isDefaultFixed && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="p-1.5 text-[#B8AFA4] dark:text-[#5A5450] hover:text-rose-600 rounded-lg transition cursor-pointer"
                          title="Delete Meal Schedule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Applicable Days Preset Pills */}
                    <div className="space-y-1.5 pl-8">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#9A8A7E] dark:text-[#7A6E64] flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#B8AFA4] dark:text-[#5A5450]" />
                          Days:
                        </span>
                        <div className="flex gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleSetApplicableDaysPreset(schedule.id, 'all')}
                            className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                              isAllDays ? 'bg-[#FFD13B] text-[#2D2640] font-bold shadow-sm' : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border border-[#EDE8DF] dark:border-[#38332E]'
                            }`}
                          >
                            All Days
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetApplicableDaysPreset(schedule.id, 'weekdays')}
                            className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                              isWeekdaysOnly ? 'bg-[#FFD13B] text-[#2D2640] font-bold shadow-sm' : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border border-[#EDE8DF] dark:border-[#38332E]'
                            }`}
                          >
                            Mon-Fri
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetApplicableDaysPreset(schedule.id, 'weekends')}
                            className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                              isWeekendsOnly ? 'bg-[#FFD13B] text-[#2D2640] font-bold shadow-sm' : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border border-[#EDE8DF] dark:border-[#38332E]'
                            }`}
                          >
                            Sat-Sun
                          </button>
                        </div>
                      </div>

                      {/* Day Toggles */}
                      <div className="flex items-center gap-1 pt-1">
                        {DAY_NAMES.map(({ dayNum, name }) => {
                          const isSelected = activeDays.includes(dayNum);
                          return (
                            <button
                              key={dayNum}
                              type="button"
                              onClick={() => handleToggleDayForSchedule(schedule.id, dayNum)}
                              className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                                isSelected
                                  ? 'bg-[#FFD13B] text-[#2D2640] font-bold shadow-sm'
                                  : 'bg-white dark:bg-[#252220] text-[#9A8A7E] dark:text-[#7A6E64] border border-[#EDE8DF] dark:border-[#38332E]'
                              }`}
                            >
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add custom schedule form */}
          <form onSubmit={handleAddNewSchedule} className="pt-2 border-t border-[#EDE8DF] dark:border-[#38332E]">
            <label className="block text-[11px] font-bold text-[#3D3530] dark:text-[#D0C8C0] uppercase tracking-wider mb-1.5">
              + Add Custom Meal Schedule
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Afternoon Tea, Late Snack"
                value={newScheduleName}
                onChange={(e) => setNewScheduleName(e.target.value)}
                className="flex-1 text-xs font-medium px-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#E8E0D5] dark:border-[#38332E] rounded-xl text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] focus:outline-none focus:border-[#2D2640] dark:focus:border-[#F0EDE8]"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] font-extrabold border border-[#2D2640]/10 rounded-xl shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EDE8DF] dark:border-[#38332E] bg-white dark:bg-[#252220] flex items-center justify-end gap-2 pb-safe">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] rounded-xl hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] transition cursor-pointer text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] font-extrabold border border-[#2D2640]/10 rounded-xl shadow-sm active:scale-[0.98] transition-all cursor-pointer text-xs"
          >
            Save Meal Schedules
          </button>
        </div>
      </div>
    </div>
  );
};
