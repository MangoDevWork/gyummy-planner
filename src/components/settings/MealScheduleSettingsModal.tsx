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
  if (!isOpen) return null;

  const [editableSchedules, setEditableSchedules] = useState<MealScheduleConfig[]>(
    JSON.parse(JSON.stringify(mealSchedules))
  );
  const [newScheduleName, setNewScheduleName] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleToggleEnabled = (id: string) => {
    setEditableSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, defaultEnabled: !s.defaultEnabled } : s))
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
      days = undefined;
    }

    setEditableSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, applicableDays: days } : s))
    );
  };

  const handleToggleDayForSchedule = (id: string, dayNum: number) => {
    setEditableSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const currentDays = s.applicableDays || [0, 1, 2, 3, 4, 5, 6];
        let updated: number[];
        if (currentDays.includes(dayNum)) {
          updated = currentDays.filter((d) => d !== dayNum);
        } else {
          updated = [...currentDays, dayNum];
        }
        return {
          ...s,
          applicableDays: updated.length === 7 ? undefined : updated
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
      <div className="bg-white w-full max-w-md max-h-[90vh] sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col overflow-hidden border border-[#EAE6DF] animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4F1EA] bg-[#FDFBF7]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2B2D42] text-white flex items-center justify-center shadow-xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Customize Meal Schedules</h2>
              <p className="text-xs text-slate-500">Weekdays (Mon-Fri) vs Weekends (Sat-Sun)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F4F1EA] hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-[#FDFBF7]">
          {toastMsg && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{toastMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Calendar Meal Schedules ({editableSchedules.length})
            </label>
            <p className="text-[11px] text-slate-500">
              Rename schedules and select which days of the week they apply.
            </p>

            <div className="space-y-2.5 pt-1">
              {editableSchedules.map((schedule) => {
                const isDefaultFixed = ['breakfast', 'lunch', 'dinner', 'snack'].includes(schedule.id);
                const activeDays = schedule.applicableDays || [0, 1, 2, 3, 4, 5, 6];

                const isWeekdaysOnly = activeDays.length === 5 && [1, 2, 3, 4, 5].every((d) => activeDays.includes(d));
                const isWeekendsOnly = activeDays.length === 2 && [0, 6].every((d) => activeDays.includes(d));
                const isAllDays = activeDays.length === 7;

                return (
                  <div
                    key={schedule.id}
                    className="p-3.5 bg-white rounded-xl border border-[#EAE6DF] space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(schedule.id)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition shrink-0 cursor-pointer ${
                          schedule.defaultEnabled
                            ? 'bg-[#2B2D42] text-white shadow-xs'
                            : 'border border-slate-300 bg-white text-transparent'
                        }`}
                        title={schedule.defaultEnabled ? 'Schedule enabled' : 'Schedule disabled'}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>

                      <input
                        type="text"
                        value={schedule.name}
                        onChange={(e) => handleRenameSchedule(schedule.id, e.target.value)}
                        className="flex-1 text-xs font-bold text-slate-900 px-2.5 py-1.5 rounded-lg border border-[#EAE6DF] bg-white focus:outline-hidden focus:border-slate-400"
                      />

                      {!isDefaultFixed && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                          title="Delete Meal Schedule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Applicable Days Preset Pills */}
                    <div className="space-y-1.5 pl-8">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          Days:
                        </span>
                        <div className="flex gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleSetApplicableDaysPreset(schedule.id, 'all')}
                            className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                              isAllDays ? 'bg-[#2B2D42] text-white' : 'bg-[#F4F1EA] text-slate-600'
                            }`}
                          >
                            All Days
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetApplicableDaysPreset(schedule.id, 'weekdays')}
                            className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                              isWeekdaysOnly ? 'bg-[#2B2D42] text-white' : 'bg-[#F4F1EA] text-slate-600'
                            }`}
                          >
                            Mon-Fri
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetApplicableDaysPreset(schedule.id, 'weekends')}
                            className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                              isWeekendsOnly ? 'bg-[#2B2D42] text-white' : 'bg-[#F4F1EA] text-slate-600'
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
                                  ? 'bg-[#2B2D42] text-white shadow-xs'
                                  : 'bg-[#FDFBF7] text-slate-500 border border-[#EAE6DF]'
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
          <form onSubmit={handleAddNewSchedule} className="pt-2 border-t border-[#EAE6DF]">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              + Add Custom Meal Schedule
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Afternoon Tea, Late Snack"
                value={newScheduleName}
                onChange={(e) => setNewScheduleName(e.target.value)}
                className="flex-1 text-xs font-medium px-3 py-2 rounded-xl border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-400"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-[#2B2D42] text-white text-xs font-bold rounded-xl hover:bg-[#1E1F2E] flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>
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
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-[#2B2D42] hover:bg-[#1E1F2E] text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            Save Meal Schedules
          </button>
        </div>
      </div>
    </div>
  );
};
