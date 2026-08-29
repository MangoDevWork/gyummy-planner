import React, { useState } from 'react';
import type { Dish, MealScheduleEntry } from '../../types';
import { X, Search, Plus, Trash2, Utensils, Check } from 'lucide-react';

interface MealScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string; // YYYY-MM-DD
  scheduleId: string;
  scheduleName: string;
  currentEntry?: MealScheduleEntry;
  dishes: Dish[];
  onSaveEntry: (date: string, scheduleId: string, entry: MealScheduleEntry | null) => void;
  onCreateNewDish: () => void;
}

export const MealScheduleModal: React.FC<MealScheduleModalProps> = ({
  isOpen,
  onClose,
  date,
  scheduleId,
  scheduleName,
  currentEntry,
  dishes,
  onSaveEntry,
  onCreateNewDish
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'library' | 'custom'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [customText, setCustomText] = useState(currentEntry?.customText || '');
  const servingsMultiplier = currentEntry?.servingsMultiplier || 1;

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const filteredDishes = dishes.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectDish = (dish: Dish) => {
    onSaveEntry(date, scheduleId, {
      dishId: dish.id,
      customText: '',
      servingsMultiplier
    });
    onClose();
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    onSaveEntry(date, scheduleId, {
      dishId: null,
      customText: customText.trim(),
      servingsMultiplier: 1
    });
    onClose();
  };

  const handleClearSchedule = () => {
    onSaveEntry(date, scheduleId, null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md max-h-[85vh] sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col overflow-hidden border border-[#EAE6DF] animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4F1EA] bg-[#FDFBF7]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🍲</span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Plan {scheduleName}
              </h2>
              <p className="text-xs text-slate-500 font-medium">{formattedDate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F4F1EA] hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-3 border-b border-[#F4F1EA] bg-white grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setActiveTab('library')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'library'
                ? 'bg-[#2B2D42] text-white shadow-xs'
                : 'bg-[#F4F1EA] text-slate-600 hover:text-slate-900'
            }`}
          >
            From Recipe Library
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-[#2B2D42] text-white shadow-xs'
                : 'bg-[#F4F1EA] text-slate-600 hover:text-slate-900'
            }`}
          >
            Quick Note / Eat Out
          </button>
        </div>

        {/* Body Content */}
        {activeTab === 'library' ? (
          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3 bg-[#FDFBF7]">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-[#EAE6DF] focus:outline-hidden focus:border-slate-400 shadow-2xs"
                />
              </div>
              <button
                onClick={() => {
                  onClose();
                  onCreateNewDish();
                }}
                className="shrink-0 flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#EAE6DF] px-3 py-2 rounded-xl transition cursor-pointer shadow-2xs"
                title="Create a new recipe"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            {/* Dishes list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
              {filteredDishes.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <Utensils className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-xs">No matching recipes found.</p>
                </div>
              ) : (
                filteredDishes.map((dish) => {
                  const isCurrent = currentEntry?.dishId === dish.id;
                  return (
                    <div
                      key={dish.id}
                      onClick={() => handleSelectDish(dish)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between active:scale-[0.98] ${
                        isCurrent
                          ? 'border-slate-800 bg-white ring-1 ring-slate-800 shadow-sm'
                          : 'border-[#EAE6DF] hover:border-slate-300 bg-white shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {dish.imageUrl ? (
                          <img
                            src={dish.imageUrl}
                            alt={dish.name}
                            className="w-11 h-11 rounded-lg object-cover border border-[#EAE6DF] shrink-0"
                          />
                        ) : (
                          <span className="text-2xl p-1 bg-[#F4F1EA] rounded-lg shrink-0">
                            {dish.imageEmoji || '🍲'}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-[#F4F1EA] px-1.5 py-0.2 rounded-md">
                              {dish.category}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              • {dish.ingredients.length} ingr.
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 truncate">{dish.name}</h4>
                        </div>
                      </div>

                      {isCurrent ? (
                        <div className="w-6 h-6 rounded-full bg-[#2B2D42] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600 shrink-0">Select</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveCustom} className="p-5 space-y-4 bg-[#FDFBF7]">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Quick Meal Note
              </label>
              <input
                type="text"
                placeholder="e.g. Leftovers, Takeout Thai, Pizza Night"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                autoFocus
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-[#EAE6DF] bg-white text-slate-900 focus:outline-hidden focus:border-slate-400 shadow-2xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Note: Custom notes won't auto-generate grocery ingredients unless assigned to a recipe.
              </p>
            </div>

            <button
              type="submit"
              disabled={!customText.trim()}
              className="w-full py-3 rounded-xl bg-[#2B2D42] hover:bg-[#1E1F2E] disabled:opacity-50 text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
            >
              Save Meal Note
            </button>
          </form>
        )}

        {/* Footer with Clear Schedule option if occupied */}
        {(currentEntry?.dishId || currentEntry?.customText) && (
          <div className="p-3 border-t border-[#F4F1EA] bg-white flex items-center justify-between pb-safe">
            <span className="text-xs text-slate-500">Currently scheduled</span>
            <button
              type="button"
              onClick={handleClearSchedule}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Schedule</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
