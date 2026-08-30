import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Dish, MasterIngredient, UserProfile } from '../../types';
import {
  Search,
  Plus,
  Clock,
  Heart,
  Download,
  Upload,
  CheckSquare,
  Square,
  CheckCircle2,
  Star,
  BookOpen,
  Globe,
  ArrowUpDown,
  Filter,
  BookmarkPlus,
  RotateCcw,
  Check
} from 'lucide-react';
import { DishDetailModal } from './DishDetailModal';
import { DishFormModal } from './DishFormModal';
import { exportToZip, parseUploadedDataFile } from '../../services/zipExportService';
import { loadMasterSystemRecipes } from '../../services/systemRecipesService';

interface DishesViewProps {
  familyName: string;
  currentProfile: UserProfile | null;
  dishes: Dish[];
  masterIngredients: MasterIngredient[];
  initialScope?: 'family' | 'system';
  showSystemGuideHint?: boolean;
  onSaveDish: (dish: Dish) => void;
  onDeleteDish: (dishId: string) => void;
  onToggleFavoriteDish: (dishId: string) => void;
  onToggleFamilyRecipe?: (dishId: string) => void;
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

const CUISINES = ['All Cuisines', 'Asian', 'Japanese', 'Korean', 'Cantonese', 'Thai', 'Vietnamese', 'Western', 'Italian', 'Mexican', 'Mediterranean', 'Other'];

// 1-Tap Quick Filter Chips
const QUICK_FILTERS = [
  { id: 'under_20m', label: '⚡ Under 20 Mins', type: 'time', maxTime: 20 },
  { id: 'chicken', label: '🍗 Chicken', type: 'keyword', keyword: 'chicken' },
  { id: 'beef_pork', label: '🥩 Beef & Pork', type: 'keyword', keyword: 'beef pork' },
  { id: 'seafood', label: '🐟 Seafood', type: 'keyword', keyword: 'fish salmon shrimp prawn seafood' },
  { id: 'noodles', label: '🍜 Noodles & Pasta', type: 'keyword', keyword: 'noodle pasta ramen spaghetti' },
  { id: 'rice', label: '🍚 Rice Bowls', type: 'keyword', keyword: 'rice donburi fried rice' },
  { id: 'vegetarian', label: '🥬 Vegetarian & Tofu', type: 'keyword', keyword: 'tofu vegetarian vegan vegetable' },
];

const INITIAL_BATCH_SIZE = 30;

export const DishesView: React.FC<DishesViewProps> = ({
  familyName,
  currentProfile,
  dishes,
  masterIngredients,
  onSaveDish,
  onDeleteDish,
  onToggleFavoriteDish,
  onToggleFamilyRecipe,
  onAddMasterIngredient,
  onImportDishes,
  onQuickPlanDish,
  isCreatorOpen,
  setIsCreatorOpen,
  initialScope = 'family',
  showSystemGuideHint = false
}) => {
  // Library vs Family Cookbook Scope Switcher
  const [libraryScope, setLibraryScope] = useState<'family' | 'system'>(initialScope);
  const [showGuideBanner, setShowGuideBanner] = useState(showSystemGuideHint);

  useEffect(() => {
    if (initialScope) {
      setLibraryScope(initialScope);
    }
  }, [initialScope]);

  useEffect(() => {
    if (showSystemGuideHint) {
      setShowGuideBanner(true);
    }
  }, [showSystemGuideHint]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('All Cuisines');
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'quickest' | 'least_ingredients' | 'name' | 'recent'>('quickest');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  
  // Progressive Infinite Scroll
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_BATCH_SIZE);
  const loadMoreObserverRef = useRef<HTMLDivElement>(null);

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

  // Auto-heal: Ensure all 3,000+ system recipes are loaded if catalog is incomplete
  useEffect(() => {
    if (dishes.length < 100 && onImportDishes) {
      loadMasterSystemRecipes().then((sys) => {
        if (sys && sys.length > 50) {
          onImportDishes(sys);
        }
      });
    }
  }, [dishes.length, onImportDishes]);

  // Reset pagination limit on filter change
  useEffect(() => {
    setVisibleLimit(INITIAL_BATCH_SIZE);
  }, [libraryScope, searchQuery, selectedCategory, selectedCuisine, selectedQuickFilter, sortBy, showOnlyFavorites]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleLimit((prev) => prev + INITIAL_BATCH_SIZE);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (loadMoreObserverRef.current) {
      observer.observe(loadMoreObserverRef.current);
    }

    return () => observer.disconnect();
  }, [filteredDishesCount(dishes, libraryScope)]);

