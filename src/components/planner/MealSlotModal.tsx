import React, { useState } from 'react';
import type { Dish, MealSlotEntry } from '../../types';
import { X, Search, Plus, Trash2, Utensils, Check } from 'lucide-react';

interface MealSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string; // YYYY-MM-DD
  slotId: string;
  slotName: string;
  currentEntry?: MealSlotEntry;
  dishes: Dish[];
  onSaveEntry: (date: string, slotId: string, entry: MealSlotEntry | null) => void;
  onCreateNewDish: () => void;
}

export const MealSlotModal: React.FC<MealSlotModalProps> = ({
  isOpen,
  onClose,
  date,
  slotId,
  slotName,
  currentEntry,
  dishes,
  onSaveEntry,
  onCreateNewDish
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'custom'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [customText, setCustomText] = useState(currentEntry?.customText || '');
  const servingsMultiplier = currentEntry?.servingsMultiplier || 1;

  if (!isOpen) return null;

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
    onSaveEntry(date, slotId, {
      dishId: dish.id,
      customText: '',
      servingsMultiplier
    });
    onClose();
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    onSaveEntry(date, slotId, {
      dishId: null,
      customText: customText.trim(),
      servingsMultiplier: 1
    });
    onClose();
  };

  const handleClearSlot = () => {
    onSaveEntry(date, slotId, null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#252220] w-full max-w-md max-h-[85vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden border border-[#EDE8DF] dark:border-[#38332E] animate-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0EAE0] dark:border-[#38332E] bg-[#FAF7F2] dark:bg-[#1E1B18]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍲</span>
            <div>
              <h2 className="text-sm font-bold text-[#2D2640] dark:text-[#F0EDE8]">
                Plan {slotName}
              </h2>
              <p className="text-xs text-[#9A8A7E] dark:text-[#7A6E64] font-medium">{formattedDate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F0E8] dark:bg-[#2E2A26] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] text-[#7A6E64] dark:text-[#9A9088] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-3 border-b border-[#F0EAE0] dark:border-[#38332E] bg-white dark:bg-[#252220] grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setActiveTab('library')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'library'
                ? 'bg-[#FFD13B] text-[#2D2640] shadow-sm'
                : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border border-[#EDE8DF] dark:border-[#38332E]'
            }`}
          >
            From Recipe Library
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-[#FFD13B] text-[#2D2640] shadow-sm'
                : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border border-[#EDE8DF] dark:border-[#38332E]'
            }`}
          >
            Quick Note / Eat Out
          </button>
        </div>

        {/* Body Content */}
        {activeTab === 'library' ? (
          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3 bg-white dark:bg-[#252220]">
            {/* Search and New Dish Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#B8AFA4] dark:text-[#5A5450] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 bg-[#FAF7F2] dark:bg-[#1E1B18] rounded-xl border border-[#E8E0D5] dark:border-[#38332E] text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] focus:outline-none focus:border-[#2D2640] dark:focus:border-[#F0EDE8]"
                />
              </div>
              <button
                onClick={() => { onClose(); onCreateNewDish(); }}
                className="shrink-0 flex items-center gap-1 text-xs font-bold bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] px-3 py-2 rounded-xl transition-colors cursor-pointer"
                title="Create a new recipe"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            {/* Dishes list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
              {filteredDishes.length === 0 ? (
                <div className="text-center py-8 text-[#B8AFA4] dark:text-[#5A5450] space-y-2">
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
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between active:scale-[0.98] ${
                        isCurrent
                          ? 'border-[#FFD13B] bg-[#FFF8E6] dark:bg-[#2A1E00] ring-2 ring-[#FFD13B]/30 shadow-sm'
                          : 'border-[#EDE8DF] dark:border-[#38332E] hover:border-[#FFD13B]/50 bg-white dark:bg-[#252220]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl">{dish.imageEmoji || '🍲'}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-px rounded-md bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088]">
                              {dish.category}
                            </span>
                            <span className="text-[10px] text-[#9A8A7E] dark:text-[#7A6E64] font-medium">
                              • {dish.ingredients.length} ingredients
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] truncate">{dish.name}</h4>
                        </div>
                      </div>

                      {isCurrent ? (
                        <div className="w-6 h-6 rounded-full bg-[#FFD13B] text-[#2D2640] flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-[#7A6E64] dark:text-[#9A9088] shrink-0">Select</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveCustom} className="p-5 space-y-4 bg-white dark:bg-[#252220]">
            <div>
              <label className="block text-xs font-extrabold text-[#7A6E64] dark:text-[#9A9088] uppercase tracking-wider mb-1.5">
                Quick Meal Note
              </label>
              <input
                type="text"
                placeholder="e.g. Leftovers, Dining Out, Pizza Night"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                autoFocus
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-[#E8E0D5] dark:border-[#38332E] bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] focus:outline-none focus:border-[#2D2640] dark:focus:border-[#F0EDE8] focus:bg-white dark:focus:bg-[#252220]"
              />
              <p className="text-[11px] text-[#B8AFA4] dark:text-[#5A5450] mt-1">
                Note: Custom notes won't auto-generate grocery ingredients unless assigned to a recipe.
              </p>
            </div>

            <button
              type="submit"
              disabled={!customText.trim()}
              className="w-full py-2.5 rounded-xl bg-[#FFD13B] hover:bg-[#FFC200] disabled:opacity-50 text-[#2D2640] text-xs font-extrabold shadow-sm border border-[#2D2640]/10 active:scale-[0.98] transition-all cursor-pointer"
            >
              Save Meal Note
            </button>
          </form>
        )}

        {/* Footer with Clear Slot option */}
        {(currentEntry?.dishId || currentEntry?.customText) && (
          <div className="p-3 border-t border-[#F0EAE0] dark:border-[#38332E] bg-[#FAF7F2] dark:bg-[#1E1B18] flex items-center justify-between pb-safe">
            <span className="text-xs text-[#9A8A7E] dark:text-[#7A6E64]">Slot currently occupied</span>
            <button
              type="button"
              onClick={handleClearSlot}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Slot</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
