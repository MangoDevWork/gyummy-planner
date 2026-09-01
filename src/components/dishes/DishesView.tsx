import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Dish, MasterIngredient, UserProfile } from '../../types';
import {
  Search,
  Plus,
  Clock,
  Heart,
  CheckCircle2,
  Star,
  BookOpen,
  ArrowUpDown,
  Filter,
  BookmarkPlus,
  RotateCcw,
  Check,
  Sparkles
} from 'lucide-react';
import { DishDetailModal } from './DishDetailModal';
import { DishFormModal } from './DishFormModal';
import { loadMasterSystemRecipes } from '../../services/systemRecipesService';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedDish, searchMatchesLocalizedDish } from '../../services/dataLocalizationService';
import { checkDishAllergenRisk } from '../../services/personalisationService';
import type { MemberPreferences, FamilyPersonalisation } from '../../types';

interface DishesViewProps {
  familyName: string;
  currentProfile: UserProfile | null;
  familyMembers?: string[];
  memberProfiles?: Record<string, MemberPreferences>;
  familyPersonalisation?: FamilyPersonalisation;
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

const CUISINES = [
  'All Cuisines',
  'Chinese',
  'Cantonese',
  'Japanese',
  'Korean',
  'Asian',
  'Western',
  'Italian',
  'American',
  'French',
  'Thai',
  'Vietnamese',
  'Mexican',
  'Mediterranean',
  'Indian',
  'Other'
];

function matchesCuisineFilter(dish: Dish, selectedCuisine: string): boolean {
  if (!selectedCuisine || selectedCuisine === 'All Cuisines') return true;
  const target = selectedCuisine.toLowerCase().trim();

  const cuisineAliases: Record<string, string[]> = {
    'chinese': ['chinese', 'cantonese', 'sichuan', 'taiwanese', '中餐', '粤菜', '川菜', '鲁菜', '中国', '中华料理', '港式', '广府', '华裔', 'asian/chinese'],
    'cantonese': ['cantonese', 'chinese', '粤菜', '中餐', '广府', '港式', '中华料理', '中国'],
    'japanese': ['japanese', 'japan', '日料', '日式', '和风', '日本', 'teriyaki', 'ramen', 'udon', 'sushi', 'miso', 'yakitori'],
    'korean': ['korean', 'korea', '韩料', '韩式', '韩国', 'bulgogi', 'kimchi', 'bibimbap'],
    'asian': ['asian', 'chinese', 'cantonese', 'japanese', 'korean', 'thai', 'vietnamese', 'malaysian', 'indonesian', 'filipino', 'singapore', '亚洲', '中餐', '日料', '韩料', '泰式', '越式', '东南亚'],
    'western': ['western', 'american', 'european', 'italian', 'french', 'british', 'australian', 'spanish', 'german', '西餐', '欧美', '美式', '意式', '法餐', 'pasta', 'burger', 'steak'],
    'italian': ['italian', 'italy', 'italia', '意式', '意大利', '意餐', 'pasta', 'pizza', 'risotto', 'lasagna', 'bolognese'],
    'american': ['american', 'usa', 'us', 'burger', 'bbq', '美式', '美国', 'cajun', 'tex-mex', 'fried chicken'],
    'french': ['french', 'france', '法餐', '法式', '法国', 'butter', 'wine', 'quiche'],
    'thai': ['thai', 'thailand', '泰式', '泰国', '泰餐', 'curry', 'pad thai', 'tom yum'],
    'vietnamese': ['vietnamese', 'vietnam', '越式', '越南', 'pho', 'lemongrass', 'banh mi'],
    'mexican': ['mexican', 'mexico', 'tex-mex', '墨西哥', 'taco', 'burrito', 'quesadilla', 'salsa', 'enchilada'],
    'mediterranean': ['mediterranean', 'greek', 'greece', '地中海', '希腊', 'tzatziki'],
    'indian': ['indian', 'india', 'curry', '印度', '咖喱', 'tikka', 'masala', 'naan'],
    'other': ['other', '其他']
  };

  const aliases = cuisineAliases[target] || [target];

  const check = (val?: any): boolean => {
    if (!val || typeof val !== 'string') return false;
    const lower = val.toLowerCase().trim();
    return aliases.some((a) => lower.includes(a) || a.includes(lower));
  };

  if (check(dish.cuisine)) return true;
  if (Array.isArray(dish.tags)) {
    if (dish.tags.some((t) => check(t))) return true;
  }
  if (check(dish.name)) return true;
  return false;
}

// 1-Tap Quick Filter Chips
const QUICK_FILTERS = [
  { id: 'under_20m', label: '⚡ Under 20 Mins', labelZh: '⚡ 20分钟快手菜', type: 'time', maxTime: 20 },
  { id: 'chicken', label: '🍗 Chicken', labelZh: '🍗 鸡肉料理', type: 'keyword', keyword: 'chicken' },
  { id: 'beef_pork', label: '🥩 Beef & Pork', labelZh: '🥩 牛肉/猪肉', type: 'keyword', keyword: 'beef pork' },
  { id: 'seafood', label: '🐟 Seafood', labelZh: '🐟 海鲜水产', type: 'keyword', keyword: 'fish salmon shrimp prawn seafood' },
  { id: 'veggie', label: '🥦 Veggie & Tofu', labelZh: '🥦 素食与豆腐', type: 'keyword', keyword: 'tofu vegetable broccoli mushroom vegetarian' },
  { id: 'noodles_rice', label: '🍜 Noodles & Rice', labelZh: '🍜 饭面主食', type: 'keyword', keyword: 'rice noodle pasta udon ramen fried rice' }
];

const INITIAL_BATCH_SIZE = 30;

export const DishesView: React.FC<DishesViewProps> = ({
  currentProfile,
  familyMembers = [],
  memberProfiles,
  familyPersonalisation,
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
  initialScope = 'family'
}) => {
  const { language, t, formatCategory, formatCuisine } = useLanguage();
  // Library vs Family Cookbook Scope Switcher
  const [libraryScope, setLibraryScope] = useState<'family' | 'system'>(initialScope);

  useEffect(() => {
    setLibraryScope(initialScope || 'family');
  }, [initialScope]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('All Cuisines');
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'quickest' | 'least_ingredients' | 'name' | 'recent' | 'most_cooked'>('quickest');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [isFamilySafeOnly, setIsFamilySafeOnly] = useState<boolean>(familyPersonalisation?.strictAllergyFilter !== false);
  const [isMyTasteOnly, setIsMyTasteOnly] = useState<boolean>(false);
  
  // Progressive Infinite Scroll
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_BATCH_SIZE);
  const loadMoreObserverRef = useRef<HTMLDivElement>(null);

  const [viewingDish, setViewingDish] = useState<Dish | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

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
          const safeTags = Array.isArray(dish.tags) ? dish.tags.filter((t) => typeof t === 'string').join(' ') : '';
          const dishString = `${dish.name || ''} ${dish.category || ''} ${dish.cuisine || ''} ${safeTags} ${dish.ingredients.map((i) => i.name || '').join(' ')}`.toLowerCase();
          const matchesAnyKeyword = keywords.some((k) => dishString.includes(k));
          if (!matchesAnyKeyword) return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'All' && dish.category !== selectedCategory) {
        return false;
      }

