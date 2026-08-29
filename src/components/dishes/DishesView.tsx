import React, { useState, useMemo, useRef } from 'react';
import type { Dish, MasterIngredient, UserProfile } from '../../types';
import { Search, Plus, Clock, Heart, Download, Upload, CheckSquare, Square, CheckCircle2, Star } from 'lucide-react';
import { DishDetailModal } from './DishDetailModal';
import { DishFormModal } from './DishFormModal';
import { exportToZip, parseUploadedDataFile } from '../../services/zipExportService';

interface DishesViewProps {
  familyName: string;
  currentProfile: UserProfile | null;
  dishes: Dish[];
  masterIngredients: MasterIngredient[];
  onSaveDish: (dish: Dish) => void;
  onDeleteDish: (dishId: string) => void;
  onToggleFavoriteDish: (dishId: string) => void;
  onAddMasterIngredient?: (ing: MasterIngredient) => void;
  onImportDishes?: (dishes: Dish[]) => void;
  onQuickPlanDish?: (dish: Dish) => void;
  isCreatorOpen: boolean;
  setIsCreatorOpen: (open: boolean) => void;
}

const CATEGORY_IMAGES: Record<string, string> = {
  All: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=200&q=80',
  Dinner: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&q=80',
  Lunch: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=200&q=80',
  Breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=200&q=80',
  Snack: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=200&q=80',
  Dessert: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=200&q=80'
};

