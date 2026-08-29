import React, { useState } from 'react';
import type { MealSlotConfig } from '../../types';
import { X, Plus, Trash2, Check, Sliders, CheckCircle2 } from 'lucide-react';

interface MealSlotSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealSlots: MealSlotConfig[];
  onSaveMealSlots: (slots: MealSlotConfig[]) => void;
}

export const MealSlotSettingsModal: React.FC<MealSlotSettingsModalProps> = ({
  isOpen,
  onClose,
  mealSlots,
  onSaveMealSlots
}) => {
  if (!isOpen) return null;

  const [editableSlots, setEditableSlots] = useState<MealSlotConfig[]>(
    JSON.parse(JSON.stringify(mealSlots))
  );
  const [newSlotName, setNewSlotName] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleToggleEnabled = (id: string) => {
    setEditableSlots((prev) =>
      prev.map((slot) =>
        slot.id === id ? { ...slot, defaultEnabled: !slot.defaultEnabled } : slot
      )
    );
  };

  const handleRenameSlot = (id: string, name: string) => {
    setEditableSlots((prev) =>
      prev.map((slot) => (slot.id === id ? { ...slot, name } : slot))
    );
  };

  const handleAddNewSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSlotName.trim();
    if (!clean) return;

    const newId = `slot_custom_${Date.now()}`;
    const newSlot: MealSlotConfig = {
      id: newId,
      name: clean,
      defaultEnabled: true,
      order: editableSlots.length + 1
    };

    setEditableSlots([...editableSlots, newSlot]);
    setNewSlotName('');
    showToast(`Added slot "${clean}"`);
  };

  const handleDeleteSlot = (id: string) => {
    setEditableSlots((prev) => prev.filter((slot) => slot.id !== id));
  };

  const handleSave = () => {
    const valid = editableSlots.filter((s) => s.name.trim().length > 0);
    onSaveMealSlots(valid);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md max-h-[90vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Customize Meal Slots</h2>
              <p className="text-xs text-slate-500">Configure, rename, or add custom meal slots</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {toastMsg && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{toastMsg}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Calendar Meal Slots ({editableSlots.length})
            </label>
            <p className="text-[11px] text-slate-400">
              Toggle checkmarks to enable/disable slots on your daily calendar, or edit slot names.
            </p>

            <div className="space-y-2 pt-1">
              {editableSlots.map((slot) => {
                const isDefaultFixed = ['breakfast', 'lunch', 'dinner', 'snack'].includes(slot.id);

                return (
                  <div
                    key={slot.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(slot.id)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition shrink-0 ${
                        slot.defaultEnabled
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'border border-slate-300 bg-white text-transparent'
                      }`}
                      title={slot.defaultEnabled ? 'Slot enabled' : 'Slot disabled'}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>

                    <input
                      type="text"
                      value={slot.name}
                      onChange={(e) => handleRenameSlot(slot.id, e.target.value)}
                      className="flex-1 text-xs font-bold text-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-amber-500"
                    />

                    {!isDefaultFixed && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
                        title="Delete slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add custom slot form */}
          <form onSubmit={handleAddNewSlot} className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              + Add Custom Meal Slot
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Afternoon Tea, Pre-workout"
                value={newSlotName}
                onChange={(e) => setNewSlotName(e.target.value)}
                className="flex-1 text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-hidden focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/90 flex items-center justify-end gap-2 pb-safe">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition"
          >
            Save Meal Slots
          </button>
        </div>
      </div>
    </div>
  );
};