      // Cuisine filter (Safe, Null-Protected & Cross-Lingual)
      if (selectedCuisine !== 'All Cuisines') {
        if (!matchesCuisineFilter(dish, selectedCuisine)) return false;
      }

      // Favorites only
      if (showOnlyFavorites) {
        const isFav = currentMember && dish.favoritedByMembers?.includes(currentMember);
        if (!isFav) return false;
      }

      // Family Safe Mode: Exclude dishes that trigger any family member's declared allergies
      if (isFamilySafeOnly) {
        const risk = checkDishAllergenRisk(dish, memberProfiles, familyMembers);
        if (risk.hasRisk) return false;
      }

      // My Taste Filter: Match current user's declared favorite cuisines
      if (isMyTasteOnly && currentMember && memberProfiles?.[currentMember]) {
        const myPrefs = memberProfiles[currentMember];
        const favCuisines = myPrefs.favoriteCuisines || [];
        if (favCuisines.length > 0) {
          const match = favCuisines.some((c) => matchesCuisineFilter(dish, c));
          if (!match) return false;
        }
      }

      // Multi-Token Search: All tokens must match somewhere in the dish (cross-lingually)
      if (queryTokens.length > 0) {
        const matches = searchMatchesLocalizedDish(dish, searchQuery, language);
        if (!matches) return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'most_cooked') {
        return (b.timesPlanned || 0) - (a.timesPlanned || 0);
      }
      if (sortBy === 'quickest') {
        return (a.prepTimeMinutes || 999) - (b.prepTimeMinutes || 999);
      }
      if (sortBy === 'least_ingredients') {
        const lenA = Array.isArray(a.ingredients) ? a.ingredients.length : 0;
        const lenB = Array.isArray(b.ingredients) ? b.ingredients.length : 0;
        return lenA - lenB;
      }
      if (sortBy === 'name') {
        const nameA = getLocalizedDish(a, language).name || '';
        const nameB = getLocalizedDish(b, language).name || '';
        return nameA.localeCompare(nameB);
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
    isFamilySafeOnly,
    isMyTasteOnly,
    memberProfiles,
    familyMembers,
    currentMember
  ]);

  // Sliced for Progressive Loading
  const displayedDishes = useMemo(() => {
    return filteredDishes.slice(0, visibleLimit);
  }, [filteredDishes, visibleLimit]);

  const familyCookbookCount = dishes.filter((d) => d.isFamilyRecipe !== false).length;

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

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedCuisine('All Cuisines');
    setSelectedQuickFilter(null);
    setShowOnlyFavorites(false);
  };

  return (
    <div className="bg-[#F7F4EF] dark:bg-[#1A1714] flex-1 pb-28 pt-3 px-4 space-y-3.5 max-w-md mx-auto w-full">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Scope Switcher: Prominent Family Cookbook vs Inviting Recipe Library */}
      <div className="bg-white dark:bg-[#252220] p-1.5 rounded-2xl border border-[#EDE8DF] dark:border-[#38332E] shadow-sm grid grid-cols-2 gap-2">
        {/* Family Cookbook Button - Warm, Established, Prominent */}
        <button
          type="button"
          onClick={() => setLibraryScope('family')}
          className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
            libraryScope === 'family'
              ? 'bg-[#FFD13B] text-[#2D2640] shadow-sm font-extrabold scale-[1.01]'
              : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] font-bold'
          }`}
        >
          <BookOpen className={`w-4 h-4 ${libraryScope === 'family' ? 'text-[#2D2640]' : 'text-[#7A6E64] dark:text-[#9A9088]'}`} />
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-xs">{t('dishes.familyTab')}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                libraryScope === 'family'
                  ? 'bg-[#2D2640] text-[#FFD13B] shadow-sm'
                  : 'bg-[#EDE8DF] dark:bg-[#38332E] text-[#7A6E64] dark:text-[#9A9088]'
              }`}
            >
              {familyCookbookCount}
            </span>
          </div>
        </button>

        {/* Recipe Library Button - Vibrant, Discoverable, Inviting */}
        <button
          type="button"
          onClick={() => setLibraryScope('system')}
          className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden group ${
            libraryScope === 'system'
              ? 'bg-gradient-to-r from-[#FFD13B] to-[#FFB347] text-[#2D2640] shadow-sm font-extrabold scale-[1.01]'
              : 'bg-[#FFF3D6] dark:bg-[#2A1E00] text-[#7A5C00] dark:text-[#FFD13B] border border-[#FFD13B]/40 hover:border-[#FFD13B]/60 font-bold shadow-sm'
          }`}
        >
          <Sparkles className={`w-4 h-4 animate-pulse shrink-0 ${libraryScope === 'system' ? 'text-[#2D2640]' : 'text-[#7A5C00] dark:text-[#FFD13B]'}`} />
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-xs">{t('dishes.libraryTab')}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                libraryScope === 'system'
                  ? 'bg-white/40 text-[#2D2640] border border-[#2D2640]/10'
                  : 'bg-[#FFD13B]/20 text-[#7A5C00] dark:text-[#FFD13B]'
              }`}
            >
              3,000+
            </span>
          </div>
        </button>
      </div>

      {/* Quick Context Banner when on Recipe Library */}
      {libraryScope === 'system' && (
        <div className="bg-[#2D2640] dark:bg-[#252220] text-[#F0EDE8] p-3.5 rounded-2xl shadow-md border border-[#2D2640]/10 dark:border-[#38332E] space-y-2 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FFD13B] text-[#2D2640] flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                ✨
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{language === 'zh-CN' ? '3,000+ 精选全球食谱库' : '3,000+ Curated Global Recipes'}</span>
                </h4>
                <p className="text-[10.5px] text-slate-200 leading-tight">
                  {language === 'zh-CN'
                    ? '发现美味后，点击菜谱上的 "+ 家庭常备" 即可加入排餐！'
                    : 'Explore recipes and tap "+ Cookbook" to save to your family rotation!'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setLibraryScope('family')}
              className="text-[10px] font-bold bg-white/15 hover:bg-white/25 text-[#F0EDE8] px-2.5 py-1.5 rounded-xl transition shrink-0 cursor-pointer border border-white/10"
            >
              {language === 'zh-CN' ? '查看我的菜单' : 'My Cookbook'}
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#B8AFA4] dark:text-[#5A5450] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              libraryScope === 'family'
                ? t('planner.searchCookbookPlaceholder')
                : t('planner.searchLibraryPlaceholder')
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-medium pl-9 pr-8 py-2.5 bg-[#FAF7F2] dark:bg-[#1E1B18] text-[#2D2640] dark:text-[#F0EDE8] placeholder:text-[#C4B8A8] dark:placeholder:text-[#5A5048] rounded-xl border border-[#E8E0D5] dark:border-[#38332E] focus:outline-none focus:border-[#2D2640] dark:focus:border-[#F0EDE8] shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#B8AFA4] dark:text-[#5A5450] hover:text-[#3D3530] dark:text-[#D0C8C0] bg-[#F5F0E8] dark:bg-[#2E2A26] rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* 1-Tap Quick Filter Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        {/* Family Safe Filter Toggle */}
        <button
          type="button"
          onClick={() => setIsFamilySafeOnly(!isFamilySafeOnly)}
          className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 shadow-sm ${
            isFamilySafeOnly
              ? 'bg-[#E8F5ED] dark:bg-[#0D2E1A] text-[#2D6A4A] dark:text-[#4CAF82] border border-[#A8D8BC] dark:border-[#1D4A2A]'
              : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'
          }`}
          title={language === 'zh-CN' ? '自动屏蔽全家过敏食材' : 'Hide dishes with any family member allergens'}
        >
          <span>🛡️</span>
          <span>{language === 'zh-CN' ? '全家安全' : 'Family Safe'}</span>
        </button>

        {/* My Taste Filter Toggle */}
        {currentMember && memberProfiles?.[currentMember] && (
          <button
            type="button"
            onClick={() => setIsMyTasteOnly(!isMyTasteOnly)}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 shadow-sm ${
              isMyTasteOnly
                ? 'bg-[#FFD13B] text-[#2D2640] border border-[#2D2640]/10'
                : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'
            }`}
            title={language === 'zh-CN' ? '仅显示符合我偏好的菜系' : 'Only show my favorite cuisines'}
          >
            <span>👤</span>
            <span>{language === 'zh-CN' ? '我的口味' : 'My Taste'}</span>
          </button>
        )}

        {QUICK_FILTERS.map((pill) => {
          const isSelected = selectedQuickFilter === pill.id;
          const displayLabel = language === 'zh-CN' && (pill as any).labelZh ? (pill as any).labelZh : pill.label;
          return (
            <button
              key={pill.id}
              onClick={() => setSelectedQuickFilter(isSelected ? null : pill.id)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-[#FFD13B] text-[#2D2640] shadow-sm border border-[#2D2640]/10'
                  : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'
              }`}
            >
              {displayLabel}
            </button>
          );
        })}
      </div>

      {/* Sort By & Cuisine Filter Bar */}
      <div className="flex items-center justify-between gap-2 text-xs">
        {/* Sort By Selector */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-[#252220] px-2.5 py-1.5 rounded-xl border border-[#EDE8DF] dark:border-[#38332E] shadow-sm">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#9A8A7E] dark:text-[#7A6E64]" />
          <span className="text-[10px] font-bold text-[#9A8A7E] dark:text-[#7A6E64] uppercase">{language === 'zh-CN' ? '排序:' : 'Sort:'}</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="most_cooked" className="bg-white dark:bg-[#252220] text-[#2D2640] dark:text-[#F0EDE8]">{language === 'zh-CN' ? '🔥 烹饪最多次数' : '🔥 Most Cooked'}</option>
            <option value="quickest" className="bg-white dark:bg-[#252220] text-[#2D2640] dark:text-[#F0EDE8]">{language === 'zh-CN' ? '⏱️ 用时最短' : '⏱️ Quickest Meals'}</option>
            <option value="least_ingredients" className="bg-white dark:bg-[#252220] text-[#2D2640] dark:text-[#F0EDE8]">{language === 'zh-CN' ? '🥬 食材最少' : '🥬 Least Ingredients'}</option>
            <option value="name" className="bg-white dark:bg-[#252220] text-[#2D2640] dark:text-[#F0EDE8]">{language === 'zh-CN' ? '🔤 名称排序' : '🔤 Name (A-Z)'}</option>
            <option value="recent" className="bg-white dark:bg-[#252220] text-[#2D2640] dark:text-[#F0EDE8]">{language === 'zh-CN' ? '🕒 最近添加' : '🕒 Recently Added'}</option>
          </select>
        </div>

        {/* Cuisine Filter Selector */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-[#252220] px-2.5 py-1.5 rounded-xl border border-[#EDE8DF] dark:border-[#38332E] shadow-sm">
          <Filter className="w-3.5 h-3.5 text-[#9A8A7E] dark:text-[#7A6E64]" />
          <select
            value={selectedCuisine}
            onChange={(e) => setSelectedCuisine(e.target.value)}
            className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] bg-transparent focus:outline-none cursor-pointer max-w-[130px] truncate"
          >
            {CUISINES.map((c) => (
              <option key={c} value={c} className="bg-white dark:bg-[#252220] text-[#2D2640] dark:text-[#F0EDE8]">
                {formatCuisine(c)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* "Our Category" Section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] uppercase tracking-wider">
            {language === 'zh-CN' ? '菜品分类' : 'Our Category'}
          </h3>
          <button
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer ${
              showOnlyFavorites
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-white text-[#7A6E64] dark:text-[#9A9088] border border-[#EAE6DF] hover:text-rose-500'
            }`}
          >
            <Heart className={`w-3 h-3 ${showOnlyFavorites ? 'fill-white' : 'text-rose-500'}`} />
            <span>{t('common.favorites')}</span>
          </button>
        </div>

        {/* Category Pills Slider */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-2xl transition-all whitespace-nowrap cursor-pointer border shadow-sm ${
                  isSelected
                    ? 'bg-[#FFD13B] text-[#2D2640] border-[#2D2640]/10 shadow-sm'
                    : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'
                }`}
              >
                <img
                  src={CATEGORY_IMAGES[cat] || CATEGORY_IMAGES.All}
                  alt={cat}
                  className="w-6 h-6 rounded-xl object-cover shrink-0"
                />
                <span className="text-xs font-bold shrink-0">{formatCategory(cat)}</span>
                <span
                  className={`inline-flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-[#2D2640]/10 text-[#2D2640]'
                      : 'bg-[#EDE8DF] dark:bg-[#38332E] text-[#9A8A7E] dark:text-[#7A6E64]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dishes Header & Count */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] uppercase tracking-wider">
            {libraryScope === 'family' ? t('dishes.familyTab') : t('dishes.libraryTab')} (
            {filteredDishes.length.toLocaleString()})
          </h3>
        </div>
        
        <button
          onClick={() => setIsCreatorOpen(true)}
          className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] flex items-center gap-1 hover:underline cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('dishes.newRecipe')}</span>
        </button>
      </div>

      {/* Dishes List / Cards */}
      {filteredDishes.length === 0 ? (
        <div className="bg-white dark:bg-[#252220] rounded-2xl p-7 text-center border border-dashed border-[#EDE8DF] dark:border-[#38332E] space-y-3 shadow-sm animate-in fade-in">
          <div className="w-12 h-12 rounded-xl bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#7A6E64] dark:text-[#9A9088] flex items-center justify-center mx-auto text-2xl">
            {libraryScope === 'family' ? '📖' : '🔍'}
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[#2D2640] dark:text-[#F0EDE8]">
              {libraryScope === 'family' ? t('dishes.emptyCookbookTitle') : t('planner.noRecipesFound')}
            </h4>
            <p className="text-xs text-[#9A8A7E] dark:text-[#7A6E64]">
              {libraryScope === 'family'
                ? t('dishes.emptyCookbookSubtitle')
                : t('planner.noRecipesFoundSub')}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            {libraryScope === 'family' ? (
              <>
                <button
                  onClick={() => setLibraryScope('system')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFD13B] text-[#2D2640] text-xs font-bold shadow-sm border border-[#2D2640]/10 active:scale-95 transition cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{t('dishes.exploreRecipesBtn')}</span>
                </button>
                {(selectedCuisine !== 'All Cuisines' || selectedCategory !== 'All' || searchQuery || selectedQuickFilter || showOnlyFavorites) && (
                  <button
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F5F0E8] dark:bg-[#2E2A26] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] text-xs font-bold transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('common.clear')}</span>
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F5F0E8] dark:bg-[#2E2A26] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E] text-[#2D2640] dark:text-[#D0C8C0] border border-[#EDE8DF] dark:border-[#38332E] text-xs font-bold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('common.clear')}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedDishes.map((dish) => {
            const isFavoritedByMe = currentMember && dish.favoritedByMembers?.includes(currentMember);
            const isInFamilyCookbook = dish.isFamilyRecipe !== false;
            const localized = getLocalizedDish(dish, language);

            return (
              <div
                key={dish.id}
                onClick={() => setViewingDish(dish)}
                className="bg-white dark:bg-[#252220] rounded-2xl p-3.5 border border-[#EDE8DF] dark:border-[#38332E] hover:border-[#FFD13B]/50 hover:shadow-md transition-all cursor-pointer active:scale-[0.99] flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">

                  {/* Thumbnail Photo or Emoji */}
                  <div className="relative shrink-0">
                    {dish.imageUrl ? (
                      <img
                        src={dish.imageUrl}
                        alt={localized.name}
                        loading="lazy"
                        className="w-16 h-16 rounded-xl object-cover border border-[#EDE8DF] dark:border-[#38332E] shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-[#F5F0E8] dark:bg-[#2E2A26] border border-[#EDE8DF] dark:border-[#38332E] flex items-center justify-center text-3xl shadow-sm">
                        {dish.imageEmoji || '🍲'}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A6E64] dark:text-[#9A9088] bg-[#F5F0E8] dark:bg-[#2E2A26] px-1.5 py-0.2 rounded-md">
                        {formatCategory(dish.category)}
                      </span>
                      {dish.cuisine && (
                        <span className="text-[10px] font-semibold text-[#9A8A7E] dark:text-[#7A6E64] bg-[#FAF7F2] dark:bg-[#1E1B18] border border-[#EDE8DF] dark:border-[#38332E] px-1.5 py-0.2 rounded-md">
                          {formatCuisine(dish.cuisine)}
                        </span>
                      )}
                      {dish.timesPlanned && dish.timesPlanned > 0 ? (
                        <span className="text-[10px] font-bold text-[#7A5C00] dark:text-[#FFD13B] bg-[#FFF3D6] dark:bg-[#2A1E00] border border-[#FFD13B]/40 px-1.5 py-0.2 rounded-md">
                          🔥 {dish.timesPlanned}x
                        </span>
                      ) : null}
                      {(() => {
                        const risk = checkDishAllergenRisk(dish, memberProfiles, familyMembers);
                        if (risk.hasRisk) {
                          return (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-md">
                              ⚠️ {risk.affectedMembers.map((m) => m.memberName).join(', ')}
                            </span>
                          );
                        }
                        return null;
                      })()}
                      {localized.fallbackTag && (
                        <span className="text-[10px] font-semibold text-[#7A5C00] dark:text-[#FFD13B] bg-[#FFF3D6] dark:bg-[#2A1E00] border border-[#FFD13B]/40 px-1.5 py-0.2 rounded-md">
                          {localized.fallbackTag}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] truncate leading-snug">
                      {localized.name}
                    </h4>
                    
                    {/* Star rating, prep time & ingredients count */}
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#9A8A7E] dark:text-[#7A6E64]">
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>4.8</span>
                      </div>
                      
                      {dish.prepTimeMinutes && (
                        <div className="flex items-center gap-1 text-[#9A8A7E] dark:text-[#7A6E64]">
                          <Clock className="w-3 h-3 text-[#B8AFA4] dark:text-[#5A5450]" />
                          <span className="font-semibold text-[#3D3530] dark:text-[#D0C8C0]">{dish.prepTimeMinutes}m</span>
                        </div>
                      )}

                      <span className="text-[#C4B8A8] dark:text-[#5A5450]">•</span>
                      <span className="text-[#9A8A7E] dark:text-[#7A6E64]">
                        {t('dishes.ingredientsCount', { count: dish.ingredients.length })}
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
                        ? 'bg-[#FFF3D6] dark:bg-[#2A1E00] text-[#7A5C00] dark:text-[#FFD13B] border-[#FFD13B]/40 shadow-sm'
                        : 'bg-[#F5F0E8] dark:bg-[#2E2A26] text-[#2D2640] dark:text-[#D0C8C0] border-[#EDE8DF] dark:border-[#38332E] hover:bg-[#EDE8DF] dark:hover:bg-[#38332E]'
                    }`}
                    title={isInFamilyCookbook ? 'In Family Cookbook (Tap to remove)' : 'Add to Family Cookbook'}
                  >
                    {isInFamilyCookbook ? (
                      <>
                        <Check className="w-3 h-3 text-[#7A5C00] dark:text-[#FFD13B] stroke-[3]" />
                        <span>{t('dishes.addedToCookbook')}</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3 h-3 text-[#7A6E64] dark:text-[#9A9088]" />
                        <span>{t('dishes.addToCookbook')}</span>
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
                      className="p-1 text-[#C4B8A8] dark:text-[#5A5450] hover:text-rose-500 transition active:scale-125 cursor-pointer"
                      title="Toggle Favorite"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isFavoritedByMe ? 'fill-rose-500 text-rose-500' : 'text-[#C4B8A8] dark:text-[#5A5450] hover:text-rose-400'
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
                      className="px-2 py-0.5 bg-[#FFD13B] hover:bg-[#FFC200] text-[#2D2640] border border-[#2D2640]/10 text-[10px] font-bold rounded-md shadow-sm active:scale-95 transition cursor-pointer"
                    >
                      {language === 'zh-CN' ? '+ 排餐' : '+ Plan'}
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
                className="px-5 py-2 rounded-xl bg-white dark:bg-[#252220] border border-[#EDE8DF] dark:border-[#38332E] text-xs font-bold text-[#2D2640] dark:text-[#F0EDE8] hover:bg-[#F7F4EF] dark:hover:bg-[#1A1714] transition shadow-sm cursor-pointer"
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
        familyMembers={familyMembers}
        memberProfiles={memberProfiles}
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