export const DishesView: React.FC<DishesViewProps> = ({
  familyName,
  currentProfile,
  dishes,
  masterIngredients,
  onSaveDish,
  onDeleteDish,
  onToggleFavoriteDish,
  onAddMasterIngredient,
  onImportDishes,
  onQuickPlanDish,
  isCreatorOpen,
  setIsCreatorOpen
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [viewingDish, setViewingDish] = useState<Dish | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  
  // Selection Mode for Batch Export
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedDishIds, setSelectedDishIds] = useState<Set<string>>(new Set());

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const currentMember = currentProfile?.memberName || '';

  // Extract all categories
  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    dishes.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return Array.from(set);
  }, [dishes]);

  // Count items per category
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { All: dishes.length };
    dishes.forEach((d) => {
      const cat = d.category || 'Dinner';
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [dishes]);

  // Filtered dishes
  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      const matchesSearch =
        dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dish.ingredients.some((ing) => ing.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        dish.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === 'All' || dish.category === selectedCategory;
      const matchesFav = !showOnlyFavorites || (currentMember && dish.favoritedByMembers?.includes(currentMember));

      return matchesSearch && matchesCat && matchesFav;
    });
  }, [dishes, searchQuery, selectedCategory, showOnlyFavorites, currentMember]);

  const toggleSelectDish = (dishId: string) => {
    const next = new Set(selectedDishIds);
    if (next.has(dishId)) {
      next.delete(dishId);
    } else {
      next.add(dishId);
    }
    setSelectedDishIds(next);
  };

  const handleSelectAll = () => {
    if (selectedDishIds.size === filteredDishes.length) {
      setSelectedDishIds(new Set());
    } else {
      setSelectedDishIds(new Set(filteredDishes.map((d) => d.id)));
    }
  };

  const handleExportSelectedOrAll = async () => {
    const targetDishes = isSelectMode && selectedDishIds.size > 0
      ? dishes.filter((d) => selectedDishIds.has(d.id))
      : dishes;

    if (targetDishes.length === 0) {
      showToast('⚠️ No recipes selected to export');
      return;
    }

    try {
      const label = targetDishes.length === 1 ? targetDishes[0].name : `${targetDishes.length}_Recipes`;
      const filename = await exportToZip(
        familyName,
        'Dishes',
        { dishes: targetDishes },
        label
      );
      showToast(`📦 Exported ${filename}`);
      setIsSelectMode(false);
      setSelectedDishIds(new Set());
    } catch (err: any) {
      showToast(`❌ Export failed: ${err.message}`);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await parseUploadedDataFile(file);
    if (!res.success || !res.data) {
      showToast(`❌ ${res.message}`);
      return;
    }

    if (res.type !== 'dishes' && res.type !== 'full') {
      showToast('⚠️ Please choose a Dishes Zip/JSON file.');
      return;
    }

    const incomingDishes: Dish[] = res.type === 'dishes' ? res.data : res.data.dishes || [];
    if (incomingDishes.length === 0) {
      showToast('⚠️ No recipes found in file.');
      return;
    }

    if (onImportDishes) {
      onImportDishes(incomingDishes);
    } else {
      incomingDishes.forEach((d) => onSaveDish(d));
    }

    showToast(`✅ Imported ${incomingDishes.length} recipe(s) successfully!`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex-1 pb-28 pt-3 px-4 space-y-4 max-w-md mx-auto w-full">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".zip,.json"
        className="hidden"
      />

      {/* Search Bar & Sharing Action Buttons */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search recipes, ingredients, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-medium pl-9 pr-4 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-[#EAE6DF] focus:outline-hidden focus:border-slate-400 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        <button
          onClick={() => {
            if (isSelectMode) {
              setIsSelectMode(false);
              setSelectedDishIds(new Set());
            } else {
              setIsSelectMode(true);
            }
          }}
          className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
            isSelectMode
              ? 'bg-[#2B2D42] border-[#2B2D42] text-white shadow-xs'
              : 'bg-white border-[#EAE6DF] text-slate-600 hover:bg-slate-50'
          }`}
          title="Toggle Multi-Select for Export"
        >
          <CheckSquare className="w-4 h-4" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl border border-[#EAE6DF] bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
          title="Import Recipe Zip/JSON"
        >
          <Upload className="w-4 h-4" />
        </button>
      </div>

      {/* "Our Category" Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Our Category
          </h3>
          <button
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer ${
              showOnlyFavorites
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-[#EAE6DF] hover:text-rose-500'
            }`}
          >
            <Heart className={`w-3 h-3 ${showOnlyFavorites ? 'fill-white' : 'text-rose-500'}`} />
            <span>My Favorites</span>
          </button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-1">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat && !showOnlyFavorites;
            const imgUrl = CATEGORY_IMAGES[cat] || CATEGORY_IMAGES.Dinner;
            const count = categoryCounts[cat] || 0;

            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setShowOnlyFavorites(false);
                }}
                className={`flex flex-col items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                  isSelected ? 'scale-105' : 'opacity-75 hover:opacity-100'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-full overflow-hidden p-0.5 transition-all ${
                    isSelected
                      ? 'border-2 border-[#2B2D42] shadow-sm ring-2 ring-slate-200'
                      : 'border border-[#EAE6DF]'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={cat}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="text-center leading-tight">
                  <span className={`text-[11px] font-bold block ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                    {cat}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">
                    {count} Menu
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Select Mode Action Bar */}
      {isSelectMode && (
        <div className="bg-white border border-[#EAE6DF] p-3 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="text-xs font-bold text-slate-900 underline flex items-center gap-1 cursor-pointer"
            >
              {selectedDishIds.size === filteredDishes.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs text-slate-500">
              ({selectedDishIds.size} selected)
            </span>
          </div>

          <button
            onClick={handleExportSelectedOrAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2B2D42] hover:bg-[#1E1F2E] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Zip</span>
          </button>
        </div>
      )}

      {/* Dishes Header & Count */}
      <div className="flex items-center justify-between pt-1">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Best Home Recipes ({filteredDishes.length})
        </h3>
        
        {!isSelectMode && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportSelectedOrAll}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition"
              title="Export All Recipes as Zip"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export All</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setIsCreatorOpen(true)}
              className="text-xs font-bold text-slate-800 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        )}
      </div>

      {/* Dishes List / Cards in Pure White #FFFFFF with rounded-2xl and shadow-sm */}
      {filteredDishes.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-[#EAE6DF] space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#F4F1EA] text-slate-600 flex items-center justify-center mx-auto text-2xl">
            🍳
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">No recipes found</h4>
            <p className="text-xs text-slate-500">
              {searchQuery || showOnlyFavorites
                ? 'Try adjusting your search or category filters.'
                : 'Create your first family recipe!'}
            </p>
          </div>
          <button
            onClick={() => setIsCreatorOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2B2D42] text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Recipe</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDishes.map((dish) => {
            const isFavoritedByMe = currentMember && dish.favoritedByMembers?.includes(currentMember);
            const isSelected = selectedDishIds.has(dish.id);

            return (
              <div
                key={dish.id}
                onClick={() => {
                  if (isSelectMode) {
                    toggleSelectDish(dish.id);
                  } else {
                    setViewingDish(dish);
                  }
                }}
                className={`bg-white rounded-2xl p-3.5 border transition-all cursor-pointer active:scale-[0.99] flex items-center justify-between group shadow-sm ${
                  isSelected
                    ? 'border-slate-800 ring-2 ring-slate-200'
                    : 'border-[#EAE6DF] hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {isSelectMode ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectDish(dish.id);
                      }}
                      className="p-1 text-slate-700"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 fill-slate-800 text-white" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300" />
                      )}
                    </button>
                  ) : null}

                  {/* Thumbnail Photo or Emoji */}
                  <div className="relative shrink-0">
                    {dish.imageUrl ? (
                      <img
                        src={dish.imageUrl}
                        alt={dish.name}
                        className="w-16 h-16 rounded-xl object-cover border border-[#EAE6DF] shadow-2xs"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-[#F4F1EA] border border-[#EAE6DF] flex items-center justify-center text-3xl shadow-2xs">
                        {dish.imageEmoji || '🍲'}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-[#F4F1EA] px-1.5 py-0.2 rounded-md">
                        {dish.category}
                      </span>
                      {dish.tags && dish.tags[0] && (
                        <span className="text-[10px] font-medium text-slate-400 truncate max-w-[90px]">
                          • {dish.tags[0]}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 truncate leading-snug">
                      {dish.name}
                    </h4>
                    
                    {/* Star rating & time badges */}
                    <div className="flex items-center gap-2.5 mt-1.5 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>4.8</span>
                      </div>
                      
                      {dish.prepTimeMinutes && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{dish.prepTimeMinutes}m</span>
                        </div>
                      )}

                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500">
                        {dish.ingredients.length} ingr.
                      </span>
                    </div>

                    {/* Member favorites list */}
                    {dish.favoritedByMembers && dish.favoritedByMembers.length > 0 && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-600 font-medium">
                        <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                        <span className="truncate max-w-[170px]">
                          {dish.favoritedByMembers.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pl-2 shrink-0">
                  {/* Quick Favorite Heart */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavoriteDish(dish.id);
                    }}
                    className="p-1.5 text-slate-300 hover:text-rose-500 transition active:scale-125 cursor-pointer"
                    title="Toggle Favorite"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isFavoritedByMe ? 'fill-rose-500 text-rose-500' : 'text-slate-300 hover:text-rose-400'
                      }`}
                    />
                  </button>

                  {/* Clean "+ ADD" button in neutral slate gray */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onQuickPlanDish) {
                        onQuickPlanDish(dish);
                      } else {
                        setViewingDish(dish);
                      }
                    }}
                    className="px-3 py-1.5 bg-[#EDF2F4] hover:bg-[#E2E8F0] text-slate-800 text-[11px] font-bold rounded-xl border border-[#E2E8F0] active:scale-95 transition-all cursor-pointer"
                  >
                    ADD
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dish Detail Drilldown Modal */}
      <DishDetailModal
        dish={viewingDish}
        isOpen={Boolean(viewingDish)}
        currentProfile={currentProfile}
        onClose={() => setViewingDish(null)}
        onEdit={(dish) => {
          setViewingDish(null);
          setEditingDish(dish);
        }}
        onDelete={(dishId) => {
          onDeleteDish(dishId);
          setViewingDish(null);
        }}
        onToggleFavorite={onToggleFavoriteDish}
        onQuickPlan={onQuickPlanDish}
        onShowToast={showToast}
      />

      {/* Dish Form Modal (New / Edit) */}
      <DishFormModal
        isOpen={isCreatorOpen || Boolean(editingDish)}
        initialDish={editingDish}
        masterIngredients={masterIngredients}
        onAddMasterIngredient={onAddMasterIngredient}
        onClose={() => {
          setIsCreatorOpen(false);
          setEditingDish(null);
        }}
        onSave={(dish) => {
          onSaveDish(dish);
          setIsCreatorOpen(false);
          setEditingDish(null);
          showToast(`✅ Saved "${dish.name}"`);
        }}
      />
    </div>
  );
};