  function filteredDishesCount(allDishes: Dish[], scope: 'family' | 'system') {
    return scope === 'family'
      ? allDishes.filter((d) => d.isFamilyRecipe !== false).length
      : allDishes.length;
  }

  // Extract all categories
  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    dishes.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return Array.from(set);
  }, [dishes]);

  // Count items per category (based on active scope)
  const categoryCounts = useMemo(() => {
    const scopeDishes = libraryScope === 'family'
      ? dishes.filter((d) => d.isFamilyRecipe !== false)
      : dishes;

    const map: Record<string, number> = { All: scopeDishes.length };
    scopeDishes.forEach((d) => {
      const cat = d.category || 'Dinner';
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [dishes, libraryScope]);

  // Smart Multi-Token Filter & Sort
  const filteredDishes = useMemo(() => {
    // Split search query into individual lowercase tokens
    const queryTokens = searchQuery
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0);

    const activeQuick = QUICK_FILTERS.find((f) => f.id === selectedQuickFilter);

    let result = dishes.filter((dish) => {
      // Scope Filter: Family Cookbook vs System Library
      if (libraryScope === 'family' && dish.isFamilyRecipe === false) {
        return false;
      }

      // Quick Filter Check
      if (activeQuick) {
        if (activeQuick.type === 'time' && activeQuick.maxTime) {
          if ((dish.prepTimeMinutes || 999) > activeQuick.maxTime) return false;
        } else if (activeQuick.type === 'keyword' && activeQuick.keyword) {
          const keywords = activeQuick.keyword.split(' ');
          const dishString = `${dish.name} ${dish.category} ${dish.cuisine || ''} ${dish.tags?.join(' ') || ''} ${dish.ingredients.map((i) => i.name).join(' ')}`.toLowerCase();
          const matchesAnyKeyword = keywords.some((k) => dishString.includes(k));
          if (!matchesAnyKeyword) return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'All' && dish.category !== selectedCategory) {
        return false;
      }

      // Cuisine filter
      if (selectedCuisine !== 'All Cuisines') {
        const matchesCuisine =
          (dish.cuisine && dish.cuisine.toLowerCase() === selectedCuisine.toLowerCase()) ||
          dish.tags?.some((t) => t.toLowerCase() === selectedCuisine.toLowerCase());
        if (!matchesCuisine) return false;
      }

      // Favorites only
      if (showOnlyFavorites) {
        const isFav = currentMember && dish.favoritedByMembers?.includes(currentMember);
        if (!isFav) return false;
      }

      // Multi-Token Search: All tokens must match somewhere in the dish
      if (queryTokens.length > 0) {
        const dishSearchString = `${dish.name} ${dish.cuisine || ''} ${dish.category || ''} ${dish.tags?.join(' ') || ''} ${dish.ingredients.map((i) => i.name).join(' ')}`.toLowerCase();
        const allTokensMatch = queryTokens.every((token) => dishSearchString.includes(token));
        if (!allTokensMatch) return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'quickest') {
        return (a.prepTimeMinutes || 999) - (b.prepTimeMinutes || 999);
      }
      if (sortBy === 'least_ingredients') {
        return a.ingredients.length - b.ingredients.length;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'recent') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      return 0;
    });

    return result;
  }, [
    dishes,
    libraryScope,
    searchQuery,
    selectedCategory,
    selectedCuisine,
    selectedQuickFilter,
    sortBy,
    showOnlyFavorites,
    currentMember
  ]);

  // Sliced for Progressive Loading
  const displayedDishes = useMemo(() => {
    return filteredDishes.slice(0, visibleLimit);
  }, [filteredDishes, visibleLimit]);

  const familyCookbookCount = dishes.filter((d) => d.isFamilyRecipe !== false).length;
  const systemLibraryCount = dishes.length;

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

  const handleToggleFamilyCookbook = (dish: Dish) => {
    if (onToggleFamilyRecipe) {
      onToggleFamilyRecipe(dish.id);
    } else {
      const updated = {
        ...dish,
        isFamilyRecipe: dish.isFamilyRecipe === false ? true : false
      };
      onSaveDish(updated);
    }
    const isNowInFamily = dish.isFamilyRecipe === false;
    if (isNowInFamily) {
      showToast(`📖 Added "${dish.name}" to Family Cookbook!`);
    } else {
      showToast(`Removed "${dish.name}" from Family Cookbook.`);
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
      showToast('⚠️ Please choose a Dishes Zip/JSON/CSV file.');
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

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedCuisine('All Cuisines');
    setSelectedQuickFilter(null);
    setShowOnlyFavorites(false);
  };

  return (
    <div className="flex-1 pb-28 pt-3 px-4 space-y-3.5 max-w-md mx-auto w-full">
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
        accept=".zip,.json,.csv,.txt"
        className="hidden"
      />

      {/* Scope Switcher: Family Cookbook vs System Library */}
      <div className="grid grid-cols-2 bg-[#F4F1EA] p-1 rounded-2xl border border-[#EAE6DF]">
        <button
          onClick={() => setLibraryScope('family')}
          className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            libraryScope === 'family'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Family Cookbook ({familyCookbookCount})</span>
        </button>

        <button
          onClick={() => setLibraryScope('system')}
          className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            libraryScope === 'system'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>System Library ({systemLibraryCount.toLocaleString()})</span>
        </button>
      </div>

      {/* First Time Guidance Spotlight Banner */}
      {showGuideBanner && libraryScope === 'system' && (
        <div className="bg-[#2B2D42] text-white p-3.5 rounded-2xl shadow-md border border-slate-700 space-y-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-sm shrink-0 border border-amber-400/30">
                ✨
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>System Recipe Library (3,066 Curated Dishes)</span>
                </h4>
                <p className="text-[11px] text-slate-200 leading-snug">
                  👉 Tap <strong>"+ Cookbook"</strong> on any recipe card below to add it to your Family Cookbook!
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGuideBanner(false)}
              className="text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer"
            >
              Got it! ✓
            </button>
          </div>
        </div>
      )}

      {/* Search Bar & Sharing Action Buttons */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              libraryScope === 'family'
                ? 'Search Family Cookbook...'
                : 'Search 3,000+ System Recipes...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-medium pl-9 pr-8 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-[#EAE6DF] focus:outline-hidden focus:border-slate-400 shadow-2xs"
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
          title="Import Recipe Zip/JSON/CSV"
        >
          <Upload className="w-4 h-4" />
        </button>
      </div>

      {/* 1-Tap Quick Filter Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        {QUICK_FILTERS.map((pill) => {
          const isSelected = selectedQuickFilter === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => setSelectedQuickFilter(isSelected ? null : pill.id)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-[#2B2D42] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-[#EAE6DF] hover:bg-slate-50'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Sort By & Cuisine Filter Bar */}
      <div className="flex items-center justify-between gap-2 text-xs">
        {/* Sort By Selector */}
        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-[#EAE6DF] shadow-2xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs font-bold text-slate-900 bg-transparent focus:outline-hidden cursor-pointer"
          >
            <option value="quickest">⏱️ Quickest Meals</option>
            <option value="least_ingredients">🥬 Least Ingredients</option>
            <option value="name">🔤 Name (A-Z)</option>
            <option value="recent">🕒 Recently Added</option>
          </select>
        </div>

        {/* Cuisine Filter Selector */}
        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-[#EAE6DF] shadow-2xs">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={selectedCuisine}
            onChange={(e) => setSelectedCuisine(e.target.value)}
            className="text-xs font-bold text-slate-900 bg-transparent focus:outline-hidden cursor-pointer max-w-[120px] truncate"
          >
            {CUISINES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* "Our Category" Section */}
      <div className="space-y-1.5">
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
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {libraryScope === 'family' ? 'Family Homemade Recipes' : 'All System Recipes'} (
            {filteredDishes.length.toLocaleString()})
          </h3>
        </div>
        
        {!isSelectMode && (
          <button
            onClick={() => setIsCreatorOpen(true)}
            className="text-xs font-bold text-slate-800 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Recipe</span>
          </button>
        )}
      </div>

      {/* Dishes List / Cards */}
      {filteredDishes.length === 0 ? (
        <div className="bg-white rounded-2xl p-7 text-center border border-dashed border-[#EAE6DF] space-y-3 shadow-sm animate-in fade-in">
          <div className="w-12 h-12 rounded-xl bg-[#F4F1EA] text-slate-600 flex items-center justify-center mx-auto text-2xl">
            {libraryScope === 'family' ? '📖' : '🔍'}
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">
              {libraryScope === 'family' ? 'No recipes in your Family Cookbook yet' : 'No matching recipes found'}
            </h4>
            <p className="text-xs text-slate-500">
              {libraryScope === 'family'
                ? 'Switch to the System Library to browse 3,000+ curated recipes and tap "+ Add to Cookbook"!'
                : `No recipes matched your search filters. Try clearing your search or picking a popular category.`}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            {libraryScope === 'family' ? (
              <button
                onClick={() => setLibraryScope('system')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2B2D42] text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Explore System Library</span>
              </button>
            ) : (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F4F1EA] hover:bg-[#EAE6DF] text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedDishes.map((dish) => {
            const isFavoritedByMe = currentMember && dish.favoritedByMembers?.includes(currentMember);
            const isSelected = selectedDishIds.has(dish.id);
            const isInFamilyCookbook = dish.isFamilyRecipe !== false;

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
                        loading="lazy"
                        className="w-16 h-16 rounded-xl object-cover border border-[#EAE6DF] shadow-2xs"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-[#F4F1EA] border border-[#EAE6DF] flex items-center justify-center text-3xl shadow-2xs">
                        {dish.imageEmoji || '🍲'}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-[#F4F1EA] px-1.5 py-0.2 rounded-md">
                        {dish.category}
                      </span>
                      {dish.cuisine && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-[#FDFBF7] border border-[#EAE6DF] px-1.5 py-0.2 rounded-md">
                          {dish.cuisine}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 truncate leading-snug">
                      {dish.name}
                    </h4>
                    
                    {/* Star rating, prep time & ingredients count */}
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>4.8</span>
                      </div>
                      
                      {dish.prepTimeMinutes && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold text-slate-700">{dish.prepTimeMinutes}m</span>
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

                <div className="flex flex-col items-end gap-1.5 pl-2 shrink-0">
                  {/* Explicit 1-Click Cookbook Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFamilyCookbook(dish);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition active:scale-95 cursor-pointer border ${
                      isInFamilyCookbook
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                        : 'bg-[#EDF2F4] text-slate-700 border-[#E2E8F0] hover:bg-[#E2E8F0]'
                    }`}
                    title={isInFamilyCookbook ? 'In Family Cookbook (Tap to remove)' : 'Add to Family Cookbook'}
                  >
                    {isInFamilyCookbook ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />
                        <span>In Cookbook</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3 h-3 text-slate-600" />
                        <span>+ Cookbook</span>
                      </>
                    )}
                  </button>

                  {/* Actions Row (Favorite Heart & Add to Planner) */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavoriteDish(dish.id);
                      }}
                      className="p-1 text-slate-300 hover:text-rose-500 transition active:scale-125 cursor-pointer"
                      title="Toggle Favorite"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isFavoritedByMe ? 'fill-rose-500 text-rose-500' : 'text-slate-300 hover:text-rose-400'
                        }`}
                      />
                    </button>

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
                      className="px-2 py-0.5 bg-[#2B2D42] hover:bg-[#1E1F2E] text-white text-[10px] font-bold rounded-md shadow-2xs active:scale-95 transition cursor-pointer"
                    >
                      + Plan
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Progressive Loading Sentinel / Show More Trigger */}
          {displayedDishes.length < filteredDishes.length && (
            <div
              ref={loadMoreObserverRef}
              className="py-4 text-center"
            >
              <button
                onClick={() => setVisibleLimit((prev) => prev + INITIAL_BATCH_SIZE)}
                className="px-5 py-2 rounded-xl bg-white border border-[#EAE6DF] text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              >
                Showing {displayedDishes.length} of {filteredDishes.length.toLocaleString()} recipes • Load More
              </button>
            </div>
          )}
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
        onToggleFamilyCookbook={(dish) => handleToggleFamilyCookbook(dish)}
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
