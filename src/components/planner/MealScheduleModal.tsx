import React, { useState, useMemo } from 'react';
import type { Dish, MealScheduleEntry } from '../../types';
import { X, Search, Plus, Trash2, Utensils, Check, BookOpen, ArrowRight, Sparkles, Heart } from 'lucide-react';

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
  onNavigateToLibrary?: () => void;
  onToggleFamilyRecipe?: (dishId: string) => void;
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
  onCreateNewDish,
  onNavigateToLibrary,
  onToggleFamilyRecipe
}) => {
  if (!isOpen) return null;

  const initialSelectedIds = useMemo(() => {
    if (currentEntry?.dishIds && currentEntry.dishIds.length > 0) return currentEntry.dishIds;
    if (currentEntry?.dishId) return [currentEntry.dishId];
    return [];
  }, [currentEntry]);

  const [selectedDishIds, setSelectedDishIds] = useState<string[]>(initialSelectedIds);
  const [activeTab, setActiveTab] = useState<'family' | 'system' | 'custom'>('family');
  const [searchQuery, setSearchQuery] = useState('');
  const [customText, setCustomText] = useState(currentEntry?.customText || '');
  const servingsMultiplier = currentEntry?.servingsMultiplier || 1;
  const [visibleLimit, setVisibleLimit] = useState(30);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  // Split dishes into Family Cookbook vs System Library
  const familyDishes = useMemo(() => {
    return dishes.filter((d) => d.isFamilyRecipe !== false);
  }, [dishes]);

  const systemDishes = dishes;

  // Filter current list based on search and active tab
  const currentList = activeTab === 'family' ? familyDishes : systemDishes;

  const filteredDishes = useMemo(() => {
    let result = currentList;

    if (showOnlyFavorites) {
      result = result.filter((d) => d.favoritedByMembers && d.favoritedByMembers.length > 0);
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return result;
    const tokens = q.split(/\s+/).filter(Boolean);

    return result.filter((d) => {
      const name = (d.name || '').toLowerCase();
      const category = (d.category || '').toLowerCase();
      const cuisine = (d.cuisine || '').toLowerCase();
      const tags = (d.tags || []).join(' ').toLowerCase();
      const ingredients = (d.ingredients || []).map((i) => i.name).join(' ').toLowerCase();

      const fullText = `${name} ${category} ${cuisine} ${tags} ${ingredients}`;
      return tokens.every((token) => fullText.includes(token));
    });
  }, [currentList, searchQuery, showOnlyFavorites]);

  const handleToggleDish = (dish: Dish) => {
    // If selecting a system dish that is not yet in family cookbook, add it to family cookbook
    if (dish.isFamilyRecipe === false && onToggleFamilyRecipe) {
      onToggleFamilyRecipe(dish.id);
    }

    setSelectedDishIds((prev) => {
      if (prev.includes(dish.id)) {
        return prev.filter((id) => id !== dish.id);
      } else {
        return [...prev, dish.id];
      }
    });
  };

  const handleSaveAll = () => {
    if (selectedDishIds.length === 0 && !customText.trim()) {
      onSaveEntry(date, scheduleId, null);
    } else {
      onSaveEntry(date, scheduleId, {
        dishIds: selectedDishIds,
        dishId: selectedDishIds[0] || null,
        customText: customText.trim(),
        servingsMultiplier
      });
    }
    onClose();
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim() && selectedDishIds.length === 0) return;

    onSaveEntry(date, scheduleId, {
      dishIds: selectedDishIds,
      dishId: selectedDishIds[0] || null,
      customText: customText.trim(),
      servingsMultiplier: 1
    });
    onClose();
  };

  const handleClearSchedule = () => {
    onSaveEntry(date, scheduleId, null);
    onClose();
  };

  const handleGoToFullLibrary = () => {
    onClose();
    if (onNavigateToLibrary) {
      onNavigateToLibrary();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg max-h-[88vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden border border-[#EAE6DF] animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F4F1EA] bg-[#FDFBF7]">
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

        {/* 3-Way Tab Switcher: Family Cookbook vs Recipe Library vs Quick Note */}
        <div className="p-2 border-b border-[#F4F1EA] bg-white grid grid-cols-3 gap-1">
          <button
            onClick={() => {
              setActiveTab('family');
              setVisibleLimit(30);
            }}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'family'
                ? 'bg-[#2B2D42] text-white shadow-xs'
                : 'bg-[#F4F1EA] text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="truncate">Cookbook ({familyDishes.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('system');
              setVisibleLimit(30);
            }}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'system'
                ? 'bg-[#2B2D42] text-white shadow-xs'
                : 'bg-[#F4F1EA] text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="truncate">Recipe Library</span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-[#2B2D42] text-white shadow-xs'
                : 'bg-[#F4F1EA] text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>✏️ Quick Note</span>
          </button>
        </div>

        {/* Body Content */}
        {activeTab === 'family' || activeTab === 'system' ? (
          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3 bg-[#FDFBF7]">
            {/* Selected Recipes Tray Banner if multiple recipes chosen */}
            {selectedDishIds.length > 0 && (
              <div className="bg-white p-2.5 rounded-2xl border border-[#EAE6DF] space-y-1.5 shadow-2xs animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    <span>✨ Selected for this Meal ({selectedDishIds.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedDishIds([])}
                    className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto">
                  {selectedDishIds.map((dId) => {
                    const d = dishes.find((item) => item.id === dId);
                    if (!d) return null;
                    return (
                      <span
                        key={d.id}
                        className="inline-flex items-center gap-1 bg-[#F4F1EA] text-slate-900 text-xs font-bold px-2.5 py-1 rounded-xl border border-[#EAE6DF] shadow-2xs"
                      >
                        <span>{d.imageEmoji || '🍲'} {d.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedDishIds((prev) => prev.filter((id) => id !== d.id))}
                          className="w-4 h-4 rounded-full hover:bg-slate-300 flex items-center justify-center text-slate-500 cursor-pointer ml-0.5"
                          title="Remove recipe"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search and Filter Row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'family'
                      ? 'Search your family recipes...'
                      : 'Search recipe library...'
                  }
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleLimit(30);
                  }}
                  className="w-full text-xs pl-8 pr-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-[#EAE6DF] focus:outline-hidden focus:border-slate-400 shadow-2xs"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-2 rounded-xl transition cursor-pointer border shadow-2xs ${
                  showOnlyFavorites
                    ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                    : 'bg-white text-slate-600 border-[#EAE6DF] hover:text-rose-500'
                }`}
                title="Filter favorites"
              >
                <Heart className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-white' : 'text-rose-500'}`} />
                <span className="hidden sm:inline">Favorites</span>
              </button>
              
              {activeTab === 'family' && (
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
              )}
            </div>

            {/* Navigation Option Banner to Recipe Library */}
            <div className="bg-white rounded-2xl p-2.5 border border-[#EAE6DF] flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {activeTab === 'family' ? 'Discover more recipes' : 'Explore Recipe Library'}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate">
                    Browse 3,000+ curated recipes
                  </p>
                </div>
              </div>

              {activeTab === 'family' ? (
                <button
                  onClick={() => {
                    setActiveTab('system');
                    setVisibleLimit(30);
                  }}
                  className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-[#F4F1EA] hover:bg-[#EAE6DF] px-3 py-1.5 rounded-xl transition active:scale-95 cursor-pointer"
                >
                  <span>Explore</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={handleGoToFullLibrary}
                  className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-white bg-[#2B2D42] hover:bg-[#1E1F2E] px-3 py-1.5 rounded-xl transition active:scale-95 cursor-pointer shadow-xs"
                >
                  <span>Library</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Dishes list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
              {filteredDishes.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-3 bg-white rounded-2xl border border-dashed border-[#EAE6DF] p-6">
                  <Utensils className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700">
                      {activeTab === 'family'
                        ? 'No recipes in Family Cookbook yet.'
                        : 'No matching recipes found.'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {activeTab === 'family'
                        ? 'Add dishes from the Recipe Library to start planning!'
                        : 'Try searching with other keywords.'}
                    </p>
                  </div>
                  {activeTab === 'family' && (
                    <button
                      onClick={() => {
                        setActiveTab('system');
                        setVisibleLimit(30);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#2B2D42] hover:bg-[#1E1F2E] px-4 py-2 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Browse Recipe Library</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {filteredDishes.slice(0, visibleLimit).map((dish) => {
                    const isSelected = selectedDishIds.includes(dish.id);
                    const isInCookbook = dish.isFamilyRecipe !== false;

                    return (
                      <div
                        key={dish.id}
                        onClick={() => handleToggleDish(dish)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between active:scale-[0.98] ${
                          isSelected
                            ? 'border-[#00F5A0] bg-white ring-2 ring-[#00F5A0]/25 shadow-sm'
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
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-[#F4F1EA] px-1.5 py-0.2 rounded-md">
                                {dish.category}
                              </span>
                              <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
                                ⏱ {dish.prepTimeMinutes || 20}m
                              </span>
                              <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
                                👤 {dish.servings || 4} serv
                              </span>
                              <span className="text-[10px] text-slate-400">
                                • {dish.ingredients.length} ingr.
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 truncate">{dish.name}</h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 pl-2">
                          {/* Cookbook status badge */}
                          {isInCookbook ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md hidden sm:inline-block">
                              Cookbook
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md hidden sm:inline-block">
                              Library
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleDish(dish);
                            }}
                            className={`flex items-center justify-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl transition active:scale-95 cursor-pointer shadow-2xs ${
                              isSelected
                                ? 'bg-[#00F5A0] text-black border border-[#00D68F]'
                                : 'bg-[#F4F1EA] hover:bg-[#EAE6DF] text-slate-800 border border-[#EAE6DF]'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Added</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Load more button if large search */}
                  {filteredDishes.length > visibleLimit && (
                    <div className="pt-2 text-center">
                      <button
                        onClick={() => setVisibleLimit((prev) => prev + 30)}
                        className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white border border-[#EAE6DF] rounded-xl hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                      >
                        Showing {visibleLimit} of {filteredDishes.length} • Load More
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          /* Quick Custom Note */
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
              disabled={!customText.trim() && selectedDishIds.length === 0}
              className="w-full py-3 rounded-xl bg-[#2B2D42] hover:bg-[#1E1F2E] disabled:opacity-50 text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
            >
              Save Meal Note
            </button>
          </form>
        )}

        {/* Footer with Save Plan CTA and Clear Schedule */}
        <div className="p-3 border-t border-[#F4F1EA] bg-white flex items-center justify-between gap-2 pb-safe">
          {(currentEntry?.dishId || (currentEntry?.dishIds && currentEntry.dishIds.length > 0) || currentEntry?.customText) ? (
            <button
              type="button"
              onClick={handleClearSchedule}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-2 rounded-xl hover:bg-rose-50 transition cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleSaveAll}
            className="flex-1 py-2.5 bg-[#2B2D42] hover:bg-[#1E1F2E] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              {selectedDishIds.length === 0
                ? 'Save Entry'
                : `Save Plan (${selectedDishIds.length} Recipe${selectedDishIds.length === 1 ? '' : 's'})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
